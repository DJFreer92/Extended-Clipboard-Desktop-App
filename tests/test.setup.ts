import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Provide a minimal electronAPI mock for tests
Object.defineProperty(window, 'electronAPI', {
  value: {
    clipboard: {
      writeText: vi.fn(),
      readText: vi.fn().mockReturnValue(''),
    },
    frontmostApp: {
      getName: vi.fn().mockResolvedValue('TestApp'),
    },
    app: {
      getName: vi.fn().mockResolvedValue('clipboard-ui'),
    },
  },
  writable: true,
});

// Mock navigator.clipboard when needed
if (!('clipboard' in navigator)) {
  (navigator as any).clipboard = {
    writeText: vi.fn(),
    readText: vi.fn().mockResolvedValue(''),
  };
}

// Stub IntersectionObserver
class IO {
  callback: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
  // Track instances for tests to trigger callbacks
  const arr = ((global as any).__ioInstances ||= []);
  arr.push(this);
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}
(global as any).IntersectionObserver = IO as any;
