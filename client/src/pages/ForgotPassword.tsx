import { useState, useRef } from 'react';
import type { KeyboardEvent, ClipboardEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { BRAND } from '../constants/brand';
import api from '../services/api';

const OTP_LENGTH = 6;

type Step = 'email' | 'otp' | 'reset';

export const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP state
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const otp = digits.join('');

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('Reset code sent! Check your inbox.');
      setStep('otp');
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((c) => { if (c <= 1) { clearInterval(interval); return 0; } return c - 1; });
      }, 1000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.length < OTP_LENGTH) { setError('Please enter all 6 digits'); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post('/auth/verify-reset-otp', { email, otp });
      setResetToken(data.resetToken);
      setStep('reset');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Verification failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('New code sent! Check your inbox.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((c) => { if (c <= 1) { clearInterval(interval); return 0; } return c - 1; });
      }, 1000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to resend code';
      setError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setError('');
    if (password.length < 6) { setPasswordError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setPasswordError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { resetToken, password });
      setSuccess('Password reset successful!');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Password reset failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-2">
          <Link to="/" className="no-underline">
            <span className="text-white font-bold text-2xl tracking-tight">
              Call<span className="text-[#FF6800]">Shot</span>
            </span>
          </Link>
          <p className="text-gray-500 text-sm">{BRAND.tagline}</p>
        </div>

        {/* Card */}
        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-6">
          {/* Step 1: Email */}
          {step === 'email' && (
            <>
              <div className="text-center mb-6">
                <div className="text-3xl mb-3">🔑</div>
                <h1 className="text-white font-semibold text-xl">Forgot password?</h1>
                <p className="text-gray-500 text-sm mt-2">
                  Enter the email linked to your account
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5 mb-4 text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4" noValidate>
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Button type="submit" fullWidth loading={loading} className="mt-2">
                  Send Reset Code
                </Button>
              </form>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <>
              <div className="text-center mb-6">
                <div className="text-3xl mb-3">🔒</div>
                <h1 className="text-white font-semibold text-xl">Enter reset code</h1>
                <p className="text-gray-500 text-sm mt-2">
                  We sent a 6-digit code to
                </p>
                <p className="text-[#FF6800] text-sm font-medium mt-0.5">{email}</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5 mb-4 text-center">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg px-3 py-2.5 mb-4 text-center">
                  {success}
                </div>
              )}

              <form onSubmit={handleOtpSubmit}>
                <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className={`
                        w-11 h-13 text-center text-xl font-bold rounded-lg border bg-[#111111] text-white
                        outline-none transition-colors caret-transparent
                        ${d ? 'border-[#FF6800]' : 'border-[#2F2F2F]'}
                        focus:border-[#FF6800]
                      `}
                      style={{ height: '52px' }}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <Button type="submit" fullWidth loading={loading} disabled={otp.length < OTP_LENGTH}>
                  Verify Code
                </Button>
              </form>

              <div className="text-center mt-4">
                <p className="text-gray-500 text-sm">
                  Didn't receive the code?{' '}
                  {resendCooldown > 0 ? (
                    <span className="text-gray-600">Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={resendLoading}
                      className="text-[#FF6800] hover:text-[#ff8533] font-medium disabled:opacity-50 transition-colors"
                    >
                      {resendLoading ? 'Sending...' : 'Resend code'}
                    </button>
                  )}
                </p>
              </div>
            </>
          )}

          {/* Step 3: New Password */}
          {step === 'reset' && (
            <>
              <div className="text-center mb-6">
                <div className="text-3xl mb-3">🔐</div>
                <h1 className="text-white font-semibold text-xl">Set new password</h1>
                <p className="text-gray-500 text-sm mt-2">
                  Choose a strong password for your account
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5 mb-4 text-center">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg px-3 py-2.5 mb-4 text-center">
                  {success}
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="flex flex-col gap-4" noValidate>
                <Input
                  label="New Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={passwordError && password.length < 6 ? passwordError : undefined}
                  autoComplete="new-password"
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={passwordError && password !== confirmPassword ? passwordError : undefined}
                  autoComplete="new-password"
                />
                <Button type="submit" fullWidth loading={loading} className="mt-2">
                  Reset Password
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-4">
          Remember your password?{' '}
          <Link to="/login" className="text-[#FF6800] hover:text-[#ff8533] no-underline font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};
