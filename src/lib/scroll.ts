// Scroll: progresso ligado ao scroll (sem sequestrar o scroll), reveals e movimento reduzido.
// Regras: só transform/opacity, um rAF por frame, listeners passivos, tudo desligado com prefers-reduced-motion.

import { useEffect, useState, type RefObject } from 'react'

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

// Progresso 0→1 de um elemento alto com conteúdo sticky: 0 quando o topo chega ao topo do ecrã,
// 1 quando o fundo chega ao fundo do ecrã.
export function useStickyProgress(ref: RefObject<HTMLElement | null>, enabled = true) {
  const [p, setP] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let raf = 0
    let last = -1
    const tick = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const span = r.height - window.innerHeight
      const v = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0
      if (Math.abs(v - last) > 0.0004) {
        last = v
        setP(v)
      }
    }
    const req = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    tick()
    window.addEventListener('scroll', req, { passive: true })
    window.addEventListener('resize', req)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', req)
      window.removeEventListener('resize', req)
    }
  }, [ref, enabled])
  return p
}

// Escreve --sy (px de scroll dentro do elemento) e --sp (0→1 enquanto o elemento atravessa o ecrã)
// como variáveis CSS, sem re-render. Usado no pôr do sol do hero e na faixa das aldeias.
export function useScrollVars(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    let raf = 0
    const tick = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      el.style.setProperty('--sy', `${Math.max(0, -r.top)}`)
      el.style.setProperty('--sp', `${Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))}`)
    }
    const req = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    tick()
    window.addEventListener('scroll', req, { passive: true })
    window.addEventListener('resize', req)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', req)
      window.removeEventListener('resize', req)
    }
  }, [ref, enabled])
}
