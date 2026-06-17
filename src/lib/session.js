/**
 * Модуль-локальное хранилище текущего user_id.
 * AuthProvider обновляет его при изменении сессии.
 * useTasks читает синхронно — никаких async getSession() с гонками.
 */

let currentUserId = null
const listeners = new Set()

export function getCurrentUserId() {
  return currentUserId
}

export function setCurrentUserId(id) {
  if (currentUserId === id) return
  currentUserId = id
  for (const l of listeners) l(id)
}

export function onUserChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
