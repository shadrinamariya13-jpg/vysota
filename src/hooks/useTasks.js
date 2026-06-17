import { useLiveQuery } from 'dexie-react-hooks'
import { db, emptyTask } from '../lib/db'
import { generateOccurrences } from '../lib/recurrence'
import { remoteUpsert, remoteDelete } from '../lib/sync'
import { getCurrentUserId } from '../lib/session'

function nowIso() {
  return new Date().toISOString()
}

export function useAllTasks() {
  return useLiveQuery(() => db.tasks.orderBy('created_at').reverse().toArray(), [], [])
}

export function useTasksByStatus(status) {
  return useLiveQuery(
    () => db.tasks.where('status').equals(status).sortBy('position'),
    [status],
    []
  )
}

export function useTasksByDate(dateStr) {
  return useLiveQuery(
    () => db.tasks.where('due_date').equals(dateStr).toArray(),
    [dateStr],
    []
  )
}

export async function createTask(partial) {
  const userId = getCurrentUserId()
  const base = emptyTask({ ...partial, user_id: userId })
  let series = [base]
  if (base.recurrence && base.recurrence !== 'none' && base.due_date) {
    series = generateOccurrences(base).map((t) => ({ ...t, user_id: userId }))
  }
  console.log('[tasks] create', { userId, count: series.length, title: base.title })
  await db.tasks.bulkPut(series)
  for (const t of series) remoteUpsert(t, userId)
  return base
}

export async function updateTask(id, patch) {
  const userId = getCurrentUserId()
  const patched = { ...patch, updated_at: nowIso() }
  await db.tasks.update(id, patched)
  const full = await db.tasks.get(id)
  if (full) {
    // если задача без user_id (создана до логина), проставим текущий
    if (!full.user_id && userId) {
      full.user_id = userId
      await db.tasks.update(id, { user_id: userId })
    }
    remoteUpsert(full, userId)
  }
}

export async function deleteTask(id) {
  await db.tasks.delete(id)
  remoteDelete(id)
}

export async function deleteSeries(parentId) {
  const series = await db.tasks
    .where('parent_recurrence_id')
    .equals(parentId)
    .or('id')
    .equals(parentId)
    .toArray()
  const ids = series.map((t) => t.id)
  await db.tasks.bulkDelete(ids)
  for (const id of ids) remoteDelete(id)
}

export async function toggleDone(task) {
  const isDone = task.status === 'done'
  await updateTask(task.id, {
    status: isDone ? 'todo' : 'done',
    completed_at: isDone ? null : nowIso(),
  })
}

export async function moveTask(id, status, position) {
  await updateTask(id, {
    status,
    position,
    completed_at: status === 'done' ? nowIso() : null,
  })
}
