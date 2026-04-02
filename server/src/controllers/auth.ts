import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { User } from '../models/index';
import { AuthRequest, JwtPayload } from '../types/index';
import { generateOtp, sendOtpEmail, sendPasswordResetOtpEmail } from '../services/email';

const OTP_EXPIRY_MINUTES = 15;

const signAccess = (id: string, role: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jwt.sign({ id, role }, process.env.JWT_SECRET!, { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any });

const signRefresh = (id: string, role: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jwt.sign({ id, role }, process.env.JWT_REFRESH_SECRET!, { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any });

export const register = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const { name, username, email, password } = req.body as {
    name: string; username: string; email: string; password: string;
  };

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) { res.status(409).json({ message: 'Email or username already in use' }); return; }

  const otp = generateOtp();
  const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await User.create({ name, username, email, password, otp, otpExpiry, otpPurpose: 'verification', isVerified: false });
  await sendOtpEmail(email, name, otp);

  res.status(201).json({
    requiresVerification: true,
    email,
    message: `Verification code sent to ${email}`,
  });
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body as { email: string; otp: string };
  if (!email || !otp) { res.status(400).json({ message: 'Email and OTP are required' }); return; }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) { res.status(404).json({ message: 'Account not found' }); return; }

  if (user.isVerified) {
    res.status(400).json({ message: 'Email already verified. Please login.' });
    return;
  }

  if (!user.otp || !user.otpExpiry || user.otpPurpose !== 'verification') {
    res.status(400).json({ message: 'No OTP found. Please request a new one.' });
    return;
  }

  if (new Date() > user.otpExpiry) {
    res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    return;
  }

  if (user.otp !== otp) {
    res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
    return;
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpiry = null;
  user.otpPurpose = null;
  await user.save();

  const accessToken = signAccess(user.id as string, user.role);
  const refreshToken = signRefresh(user.id as string, user.role);

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role },
  });
};

export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email: string };
  if (!email) { res.status(400).json({ message: 'Email is required' }); return; }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) { res.status(404).json({ message: 'Account not found' }); return; }
  if (user.isVerified) { res.status(400).json({ message: 'Email already verified' }); return; }

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  user.otpPurpose = 'verification';
  await user.save();

  await sendOtpEmail(email, user.name, otp);
  res.json({ message: `New verification code sent to ${email}` });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const { email, password } = req.body as { email: string; password: string };
  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  if (!user.isVerified) {
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    user.otpPurpose = 'verification';
    await user.save();
    await sendOtpEmail(email, user.name, otp);
    res.status(403).json({
      message: 'Email not verified',
      requiresVerification: true,
      email: user.email,
    });
    return;
  }

  const accessToken = signAccess(user.id as string, user.role);
  const refreshToken = signRefresh(user.id as string, user.role);

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role },
  });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body as { refreshToken: string };
  if (!token) { res.status(400).json({ message: 'Refresh token required' }); return; }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
    const accessToken = signAccess(decoded.id, decoded.role);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user!.id).select('-password -otp -otpExpiry -otpPurpose');
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  res.json({ user });
};

const signResetToken = (id: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jwt.sign({ id, purpose: 'password-reset' }, process.env.JWT_SECRET!, { expiresIn: '10m' as any });

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const { email } = req.body as { email: string };
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    res.json({ message: 'If an account exists with this email, a reset code has been sent', email });
    return;
  }

  if (!user.isVerified) {
    res.status(400).json({ message: 'Please verify your email first' });
    return;
  }

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  user.otpPurpose = 'password-reset';
  await user.save();

  await sendPasswordResetOtpEmail(email, user.name, otp);
  res.json({ message: 'If an account exists with this email, a reset code has been sent', email });
};

export const verifyResetOtp = async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body as { email: string; otp: string };
  if (!email || !otp) { res.status(400).json({ message: 'Email and OTP are required' }); return; }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) { res.status(404).json({ message: 'Account not found' }); return; }

  if (user.otpPurpose !== 'password-reset') {
    res.status(400).json({ message: 'No password reset requested' });
    return;
  }

  if (!user.otp || !user.otpExpiry) {
    res.status(400).json({ message: 'No OTP found. Please request a new one.' });
    return;
  }

  if (new Date() > user.otpExpiry) {
    res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    return;
  }

  if (user.otp !== otp) {
    res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
    return;
  }

  const resetToken = signResetToken(user.id as string);
  res.json({ resetToken, message: 'OTP verified successfully' });
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const { resetToken, password } = req.body as { resetToken: string; password: string };
  if (!resetToken) { res.status(400).json({ message: 'Reset token is required' }); return; }

  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET!) as { id: string; purpose: string };
    if (decoded.purpose !== 'password-reset') {
      res.status(400).json({ message: 'Invalid reset token' });
      return;
    }

    const user = await User.findById(decoded.id);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    user.password = password;
    user.otp = null;
    user.otpExpiry = null;
    user.otpPurpose = null;
    await user.save();

    res.json({ message: 'Password reset successful. Please login with your new password.' });
  } catch {
    res.status(401).json({ message: 'Reset token has expired. Please start again.' });
  }
};
