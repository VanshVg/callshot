import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Derive the socket server base URL from the API URL (strip /api suffix)
const getServerUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (apiUrl) return apiUrl.replace(/\/api\/?$/, '');
  // Fallback: same host, port 5000 (dev without proxy)
  return `${window.location.protocol}//${window.location.hostname}:5000`;
};

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;

  // Disconnect stale instance before reconnecting (e.g. after logout/login)
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  const token = localStorage.getItem('accessToken');
  socket = io(getServerUrl(), {
    auth: { token },
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;
