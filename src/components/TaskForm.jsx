import { useEffect, useRef, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { addWeeks, addMonths, format } from 'date-fns'
import { CATEGORIES, PRIORITIES, RECURRENCES, emptyTask } from '../lib/db'
import { createTask, updateTask, deleteTask, deleteSeries } from '../hooks/useTasks'

// Разбирает reminder_at: может быть JSON-массив "[30,5]" или старый ISO-формат
export function parseReminderMinutes(reminderAt) {
  if (!reminderAt) return []
  try {
    const parsed = JSON.parse(reminderAt)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return [] // старый ISO-формат игнорируем
}

const RECURRENCE_END_PRESETS = [
  { label: '2 недели', fn: (d) => addWeeks(d, 2) },
  { label: '1 месяц', fn: (d) => addMonths(d, 1) },
  { label: '3 месяца', fn: (d) => addMonths(d, 3) },
  { label: '6 месяцев', fn: (d) => addMonths(d, 6) },
]

function buildInitial(initial) {
  if (initial && initial.id) return initial
  return emptyTask(initial || {})
}

// Цветовые схемы для активных чипов
const CATEGORY_ACTIVE = {
  work: 'bg-olive text-white border-olive shadow-soft',
  personal: 'bg-terracotta text-white border-terracotta shadow-soft',
}

const PRIORITY_ACTIVE = {
  high: 'bg-terracotta text-white border-terracotta shadow-soft',
  medium: 'bg-gold text-white border-gold shadow-gold',
  low: 'bg-coffee-light text-white border-coffee-light shadow-soft',
}

export default function TaskForm({ initial, onClose }) {
  const [task, setTask] = useState(() => buildInitial(initial))
  const isEdit = !!(initial && initial.id)
  const titleRef = useRef(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // на iOS Safari автофокус с виртуальной клавиатурой иногда ломает скролл —
    // фокусируем без скролла
    titleRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // блокируем скролл фона пока модалка открыта
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const set = (patch) => setTask((t) => ({ ...t, ...patch }))

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!task.title.trim() || busy) return
    if (task.recurrence !== 'none' && !task.due_date) {
      alert('Для повторяющейся задачи нужно выбрать дату — с какого дня начать.')
      return
    }
    setBusy(true)
    try {
      if (isEdit) {
        const { id, created_at, ...patch } = task
        await updateTask(id, patch)
      } else {
        await createTask(task)
      }
      onClose()
    } catch (err) {
      console.error(err)
      alert('Не получилось сохранить задачу. Подробности в консоли.')
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!isEdit) return
    if (task.parent_recurrence_id || task.recurrence !== 'none') {
      const parentId = task.parent_recurrence_id || task.id
      if (confirm('Удалить все повторения этой задачи?')) {
        await deleteSeries(parentId)
        onClose()
      }
    } else {
      if (confirm('Удалить задачу?')) {
        await deleteTask(task.id)
        onClose()
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-coffee-dark/30 backdrop-blur-sm"
      onMouseDown={(e) => {
        // закрываем только если кликнули по фону, а не по форме
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handleSave}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full md:max-w-lg bg-cream-bg rounded-t-3xl md:rounded-xl2 shadow-soft border-t md:border border-cream-border flex flex-col"
        style={{ maxHeight: '92dvh' }}
      >
        {/* шапка */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
          <h2 className="font-display text-xl text-coffee-dark">
            {isEdit ? 'Редактировать' : 'Новая задача'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-coffee-mid hover:bg-cream-deep -mr-2"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4 overflow-y-auto flex-1">
          <input
            ref={titleRef}
            className="input text-base"
            placeholder="Что нужно сделать?"
            value={task.title}
            onChange={(e) => set({ title: e.target.value })}
            required
          />

          <Field label="Категория">
            <div className="flex gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => set({ category: c.id })}
                  className={chipClass(task.category === c.id, CATEGORY_ACTIVE[c.id])}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Приоритет">
            <div className="flex gap-2 flex-wrap">
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set({ priority: p.id })}
                  className={chipClass(task.priority === p.id, PRIORITY_ACTIVE[p.id])}
                >
                  <span
                    className={[
                      'w-2 h-2 rounded-full',
                      task.priority === p.id
                        ? 'bg-white'
                        : p.id === 'high'
                          ? 'bg-terracotta'
                          : p.id === 'medium'
                            ? 'bg-gold'
                            : 'bg-coffee-light',
                    ].join(' ')}
                  />
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Дата">
              <input
                type="date"
                className="input"
                value={task.due_date || ''}
                onChange={(e) => set({ due_date: e.target.value || null })}
              />
            </Field>
            <Field label="Время (опц.)">
              <input
                type="time"
                className="input"
                value={task.start_time ? task.start_time.slice(11, 16) : ''}
                onChange={(e) => {
                  const v = e.target.value
                  if (!v || !task.due_date) {
                    set({ start_time: null })
                    return
                  }
                  set({ start_time: `${task.due_date}T${v}:00` })
                }}
                disabled={!task.due_date}
              />
            </Field>
          </div>

          {task.start_time && (
            <Field label="Напомнить до начала">
              <div className="flex flex-wrap gap-2">
                {[5, 10, 30, 60].map((mins) => {
                  const selected = parseReminderMinutes(task.reminder_at)
                  const isActive = selected.includes(mins)
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        const current = parseReminderMinutes(task.reminder_at)
                        const next = isActive
                          ? current.filter((m) => m !== mins)
                          : [...current, mins].sort((a, b) => b - a)
                        set({ reminder_at: next.length ? JSON.stringify(next) : null })
                      }}
                      className={chipClass(isActive, 'bg-gold text-white border-gold')}
                    >
                      {mins < 60 ? `${mins} мин` : '1 час'}
                    </button>
                  )
                })}
              </div>
              {parseReminderMinutes(task.reminder_at).length > 0 && (
                <p className="text-xs text-olive mt-1.5">
                  ✓ Напоминание придёт за {parseReminderMinutes(task.reminder_at).map(m => m < 60 ? `${m} мин` : '1 час').join(' и ')}
                </p>
              )}
            </Field>
          )}

          {!isEdit && (
            <Field label="Повторение">
              <select
                className="input"
                value={task.recurrence}
                onChange={(e) => set({ recurrence: e.target.value, recurrence_end: null })}
              >
                {RECURRENCES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              {task.recurrence !== 'none' && !task.due_date && (
                <p className="text-xs text-terracotta mt-1">
                  Не забудьте выбрать дату — повторы начнутся с неё
                </p>
              )}
            </Field>
          )}

          {!isEdit && task.recurrence !== 'none' && (
            <Field label="Повторять до...">
              <div className="flex flex-wrap gap-2 mb-2">
                {RECURRENCE_END_PRESETS.map((p) => {
                  const base = task.due_date ? new Date(task.due_date) : new Date()
                  const val = format(p.fn(base), 'yyyy-MM-dd')
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => set({ recurrence_end: val })}
                      className={chipClass(task.recurrence_end === val, 'bg-gold text-white border-gold')}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
              <input
                type="date"
                className="input text-sm"
                placeholder="Своя дата"
                value={task.recurrence_end || ''}
                min={task.due_date || undefined}
                onChange={(e) => set({ recurrence_end: e.target.value || null })}
              />
              {!task.recurrence_end && (
                <p className="text-xs text-coffee-light mt-1">
                  Если не выбрать — создастся 90 копий вперёд
                </p>
              )}
              {task.recurrence_end && (
                <p className="text-xs text-olive mt-1">
                  ✓ Повторы закончатся {new Date(task.recurrence_end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </Field>
          )}

          <Field label="Заметка (опц.)">
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Детали, ссылки, мысли..."
              value={task.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
        </div>

        {/* подвал — обычный, без sticky чтоб на iOS Safari работало надёжно */}
        <div
          className="px-5 py-4 border-t border-cream-border bg-cream-surface/50 flex items-center justify-between gap-3 shrink-0"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              className="text-terracotta text-sm flex items-center gap-1.5 px-2 py-1 hover:bg-terracotta/10 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
              Удалить
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy || !task.title.trim()}
              className="btn-gold disabled:opacity-50"
            >
              {isEdit ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-coffee-mid mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  )
}

function chipClass(active, activeStyle) {
  return [
    'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition',
    active
      ? activeStyle || 'bg-gold text-white border-gold'
      : 'bg-cream-surface border-cream-border text-coffee-mid hover:bg-cream-deep',
  ].join(' ')
}
