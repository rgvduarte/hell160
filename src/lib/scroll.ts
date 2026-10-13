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

// Reveals: aplicados a seletores conhecidos, só abaixo da dobra (o que já está à vista não pisca).
// Stagger entre irmãos do mesmo grupo; números das faixas de dados contam a partir de zero.
const REVEAL = [
  '.sec h2.display',
  '.sec h2.cond',
  '.sec .lede',
  '.stats > div',
  '.race-row',
  '.listing',
  '.numlist > li',
  '.ticklist > li',
  '[data-reveal]',
].join(',')

export function useReveal(key: string) {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return
    let io: IntersectionObserver | null = null
    const t = window.setTimeout(() => {
      const vh = window.innerHeight
      const els = Array.from(document.querySelectorAll<HTMLElement>(`main :is(${REVEAL})`)).filter(
        (el) => !el.closest('.no-reveal') && el.getBoundingClientRect().top > vh * 0.92,
      )
      const groups = new Map<Element | null, number>()
      for (const el of els) {
        const n = groups.get(el.parentElement) ?? 0
        groups.set(el.parentElement, n + 1)
        el.style.setProperty('--rv-delay', `${Math.min(n, 6) * 70}ms`)
        el.classList.add('rv')
      }
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue
            const el = e.target as HTMLElement
            el.classList.add('rv-in')
            io?.unobserve(el)
            el.querySelectorAll<HTMLElement>(':scope > b').forEach(countUp)
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
      )
      els.forEach((el) => io!.observe(el))
    }, 60)
    return () => {
      window.clearTimeout(t)
      io?.disconnect()
      document.querySelectorAll('.rv').forEach((el) => el.classList.remove('rv', 'rv-in'))
    }
  }, [key])
}

// Conta de 0 até ao valor, mantendo o formato (164.6, 2648, 45°). Ignora textos não numéricos.
function countUp(el: HTMLElement) {
  const raw = el.textContent ?? ''
  const m = raw.match(/^(\D*)(\d+(?:[.,]\d+)?)(\D*)$/)
  if (!m) return
  const [, pre, num, post] = m
  const sep = num.includes(',') ? ',' : '.'
  const target = parseFloat(num.replace(',', '.'))
  const decimals = num.includes(sep) ? num.split(sep)[1].length : 0
  if (!isFinite(target) || target === 0) return
  const dur = 900
  const t0 = performance.now()
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / dur)
    const eased = 1 - Math.pow(1 - k, 3)
    el.textContent = `${pre}${(target * eased).toFixed(decimals).replace('.', sep)}${post}`
    if (k < 1) requestAnimationFrame(step)
    else el.textContent = raw
  }
  requestAnimationFrame(step)
}
