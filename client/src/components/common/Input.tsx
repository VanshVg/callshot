import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, id, ...props }, ref) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-300">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={`
          bg-[#1E1E1E] border rounded-lg px-3 py-2.5 text-white text-sm
          placeholder-gray-600 outline-none transition-colors w-full
          ${error ? 'border-red-500 focus:border-red-400' : 'border-[#2F2F2F] focus:border-[#FF6800]'}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
