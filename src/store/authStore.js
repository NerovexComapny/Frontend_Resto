import { create } from 'zustand';

const getSafeStorage = () => {
  if (typeof window !== 'undefined' && window.sessionStorage && typeof window.sessionStorage.getItem === 'function') {
    return window.sessionStorage;
  }

  if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.getItem === 'function') {
    return sessionStorage;
  }

  return null;
};

const readToken = () => {
  const storage = getSafeStorage();
  return storage?.getItem('token') || null;
};

const readUser = () => {
  const storage = getSafeStorage();
  const rawUser = storage?.getItem('user');
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
};

const writeStorage = (key, value) => {
  const storage = getSafeStorage();
  if (!storage) return;

  storage.setItem(key, value);
};

const removeStorage = (key) => {
  const storage = getSafeStorage();
  if (!storage) return;

  storage.removeItem(key);
};

const initialToken = readToken();
const initialUser = readUser();

const useAuthStore = create((set) => ({
  user: initialUser,
  token: initialToken,
  isAuthenticated: Boolean(initialToken),
  isLoading: false,

  login: (userData, token) => {
    writeStorage('token', token);
    writeStorage('user', JSON.stringify(userData));
    set({
      user: userData,
      token: token,
      isAuthenticated: true,
    });
  },

  logout: () => {
    removeStorage('token');
    removeStorage('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  setUser: (user) => set({ user }),

  setLoading: (isLoading) => set({ isLoading }),
}));

export default useAuthStore;
