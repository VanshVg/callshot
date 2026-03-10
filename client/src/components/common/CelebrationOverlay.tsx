import { useEffect } from 'react';

interface CelebrationOverlayProps {
  headline: string;
  subline: string;
  onDone: () => void;
}

export const CelebrationOverlay = ({ headline, subline, onDone }: CelebrationOverlayProps) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onDone}
      style={{ cursor: 'pointer' }}
    >
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        style={{ animation: 'fadeInBg 0.25s ease forwards' }}
      />

      {/* Central card */}
      <div
        className="relative flex flex-col items-center gap-4 bg-[#181818] border-2 border-[#FF6800]/70 rounded-2xl px-10 py-8 shadow-2xl max-w-xs w-full mx-4 text-center"
        style={{ animation: 'cardPop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards', opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          className="text-5xl select-none"
          style={{ animation: 'iconPulse 0.7s 0.4s ease-in-out infinite alternate' }}
        >
          🎯
        </div>

        {/* Headline */}
        <div>
          <p className="text-white font-extrabold text-2xl leading-tight tracking-tight">
            {headline}
          </p>
          <p className="text-gray-400 text-sm mt-2 leading-relaxed">{subline}</p>
        </div>

        {/* Orange accent bar */}
        <div className="w-12 h-1 rounded-full bg-[#FF6800] opacity-80" />

        <p className="text-gray-600 text-xs">Tap anywhere to close</p>
      </div>

      <style>{`
        @keyframes fadeInBg {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cardPop {
          0%   { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes iconPulse {
          0%   { transform: scale(1)    rotate(-4deg); }
          100% { transform: scale(1.15) rotate(4deg);  }
        }
      `}</style>
    </div>
  );
};
