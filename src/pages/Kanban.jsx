import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LayoutGrid, Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import TaskCard from '../components/TaskCard'
import { useTaskForm } from '../components/TaskFormContext'
import { useAllTasks, moveTask } from '../hooks/useTasks'
import { db } from '../lib/db'
import { todayStr } from '../lib/stats'

const COLUMNS = [
  { id: 'todo', label: 'Сделать', accent: 'text-coffee-mid' },
  { id: 'in_progress', label: 'В работе', accent: 'text-gold' },
  { id: 'done', label: 'Готово', accent: 'text-olive' },
]

function SortableTaskCard({ task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} compact />
    </div>
  )
}

function Column({ column, tasks, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  return (
    <div
      ref={setNodeRef}
      className={[
        'card p-4 min-h-[320px] flex flex-col transition',
        isOver && 'ring-2 ring-gold/40 bg-gold/5',
      ].filter(Boolean).join(' ')}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-display text-lg ${column.accent}`}>{column.label}</h3>
        <span className="text-xs text-coffee-light bg-cream-deep px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-2 min-h-[100px]">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 text-coffee-light text-xs pointer-events-none">
              <LayoutGrid className="w-5 h-5 mb-1 opacity-40" strokeWidth={1.5} />
              Пусто
            </div>
          ) : (
            tasks.map((t) => <SortableTaskCard key={t.id} task={t} />)
          )}
        </div>
      </SortableContext>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onAdd()
        }}
        className="btn-ghost mt-3 w-full justify-center text-xs"
      >
        <Plus className="w-3.5 h-3.5" /> Добавить
      </button>
    </div>
  )
}

function group(tasks) {
  const cols = { todo: [], in_progress: [], done: [] }
  for (const t of tasks) (cols[t.status] || cols.todo).push(t)
  for (const k of Object.keys(cols)) {
    cols[k].sort((a, b) => (a.position || 0) - (b.position || 0))
  }
  return cols
}

/**
 * Канбан показывает текущую работу:
 *  - все todo и in_progress (включая без даты и просроченные)
 *  - выполненные за последние 3 дня (свежие итоги)
 * Скрыто:
 *  - будущие копии повторяющихся задач (parent_recurrence_id + due_date > сегодня)
 *    — они появятся в свой день; полностью видны в Календаре и Списке.
 *  - давние выполненные — их видно в Списке (фильтр "Готово")
 */
function visibleOnKanban(tasks) {
  const today = todayStr()
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const cutoff = threeDaysAgo.toISOString()

  return tasks.filter((t) => {
    // Будущие копии повторов — прячем
    if (t.parent_recurrence_id && t.due_date && t.due_date > today && t.status !== 'done') {
      return false
    }
    if (t.status === 'done') {
      return !t.completed_at || t.completed_at >= cutoff
    }
    // todo и in_progress — показываем все
    return true
  })
}

export default function Kanban() {
  const allTasks = useAllTasks()
  const visible = visibleOnKanban(allTasks)
  const cols = group(visible)
  const [active, setActive] = useState(null)
  const { openCreate } = useTaskForm()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const findColumn = (id) => {
    if (COLUMNS.find((c) => c.id === id)) return id
    const task = visible.find((t) => t.id === id)
    return task?.status
  }

  const handleDragEnd = async (event) => {
    setActive(null)
    const { active: a, over } = event
    if (!over) return

    const activeTask = visible.find((t) => t.id === a.id)
    if (!activeTask) return

    const activeColId = activeTask.status
    const overColId = findColumn(over.id)
    if (!overColId) return

    // Перестановка внутри колонки
    if (activeColId === overColId) {
      if (a.id === over.id) return
      const list = cols[activeColId]
      const oldIndex = list.findIndex((t) => t.id === a.id)
      const newIndex = list.findIndex((t) => t.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(list, oldIndex, newIndex)
      await db.transaction('rw', db.tasks, async () => {
        for (let i = 0; i < reordered.length; i++) {
          await db.tasks.update(reordered[i].id, { position: i })
        }
      })
      return
    }

    // Перенос в другую колонку
    const destList = cols[overColId]
    const overIndex = destList.findIndex((t) => t.id === over.id)
    const insertAt = overIndex === -1 ? destList.length : overIndex
    await moveTask(a.id, overColId, insertAt)
    const updatedDest = [
      ...destList.slice(0, insertAt),
      activeTask,
      ...destList.slice(insertAt).filter((t) => t.id !== a.id),
    ]
    await db.transaction('rw', db.tasks, async () => {
      for (let i = 0; i < updatedDest.length; i++) {
        await db.tasks.update(updatedDest[i].id, { position: i })
      }
    })
  }

  const activeTask = active ? visible.find((t) => t.id === active) : null

  return (
    <>
      <PageHeader title="Канбан" subtitle="Перетаскивайте задачи между колонками" />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActive(e.active.id)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActive(null)}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              column={col}
              tasks={cols[col.id]}
              onAdd={() => openCreate({ status: col.id })}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-1">
              <TaskCard task={activeTask} compact />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  )
}
