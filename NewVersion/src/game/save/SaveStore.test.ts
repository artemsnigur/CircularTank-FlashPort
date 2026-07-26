import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MemoryBackend,
  OPTIONS_STORE,
  SaveStore,
  SaveStores,
  saveSlotStoreName,
} from './SaveStore';

let backend: MemoryBackend;

beforeEach(() => {
  backend = new MemoryBackend();
});

describe('store names', () => {
  it('preserves the AS3 SharedObject names', () => {
    expect(OPTIONS_STORE).toBe('CircularTankOptions');
    expect(saveSlotStoreName(1)).toBe('CircularTankSave1');
    expect(saveSlotStoreName(3)).toBe('CircularTankSave3');
  });

  it('rejects a slot outside 1-3', () => {
    expect(() => saveSlotStoreName(0)).toThrow(RangeError);
    expect(() => saveSlotStoreName(4)).toThrow(RangeError);
  });
});

describe('SaveStore', () => {
  it('reads back what it wrote after a flush', () => {
    const store = new SaveStore('s', backend);
    store.set('money', 1200);
    expect(store.flush()).toBe(true);

    const reopened = new SaveStore('s', backend);
    expect(reopened.get('money', 0)).toBe(1200);
  });

  it('does not persist until flushed', () => {
    const store = new SaveStore('s', backend);
    store.set('money', 1200);
    expect(new SaveStore('s', backend).get('money', 0)).toBe(0);
  });

  it('preserves arrays and booleans across a round trip', () => {
    // SharedObject stored typed AMF; JSON has to carry the same shapes.
    const store = new SaveStore('s', backend);
    store.set('levelsArray', [0, 3, 10]);
    store.set('soundOn', false);
    store.set('equipped', ['Cannon', 'Shotgun']);
    store.flush();

    const reopened = new SaveStore('s', backend);
    expect(reopened.get('levelsArray', [])).toEqual([0, 3, 10]);
    expect(reopened.get('soundOn', true)).toBe(false);
    expect(reopened.get('equipped', [])).toEqual(['Cannon', 'Shotgun']);
  });

  it('returns the fallback for a missing key', () => {
    expect(new SaveStore('s', backend).get('nope', 42)).toBe(42);
  });

  it('distinguishes a stored false from a missing key', () => {
    const store = new SaveStore('s', backend);
    store.set('flag', false);
    expect(store.get('flag', true)).toBe(false);
    expect(store.has('flag')).toBe(true);
    expect(store.has('other')).toBe(false);
  });

  it('reports emptiness, which the AS3 tests via `data.x == undefined`', () => {
    const store = new SaveStore('s', backend);
    expect(store.isEmpty).toBe(true);
    store.set('x', 1);
    expect(store.isEmpty).toBe(false);
  });

  it('clears both memory and storage', () => {
    const store = new SaveStore('s', backend);
    store.set('x', 1);
    store.flush();
    store.clear();

    expect(store.isEmpty).toBe(true);
    expect(new SaveStore('s', backend).isEmpty).toBe(true);
  });

  it('deletes individual keys', () => {
    const store = new SaveStore('s', backend);
    store.set('x', 1);
    store.delete('x');
    store.flush();
    expect(new SaveStore('s', backend).has('x')).toBe(false);
  });

  it('resets rather than throwing when the stored entry is corrupt', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    backend.write('s', '{not json');

    const store = new SaveStore('s', backend);
    expect(store.isEmpty).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('resets when the stored entry is valid JSON but not an object', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    backend.write('s', '[1,2,3]');
    expect(new SaveStore('s', backend).isEmpty).toBe(true);
    warn.mockRestore();
  });

  it('returns false instead of throwing when the backend rejects a write', () => {
    // Quota exhaustion. Every AS3 caller treats saving as best-effort, so a
    // failed flush must not take the game down.
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failing = {
      read: () => null,
      write: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
      remove: () => undefined,
    };

    const store = new SaveStore('s', failing);
    store.set('x', 1);
    expect(store.flush()).toBe(false);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('treats a flush with no changes as a no-op success', () => {
    const store = new SaveStore('s', backend);
    expect(store.flush()).toBe(true);
    expect(backend.entries.has('s')).toBe(false);
  });
});

describe('SaveStores', () => {
  it('opens the options store plus three independent slots', () => {
    const stores = new SaveStores(backend);
    stores.slot(1).set('money', 10);
    stores.slot(2).set('money', 20);
    stores.flushAll();

    const reopened = new SaveStores(backend);
    expect(reopened.slot(1).get('money', 0)).toBe(10);
    expect(reopened.slot(2).get('money', 0)).toBe(20);
    expect(reopened.slot(3).isEmpty).toBe(true);
  });

  it('returns the same instance for repeated slot access', () => {
    const stores = new SaveStores(backend);
    expect(stores.slot(1)).toBe(stores.slot(1));
  });

  it('keeps options separate from slot data', () => {
    const stores = new SaveStores(backend);
    stores.options.set('soundVol', 0.5);
    stores.slot(1).set('soundVol', 0.1);
    stores.flushAll();

    const reopened = new SaveStores(backend);
    expect(reopened.options.get('soundVol', 1)).toBe(0.5);
    expect(reopened.slot(1).get('soundVol', 1)).toBe(0.1);
  });

  it('reports an untouched slot as empty', () => {
    expect(new SaveStores(backend).slotIsEmpty(2)).toBe(true);
  });
});
