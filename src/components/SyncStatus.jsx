import { useEffect, useState } from 'react'
import { Cloud, CloudOff, AlertTriangle } from 'lucide-react'
import { getSyncStatus, onSyncStatus } from '../lib/sync'

export default function SyncStatus({ compact = false }) {
  const [, setTick] = useState(0)
  useEffect(() => onSyncStatus(() => setTick((n) => n + 1)), [])
  const s = getSyncStatus()

  // Ошибка записи (upsert упал)
  if (s.lastWriteError) {
    return (
      <button
        type="button"
        onClick={() => alert('Не могу сохранить задачи в облако:\n\n' + s.lastWriteError + '\n\nПопробуй выйти и войти снова.')}
        className="text-[10px] text-terracotta bg-terracotta/10 border border-terracotta/30 rounded-full px-2 py-0.5 flex items-center gap-1 max-w-[160px] hover:bg-terracotta/20 transition"
      >
        <AlertTriangle className="w-3 h-3 shrink-0" />
        <span className="truncate">не сохранилось</span>
      </button>
    )
  }

  // Ошибка чтения (pull упал)
  if (s.lastError) {
    return (
      <button
        type="button"
        onClick={() => alert('Ошибка облака:\n\n' + s.lastError)}
        className="text-[10px] text-terracotta bg-terracotta/10 border border-terracotta/30 rounded-full px-2 py-0.5 flex items-center gap-1 max-w-[150px] hover:bg-terracotta/20 transition"
        title={s.lastError}
      >
        <AlertTriangle className="w-3 h-3 shrink-0" />
        <span className="truncate">{compact ? 'ошибка' : s.lastError}</span>
      </button>
    )
  }

  if (s.lastPullCount === null) {
    return (
      <span className="text-[10px] text-coffee-light flex items-center gap-1">
        <CloudOff className="w-3 h-3" />
        {compact ? '—' : 'ждём'}
      </span>
    )
  }

  return (
    <span
      className="text-[10px] text-olive flex items-center gap-1"
      title={`Последняя загрузка: ${s.lastPullAt?.toLocaleTimeString('ru-RU') || ''}`}
    >
      <Cloud className="w-3 h-3" />
      {s.lastPullCount} в облаке
    </span>
  )
}
