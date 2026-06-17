import { useState } from 'react'
import { BarChart3, TrendingUp, CheckCircle2, Circle } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useAllTasks } from '../hooks/useTasks'
import { computeStats } from '../lib/stats'

function MetricCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-coffee-mid text-xs mb-3">
        <Icon className="w-4 h-4 text-gold" strokeWidth={2} />
        {label}
      </div>
      <div className="font-display text-3xl text-coffee-dark">{value}</div>
      {hint && <div className="text-xs text-coffee-light mt-1">{hint}</div>}
    </div>
  )
}

function Bar({ value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="h-1.5 bg-cream-deep rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function Stats() {
  const [period, setPeriod] = useState('week')
  const tasks = useAllTasks()
  const stats = computeStats(tasks, period)

  const maxDayCount = Math.max(1, ...stats.days.map((d) => d.count))

  return (
    <>
      <PageHeader title="Итоги" subtitle="Сколько сделано за период" />

      <div className="flex gap-2 mb-6">
        {[
          { id: 'week', label: 'Неделя' },
          { id: 'month', label: 'Месяц' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={
              period === p.id
                ? 'px-4 py-2 rounded-xl2 bg-gold text-white text-sm font-medium shadow-gold'
                : 'px-4 py-2 rounded-xl2 bg-cream-surface border border-cream-border text-coffee-mid text-sm font-medium hover:bg-cream-deep'
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard icon={Circle} label="Создано" value={stats.created} />
        <MetricCard icon={CheckCircle2} label="Выполнено" value={stats.completed} />
        <MetricCard
          icon={TrendingUp}
          label="Процент"
          value={stats.percent === null ? '—' : `${stats.percent}%`}
          hint="выполнения"
        />
        <MetricCard icon={BarChart3} label="В работе" value={stats.inProgress} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h3 className="font-display text-lg text-coffee-dark mb-4">По категориям</h3>
          <div className="space-y-4 text-sm">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-coffee-mid">Работа</span>
                <span className="text-coffee-dark font-medium">
                  {stats.byCategory.work.done} / {stats.byCategory.work.total}
                </span>
              </div>
              <Bar
                value={stats.byCategory.work.done}
                total={stats.byCategory.work.total}
                color="bg-olive"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-coffee-mid">Личное</span>
                <span className="text-coffee-dark font-medium">
                  {stats.byCategory.personal.done} / {stats.byCategory.personal.total}
                </span>
              </div>
              <Bar
                value={stats.byCategory.personal.done}
                total={stats.byCategory.personal.total}
                color="bg-terracotta"
              />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-display text-lg text-coffee-dark mb-4">По приоритетам</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-coffee-mid">
                <span className="w-2 h-2 rounded-full bg-terracotta" /> Высокий
              </span>
              <span className="text-coffee-dark">{stats.byPriority.high}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-coffee-mid">
                <span className="w-2 h-2 rounded-full bg-gold" /> Средний
              </span>
              <span className="text-coffee-dark">{stats.byPriority.medium}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-coffee-mid">
                <span className="w-2 h-2 rounded-full bg-coffee-light" /> Низкий
              </span>
              <span className="text-coffee-dark">{stats.byPriority.low}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-display text-lg text-coffee-dark mb-4">
          Выполнено по дням
        </h3>
        <div className="flex items-end gap-1.5 h-32">
          {stats.days.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full bg-gold/80 hover:bg-gold rounded-md transition"
                  style={{ height: `${(d.count / maxDayCount) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                  title={`${d.count} выполнено`}
                />
              </div>
              <div className="text-[10px] text-coffee-light capitalize">{d.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
