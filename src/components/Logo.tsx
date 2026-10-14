import { useId } from 'react'
import { FIRE_STOPS, LOGOS, type LogoVariant } from './logoArt'

// Logótipo oficial HELL160 desenhado em linha, para o cabeçalho poder trocar de tom por cima da fotografia.
// As cores do HELL e da assinatura vêm de --logo-hell e --logo-tag (claro por defeito, negativo em fundos escuros).

type Props = {
  variant?: LogoVariant
  height?: number
  tone?: 'light' | 'dark'
  title?: string
  className?: string
}

const r = (n: number) => Math.round(n * 10) / 10

export function Logo({ variant = 'compact', height = 32, tone, title = 'HELL160', className = '' }: Props) {
  const art = LOGOS[variant]
  const gid = 'fogo' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const cls = ['logo', tone === 'dark' ? 'logo--dark' : '', className].filter(Boolean).join(' ')
  return (
    <svg className={cls} viewBox={`0 0 ${art.w} ${art.h}`} width={r((height * art.w) / art.h)} height={height} role="img" aria-label={title}>
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="0" y2="0">
          {FIRE_STOPS.map(([o, c]) => (
            <stop key={o} offset={o} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      {art.fire.map((d, i) => (
        <path key={i} fill={`url(#${gid})`} d={d} />
      ))}
      {art.hell && <path className="logo-hell" d={art.hell} />}
      {art.tag && <path className="logo-tag" d={art.tag} />}
    </svg>
  )
}
