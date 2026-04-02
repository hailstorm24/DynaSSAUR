/**
 * Vitest global setup — runs before every test file.
 * Provides a localStorage mock so stores that persist to localStorage
 * (themeStore, persistence) work in the node test environment.
 */

const store: Record<string, string> = {};

const localStorageMock: Storage = {
  length: 0,
  key: (_index: number) => null,
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
