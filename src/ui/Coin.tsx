import { formatCents } from '../sim'

/** Icono de moneda: el símbolo del euroLuky. */
export function CoinIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#e2b04a" stroke="#b8862b" strokeWidth="2" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#b8862b" strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill="#b8862b" />
    </svg>
  )
}

/** Cantidad en euroLukys con su moneda delante. */
export function Amount({ cents, size = 'md', className = '', decimals }: { cents: number; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string; decimals?: boolean }) {
  const text = formatCents(cents, { alwaysDecimals: decimals })
  const sizes = {
    sm: { icon: 14, cls: 'text-sm' },
    md: { icon: 18, cls: 'text-base' },
    lg: { icon: 22, cls: 'text-xl' },
    xl: { icon: 30, cls: 'text-3xl' },
  }[size]
  return (
    <span className={`inline-flex items-center gap-1.5 font-display font-semibold tabular-nums ${sizes.cls} ${className}`}>
      <CoinIcon size={sizes.icon} />
      <span>{text}</span>
    </span>
  )
}
