import { createEvent } from 'ics'

/**
 * Преобразуем задачу в .ics-событие и скачаем как файл.
 * Если у задачи есть start_time — это полноценное событие со временем.
 * Если только due_date — событие на весь день.
 */
export async function exportTaskToIcs(task) {
  if (!task.due_date) {
    alert('Чтобы экспортировать в календарь, у задачи должна быть дата.')
    return
  }

  const [y, m, d] = task.due_date.split('-').map(Number)

  let event
  if (task.start_time) {
    const start = new Date(task.start_time)
    const dur = task.end_time
      ? new Date(task.end_time).getTime() - start.getTime()
      : 60 * 60 * 1000
    event = {
      title: task.title,
      description: task.description || '',
      start: [
        start.getFullYear(),
        start.getMonth() + 1,
        start.getDate(),
        start.getHours(),
        start.getMinutes(),
      ],
      duration: { minutes: Math.max(15, Math.round(dur / 60000)) },
    }
  } else {
    event = {
      title: task.title,
      description: task.description || '',
      start: [y, m, d],
      duration: { days: 1 },
    }
  }

  const { error, value } = await new Promise((resolve) => {
    createEvent(event, (error, value) => resolve({ error, value }))
  })
  if (error) {
    console.error(error)
    alert('Не получилось создать файл календаря.')
    return
  }

  const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${task.title.replace(/[^\p{L}\p{N}_-]/giu, '_').slice(0, 40)}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
