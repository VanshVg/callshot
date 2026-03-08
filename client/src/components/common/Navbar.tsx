import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { connectSocket, disconnectSocket } from '../../services/socket';
import { api, useGetNotificationsQuery, useMarkNotificationsReadMutation } from '../../store/api';
import type { AppDispatch } from '../../store/index';
import type { Notification } from '../../types/index';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useGetNotificationsQuery(undefined, { skip: !user });
  const [markRead] = useMarkNotificationsReadMutation();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Connect socket and handle real-time notifications
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();
    socket.on('notification', (notif: Notification) => {
      dispatch(
        api.util.updateQueryData('getNotifications', undefined, (draft) => {
          draft.unshift(notif);
        })
      );
    });

    return () => {
      socket.off('notification');
    };
  }, [user, dispatch]);

  // Disconnect socket on logout
  useEffect(() => {
    if (!user) disconnectSocket();
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBellClick = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening && unreadCount > 0) {
      markRead();
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    dispatch(api.util.resetApiState());
    logout();
    navigate('/login');
  };

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const NotifList = () => (
    <>
      {notifications.length === 0 ? (
        <div className="px-4 py-6 text-center text-gray-500 text-sm">No notifications yet</div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {notifications.map((n) => (
            <div
              key={n._id}
              className={`px-4 py-3 border-b border-[#2A2A2A] last:border-0 ${!n.read ? 'bg-[#FF6800]/5' : ''}`}
            >
              <div className="flex items-start gap-2">
                {!n.read && <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[#FF6800]" />}
                <div className={!n.read ? '' : 'pl-3.5'}>
                  <p className="text-gray-300 text-xs leading-snug">{n.message}</p>
                  <p className="text-gray-600 text-[11px] mt-1">{formatTime(n.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 bg-[#1C1C1C] border-b border-[#2F2F2F]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
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
                {/* Bell icon */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={handleBellClick}
                    className="relative text-gray-400 hover:text-white transition-colors p-1 cursor-pointer"
                    aria-label="Notifications"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-[#FF6800] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications dropdown */}
                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl shadow-2xl overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-[#2F2F2F]">
                        <p className="text-white text-sm font-semibold">Notifications</p>
                      </div>
                      <NotifList />
                    </div>
                  )}
                </div>

                <span className="text-sm text-gray-400">@{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-[#2A2A2A] hover:bg-[#2F2F2F] text-gray-300 px-3 py-1.5 rounded-lg transition-colors border border-[#2F2F2F] cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Mobile: bell + hamburger */}
            <div className="sm:hidden flex items-center gap-2">
              <div className="relative" ref={notifRef}>
                <button
                  onClick={handleBellClick}
                  className="relative text-gray-400 p-1 cursor-pointer"
                  aria-label="Notifications"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#FF6800] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-[#2F2F2F]">
                      <p className="text-white text-sm font-semibold">Notifications</p>
                    </div>
                    <NotifList />
                  </div>
                )}
              </div>

              <button
                className="text-gray-400 p-1 cursor-pointer"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
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

      {/* Mobile dropdown menu */}
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
            className="text-left text-sm text-red-400 cursor-pointer"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};
