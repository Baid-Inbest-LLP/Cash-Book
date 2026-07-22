import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Company, Location } from '../models/index.js';
import { buildLocationName } from '../utils/locationFormat.js';
import { processStampUpload, stampBase64ToDataUri } from '../utils/processStampImage.js';
import { escapeRegex } from '../utils/searchUtils.js';

const toLocationDto = (loc) => ({
  _id: loc._id,
  label: loc.label,
  street: loc.street || '',
  city: loc.city || '',
  state: loc.state || '',
  zipCode: loc.zipCode || '',
  country: loc.country || '',
  isDefault: Boolean(loc.isDefault),
});

const toPublicCompany = (company, locations = [], hasStampOverride) => {
  const doc = company?.toObject ? company.toObject() : { ...company };
  const { stampImage, code, ...rest } = doc;
  return {
    ...rest,
    companyCode: code,
    hasStamp: hasStampOverride !== undefined ? hasStampOverride : Boolean(stampImage),
    locations: locations.map(toLocationDto),
  };
};

const normalizeCompanyFields = (body = {}) => ({
  name: body.name?.trim(),
  code: (body.companyCode || body.code)?.trim(),
  email: body.email?.trim()?.toLowerCase(),
  phone: body.phone?.trim(),
  taxId: body.taxId?.trim()?.toUpperCase(),
  logo: body.logo?.trim() || '',
  isActive: body.isActive !== false,
});

const applyStamp = (company, stampImage, { clearStamp = false } = {}) => {
  if (clearStamp) {
    company.stampImage = '';
    return;
  }
  if (stampImage === undefined) return;
  company.stampImage = processStampUpload(stampImage);
};

const loadCompanyLocations = (companyId) =>
  Location.find({ company: companyId, isActive: true }).sort({ isDefault: -1, label: 1 }).lean();

const syncLocations = async (companyId, locations = []) => {
  if (!locations.length) {
    throw ApiError.badRequest('At least one location is required');
  }

  const existing = await Location.find({ company: companyId }).select('_id').lean();
  const incomingIds = new Set(locations.filter((l) => l._id).map((l) => String(l._id)));
  const remainingCount =
    existing.filter((l) => incomingIds.has(String(l._id))).length +
    locations.filter((l) => !l._id).length;

  if (remainingCount < 1) {
    throw ApiError.badRequest('Company must have at least one location');
  }

  const idsToDelete = existing
    .filter((l) => !incomingIds.has(String(l._id)))
    .map((l) => l._id);
  if (idsToDelete.length) {
    await Location.deleteMany({ _id: { $in: idsToDelete } });
  }

  const firstDefaultIndex = locations.findIndex((l) => l.isDefault);
  const defaultIndex = firstDefaultIndex === -1 ? 0 : firstDefaultIndex;
  const normalizedLocations = locations.map((loc, index) => ({
    ...loc,
    isDefault: index === defaultIndex,
  }));

  const updates = [];
  const creates = [];
  for (const loc of normalizedLocations) {
    const payload = {
      company: companyId,
      label: String(loc.label || '').trim(),
      name: buildLocationName(loc.label),
      code: String(loc.label || '').trim(),
      street: loc.street?.trim() || '',
      city: loc.city?.trim() || '',
      state: loc.state?.trim() || '',
      zipCode: loc.zipCode?.trim() || '',
      country: loc.country?.trim() || 'India',
      isDefault: Boolean(loc.isDefault),
      isActive: true,
    };

    if (loc._id) {
      updates.push(
        Location.findByIdAndUpdate(loc._id, payload, { runValidators: true }),
      );
    } else {
      creates.push(payload);
    }
  }

  await Promise.all([
    ...updates,
    ...(creates.length ? [Location.insertMany(creates)] : []),
  ]);
};

export const getCompanies = asyncHandler(async (req, res) => {
  const { search, isActive, page = 1, limit = 50 } = req.query;
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const filter = {};

  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    const searchRegex = escapeRegex(search);
    filter.$or = [
      { name: { $regex: searchRegex, $options: 'i' } },
      { email: { $regex: searchRegex, $options: 'i' } },
      { code: { $regex: searchRegex, $options: 'i' } },
    ];
  }

  const total = await Company.countDocuments(filter);
  const companies = await Company.find(filter)
    .sort({ name: 1 })
    .skip((parsedPage - 1) * parsedLimit)
    .limit(parsedLimit)
    .lean();

  const companiesWithStampIds = new Set(
    (
      await Company.find({ _id: { $in: companies.map((c) => c._id) }, stampImage: { $nin: [null, ''] } })
        .select('_id')
        .lean()
    ).map((c) => String(c._id)),
  );

  const companyIds = companies.map((c) => c._id);
  const locationDocs = await Location.find({
    company: { $in: companyIds },
    isActive: true,
  })
    .sort({ isDefault: -1, label: 1 })
    .lean();

  const locationsByCompany = locationDocs.reduce((acc, loc) => {
    const key = String(loc.company);
    if (!acc[key]) acc[key] = [];
    acc[key].push(loc);
    return acc;
  }, {});

  const payload = companies.map((company) =>
    toPublicCompany(
      company,
      locationsByCompany[String(company._id)] || [],
      companiesWithStampIds.has(String(company._id)),
    ),
  );

  ApiResponse.paginated(res, payload, {
    page: parsedPage,
    pages: Math.ceil(total / parsedLimit) || 1,
    total,
    limit: parsedLimit,
  });
});

export const getCompany = asyncHandler(async (req, res) => {
  const [company, stampDoc] = await Promise.all([
    Company.findById(req.params.id),
    Company.findById(req.params.id).select('stampImage').lean(),
  ]);
  if (!company) throw ApiError.notFound('Company not found');
  const locations = await loadCompanyLocations(company._id);
  ApiResponse.success(res, toPublicCompany(company, locations, Boolean(stampDoc?.stampImage)));
});

export const getCompanyStamp = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id).select('+stampImage code name');
  if (!company) throw ApiError.notFound('Company not found');
  ApiResponse.success(res, {
    hasStamp: Boolean(company.stampImage),
    stampPreview: company.stampImage ? stampBase64ToDataUri(company.stampImage) : '',
  });
});

export const createCompany = asyncHandler(async (req, res) => {
  const { locations = [], stampImage, clearStamp, ...companyBody } = req.body;
  const fields = normalizeCompanyFields(companyBody);

  const company = await Company.create(fields);
  try {
    applyStamp(company, stampImage, { clearStamp });
    if (stampImage !== undefined || clearStamp) await company.save();
    await syncLocations(company._id, locations);
  } catch (err) {
    await Company.findByIdAndDelete(company._id);
    if (err instanceof ApiError) throw err;
    throw ApiError.badRequest(err.message || 'Failed to create company');
  }

  const locs = await loadCompanyLocations(company._id);
  ApiResponse.created(res, toPublicCompany(company, locs, Boolean(company.stampImage)), 'Company created');
});

export const updateCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id).select('+stampImage');
  if (!company) throw ApiError.notFound('Company not found');

  const { locations, stampImage, clearStamp, ...companyBody } = req.body;
  Object.assign(company, normalizeCompanyFields({ ...company.toObject(), ...companyBody }));

  try {
    applyStamp(company, stampImage, { clearStamp });
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }

  await company.save();

  if (Array.isArray(locations)) {
    await syncLocations(company._id, locations);
  }

  const locs = await loadCompanyLocations(company._id);
  ApiResponse.success(res, toPublicCompany(company, locs, Boolean(company.stampImage)), 'Company updated');
});

export const deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) throw ApiError.notFound('Company not found');

  await Location.deleteMany({ company: company._id });
  await Company.findByIdAndDelete(company._id);
  ApiResponse.success(res, null, 'Company deleted successfully');
});
