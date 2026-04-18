import { io } from 'socket.io-client';

const resolveSocketUrl = () => {
  const explicitUrl = String(import.meta.env.VITE_SOCKET_URL || '').trim();
  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, '');
  }

  const apiUrl = String(import.meta.env.VITE_API_URL || '').trim();
  if (!apiUrl) {
    throw new Error('Missing VITE_API_URL or VITE_SOCKET_URL for socket connection');
  }

  return apiUrl.replace(/\/api\/?$/, '');
};

const SOCKET_URL = resolveSocketUrl();

let socket = null;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const connectSocket = (token) => {
  if (socket) {
    disconnectSocket();
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    withCredentials: true,
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
};

export const getSocket = () => socket;

export default { connectSocket, getSocket, disconnectSocket };
