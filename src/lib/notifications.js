/**
 * Движок браузерных уведомлений для "Высоты".
 *
 * reminder_at хранит JSON-массив смещений в минутах: "[30,5]"
 * = напомнить за 30 мин и за 5 мин до start_time задачи.
 */

const timers = new Map() // `${taskId}-${mins}` → timer id

export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function hasPermission() {
  return 'Notification' in window && Notification.permission === 'granted'
}

function showNotification(task, minsLeft) {
  if (!hasPermission()) return
  const body = minsLeft === 0
    ? task.title
    : `через ${minsLeft < 60 ? `${minsLeft} мин` : '1 час'} — ${task.title}`
  const iconUrl = `${import.meta.env.BASE_URL}icons/icon-192.png`.replace('//', '/')
  const n = new Notification('Высота', {
    body,
    icon: iconUrl,
    badge: iconUrl,
    tag: `task-${task.id}-${minsLeft}`,
    renotify: true,
  })
  n.onclick = () => { window.focus(); n.close() }
}

function parseOffsets(reminderAt) {
  if (!reminderAt) return []
  try {
    const parsed = JSON.parse(reminderAt)
    if (Array.isArray(parsed)) return parsed.filter(Number.isFinite)
  } catch {}
  return []
}

export function scheduleReminders(tasks) {
  const now = Date.now()
  const active = new Set()

  for (const task of tasks) {
    if (task.status === 'done' || !task.start_time || !task.reminder_at) continue
    const offsets = parseOffsets(task.reminder_at)
    if (offsets.length === 0) continue

    // Парсим время без new Date() — Safari трактует строку без TZ как UTC
    // и даёт неправильный timestamp. Берём дату и время напрямую из строки.
    const [datePart, timePart] = task.start_time.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = (timePart || '00:00').split(':').map(Number)
    const startMs = new Date(year, month - 1, day, hour, minute, 0).getTime()

    for (const mins of offsets) {
      const key = `${task.id}-${mins}`
      active.add(key)
      const fireAt = startMs - mins * 60_000
      const delay = fireAt - now

      // Уже прошло или дальше 24 часов
      if (delay <= 0 || delay > 24 * 60 * 60 * 1000) continue

      // Таймер уже стоит и совпадает
      const existing = timers.get(key)
      if (existing?.fireAt === fireAt) continue

      // Сбрасываем старый и ставим новый
      if (existing) clearTimeout(existing.timerId)
      const timerId = setTimeout(() => {
        showNotification(task, mins)
        timers.delete(key)
      }, delay)
      timers.set(key, { timerId, fireAt })
    }
  }

  // Убираем таймеры задач которых больше нет
  for (const [key, { timerId }] of timers.entries()) {
    if (!active.has(key)) {
      clearTimeout(timerId)
      timers.delete(key)
    }
  }
}

export function cancelReminder(taskId) {
  for (const [key, { timerId }] of timers.entries()) {
    if (key.startsWith(`${taskId}-`)) {
      clearTimeout(timerId)
      timers.delete(key)
    }
  }
}

export function cancelAll() {
  for (const { timerId } of timers.values()) clearTimeout(timerId)
  timers.clear()
}
