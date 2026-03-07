import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = ({ children, variant = 'primary', loading = false, fullWidth = false, className = '', disabled, ...props }: ButtonProps) => {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5';

  const variants = {
    primary: 'bg-[#FF6800] hover:bg-[#e05e00] text-white',
    secondary: 'bg-[#2A2A2A] hover:bg-[#333] text-gray-200 border border-[#2F2F2F]',
    ghost: 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
};
