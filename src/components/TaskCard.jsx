import { Check, Briefcase, Heart, Clock, RotateCcw } from 'lucide-react'
import { useTaskForm } from './TaskFormContext'
import { toggleDone } from '../hooks/useTasks'

function categoryStyle(c) {
  if (c === 'work') return { Icon: Briefcase, ring: 'ring-olive/30', tone: 'text-olive' }
  return { Icon: Heart, ring: 'ring-terracotta/30', tone: 'text-terracotta' }
}

function priorityDot(p) {
  if (p === 'high') return 'bg-terracotta'
  if (p === 'medium') return 'bg-gold'
  return 'bg-coffee-light'
}

function formatTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function TaskCard({ task, compact = false }) {
  const { openEdit } = useTaskForm()
  const { Icon, tone } = categoryStyle(task.category)
  const done = task.status === 'done'
  const time = formatTime(task.start_time)
  const isRecurring = task.recurrence !== 'none' || task.parent_recurrence_id

  return (
    <div
      className={[
        'group card p-3.5 hover:shadow-soft transition cursor-pointer',
        done && 'opacity-60',
      ].filter(Boolean).join(' ')}
      onClick={() => openEdit(task)}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleDone(task)
          }}
          className={[
            'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition',
            done
              ? 'bg-olive border-olive text-white'
              : 'border-coffee-light hover:border-gold',
          ].join(' ')}
          aria-label={done ? 'Отметить как невыполненное' : 'Выполнить'}
        >
          {done && <Check className="w-3 h-3" strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${priorityDot(task.priority)}`} />
            <div className="flex-1 min-w-0">
              <div
                className={[
                  'text-sm font-medium leading-snug',
                  done ? 'line-through text-coffee-mid' : 'text-coffee-dark',
                ].join(' ')}
              >
                {task.title}
              </div>
              {!compact && task.description && (
                <div className="text-xs text-coffee-mid mt-1 line-clamp-2">
                  {task.description}
                </div>
              )}
            </div>
          </div>

          {!compact && (
            <div className="flex items-center gap-2 mt-2 text-[11px] text-coffee-mid flex-wrap">
              <span className={`flex items-center gap-1 ${tone}`}>
                <Icon className="w-3 h-3" strokeWidth={2} />
                {task.category === 'work' ? 'Работа' : 'Личное'}
              </span>
              {time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {time}
                </span>
              )}
              {isRecurring && (
                <span className="flex items-center gap-1 text-gold">
                  <RotateCcw className="w-3 h-3" />
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
