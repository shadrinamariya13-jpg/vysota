export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="font-display text-3xl md:text-4xl text-coffee-dark leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-coffee-mid mt-1.5 text-sm md:text-base">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}
