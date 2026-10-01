import { useEffect, useState, useSyncExternalStore } from 'react'

const SESSION_STORAGE_KEY = 'werewolf.local-session'
const SESSION_CHANGED_EVENT = 'werewolf:session-changed'

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

/**
 * Trong lần render hydration, useSyncExternalStore trả về server snapshot
 * (null) nên mọi gate kiểu "không có token thì đá về /" đều chạy nhầm nếu
 * đánh giá trước khi hydration xong. Hook này chặn gate đó tới khi mount.
 */
export function useIsHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}

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
