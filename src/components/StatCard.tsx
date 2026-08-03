import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
  tone?: 'blue' | 'green' | 'gold' | 'red' | 'slate'
}

export function StatCard({ label, value, hint, icon, tone = 'blue' }: StatCardProps) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {hint ? <span>{hint}</span> : null}
      </div>
    </article>
  )
}
