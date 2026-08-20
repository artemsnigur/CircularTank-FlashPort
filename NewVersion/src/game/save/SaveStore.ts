/**
 * Replaces Flash's `SharedObject` for `SWFimported/scripts/SaveManager.as`.
 *
 * The AS3 keeps four local stores:
 *
 *     SharedObject.getLocal("CircularTankOptions")
 *     SharedObject.getLocal("CircularTankSave1" | "...2" | "...3")
 *
 * and writes loose properties onto `.data`, calling `.flush()` to persist.
 * The names are preserved so a future migration tool could line old data up
 * with new, and so grepping the AS3 for a store name still finds this file.
 *
 * `SharedObject` differences worth knowing:
 *   - It is synchronous, and so is localStorage. Capacitor Preferences is
 *     **async**, which is why the backend interface is written around a
 *     synchronous in-memory cache with an explicit `flush()` — the same shape
 *     as the original, and portable to an async backend without touching
 *     callers.
 *   - It has a per-domain quota and `flush()` can fail. localStorage throws
 *     `QuotaExceededError` instead; `flush()` returns a boolean rather than
 *     throwing, because the AS3 callers treat saving as best-effort.
 *   - It stores typed AMF, so arrays and booleans survive a round trip.
 *     localStorage stores strings only, so values are JSON-encoded here.
 */

/** Store names, verbatim from SaveManager.as. */
export const OPTIONS_STORE = 'CircularTankOptions';
const SAVE_SLOT_STORES = ['CircularTankSave1', 'CircularTankSave2', 'CircularTankSave3'];

export function saveSlotStoreName(slot: number): string {
  const name = SAVE_SLOT_STORES[slot - 1];
  if (!name) throw new RangeError(`Save slot ${slot} does not exist (expected 1-3).`);
  return name;
}

/** The persistence primitive. Implemented by localStorage today. */
export interface StorageBackend {
  read(name: string): string | null;
  write(name: string, serialised: string): void;
  remove(name: string): void;
}

/** Backed by `window.localStorage`, degrading to memory when unavailable. */
export class LocalStorageBackend implements StorageBackend {
  private readonly memory = new Map<string, string>();
  private readonly available: boolean;

  constructor() {
    this.available = LocalStorageBackend.probe();
    if (!this.available) {
      // Private browsing on iOS and some embedded webviews expose
      // localStorage but throw on write. Falling back keeps the game playable,
      // just without persistence.
      console.warn('[SaveStore] localStorage unavailable; saves will not persist.');
    }
  }

  private static probe(): boolean {
    try {
      const key = '__save_probe__';
      window.localStorage.setItem(key, '1');
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  read(name: string): string | null {
    if (!this.available) return this.memory.get(name) ?? null;
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  }

  write(name: string, serialised: string): void {
    if (!this.available) {
      this.memory.set(name, serialised);
      return;
    }
    window.localStorage.setItem(name, serialised);
  }

  remove(name: string): void {
    this.memory.delete(name);
    if (!this.available) return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* nothing useful to do */
    }
  }
}

/** In-memory backend for tests. */
export class MemoryBackend implements StorageBackend {
  readonly entries = new Map<string, string>();
  read(name: string): string | null {
    return this.entries.get(name) ?? null;
  }
  write(name: string, serialised: string): void {
    this.entries.set(name, serialised);
  }
  remove(name: string): void {
    this.entries.delete(name);
  }
}

type StoredValue = unknown;

/**
 * One named store — the direct analogue of a `SharedObject`.
 *
 * Reads and writes go to an in-memory record; `flush()` persists. That matches
 * the AS3 usage pattern (many `.data.x =` assignments then one `.flush()`) and
 * keeps writes cheap.
 */
export class SaveStore {
  readonly name: string;
  private readonly backend: StorageBackend;
  private data: Record<string, StoredValue>;
  private dirty = false;

  constructor(name: string, backend: StorageBackend) {
    this.name = name;
    this.backend = backend;
    this.data = SaveStore.load(name, backend);
  }

  private static load(name: string, backend: StorageBackend): Record<string, StoredValue> {
    const raw = backend.read(name);
    if (raw === null) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, StoredValue>;
      }
      console.warn(`[SaveStore] "${name}" held a non-object; discarding.`);
      return {};
    } catch {
      // Corrupt entry. Losing one save is bad; refusing to boot is worse.
      console.warn(`[SaveStore] "${name}" is corrupt and has been reset.`);
      return {};
    }
  }

  /** `gameSave.data.x` read. */
  get<T>(key: string, fallback: T): T {
    const value = this.data[key];
    return value === undefined ? fallback : (value as T);
  }

  has(key: string): boolean {
    return this.data[key] !== undefined;
  }

  /** `gameSave.data.x = value`. Does not persist until `flush()`. */
  set(key: string, value: StoredValue): void {
    this.data[key] = value;
    this.dirty = true;
  }

  delete(key: string): void {
    delete this.data[key];
    this.dirty = true;
  }

  /** True when the store holds nothing — the AS3 tests `data.x == undefined`. */
  get isEmpty(): boolean {
    return Object.keys(this.data).length === 0;
  }

  /**
   * `SharedObject.flush()`. Returns false rather than throwing when the quota
   * is exceeded, because every AS3 caller treats saving as best-effort.
   */
  /**
   * Re-read this store from the backend, keeping any unflushed writes.
   *
   * Flushes before reading so a pending change is persisted rather than
   * thrown away: this is called to *refresh* a stale view, and losing a
   * write on the way would be a far worse bug than the one it fixes.
   */
  reload(): void {
    this.flush();
    this.data = SaveStore.load(this.name, this.backend);
    this.dirty = false;
  }

  flush(): boolean {
    if (!this.dirty) return true;
    try {
      this.backend.write(this.name, JSON.stringify(this.data));
      this.dirty = false;
      return true;
    } catch (error) {
      console.error(`[SaveStore] Could not persist "${this.name}":`, error);
      return false;
    }
  }

  /** `SharedObject.clear()`. */
  clear(): void {
    this.data = {};
    this.dirty = false;
    this.backend.remove(this.name);
  }
}

/**
 * Opens the four stores the game uses. Mirrors the AS3 constructor plus
 * `setGameSave(slotNumber)`.
 */
export class SaveStores {
  readonly options: SaveStore;
  private readonly backend: StorageBackend;
  private readonly slots = new Map<number, SaveStore>();

  constructor(backend: StorageBackend = new LocalStorageBackend()) {
    this.backend = backend;
    this.options = new SaveStore(OPTIONS_STORE, backend);
  }

  /** `SaveManager.setGameSave(slotNumber)` — 1-based. */
  slot(slotNumber: number): SaveStore {
    const existing = this.slots.get(slotNumber);
    if (existing) return existing;
    const store = new SaveStore(saveSlotStoreName(slotNumber), this.backend);
    this.slots.set(slotNumber, store);
    return store;
  }

  /** True when a slot has never been written to. */
  slotIsEmpty(slotNumber: number): boolean {
    return this.slot(slotNumber).isEmpty;
  }

  flushAll(): boolean {
    let ok = this.options.flush();
    for (const store of this.slots.values()) ok = store.flush() && ok;
    return ok;
  }

  /**
   * Re-read every cached store from the backend.
   *
   * ── Why this has to exist ────────────────────────────────────────────
   * A `SaveStore` loads once in its constructor and answers every read from
   * that copy. That is the AS3's `SharedObject` shape and it is fine for one
   * owner — but **two instances over the same key diverge silently**, and this
   * game has exactly that: `getPlayerProfile` builds its own store for the
   * active slot and gameplay writes through it, while `MainMenuScene` holds a
   * separate `SaveStores` for listing all three.
   *
   * The menu's copy is built once, when Phaser constructs the scene at boot,
   * and Phaser reuses scene instances across `start`. So the menu kept showing
   * the slots as they were at page load: play a level, come back, and the slot
   * still read "New game" until the page was reloaded and every instance was
   * rebuilt.
   *
   * Pending writes are flushed first rather than discarded — the menu itself
   * writes when a slot is deleted, and a reload that dropped that would turn a
   * display bug into a data-loss one.
   */
  reloadAll(): void {
    this.options.reload();
    for (const store of this.slots.values()) store.reload();
  }
}
