import { Coffee, Briefcase, Heart, Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import TaskCard from '../components/TaskCard'
import { useTaskForm } from '../components/TaskFormContext'
import { useAllTasks } from '../hooks/useTasks'
import { todayStr } from '../lib/stats'

function formatToday() {
  return new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function StatCard({ icon: Icon, label, value, tone = 'gold' }) {
  const toneClass = {
    gold: 'text-gold bg-gold/10',
    olive: 'text-olive bg-olive/10',
    terracotta: 'text-terracotta bg-terracotta/10',
  }[tone]
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl2 flex items-center justify-center ${toneClass}`}>
        <Icon className="w-5 h-5" strokeWidth={1.8} />
      </div>
      <div>
        <div className="text-2xl font-display text-coffee-dark leading-none">{value}</div>
        <div className="text-xs text-coffee-mid mt-1">{label}</div>
      </div>
    </div>
  )
}

export default function Today() {
  const allTasks = useAllTasks()
  const today = todayStr()
  const { openCreate } = useTaskForm()

  const todayTasks = allTasks.filter((t) => t.due_date === today)
  const total = todayTasks.length
  const work = todayTasks.filter((t) => t.category === 'work').length
  const personal = todayTasks.filter((t) => t.category === 'personal').length

  const undone = todayTasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
  const done = todayTasks.filter((t) => t.status === 'done')

  const subtitle = formatToday()

  return (
    <>
      <PageHeader title="Сегодня" subtitle={subtitle.charAt(0).toUpperCase() + subtitle.slice(1)} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <StatCard icon={Coffee} label="Всего на сегодня" value={total} tone="gold" />
        <StatCard icon={Briefcase} label="Работа" value={work} tone="olive" />
        <StatCard icon={Heart} label="Личное" value={personal} tone="terracotta" />
      </div>

      {total === 0 ? (
        <EmptyState
          icon={Coffee}
          title="Пока тихо"
          hint="Создайте первую задачу на сегодня — она появится здесь."
        />
      ) : (
        <div className="space-y-5">
          {undone.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-display text-lg text-coffee-dark">Нужно сделать</h3>
                <button
                  onClick={() => openCreate({ due_date: today })}
                  className="btn-ghost text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Добавить
                </button>
              </div>
              <div className="space-y-2">
                {undone.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <h3 className="font-display text-lg text-coffee-dark mb-2.5">Готово</h3>
              <div className="space-y-2">
                {done.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}
