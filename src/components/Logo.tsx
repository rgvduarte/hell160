import { layout, MARK } from './logoPaths'

const WORD = layout('HELL160')
const SPLIT = 4 // "HELL" | "160"

export function Mark({ size = 32, title = 'HELL160' }: { size?: number; title?: string }) {
  return (
    <svg viewBox={`0 0 ${MARK.size} ${MARK.size}`} width={size} height={size} role="img" aria-label={title}>
      <path d={MARK.left} fill="var(--ember)" />
      <path d={MARK.right} fill="currentColor" />
      <path d={MARK.river} fill="currentColor" />
    </svg>
  )
}

export function Wordmark({ height = 24, accent = true }: { height?: number; accent?: boolean }) {
  const w = WORD.width
  return (
    <svg
      viewBox={`0 0 ${w} 60`}
      height={height}
      width={(height * w) / 60}
      role="img"
      aria-label="HELL160"
      style={{ display: 'block' }}
    >
      {WORD.glyphs.map((g, i) => (
        <path
          key={i}
          d={g.d}
          transform={`translate(${g.x} 0)`}
          fill={accent && i >= SPLIT ? 'var(--ember)' : 'currentColor'}
          fillRule="evenodd"
        />
      ))}
    </svg>
  )
}

export function Lockup({ height = 28 }: { height?: number }) {
  return (
    <span className="lockup" style={{ gap: height * 0.4 }}>
      <Mark size={height} />
      <Wordmark height={height * 0.62} />
    </span>
  )
}
