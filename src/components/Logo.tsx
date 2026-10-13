import { DORSAL, DORSAL_SMALL, LOCKUP } from './logoPaths'

// Cores fixas de marca (o dorsal é um objeto: não muda com o tema). O HELL do lockup segue currentColor.
const INK = 'var(--brand-ink, #15120f)'
const EMBER = 'var(--brand-ember, #c8361b)'
const CHALK = 'var(--brand-chalk, #efe9df)'

// Símbolo "O Dorsal". Abaixo de 28 px usa a ótica pequena (só o 160).
export function Mark({ size = 64, title = 'HELL160' }: { size?: number; title?: string }) {
  if (size < 28) return <MarkSmall size={size} title={title} />
  return (
    <svg viewBox={`0 0 ${DORSAL.size} ${DORSAL.size}`} width={size} height={size} role="img" aria-label={title} style={{ display: 'block' }}>
      <path d={DORSAL.field} fill={EMBER} />
      <path d={DORSAL.band} fill={INK} />
      <path d={DORSAL.hell} fill={CHALK} fillRule="evenodd" />
      <path d={DORSAL.n160} fill={CHALK} fillRule="evenodd" />
    </svg>
  )
}

export function MarkSmall({ size = 16, title = 'HELL160' }: { size?: number; title?: string }) {
  return (
    <svg viewBox={`0 0 ${DORSAL_SMALL.size} ${DORSAL_SMALL.size}`} width={size} height={size} role="img" aria-label={title} style={{ display: 'block' }}>
      <path d={DORSAL_SMALL.field} fill={EMBER} />
      <path d={DORSAL_SMALL.n160} fill={CHALK} fillRule="evenodd" />
    </svg>
  )
}

// Horizontal: HELL (cor do texto) + caixa brasa com 160.
export function Lockup({ height = 30, title = 'HELL160' }: { height?: number; title?: string }) {
  return (
    <svg
      viewBox={`0 0 ${LOCKUP.w} ${LOCKUP.h}`}
      height={height}
      width={(height * LOCKUP.w) / LOCKUP.h}
      role="img"
      aria-label={title}
      style={{ display: 'block' }}
    >
      <path d={LOCKUP.hell} fill="currentColor" fillRule="evenodd" />
      <path d={LOCKUP.box} fill={EMBER} />
      <path d={LOCKUP.n160} fill={CHALK} fillRule="evenodd" />
    </svg>
  )
}

// Compatibilidade: o antigo wordmark passa a ser o lockup horizontal.
export function Wordmark({ height = 24 }: { height?: number }) {
  return <Lockup height={height} />
}
