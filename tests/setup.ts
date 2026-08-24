/**
 * VocalMirror Vitest Global Setup
 * 
 * Registers Web Audio API mocks, MediaStream mocks, URL object URL polyfills,
 * and Canvas 2D context mocks across globalThis and window.
 */

import { installWebAudioMocks } from './mocks/webAudioMock';

// Enable React 18 act environment for testing
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Storage and LocalStorage Mock Setup for jsdom/Node environment
class StorageMock implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const mockStorageInstance = new StorageMock();
(globalThis as any).Storage = StorageMock;
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorageInstance,
  writable: true,
  configurable: true,
});

// Install Web Audio API & Media mocks globally
installWebAudioMocks(globalThis);

// Provide DOM & Window fallbacks if running in pure Node environment without jsdom
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}
(globalThis.window as any).Storage = StorageMock;
Object.defineProperty(globalThis.window, 'localStorage', {
  value: mockStorageInstance,
  writable: true,
  configurable: true,
});

if (typeof globalThis.document === 'undefined') {
  const elementMap = new Map<string, any>();
  const elementClasses = new Map<string, any>();

  (globalThis as any).document = {
    createElement: (tag: string) => {
      const el: any = {
        tagName: tag.toUpperCase(),
        className: '',
        id: '',
        _textContent: '',
        get textContent(): string {
          if (this._textContent) return this._textContent;
          if (this.children && this.children.length > 0) {
            return this.children.map((c: any) => c.textContent || '').join('');
          }
          return '';
        },
        set textContent(val: string) {
          this._textContent = val;
        },
        width: 300,
        height: 150,
        children: [] as any[],
        appendChild: (child: any) => {
          el.children.push(child);
          if (child.id) elementMap.set(child.id, child);
          if (child.className) elementClasses.set(child.className, child);
          return child;
        },
        getContext: (contextId: string) => {
          if (contextId === '2d') {
            return {
              canvas: el,
              clearRect: () => {},
              fillRect: () => {},
              strokeRect: () => {},
              beginPath: () => {},
              closePath: () => {},
              moveTo: () => {},
              lineTo: () => {},
              bezierCurveTo: () => {},
              quadraticCurveTo: () => {},
              arc: () => {},
              fill: () => {},
              stroke: () => {},
              save: () => {},
              restore: () => {},
              scale: () => {},
              rotate: () => {},
              translate: () => {},
              transform: () => {},
              setTransform: () => {},
              resetTransform: () => {},
              setLineDash: () => {},
              getLineDash: () => [],
              createLinearGradient: () => ({ addColorStop: () => {} }),
              createRadialGradient: () => ({ addColorStop: () => {} }),
              fillText: () => {},
              strokeText: () => {},
              measureText: (text: string) => ({ width: text.length * 8 }),
              drawImage: () => {},
              getImageData: () => ({ data: new Uint8ClampedArray(4) }),
              putImageData: () => {},
              fillStyle: '#000000',
              strokeStyle: '#000000',
              lineWidth: 1,
              lineCap: 'butt',
              lineJoin: 'miter',
              font: '10px sans-serif',
              textAlign: 'start',
              textBaseline: 'alphabetic',
              globalAlpha: 1.0,
            };
          }
          return null;
        },
      };
      return el;
    },
    getElementById: (id: string) => elementMap.get(id) || null,
    querySelector: (selector: string) => {
      if (selector.startsWith('#')) return elementMap.get(selector.slice(1)) || null;
      if (selector.startsWith('.')) return elementClasses.get(selector.slice(1)) || null;
      return null;
    },
    body: {
      appendChild: (child: any) => {
        if (child.id) elementMap.set(child.id, child);
        if (child.className) elementClasses.set(child.className, child);
        return child;
      },
    },
  };
}

if (typeof window !== 'undefined') {
  (window as any).IS_REACT_ACT_ENVIRONMENT = true;
  installWebAudioMocks(window);

  if (!window.URL) {
    (window as any).URL = {};
  }
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => `blob:http://localhost:5173/${Math.random().toString(36).substring(2, 11)}`;
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }

  // ResizeObserver Mock Polyfill
  if (typeof globalThis.ResizeObserver === 'undefined') {
    (globalThis as any).ResizeObserver = class ResizeObserver {
      public observe() {}
      public unobserve() {}
      public disconnect() {}
    };
  }

  // HTML5 Canvas 2D Context Mock Polyfill for jsdom environment
  if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = ((contextId: string) => {
      if (contextId === '2d') {
        return {
          canvas: document.createElement('canvas'),
          clearRect: () => {},
          fillRect: () => {},
          strokeRect: () => {},
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          bezierCurveTo: () => {},
          quadraticCurveTo: () => {},
          arc: () => {},
          fill: () => {},
          stroke: () => {},
          save: () => {},
          restore: () => {},
          scale: () => {},
          rotate: () => {},
          translate: () => {},
          transform: () => {},
          setTransform: () => {},
          resetTransform: () => {},
          setLineDash: () => {},
          getLineDash: () => [],
          createLinearGradient: () => ({ addColorStop: () => {} }),
          createRadialGradient: () => ({ addColorStop: () => {} }),
          fillText: () => {},
          strokeText: () => {},
          measureText: (text: string) => ({ width: text.length * 8 }),
          drawImage: () => {},
          getImageData: () => ({ data: new Uint8ClampedArray(4) }),
          putImageData: () => {},
          fillStyle: '#000000',
          strokeStyle: '#000000',
          lineWidth: 1,
          lineCap: 'butt',
          lineJoin: 'miter',
          font: '10px sans-serif',
          textAlign: 'start',
          textBaseline: 'alphabetic',
          globalAlpha: 1.0,
        } as unknown as CanvasRenderingContext2D;
      }
      return null;
    }) as any;
  }
}
