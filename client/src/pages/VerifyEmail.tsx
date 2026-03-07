import { useState, useRef, KeyboardEvent, ClipboardEvent, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { BRAND } from '../constants/brand';

const OTP_LENGTH = 6;

export const VerifyEmail = () => {
  const { verifyEmail, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email || '';

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.length < OTP_LENGTH) { setError('Please enter all 6 digits'); return; }
    setLoading(true);
    setError('');
    try {
      await verifyEmail(email, otp);
      navigate('/dashboard');
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
      await resendOtp(email);
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

  if (!email) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No email found. Please register first.</p>
          <Link to="/register" className="text-[#FF6800] no-underline text-sm font-medium">Go to Register</Link>
        </div>
      </div>
    );
  }

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
          <div className="text-center mb-6">
            <div className="text-3xl mb-3">📬</div>
            <h1 className="text-white font-semibold text-xl">Verify your email</h1>
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

          <form onSubmit={handleSubmit}>
            {/* OTP boxes */}
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
              Verify Email
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
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Wrong email?{' '}
          <Link to="/register" className="text-gray-400 hover:text-white no-underline">
            Go back
          </Link>
        </p>
      </div>
    </div>
  );
};
