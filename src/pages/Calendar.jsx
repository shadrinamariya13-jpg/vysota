import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Plus,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import TaskCard from '../components/TaskCard'
import { useTaskForm } from '../components/TaskFormContext'
import { useAllTasks } from '../hooks/useTasks'
import { exportTaskToIcs } from '../lib/calendar'

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function pad(n) {
  return String(n).padStart(2, '0')
}
function dateKey(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
  const days = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d)
  while (days.length % 7 !== 0) days.push(null)
  return days
}

export default function Calendar() {
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState(
    dateKey(today.getFullYear(), today.getMonth(), today.getDate())
  )
  const tasks = useAllTasks()
  const { openCreate } = useTaskForm()

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate())

  const byDate = useMemo(() => {
    const map = new Map()
    for (const t of tasks) {
      if (!t.due_date) continue
      if (!map.has(t.due_date)) map.set(t.due_date, [])
      map.get(t.due_date).push(t)
    }
    return map
  }, [tasks])

  const days = buildMonthGrid(cursor.year, cursor.month)
  const monthName = new Date(cursor.year, cursor.month, 1).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })

  const goto = (delta) => {
    let m = cursor.month + delta
    let y = cursor.year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setCursor({ year: y, month: m })
  }

  const selectedTasks = byDate.get(selected) || []

  return (
    <>
      <PageHeader title="Календарь" subtitle="Задачи по датам" />

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-coffee-dark capitalize">{monthName}</h3>
          <div className="flex items-center gap-1">
            <button className="btn-ghost p-2" onClick={() => goto(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                setCursor({ year: today.getFullYear(), month: today.getMonth() })
                setSelected(todayKey)
              }}
            >
              Сегодня
            </button>
            <button className="btn-ghost p-2" onClick={() => goto(1)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Заголовки дней недели */}
        <div className="grid grid-cols-7 gap-1 mb-3">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-display font-medium text-coffee-mid py-1 tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Ячейки дней */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            if (d === null) return <div key={i} className="aspect-square" />
            const key = dateKey(cursor.year, cursor.month, d)
            const isToday = key === todayKey
            const isSelected = key === selected
            const dayTasks = byDate.get(key) || []
            const hasWork = dayTasks.some((t) => t.category === 'work')
            const hasPersonal = dayTasks.some((t) => t.category === 'personal')
            const isWeekend = new Date(cursor.year, cursor.month, d).getDay() % 6 === 0

            return (
              <button
                key={i}
                onClick={() => setSelected(key)}
                className={[
                  'aspect-square rounded-xl2 flex flex-col items-center justify-center transition-all',
                  isSelected
                    ? 'bg-gold text-white shadow-gold scale-105'
                    : isToday
                      ? 'ring-2 ring-gold/50 text-gold font-semibold bg-cream-surface'
                      : isWeekend
                        ? 'text-coffee-light bg-cream-bg hover:bg-cream-deep'
                        : 'text-coffee-dark bg-cream-bg hover:bg-cream-deep',
                ].join(' ')}
              >
                <span className="font-display text-sm leading-none">{d}</span>
                {dayTasks.length > 0 && (
                  <span className="flex gap-0.5 mt-1">
                    {hasWork && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : 'bg-olive'}`} />
                    )}
                    {hasPersonal && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : 'bg-terracotta'}`} />
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg text-coffee-dark">
            {new Date(selected).toLocaleDateString('ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h3>
          <button
            onClick={() => openCreate({ due_date: selected })}
            className="btn-ghost text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Добавить
          </button>
        </div>

        {selectedTasks.length === 0 ? (
          <div className="card p-8 text-center text-coffee-mid text-sm">
            На этот день задач нет
          </div>
        ) : (
          <div className="space-y-2">
            {selectedTasks.map((t) => (
              <div key={t.id} className="relative group">
                <TaskCard task={t} />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    exportTaskToIcs(t)
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-cream-bg/90 backdrop-blur-sm border border-cream-border rounded-lg p-1.5 text-coffee-mid hover:text-gold hover:border-gold/40"
                  title="Скачать .ics для Календаря iPhone"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
