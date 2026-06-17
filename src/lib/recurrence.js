import { addDays, addWeeks, addMonths, parseISO, format, isAfter, isBefore } from 'date-fns'
import { emptyTask, newId } from './db'

/**
 * Сгенерировать копии задачи по правилу повторения.
 * Возвращает массив задач (включая исходную) с разными due_date.
 * Первая копия — это сам template (parent_recurrence_id = null).
 * Остальные ссылаются на template через parent_recurrence_id.
 */
export function generateOccurrences(template, untilDateStr) {
  if (!template.due_date || template.recurrence === 'none') {
    return [template]
  }
  const start = parseISO(template.due_date)
  const until = untilDateStr ? parseISO(untilDateStr) : addDays(start, 90)
  const tasks = [template]
  const parentId = template.id

  const step = (d) => {
    switch (template.recurrence) {
      case 'daily':
        return addDays(d, 1)
      case 'weekdays': {
        let next = addDays(d, 1)
        while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1)
        return next
      }
      case 'weekly':
        return addWeeks(d, 1)
      case 'monthly':
        return addMonths(d, 1)
      default:
        return null
    }
  }

  let cursor = step(start)
  while (cursor && !isAfter(cursor, until)) {
    if (template.recurrence_end && isAfter(cursor, parseISO(template.recurrence_end))) break
    const due = format(cursor, 'yyyy-MM-dd')
    tasks.push(
      emptyTask({
        ...template,
        id: newId(),
        due_date: due,
        parent_recurrence_id: parentId,
        completed_at: null,
        status: 'todo',
      })
    )
    cursor = step(cursor)
  }
  return tasks
}
