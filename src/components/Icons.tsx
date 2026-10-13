import type { ReactNode } from 'react'

// Ícones desenhados para o site: traço de 1,6 em grelha de 24, pontas redondas. Sem fontes de ícones nem glifos.

type P = { size?: number; className?: string }

function Svg({ size = 24, className, children, fill = false }: P & { children: ReactNode; fill?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const IconChevronLeft = (p: P) => <Svg {...p}><path d="M14.5 5.5 8 12l6.5 6.5" /></Svg>
export const IconChevronRight = (p: P) => <Svg {...p}><path d="M9.5 5.5 16 12l-6.5 6.5" /></Svg>
export const IconArrowRight = (p: P) => <Svg {...p}><path d="M3 12h17M14 6l6 6-6 6" /></Svg>
export const IconArrowUpRight = (p: P) => <Svg {...p}><path d="M7 17 17 7M9 7h8v8" /></Svg>
export const IconClose = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
export const IconMenu = (p: P) => <Svg {...p}><path d="M4 8.5h16M4 15.5h16" /></Svg>
export const IconPlay = (p: P) => <Svg {...p} fill><path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2Z" /></Svg>
export const IconRoute = (p: P) => (
  <Svg {...p}>
    <circle cx="5" cy="18" r="2" />
    <circle cx="19" cy="6" r="2" />
    <path d="M7 18h7.5a3 3 0 0 0 0-6h-5a3 3 0 0 1 0-6H17" />
  </Svg>
)
export const IconClimb = (p: P) => <Svg {...p}><path d="M3 19h18M3 19l5.5-8 4 5 3-4.5L21 19" /></Svg>
export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
)
export const IconPin = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </Svg>
)
export const IconMoon = (p: P) => <Svg {...p}><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" /></Svg>
export const IconInstagram = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.4" fill="currentColor" />
  </Svg>
)
export const IconMail = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="m4.5 7 7.5 6 7.5-6" />
  </Svg>
)
export const IconSound = ({ muted, ...p }: P & { muted: boolean }) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    {muted ? <path d="m16 9.5 5 5M21 9.5l-5 5" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />}
  </Svg>
)

// Seta longa do "Voltar ao topo" (como uma régua, não um ícone de sistema).
export function IconLongArrowUp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 64" width="24" height="64" className={className} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 62V3M5 10l7-7 7 7" />
    </svg>
  )
}
