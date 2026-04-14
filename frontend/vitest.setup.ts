import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Create a jsdom instance and expose globals
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
});

// Set up globals that jsdom environment should provide
Object.defineProperty(globalThis, 'document', {
  value: dom.window.document,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'window', {
  value: dom.window,
  writable: true,
  configurable: true,
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));
