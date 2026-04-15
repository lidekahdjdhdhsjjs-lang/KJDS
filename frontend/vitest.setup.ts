import '@testing-library/jest-dom/vitest';
import { JSDOM } from 'jsdom';
import { vi } from 'vitest';

// Set up jsdom globals for @testing-library/react
// This must be done before any tests run
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

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

Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  writable: true,
  configurable: true,
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}));
