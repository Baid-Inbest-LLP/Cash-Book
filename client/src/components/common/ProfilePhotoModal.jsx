import { useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';
import Skeleton from './Skeleton';
import { useAvatar, useMe, useUpdateProfile } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../lib/queryClient';

const readImageFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

export default function ProfilePhotoModal({ open, onClose }) {
  const { data: user } = useMe();
  const { data: avatarPreview = '', isFetching: fetchingAvatar } = useAvatar();
  const updateProfile = useUpdateProfile();

  const fileInputRef = useRef(null);
  const [localPreview, setLocalPreview] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [clearPhoto, setClearPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Reset draft state when the modal opens (adjust state during render — not in an effect).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setLocalPreview('');
      setPendingFile(null);
      setClearPhoto(false);
    }
  }

  if (!open) return null;

  const loadingPreview = Boolean(user?.hasAvatar) && !avatarPreview && fetchingAvatar;
  const displayPreview = clearPhoto ? '' : localPreview || avatarPreview;
  const hasChanges = Boolean(pendingFile) || clearPhoto;

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      notifications.show({ message: 'Photo must be a PNG, JPEG, or WebP image', color: 'red' });
      return;
    }
    if (file.size > 1024 * 1024) {
      notifications.show({ message: 'Photo must be 1 MB or smaller', color: 'red' });
      return;
    }
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setPendingFile(file);
      setLocalPreview(dataUrl);
      setClearPhoto(false);
    } catch {
      notifications.show({ message: 'Could not preview photo', color: 'red' });
    }
  };

  const onRemove = () => {
    setPendingFile(null);
    setLocalPreview('');
    setClearPhoto(true);
  };

  const onSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      let payload = {};
      if (clearPhoto) {
        payload = { clearAvatar: true };
      } else if (pendingFile) {
        payload = { avatarImage: await readImageFileAsDataUrl(pendingFile) };
      }
      await updateProfile.mutateAsync(payload);
      notifications.show({ message: 'Profile photo updated', color: 'green' });
      setPendingFile(null);
      setLocalPreview('');
      setClearPhoto(false);
      onClose();
    } catch (err) {
      notifications.show({
        message: getApiErrorMessage(err, 'Failed to update photo'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="card profile-photo-modal w-full max-w-lg p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="company-form-title">Upload DP</h3>
          <button
            type="button"
            onClick={onClose}
            className="company-form-close-btn"
            aria-label="Close"
            disabled={saving}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="profile-photo-modal-preview w-[min(20rem,50vw)] h-[min(20rem,50vw)] max-w-full rounded-full overflow-hidden flex items-center justify-center text-6xl font-semibold">
            {loadingPreview ? (
              <Skeleton className="w-full h-full rounded-full" />
            ) : displayPreview ? (
              <img
                src={displayPreview}
                alt="Profile"
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <span className="profile-photo-modal-initial">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <p className="company-form-subtitle text-center mt-4">
            PNG, JPEG, or WebP · max 1 MB
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={onFileChange}
          />

          <div className="flex items-center justify-center gap-3 mt-5 w-full">
            <button
              type="button"
              className="btn-secondary flex-1 justify-center"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              Choose photo
            </button>
            <button
              type="button"
              className="btn-danger flex-1 justify-center"
              onClick={onRemove}
              disabled={saving || !displayPreview}
            >
              Remove photo
            </button>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary w-full justify-center mt-6"
          onClick={onSave}
          disabled={saving || !hasChanges}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
