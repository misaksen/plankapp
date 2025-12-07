import { openDB } from 'idb'
import type { SessionRecord } from '../types/session'

const DB_NAME = 'plank-tracker'
const DB_VERSION = 1
const STORE = 'sessions'

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE, { keyPath: 'id' })
    }
  },
})

export async function loadSessions(): Promise<SessionRecord[]> {
  return (await dbPromise).getAll(STORE)
}

export async function saveSession(record: SessionRecord) {
  return (await dbPromise).put(STORE, record)
}

export async function clearSessions() {
  return (await dbPromise).clear(STORE)
}
