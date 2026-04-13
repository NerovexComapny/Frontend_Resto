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

export const connectSocket = () => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    withCredentials: true,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default { connectSocket, getSocket, disconnectSocket };
