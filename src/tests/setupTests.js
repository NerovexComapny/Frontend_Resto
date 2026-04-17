import '@testing-library/jest-dom/vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import '../i18n';

const createMemoryStorage = () => {
  const store = new Map();

  return {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => {
      store.set(String(key), String(value));
    },
    removeItem: (key) => {
      store.delete(String(key));
    },
    clear: () => {
      store.clear();
    },
  };
};

const ensureLocalStorage = () => {
  const candidate = typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage;
  const isValid = candidate
    && typeof candidate.getItem === 'function'
    && typeof candidate.setItem === 'function'
    && typeof candidate.removeItem === 'function'
    && typeof candidate.clear === 'function';

  if (isValid) {
    return;
  }

  const fallbackStorage = createMemoryStorage();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: fallbackStorage,
  });

  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: fallbackStorage,
    });
  }
};

ensureLocalStorage();
expect.extend(matchers);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.clear === 'function') {
    window.localStorage.clear();
  } else if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear();
  }
});
