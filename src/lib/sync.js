import { db } from './db'
import { supabase, cloudEnabled } from './supabase'

const OUTBOX_KEY = 'kofe-outbox'
let realtimeChannel = null

// Видимый статус последнего pull — показывается в шапке.
const statusListeners = new Set()
const syncStatus = {
  lastPullCount: null,
  lastError: null,
  lastPullAt: null,
}
export function getSyncStatus() {
  return syncStatus
}
export function onSyncStatus(fn) {
  statusListeners.add(fn)
  return () => statusListeners.delete(fn)
}
function emitStatus(patch) {
  Object.assign(syncStatus, patch, { lastPullAt: new Date() })
  for (const l of statusListeners) l(syncStatus)
}

function loadOutbox() {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]')
  } catch {
    return []
  }
}
function saveOutbox(items) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items))
}
function pushOutbox(op) {
  const items = loadOutbox()
  items.push({ ...op, ts: Date.now() })
  saveOutbox(items)
}

export async function flushOutbox(userId) {
  if (!cloudEnabled || !userId || !navigator.onLine) return
  const items = loadOutbox()
  if (items.length === 0) return
  console.log('[sync] flushing outbox:', items.length)
  const remaining = []
  for (const op of items) {
    try {
      if (op.type === 'upsert') {
        const row = { ...op.task, user_id: userId }
        const { error } = await supabase.from('tasks').upsert(row)
        if (error) throw error
      } else if (op.type === 'delete') {
        const { error } = await supabase.from('tasks').delete().eq('id', op.id)
        if (error) throw error
      }
    } catch (e) {
      console.warn('[sync] outbox op failed, keep in queue', e)
      remaining.push(op)
    }
  }
  saveOutbox(remaining)
}

export async function remoteUpsert(task, userId) {
  if (!cloudEnabled) return
  if (!userId) {
    console.warn('[sync] upsert SKIPPED: no userId', task.id)
    pushOutbox({ type: 'upsert', task })
    return
  }
  const row = { ...task, user_id: userId }
  if (!navigator.onLine) {
    console.log('[sync] offline, queuing upsert', task.id)
    pushOutbox({ type: 'upsert', task: row })
    return
  }
  const { error } = await supabase.from('tasks').upsert(row)
  if (error) {
    console.error('[sync] upsert FAILED', error.message, error)
    pushOutbox({ type: 'upsert', task: row })
  } else {
    console.log('[sync] upsert OK', task.id, task.title)
  }
}

export async function remoteDelete(id) {
  if (!cloudEnabled) return
  if (!navigator.onLine) {
    pushOutbox({ type: 'delete', id })
    return
  }
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) {
    console.error('[sync] delete FAILED', error.message)
    pushOutbox({ type: 'delete', id })
  } else {
    console.log('[sync] delete OK', id)
  }
}

export async function initialSync(userId) {
  if (!cloudEnabled || !userId) return
  console.log('[sync] initialSync for user', userId)

  // локальные задачи без user_id или с чужим — присваиваем текущему и пушим
  const local = await db.tasks.toArray()
  const orphans = local.filter((t) => !t.user_id || t.user_id !== userId)
  if (orphans.length > 0) {
    console.log('[sync] adopting orphans:', orphans.length)
    const fixed = orphans.map((t) => ({ ...t, user_id: userId }))
    await db.tasks.bulkPut(fixed)
    if (navigator.onLine) {
      const { error } = await supabase.from('tasks').upsert(fixed)
      if (error) {
        console.error('[sync] orphan upsert failed:', error.message)
        for (const t of fixed) pushOutbox({ type: 'upsert', task: t })
      }
    } else {
      for (const t of fixed) pushOutbox({ type: 'upsert', task: t })
    }
  }

  await pullAll(userId)
  await flushOutbox(userId)
}

export async function pullAll(userId) {
  if (!cloudEnabled) {
    emitStatus({ lastError: 'Облако выключено (нет ключей)' })
    return
  }
  if (!userId) {
    emitStatus({ lastError: 'Нет userId — не залогинены' })
    return
  }
  if (!navigator.onLine) {
    emitStatus({ lastError: 'Нет интернета' })
    return
  }
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
  if (error) {
    console.error('[sync] pull FAILED:', error.message)
    emitStatus({ lastError: error.message })
    return
  }
  if (!data) {
    emitStatus({ lastError: 'Пустой ответ от облака', lastPullCount: 0 })
    return
  }
  emitStatus({ lastPullCount: data.length, lastError: null })

  const local = await db.tasks.toArray()
  const localById = new Map(local.map((t) => [t.id, t]))
  const toPut = []
  for (const remote of data) {
    const l = localById.get(remote.id)
    // Сравниваем по ISO-строкам, не через Date — Postgres хранит с микросекундами,
    // а JS Date режет до миллисекунд → каждый pull считал updated_at "новее" ложно.
    if (!l || remote.updated_at > l.updated_at) {
      toPut.push(remote)
    }
  }
  if (toPut.length) {
    await db.tasks.bulkPut(toPut)
    console.log('[sync] pulled', data.length, '/ applied', toPut.length)
  } else {
    console.log('[sync] pulled', data.length, '— нечего применять')
  }

  // НЕ удаляем локальные задачи, которых нет в облаке —
  // это могла быть только что созданная и не успевшая улететь задача.
  // Реальные удаления приходят через realtime DELETE-события и явные deleteTask.
}

export function subscribeRealtime(userId, onChange) {
  if (!cloudEnabled || !userId) return () => {}
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
  console.log('[sync] subscribing realtime for', userId)
  realtimeChannel = supabase
    .channel(`tasks:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
      async (payload) => {
        console.log('[sync] realtime event', payload.eventType, payload.new?.id || payload.old?.id)
        if (payload.eventType === 'DELETE') {
          await db.tasks.delete(payload.old.id)
        } else {
          const remote = payload.new
          const local = await db.tasks.get(remote.id)
          if (!local || remote.updated_at > local.updated_at) {
            await db.tasks.put(remote)
          }
        }
        onChange?.()
      }
    )
    .subscribe((status) => {
      console.log('[sync] realtime status:', status)
    })

  return () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }
}

export async function clearLocal() {
  await db.tasks.clear()
  localStorage.removeItem(OUTBOX_KEY)
}
