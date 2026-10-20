import "@testing-library/jest-dom/vitest";
import { act, cleanup } from "@testing-library/preact";
import { afterEach } from "vitest";

// Preact 11 runs useEffect cleanups after paint, on a timer. The library's own
// cleanup unmounts outside act(), so after a file's last test that timer could
// fire once jsdom was gone ("document is not defined"). Unmount inside act() so
// the cleanups run now. Hooks run in reverse order, so this goes before the
// library's own cleanup, which then finds nothing left.
afterEach(() => {
  act(() => {
    cleanup();
  });
});

// jsdom 29 delegates localStorage to Node's native Web Storage, which Node 26
// disables unless started with --localstorage-file. Tests need isolated,
// in-memory storage, not a shared persistent file, so provide a simple shim.
if (typeof window !== "undefined" && !("localStorage" in window && window.localStorage)) {
  class MemoryStorage implements Storage {
    #store = new Map<string, string>();
    get length() {
      return this.#store.size;
    }
    clear() {
      this.#store.clear();
    }
    getItem(key: string) {
      return this.#store.get(key) ?? null;
    }
    key(index: number) {
      return [...this.#store.keys()][index] ?? null;
    }
    removeItem(key: string) {
      this.#store.delete(key);
    }
    setItem(key: string, value: string) {
      this.#store.set(key, String(value));
    }
  }
  Object.defineProperty(window, "localStorage", { value: new MemoryStorage(), configurable: true });
}
