import crypto from 'crypto';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/tokenUtils.js';
import { processAvatarUpload, avatarBase64ToDataUri } from '../utils/processAvatarImage.js';

const toAuthUser = (user) => ({
  _id: user._id,
  name: user.name,
  role: user.role,
  hasAvatar: Boolean(user.avatarImage),
});

export const login = async (email, password) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select(
    '+password +refreshToken +avatarImage',
  );
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) {
    throw ApiError.unauthorized('Account is deactivated');
  }

  const payload = { id: user._id };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  return { user: toAuthUser(user), accessToken, refreshToken };
};

export const refreshAccessToken = async (token) => {
  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const payload = { id: user._id };
  const accessToken = generateAccessToken(payload);
  return { accessToken };
};

export const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    return { message: 'If email exists, reset link has been sent' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = Date.now() + 3600000;
  await user.save({ validateBeforeSave: false });

  return { resetToken, email: user.email, message: 'If email exists, reset link has been sent' };
};

export const resetPassword = async (token, password) => {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+password +resetPasswordToken +resetPasswordExpires');

  if (!user) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.refreshToken = undefined;
  await user.save();

  return user;
};

export const registerUser = async (data, requestedBy) => {
  const exists = await User.findOne({ email: data.email });
  if (exists) throw ApiError.conflict('Email already registered');

  if (requestedBy.role !== 'superadmin') {
    throw ApiError.forbidden('Only superadmin can create users');
  }

  const role = data.role || 'accountant';
  if (role === 'superadmin') {
    throw ApiError.forbidden('Superadmin accounts cannot be created here');
  }
  if (role !== 'accountant') {
    throw ApiError.forbidden('Invalid role');
  }

  return User.create({ ...data, role });
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('User not found');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
};

export const getProfile = async (userId) => {
  const user = await User.findById(userId).select('+avatarImage');
  if (!user) throw ApiError.notFound('User not found');
  return toAuthUser(user);
};

export const getMyAvatar = async (userId) => {
  const user = await User.findById(userId).select('+avatarImage');
  if (!user) throw ApiError.notFound('User not found');
  return {
    hasAvatar: Boolean(user.avatarImage),
    avatarPreview: user.avatarImage ? avatarBase64ToDataUri(user.avatarImage) : '',
  };
};

export const updateProfile = async (userId, { avatarImage, clearAvatar } = {}) => {
  const user = await User.findById(userId).select('+avatarImage');
  if (!user) throw ApiError.notFound('User not found');

  if (clearAvatar) {
    user.avatarImage = '';
  } else if (avatarImage !== undefined) {
    try {
      user.avatarImage = processAvatarUpload(avatarImage);
    } catch (err) {
      throw ApiError.badRequest(err.message || 'Invalid photo');
    }
  }

  await user.save({ validateBeforeSave: false });

  return {
    user: toAuthUser(user),
    avatarPreview: user.avatarImage ? avatarBase64ToDataUri(user.avatarImage) : '',
  };
};

export const toAuthUserPayload = toAuthUser;
