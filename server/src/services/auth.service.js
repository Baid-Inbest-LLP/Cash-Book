import crypto from 'crypto';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/tokenUtils.js';

const MAX_REFRESH_SESSIONS = 5;

const toAuthUser = (user) => ({
  _id: user._id,
  name: user.name,
  role: user.role,
});

/** Normalize legacy string | string[] | null refreshToken storage. */
const listRefreshTokens = (value) => {
  if (Array.isArray(value)) return value.filter((t) => typeof t === 'string' && t);
  if (typeof value === 'string' && value) return [value];
  return [];
};

const rememberRefreshToken = (user, token) => {
  const next = listRefreshTokens(user.refreshToken).filter((t) => t !== token);
  next.push(token);
  user.refreshToken = next.slice(-MAX_REFRESH_SESSIONS);
};

export const login = async (email, password) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+password +refreshToken');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) {
    throw ApiError.unauthorized('Account is deactivated');
  }

  const payload = { id: String(user._id) };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Append session token instead of replacing — local/prod or multi-device
  // logins no longer invalidate each other's refresh tokens.
  rememberRefreshToken(user, refreshToken);
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  return { user: toAuthUser(user), accessToken, refreshToken };
};

export const refreshAccessToken = async (token) => {
  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.id).select('+refreshToken');
  const sessions = listRefreshTokens(user?.refreshToken);
  if (!user || !user.isActive || !sessions.includes(token)) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const payload = { id: String(user._id) };
  const accessToken = generateAccessToken(payload);
  return { accessToken };
};

export const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: [] });
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
  user.refreshToken = [];
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
  const user = await User.findById(userId).select('+password +refreshToken');
  if (!user) throw ApiError.notFound('User not found');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.password = newPassword;
  user.refreshToken = [];
  await user.save();
};

export const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return toAuthUser(user);
};

export const toAuthUserPayload = toAuthUser;
