import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BRAND } from '../../constants/brand';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#1C1C1C] border-b border-[#2F2F2F]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo — desktop: full wordmark, mobile: icon only */}
        <Link to={user ? '/dashboard' : '/'} className="flex items-center no-underline">
          <span className="text-white font-bold text-xl tracking-tight">
            Call<span className="text-[#FF6800]">Shot</span>
          </span>
        </Link>

        {user ? (
          <>
            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-6">
              <Link to="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors no-underline">
                Dashboard
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="text-gray-400 hover:text-white text-sm transition-colors no-underline">
                  Admin
                </Link>
              )}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">@{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-[#2A2A2A] hover:bg-[#2F2F2F] text-gray-300 px-3 py-1.5 rounded-lg transition-colors border border-[#2F2F2F]"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Mobile hamburger */}
            <button
              className="sm:hidden text-gray-400 p-1"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-300 hover:text-white transition-colors no-underline">
              Login
            </Link>
            <Link
              to="/register"
              className="text-sm bg-[#FF6800] hover:bg-[#e05e00] text-white px-4 py-1.5 rounded-lg transition-colors no-underline font-medium"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>

      {/* Mobile dropdown */}
      {user && menuOpen && (
        <div className="sm:hidden bg-[#1C1C1C] border-t border-[#2F2F2F] px-4 py-3 flex flex-col gap-3">
          <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="text-gray-300 text-sm no-underline">
            Dashboard
          </Link>
          {user.role === 'admin' && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="text-gray-300 text-sm no-underline">
              Admin
            </Link>
          )}
          <span className="text-gray-500 text-sm">@{user.username}</span>
          <button
            onClick={() => { setMenuOpen(false); handleLogout(); }}
            className="text-left text-sm text-red-400"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};
