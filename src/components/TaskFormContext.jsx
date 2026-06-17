import { createContext, useCallback, useContext, useState } from 'react'
import TaskForm from './TaskForm'

const TaskFormContext = createContext(null)

export function TaskFormProvider({ children }) {
  const [state, setState] = useState({ open: false, initial: null })

  const openCreate = useCallback((preset = {}) => {
    setState({ open: true, initial: preset })
  }, [])

  const openEdit = useCallback((task) => {
    setState({ open: true, initial: task })
  }, [])

  const close = useCallback(() => setState({ open: false, initial: null }), [])

  return (
    <TaskFormContext.Provider value={{ openCreate, openEdit, close }}>
      {children}
      {state.open && <TaskForm initial={state.initial} onClose={close} />}
    </TaskFormContext.Provider>
  )
}

export function useTaskForm() {
  const ctx = useContext(TaskFormContext)
  if (!ctx) throw new Error('useTaskForm must be used inside TaskFormProvider')
  return ctx
}
