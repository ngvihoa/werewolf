import { useSyncExternalStore } from 'react'

const SESSION_STORAGE_KEY = 'werewolf.local-session'
const SESSION_CHANGED_EVENT = 'werewolf:session-changed'

export function useLocalSession() {
  const sessionToken = useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  )

  return {
    sessionToken,
    saveSession: (token: string) => {
      window.localStorage.setItem(SESSION_STORAGE_KEY, token)
      window.dispatchEvent(new Event(SESSION_CHANGED_EVENT))
    },
    leaveSession: () => {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
      window.dispatchEvent(new Event(SESSION_CHANGED_EVENT))
    },
  }
}

function subscribeToSession(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(SESSION_CHANGED_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(SESSION_CHANGED_EVENT, onStoreChange)
  }
}

function getSessionSnapshot() {
  return window.localStorage.getItem(SESSION_STORAGE_KEY)
}

function getServerSessionSnapshot() {
  return null
}
