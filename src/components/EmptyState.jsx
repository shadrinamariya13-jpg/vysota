export default function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="card flex flex-col items-center justify-center text-center px-6 py-16">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-cream-deep flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-gold" strokeWidth={1.8} />
        </div>
      )}
      <h3 className="font-display text-xl text-coffee-dark">{title}</h3>
      {hint && <p className="text-coffee-mid text-sm mt-1.5 max-w-md">{hint}</p>}
    </div>
  )
}
