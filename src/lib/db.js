import Dexie from 'dexie'

export const db = new Dexie('vysota')

// v1 — оригинальная схема
db.version(1).stores({
  tasks: 'id, status, category, priority, due_date, position, created_at, completed_at, parent_recurrence_id',
})

// v2 — добавили индекс user_id для облака
db.version(2).stores({
  tasks: 'id, status, category, priority, due_date, position, created_at, completed_at, parent_recurrence_id, user_id',
})

export const CATEGORIES = [
  { id: 'work', label: 'Работа', color: 'olive' },
  { id: 'personal', label: 'Личное', color: 'terracotta' },
]

export const PRIORITIES = [
  { id: 'high', label: 'Высокий', color: 'terracotta' },
  { id: 'medium', label: 'Средний', color: 'gold' },
  { id: 'low', label: 'Низкий', color: 'coffee-light' },
]

export const STATUSES = [
  { id: 'todo', label: 'Сделать' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'done', label: 'Готово' },
]

export const RECURRENCES = [
  { id: 'none', label: 'Не повторять' },
  { id: 'daily', label: 'Ежедневно' },
  { id: 'weekdays', label: 'По будням' },
  { id: 'weekly', label: 'Еженедельно' },
  { id: 'monthly', label: 'Ежемесячно' },
]

/**
 * Безопасный UUID v4.
 * crypto.randomUUID() требует secure context (https или localhost),
 * а на iPhone мы открываем по http://192.168.x.x — там оно падает.
 * Поэтому делаем свой, используя crypto.getRandomValues (работает везде).
 */
export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID()
    } catch {
      /* fallthrough */
    }
  }
  const buf = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf)
  } else {
    for (let i = 0; i < 16; i++) buf[i] = Math.floor(Math.random() * 256)
  }
  buf[6] = (buf[6] & 0x0f) | 0x40
  buf[8] = (buf[8] & 0x3f) | 0x80
  const hex = []
  for (let i = 0; i < 16; i++) hex.push(buf[i].toString(16).padStart(2, '0'))
  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10, 16).join('')
  )
}

export function emptyTask(overrides = {}) {
  const now = new Date().toISOString()
  return {
    id: newId(),
    user_id: null,
    title: '',
    description: '',
    category: 'personal',
    priority: 'medium',
    status: 'todo',
    due_date: null,        // YYYY-MM-DD
    start_time: null,      // ISO с временем (для встреч)
    end_time: null,
    recurrence: 'none',
    recurrence_end: null,
    parent_recurrence_id: null,
    reminder_at: null,
    position: 0,
    created_at: now,
    updated_at: now,
    completed_at: null,
    ...overrides,
  }
}
