import { db } from './db'

/**
 * Скачивает все задачи как JSON-файл.
 * Паттерн скачивания — из calendar.js (Blob → URL → <a>).
 */
export async function exportBackup(userEmail = '') {
  const tasks = await db.tasks.toArray()
  const payload = {
    version: 1,
    app: 'vysota',
    exported_at: new Date().toISOString(),
    user_email: userEmail,
    task_count: tasks.length,
    tasks,
  }
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `vysota-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  localStorage.setItem('vysota-last-backup', new Date().toISOString())
  return tasks.length
}
