import { useState } from 'react'
import { ListChecks } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import TaskCard from '../components/TaskCard'
import { useAllTasks } from '../hooks/useTasks'
import { todayStr } from '../lib/stats'

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'work', label: 'Работа' },
  { id: 'personal', label: 'Личное' },
  { id: 'today', label: 'Сегодня' },
  { id: 'overdue', label: 'Просрочены' },
  { id: 'done', label: 'Готово' },
]

export default function List() {
  const [filter, setFilter] = useState('all')
  const tasks = useAllTasks()
  const today = todayStr()

  const filtered = tasks.filter((t) => {
    if (filter === 'all') return t.status !== 'done'
    if (filter === 'work') return t.category === 'work' && t.status !== 'done'
    if (filter === 'personal') return t.category === 'personal' && t.status !== 'done'
    if (filter === 'today') return t.due_date === today
    if (filter === 'overdue')
      return t.due_date && t.due_date < today && t.status !== 'done'
    if (filter === 'done') return t.status === 'done'
    return true
  })

  return (
    <>
      <PageHeader title="Список" subtitle="Все задачи в одном месте" />

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={
              filter === f.id
                ? 'px-3 py-1.5 rounded-full text-xs font-medium bg-gold text-white shadow-gold'
                : 'px-3 py-1.5 rounded-full text-xs font-medium bg-cream-surface text-coffee-mid border border-cream-border hover:bg-cream-deep'
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Здесь пока пусто"
          hint="Поменяйте фильтр или создайте новую задачу."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </>
  )
}
