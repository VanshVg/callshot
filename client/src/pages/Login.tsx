import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { BRAND } from '../constants/brand';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    try {
      console.log(form,">>>>>>>>>>>>>>>>")
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string; requiresVerification?: boolean; email?: string } } })?.response?.data;
      if (errData?.requiresVerification) {
        navigate('/verify-email', { state: { email: errData.email } });
        return;
      }
      setErrors({ general: errData?.message || 'Invalid email or password' });
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
          <h1 className="text-white font-semibold text-xl mb-6">Welcome back</h1>

          {errors.general && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5 mb-4">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              error={errors.password}
              autoComplete="current-password"
            />

            <Button type="submit" fullWidth loading={loading} className="mt-2">
              Login
            </Button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#FF6800] hover:text-[#ff8533] no-underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};
