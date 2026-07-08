import { useState, useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { notifications } from '@mantine/notifications';
import { useCompanyStamp, useCreateCompany, useUpdateCompany } from '../../hooks/useCompanies';
import { getApiErrorMessage } from '../../lib/queryClient';

const readImageFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });

const PHONE_REGEX = /^(\+91|91)?[6-9]\d{9}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyLocation = (isFirst = false) => ({
  label: isFirst ? 'HQ' : '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'India',
  isDefault: isFirst,
});

const buildDefaultValues = (company) => ({
  name: company?.name || '',
  companyCode: company?.companyCode || '',
  email: company?.email || '',
  phone: company?.phone || '',
  taxId: company?.taxId || '',
  isActive: company ? company.isActive !== false : true,
  locations: company?.locations?.length
    ? company.locations.map((l) => ({ ...l, label: (l.label || '').toUpperCase() }))
    : [emptyLocation(true)],
});

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="company-form-field-label">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export default function CompanyForm({ company, onClose }) {
  const isEdit = Boolean(company);
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const submitting = createCompany.isPending || updateCompany.isPending;

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: buildDefaultValues(company) });

  const { fields, append, remove } = useFieldArray({ control, name: 'locations' });
  // fields[] only holds each row's initial values; watch for the live values (badges, headers).
  const locations = useWatch({ control, name: 'locations' }) || [];

  // Parent always toggles `company` and `showForm` together, so this remounts fresh per
  // add/edit — no effect needed to reset state when `company` changes.
  const [stampFile, setStampFile] = useState(null);
  const [localStampPreview, setLocalStampPreview] = useState('');
  const [clearStamp, setClearStamp] = useState(false);

  const {
    data: fetchedStamp,
    isFetching: stampLoading,
    isError: stampError,
  } = useCompanyStamp(company?._id, Boolean(company?.hasStamp));

  const stampPreview = clearStamp ? '' : localStampPreview || fetchedStamp || '';

  useEffect(() => {
    if (stampError) notifications.show({ message: 'Could not load company stamp', color: 'red' });
  }, [stampError]);

  const onStampFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      notifications.show({ message: 'Stamp must be a PNG or JPEG image', color: 'red' });
      return;
    }
    if (file.size > 1024 * 1024) {
      notifications.show({ message: 'Stamp image must be 1 MB or smaller', color: 'red' });
      return;
    }
    setStampFile(file);
    setClearStamp(false);
    try {
      setLocalStampPreview(await readImageFileAsDataUrl(file));
    } catch {
      notifications.show({ message: 'Could not preview stamp', color: 'red' });
    }
  };

  const registerUpper = (name, rules) => {
    const field = register(name, rules);
    return {
      ...field,
      onChange: (e) => {
        e.target.value = e.target.value.toUpperCase();
        return field.onChange(e);
      },
    };
  };

  const setDefault = (idx) => {
    locations.forEach((_, i) => setValue(`locations.${i}.isDefault`, i === idx));
  };

  const addLocation = () => append(emptyLocation(false));

  const removeLocation = (idx) => {
    if (fields.length <= 1) {
      notifications.show({ message: 'At least one location required', color: 'red' });
      return;
    }
    remove(idx);
    const remaining = getValues('locations');
    if (remaining.length && !remaining.some((l) => l.isDefault)) {
      setValue('locations.0.isDefault', true);
    }
  };

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      companyCode: data.companyCode.toUpperCase(),
      taxId: data.taxId.toUpperCase(),
    };
    if (clearStamp) {
      payload.clearStamp = true;
    } else if (stampFile) {
      try {
        payload.stampImage = await readImageFileAsDataUrl(stampFile);
      } catch {
        notifications.show({ message: 'Could not read stamp image', color: 'red' });
        return;
      }
    }

    try {
      if (isEdit) {
        await updateCompany.mutateAsync({ id: company._id, data: payload });
      } else {
        await createCompany.mutateAsync(payload);
      }
      notifications.show({
        message: isEdit ? 'Company updated' : 'Company created',
        color: 'green',
      });
      onClose();
    } catch (err) {
      notifications.show({
        message: getApiErrorMessage(err, 'Something went wrong'),
        color: 'red',
      });
    }
  };

  const inputCls = (err) => `input-field text-sm ${err ? 'border-red-400 focus:ring-red-400' : ''}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={submitting ? undefined : onClose}
    >
      <div className="company-form-panel" onClick={(e) => e.stopPropagation()}>
        <div className="company-form-header">
          <div>
            <h2 className="company-form-title">{isEdit ? 'Edit Company' : 'Add New Company'}</h2>
            <p className="company-form-subtitle">
              {isEdit
                ? 'Update company info and locations'
                : 'Add company details and branch locations'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="company-form-close-btn">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div>
            <h3 className="company-form-section-title mb-3">Company Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Company Name" required error={errors.name?.message}>
                  <input
                    className={inputCls(errors.name)}
                    placeholder="Baid Inbest Llp"
                    {...register('name', { required: 'Company name is required' })}
                  />
                </Field>
              </div>

              <Field label="Company Code" required error={errors.companyCode?.message}>
                <input
                  className={`${inputCls(errors.companyCode)} font-mono`}
                  placeholder="e.g. BILLP"
                  {...registerUpper('companyCode', { required: 'Company code is required' })}
                />
              </Field>

              <Field label="Email" required error={errors.email?.message}>
                <input
                  type="email"
                  className={inputCls(errors.email)}
                  placeholder="info@company.com"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: EMAIL_REGEX, message: 'Enter a valid email address' },
                  })}
                />
              </Field>

              <Field label="Phone" required error={errors.phone?.message}>
                <input
                  className={inputCls(errors.phone)}
                  placeholder="9876543210 or +919876543210"
                  maxLength={13}
                  {...register('phone', {
                    required: 'Phone number is required',
                    validate: (value) =>
                      PHONE_REGEX.test(value.replace(/\s/g, '')) ||
                      'Enter a valid Indian phone number (e.g. 9876543210 or +919876543210)',
                  })}
                />
              </Field>

              <Field label="GST No" required error={errors.taxId?.message}>
                <input
                  className={`${inputCls(errors.taxId)} uppercase`}
                  placeholder="e.g. 27AAPFU0939F1ZV"
                  maxLength={15}
                  {...registerUpper('taxId', {
                    required: 'GST No is required',
                    validate: (value) =>
                      GST_REGEX.test(value.toUpperCase()) ||
                      'Enter a valid GST number (e.g. 27AAPFU0939F1ZV)',
                  })}
                />
              </Field>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                id="companyActive"
                className="rounded"
                {...register('isActive')}
              />
              <label htmlFor="companyActive" className="company-form-checkbox-label">
                Active company
              </label>
            </div>

            <div className="mt-4 pt-4 company-form-divider">
              <label className="company-form-field-label">
                Company stamp <span className="company-form-stamp-hint">(optional)</span>
              </label>
              {stampLoading ? (
                <p className="company-form-stamp-loading">Loading stamp…</p>
              ) : (
                <>
                  {stampPreview && !clearStamp ? (
                    <div className="company-form-stamp-preview">
                      <img
                        src={stampPreview}
                        alt="Stamp preview"
                        className="max-h-24 max-w-full object-contain mx-auto"
                      />
                    </div>
                  ) : (
                    <p className="company-form-stamp-empty">No stamp on file</p>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="input-field text-sm py-2"
                    onChange={onStampFileChange}
                  />
                  {stampPreview && !clearStamp ? (
                    <button
                      type="button"
                      className="company-form-stamp-remove"
                      onClick={() => {
                        setClearStamp(true);
                        setStampFile(null);
                        setLocalStampPreview('');
                      }}
                    >
                      Remove stamp
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="company-form-section-title">Locations / Branch Addresses</h3>
                <p className="company-form-section-hint">
                  Add one or more locations for this company
                </p>
              </div>
              <button
                type="button"
                onClick={addLocation}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                + Add Location
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, idx) => {
                const loc = locations[idx] || field;
                const locErrors = errors.locations?.[idx] || {};
                return (
                  <div
                    key={field.id}
                    className={`company-location-form-card ${
                      loc.isDefault ? 'company-location-form-card--default' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`company-location-index ${
                            loc.isDefault ? 'company-location-index--default' : ''
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <span className="company-location-form-title">
                          {(loc.label || `Location ${idx + 1}`)?.toUpperCase?.()}
                        </span>
                        {loc.isDefault && (
                          <span className="company-location-default-pill">Default</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!loc.isDefault && (
                          <button
                            type="button"
                            onClick={() => setDefault(idx)}
                            className="company-location-set-default"
                          >
                            Set as default
                          </button>
                        )}
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLocation(idx)}
                            className="company-location-remove-btn"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Field label="Location Name" required error={locErrors.label?.message}>
                          <input
                            className={inputCls(locErrors.label)}
                            placeholder='e.g. "HQ", "BRO 1"'
                            {...registerUpper(`locations.${idx}.label`, {
                              required: 'Location name is required',
                            })}
                          />
                        </Field>
                      </div>

                      <div className="col-span-2">
                        <Field label="Street Address" required error={locErrors.street?.message}>
                          <input
                            className={inputCls(locErrors.street)}
                            placeholder="123 Main Street"
                            {...register(`locations.${idx}.street`, {
                              required: 'Street address is required',
                            })}
                          />
                        </Field>
                      </div>

                      <Field label="City" required error={locErrors.city?.message}>
                        <input
                          className={inputCls(locErrors.city)}
                          placeholder="City"
                          {...register(`locations.${idx}.city`, { required: 'City is required' })}
                        />
                      </Field>

                      <Field label="State / Province" required error={locErrors.state?.message}>
                        <input
                          className={inputCls(locErrors.state)}
                          placeholder="State"
                          {...register(`locations.${idx}.state`, {
                            required: 'State is required',
                          })}
                        />
                      </Field>

                      <Field label="ZIP / Postal Code" required error={locErrors.zipCode?.message}>
                        <input
                          className={inputCls(locErrors.zipCode)}
                          placeholder="ZIP Code"
                          {...register(`locations.${idx}.zipCode`, {
                            required: 'ZIP code is required',
                          })}
                        />
                      </Field>

                      <Field label="Country" required error={locErrors.country?.message}>
                        <input
                          className={inputCls(locErrors.country)}
                          placeholder="Country"
                          {...register(`locations.${idx}.country`, {
                            required: 'Country is required',
                          })}
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="company-form-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving...' : isEdit ? 'Update Company' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
