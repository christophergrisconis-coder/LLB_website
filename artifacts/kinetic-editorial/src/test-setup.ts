import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

class IntersectionObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});