import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePrefersReducedMotion } from '../lib/scroll'
import { IconChevronLeft, IconChevronRight } from './Icons'

// Fila de cartões que se desliza com o dedo (scroll-snap nativo), com o cartão seguinte à vista.
// Setas redondas e contador "1 / 5" para quem usa rato ou teclado. Sem bibliotecas, sem sequestrar o scroll.

export function Rail({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  const track = useRef<HTMLUListElement>(null)
  const reduced = usePrefersReducedMotion()
  const items = Children.toArray(children)
  const count = items.length
  const [pos, setPos] = useState({ index: 0, start: true, end: count <= 1 })

  const step = useCallback(() => {
    const el = track.current
    const first = el?.children[0] as HTMLElement | undefined
    const second = el?.children[1] as HTMLElement | undefined
    if (!el || !first) return 1
    return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth
  }, [])

  useEffect(() => {
    const el = track.current
    if (!el) return
    let raf = 0
    const measure = () => {
      raf = 0
      const max = el.scrollWidth - el.clientWidth
      const start = el.scrollLeft <= 4
      const end = el.scrollLeft >= max - 4
      const index = end ? count - 1 : Math.min(count - 1, Math.round(el.scrollLeft / step()))
      setPos((p) => (p.index === index && p.start === start && p.end === end ? p : { index, start, end }))
    }
    const req = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    el.addEventListener('scroll', req, { passive: true })
    window.addEventListener('resize', req)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', req)
      window.removeEventListener('resize', req)
    }
  }, [count, step])

  const go = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * step(), behavior: reduced ? 'auto' : 'smooth' })
  const fits = pos.start && pos.end

  return (
    <div className={`rail ${className}`}>
      <ul className="rail-track" ref={track} aria-label={label} tabIndex={0}>
        {items.map((c, i) => (
          <li className="rail-item" key={i}>
            {c}
          </li>
        ))}
      </ul>
      {!fits && (
        <div className="wrap rail-ctrl">
          <button type="button" className="round" aria-label="Anterior" disabled={pos.start} onClick={() => go(-1)}>
            <IconChevronLeft />
          </button>
          <button type="button" className="round" aria-label="Seguinte" disabled={pos.end} onClick={() => go(1)}>
            <IconChevronRight />
          </button>
          <span className="rail-count" aria-hidden="true">
            {pos.index + 1} / {count}
          </span>
        </div>
      )}
    </div>
  )
}
