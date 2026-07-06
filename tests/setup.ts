import "@testing-library/jest-dom/vitest";

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
