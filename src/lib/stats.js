import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  eachDayOfInterval,
} from 'date-fns'

export function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function inRange(dateStr, start, end) {
  if (!dateStr) return false
  return isWithinInterval(parseISO(dateStr), { start, end })
}

export function periodBounds(period) {
  const now = new Date()
  if (period === 'week') {
    return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
  }
  return { start: startOfMonth(now), end: endOfMonth(now) }
}

export function computeStats(tasks, period = 'week') {
  const { start, end } = periodBounds(period)

  const inPeriod = tasks.filter((t) => {
    const d = t.completed_at || t.due_date || t.created_at
    if (!d) return false
    return isWithinInterval(typeof d === 'string' ? parseISO(d.slice(0, 10)) : d, { start, end })
  })

  const created = tasks.filter((t) =>
    isWithinInterval(parseISO(t.created_at.slice(0, 10)), { start, end })
  ).length
  const completed = tasks.filter(
    (t) => t.completed_at && isWithinInterval(parseISO(t.completed_at.slice(0, 10)), { start, end })
  ).length
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length

  const byCategory = { work: { total: 0, done: 0 }, personal: { total: 0, done: 0 } }
  for (const t of inPeriod) {
    const cat = byCategory[t.category] || (byCategory[t.category] = { total: 0, done: 0 })
    cat.total += 1
    if (t.status === 'done') cat.done += 1
  }

  const byPriority = { high: 0, medium: 0, low: 0 }
  for (const t of inPeriod) {
    if (byPriority[t.priority] !== undefined) byPriority[t.priority] += 1
  }

  const days = eachDayOfInterval({ start, end }).map((d) => {
    const key = format(d, 'yyyy-MM-dd')
    const completedOnDay = tasks.filter(
      (t) => t.completed_at && t.completed_at.slice(0, 10) === key
    ).length
    return { date: key, label: format(d, 'EEEEEE'), count: completedOnDay }
  })

  const percent = created === 0 ? null : Math.round((completed / Math.max(created, 1)) * 100)

  return { created, completed, inProgress, percent, byCategory, byPriority, days }
}
