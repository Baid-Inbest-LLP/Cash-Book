import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Company, Location, User } from '../models/index.js';
import { normalizeBranchLabel } from '../utils/locationFormat.js';
import { ApiError } from '../utils/ApiError.js';
import { USER_ROLES } from '../constants/roles.js';

const crud = (Model, name) => ({
  list: asyncHandler(async (req, res) => {
    const filter = req.query.activeOnly === 'false' ? {} : { isActive: { $ne: false } };
    const items = await Model.find(filter).sort({ name: 1 }).lean();
    ApiResponse.success(res, items);
  }),
  create: asyncHandler(async (req, res) => {
    const item = await Model.create(req.body);
    ApiResponse.created(res, item, `${name} created`);
  }),
  update: asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) throw ApiError.notFound(`${name} not found`);
    ApiResponse.success(res, item, `${name} updated`);
  }),
  remove: asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) throw ApiError.notFound(`${name} not found`);
    ApiResponse.success(res, null, `${name} deleted`);
  }),
});

export const companyController = crud(Company, 'Company');
export const locationController = crud(Location, 'Location');

export const getLookupData = asyncHandler(async (_req, res) => {
  const [companies, locationDocs] = await Promise.all([
    Company.find({ isActive: true }).select('name code').sort({ name: 1 }).lean(),
    Location.find({ isActive: true })
      .populate('company', 'name')
      .select('name label company isDefault')
      .sort({ label: 1 })
      .lean(),
  ]);

  const companyLocations = {};
  for (const loc of locationDocs) {
    const companyName = loc.company?.name;
    if (!companyName) continue;
    if (!companyLocations[companyName]) companyLocations[companyName] = [];
    const branchLabel = normalizeBranchLabel(loc.label);
    if (branchLabel) companyLocations[companyName].push(branchLabel);
  }

  const branchLabels = [
    ...new Set(locationDocs.map((l) => normalizeBranchLabel(l.label)).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  ApiResponse.success(res, {
    companies: companies.map((c) => c.name),
    companyCodeByName: Object.fromEntries(
      companies.filter((c) => c.name && c.code).map((c) => [c.name, c.code]),
    ),
    locations: branchLabels,
    companyLocations,
    paymentMethods: ['Bank', 'Cash', 'UPI', 'Debit/Credit Card'],
    roles: USER_ROLES,
    months: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
    quarters: ['Q1', 'Q2', 'Q3', 'Q4'],
  });
});

const canManageUser = (actorRole, targetRole) =>
  actorRole === 'superadmin' && targetRole === 'accountant';

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ name: 1 });
  ApiResponse.success(res, users);
});

export const updateUser = asyncHandler(async (req, res) => {
  const actor = req.user;
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  if (user._id.equals(actor._id)) {
    throw ApiError.forbidden('You cannot edit your own account here');
  }
  if (!canManageUser(actor.role, user.role)) {
    throw ApiError.forbidden('You do not have permission to manage this user');
  }

  const { name, email, isActive } = req.body;
  if (name !== undefined) user.name = name;
  if (email !== undefined) {
    const normalized = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalized, _id: { $ne: user._id } });
    if (existing) throw ApiError.conflict('Email already in use');
    user.email = normalized;
  }
  if (isActive !== undefined) user.isActive = Boolean(isActive);

  await user.save();
  ApiResponse.success(res, user, 'User updated');
});

export const deleteUser = asyncHandler(async (req, res) => {
  const actor = req.user;
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  if (user._id.equals(actor._id)) {
    throw ApiError.forbidden('You cannot delete your own account');
  }
  if (user.role === 'superadmin') {
    throw ApiError.forbidden('Superadmin users cannot be deleted');
  }
  if (!canManageUser(actor.role, user.role)) {
    throw ApiError.forbidden('You do not have permission to delete this user');
  }

  await User.findByIdAndDelete(req.params.id);
  ApiResponse.success(res, null, 'User deleted');
});
