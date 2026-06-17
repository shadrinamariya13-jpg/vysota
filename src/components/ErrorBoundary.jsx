import { Component } from 'react'
import { RotateCw, Coffee } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-cream-bg flex items-center justify-center p-6">
          <div className="card max-w-md w-full p-6 text-center">
            <div className="w-12 h-12 rounded-xl2 bg-terracotta/10 flex items-center justify-center mx-auto mb-3">
              <Coffee className="w-5 h-5 text-terracotta" />
            </div>
            <h2 className="font-display text-xl text-coffee-dark mb-1">
              Что-то сломалось
            </h2>
            <p className="text-sm text-coffee-mid mb-4">
              Я записал ошибку в консоль. Обычно помогает перезагрузка.
            </p>
            <pre className="text-[10px] text-left text-coffee-light bg-cream-deep/50 rounded-lg p-2 overflow-auto max-h-32 mb-4">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={() => location.reload()}
              className="btn-gold w-full"
            >
              <RotateCw className="w-4 h-4" />
              Перезагрузить
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
