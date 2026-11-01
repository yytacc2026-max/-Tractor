// Multi-layer Save Game Persistence for Desktop (.exe / Electron / Portable) & Web
// Ensures save slots survive closing and reopening a portable .exe build!

export const SAVE_STORAGE_KEY = 'etatractor_save_slots_v1';
const IDB_NAME = 'etatractor_desktop_db';
const IDB_STORE = 'save_slots_store';

// 1. Direct Node/Electron FileSystem access (works when nodeIntegration: true in Electron .exe)
function getDesktopFsPath(): { fs: any; saveDir: string; saveFile: string } | null {
  try {
    const win = window as unknown as { require?: (mod: string) => any };
    if (typeof win.require === 'function') {
      const fs = win.require('fs');
      const path = win.require('path');
      const os = win.require('os');
      const saveDir = path.join(os.homedir(), '.etatractor');
      const saveFile = path.join(saveDir, 'save_slots.json');
      return { fs, saveDir, saveFile };
    }
  } catch {
    // Not running with direct window.require
  }
  return null;
}

export function readSyncSaveSlots<T extends { timestamp?: number }>(): Record<string, T> {
  let merged: Record<string, T> = {};

  // Layer A: Read from localStorage
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        delete parsed.autosave;
        merged = { ...merged, ...parsed };
      }
    }
  } catch {
    // ignore
  }

  // Layer B: Read synchronously from User Home Directory if running in Electron with nodeIntegration
  const desktopFs = getDesktopFsPath();
  if (desktopFs) {
    try {
      if (desktopFs.fs.existsSync(desktopFs.saveFile)) {
        const rawDisk = desktopFs.fs.readFileSync(desktopFs.saveFile, 'utf-8');
        const parsedDisk = JSON.parse(rawDisk);
        if (parsedDisk && typeof parsedDisk === 'object') {
          delete parsedDisk.autosave;
          for (const key of Object.keys(parsedDisk)) {
            const diskSlot = parsedDisk[key];
            const curSlot = merged[key];
            if (!curSlot || (diskSlot?.timestamp || 0) >= (curSlot?.timestamp || 0)) {
              merged[key] = diskSlot;
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return merged;
}

// Layer C: IndexedDB helper
function readIndexedDBSlots<T>(): Promise<Record<string, T>> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve({});
        return;
      }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const getReq = store.get(SAVE_STORAGE_KEY);
          getReq.onsuccess = () => {
            const res = getReq.result;
            resolve(res && typeof res === 'object' ? res : {});
          };
          getReq.onerror = () => resolve({});
        } catch {
          resolve({});
        }
      };
      req.onerror = () => resolve({});
    } catch {
      resolve({});
    }
  });
}

function writeIndexedDBSlots<T>(slots: Record<string, T>): void {
  try {
    if (typeof indexedDB === 'undefined') return;
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => {
      try {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(slots, SAVE_STORAGE_KEY);
      } catch {
        // ignore
      }
    };
  } catch {
    // ignore
  }
}

// Async load & merge across all storage backends (Disk API, Electron FS, IndexedDB, localStorage)
export async function loadAllPersistedSaveSlots<T extends { timestamp?: number }>(): Promise<Record<string, T>> {
  const current = readSyncSaveSlots<T>();

  // 1. Check IndexedDB
  const idbSlots = await readIndexedDBSlots<T>();
  for (const key of Object.keys(idbSlots)) {
    if (key === 'autosave') continue;
    const candidate = idbSlots[key];
    const existing = current[key];
    if (!existing || (candidate?.timestamp || 0) >= (existing?.timestamp || 0)) {
      current[key] = candidate;
    }
  }

  // 2. Check Server Disk File (/api/saves -> ~/.etatractor/save_slots.json)
  try {
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      const resp = await fetch('/api/saves');
      if (resp.ok) {
        const data = await resp.json();
        const diskSlots = data?.slots;
        if (diskSlots && typeof diskSlots === 'object') {
          for (const key of Object.keys(diskSlots)) {
            if (key === 'autosave') continue;
            const candidate = diskSlots[key];
            const existing = current[key];
            if (!existing || (candidate?.timestamp || 0) >= (existing?.timestamp || 0)) {
              current[key] = candidate;
            }
          }
        }
      }
    }
  } catch {
    // Offline or file:// protocol without Express server
  }

  // Sync merged result back so all layers are up-to-date
  if (Object.keys(current).length > 0) {
    persistSaveSlotsEverywhere(current);
  }

  return current;
}

// Save slots to ALL persistence layers (localStorage + Electron Home Dir + IndexedDB + Server Disk API)
export function persistSaveSlotsEverywhere<T>(slots: Record<string, T>): void {
  const cleanSlots = { ...slots };
  delete (cleanSlots as Record<string, unknown>).autosave;
  const serialized = JSON.stringify(cleanSlots);

  // 1. Browser localStorage
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, serialized);
  } catch {
    // ignore
  }

  // 2. IndexedDB
  writeIndexedDBSlots(cleanSlots);

  // 3. Direct Electron/Node Home Directory (~/.etatractor/save_slots.json)
  const desktopFs = getDesktopFsPath();
  if (desktopFs) {
    try {
      if (!desktopFs.fs.existsSync(desktopFs.saveDir)) {
        desktopFs.fs.mkdirSync(desktopFs.saveDir, { recursive: true });
      }
      desktopFs.fs.writeFileSync(desktopFs.saveFile, JSON.stringify(cleanSlots, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  // 4. Backend Disk File API (/api/saves -> ~/.etatractor/save_slots.json)
  try {
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      void fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: cleanSlots }),
      }).catch(() => {});
    }
  } catch {
    // ignore
  }
}
