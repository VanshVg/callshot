export const PageLoader = () => (
  <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-5">
    {/* Logo mark */}
    <div className="relative flex items-center justify-center w-16 h-16">
      {/* Outer spinning ring */}
      <svg
        className="absolute inset-0 w-full h-full animate-spin"
        viewBox="0 0 64 64"
        fill="none"
        style={{ animationDuration: '1s' }}
      >
        <circle
          cx="32" cy="32" r="28"
          stroke="#FF6800"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="44 132"
        />
      </svg>
      {/* Inner pulsing dot */}
      <div className="w-8 h-8 rounded-full bg-[#FF6800]/10 border border-[#FF6800]/30 flex items-center justify-center animate-pulse">
        <div className="w-3 h-3 rounded-full bg-[#FF6800]" />
      </div>
    </div>

    {/* Brand name */}
    <p className="text-gray-600 text-sm tracking-widest uppercase font-medium select-none">
      CallShot
    </p>
  </div>
);
