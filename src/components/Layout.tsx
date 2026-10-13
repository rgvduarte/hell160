import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { EVENT, raceById } from '../data/event'
import { announcement, navAction } from '../data/site'
import { Lockup } from './Logo'
import { IconClose, IconInstagram, IconLongArrowUp, IconMail, IconMenu } from './Icons'

const LINKS = [
  ['/provas', 'Provas'],
  ['/causa', 'A causa'],
  ['/alojamento', 'Dormir na aldeia'],
  ['/live', 'Live'],
  ['/territorio', 'Território'],
  ['/conta', 'Área do atleta'],
] as const

const SHEET_LINKS = [['/', 'Início'], ...LINKS, ['/apoiar', 'Apoiar']] as const

const FOOT_LINKS = [
  ['/provas', 'Provas'],
  ['/causa', 'A causa'],
  ['/alojamento', 'Dormir na aldeia'],
  ['/live', 'Live'],
  ['/conta', 'Área do atleta'],
  ['/apoiar', 'Apoiar'],
  ['/marca', 'Marca'],
] as const

// Título de cada página (WCAG 2.4.2). Rotas desconhecidas: página não encontrada.
const TITLES: Record<string, string> = {
  '/provas': 'Provas',
  '/inscricao': 'Inscrição',
  '/alojamento': 'Dormir na aldeia',
  '/alojamento/anfitriao': 'Receber atletas em casa',
  '/live': 'Live',
  '/causa': 'A causa',
  '/territorio': 'Território',
  '/apoiar': 'Apoiar',
  '/marca': 'Marca',
  '/conta': 'Área do atleta',
  '/organizacao': 'Organização',
}

function titleFor(pathname: string) {
  const p = pathname.replace(/\/+$/, '') || '/'
  if (p === '/') return 'HELL160 · Shadows and Dust · 2027'
  const race = p.match(/^\/provas\/([^/]+)$/)
  const r = race ? raceById(race[1]) : null
  if (r) return `${r.name} · Provas 2027`
  const t = race
    ? 'Página não encontrada'
    : TITLES[p] ?? (/^\/alojamento\/[^/]+$/.test(p) ? 'Casa na aldeia' : /^\/anfitriao\/[^/]+$/.test(p) ? 'Área do anfitrião' : 'Página não encontrada')
  return `${t} · HELL160`
}

export function Layout() {
  const { pathname, hash } = useLocation()
  const [menu, setMenu] = useState(false)
  const menuBtn = useRef<HTMLButtonElement>(null)
  const over = useOverHero(pathname === '/')
  const first = useRef(true)
  const cta = navAction()

  useEffect(() => {
    document.title = titleFor(pathname)
  }, [pathname])

  // Mudança de página: fecha o menu e vai para o topo, ou para a âncora (#novidades, #provas…).
  // O foco segue: para a âncora, ou para o conteúdo novo (não fica preso no link do rodapé).
  useEffect(() => {
    setMenu(false)
    const initial = first.current
    first.current = false
    const id = hash ? decodeURIComponent(hash.slice(1)) : ''
    const target = id ? document.getElementById(id) : null
    if (target) {
      target.scrollIntoView({ block: 'start' })
      if (!initial) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' })
      if (!initial) document.getElementById('conteudo')?.focus({ preventScroll: true })
    }
  }, [pathname, hash])

  return (
    <>
      <a className="skip" href="#conteudo">
        Saltar para o conteúdo
      </a>
      <Announcement />
      <header className={`nav${over && !menu ? ' nav--over' : ''}`}>
        <div className="wrap nav-row">
          <Link to="/" className="nav-brand" aria-label="HELL160, página inicial">
            <Lockup height={28} />
          </Link>
          <nav className="nav-links" aria-label="Principal">
            <ul>
              {LINKS.map(([to, label]) => (
                <li key={to}>
                  <NavLink to={to}>{label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <Link to={cta.to} className={`btn small nav-cta ${cta.primary ? 'ember' : 'ghost nav-cta--soft'}`}>
            {cta.short}
          </Link>
          <button
            ref={menuBtn}
            type="button"
            className="round nav-menu"
            aria-label="Abrir o menu"
            aria-haspopup="dialog"
            aria-expanded={menu}
            aria-controls="menu"
            onClick={() => setMenu(true)}
          >
            <IconMenu />
          </button>
        </div>
      </header>
      <MenuSheet open={menu} onClose={() => setMenu(false)} returnTo={menuBtn} pathname={pathname} />
      <main id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

// No início, o cabeçalho fica transparente por cima da fotografia de abertura enquanto a página está no topo.
function useOverHero(enabled: boolean) {
  const [over, setOver] = useState(enabled)
  useEffect(() => {
    if (!enabled) {
      setOver(false)
      return
    }
    let raf = 0
    const tick = () => {
      raf = 0
      // transparente só no topo: assim que se desliza, o texto da abertura nunca passa por baixo do logótipo
      setOver(!!document.querySelector('[data-hero]') && window.scrollY < 8)
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
  }, [enabled])
  return over
}

const ANN_KEY = 'hell160.aviso-fechado'

function Announcement() {
  const a = announcement()
  const ref = useRef<HTMLDivElement>(null)
  const [closed, setClosed] = useState(() => {
    try {
      return !!a && localStorage.getItem(ANN_KEY) === a.id
    } catch {
      return false
    }
  })
  const show = !!a && !closed

  // A altura da barra entra no cálculo da abertura do início (primeiro ecrã inteiro).
  useLayoutEffect(() => {
    const root = document.documentElement
    const el = ref.current
    if (!show || !el) {
      root.style.setProperty('--ann-h', '0px')
      return
    }
    const set = () => root.style.setProperty('--ann-h', `${el.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.setProperty('--ann-h', '0px')
    }
  }, [show])

  if (!a || !show) return null
  return (
    <div className="ann" ref={ref} role="region" aria-label="Aviso">
      <div className="wrap ann-row">
        <Link to={a.to} className="ann-link">
          {a.text}
        </Link>
        <button
          type="button"
          className="ann-x"
          aria-label="Fechar o aviso"
          onClick={() => {
            try {
              localStorage.setItem(ANN_KEY, a.id)
            } catch {
              /* sem armazenamento: fecha só nesta visita */
            }
            setClosed(true)
            // o botão desaparece: o foco passa para o logótipo, o primeiro elemento a seguir
            requestAnimationFrame(() => document.querySelector<HTMLElement>('.nav-brand')?.focus())
          }}
        >
          <IconClose size={20} />
        </button>
      </div>
    </div>
  )
}

// Menu em telemóvel: folha de ecrã inteiro num <dialog> modal (o resto da página fica inerte).
// Fecha com Escape, ao tocar fora, no botão e ao mudar de página. Bloqueia o scroll e devolve o foco.
function MenuSheet({ open, onClose, returnTo, pathname }: { open: boolean; onClose: () => void; returnTo: RefObject<HTMLButtonElement | null>; pathname: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  const lastPath = useRef(pathname)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      lastPath.current = pathname
      d.showModal()
      document.documentElement.classList.add('is-locked')
      d.querySelector<HTMLElement>('.sheet-links a')?.focus()
    } else if (!open && d.open) {
      d.close()
    }
  }, [open, pathname])

  useEffect(() => {
    const d = ref.current
    if (!d) return
    const closed = () => {
      document.documentElement.classList.remove('is-locked')
      onClose()
      // fechado por navegação: o foco vai para o conteúdo novo; senão volta ao botão do menu
      if (lastPath.current !== pathname) document.getElementById('conteudo')?.focus({ preventScroll: true })
      else returnTo.current?.focus()
    }
    d.addEventListener('close', closed)
    return () => d.removeEventListener('close', closed)
  }, [onClose, returnTo, pathname])

  useEffect(() => () => document.documentElement.classList.remove('is-locked'), [])

  const trap = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== 'Tab') return
    const f = Array.from(ref.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])
    if (!f.length) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <dialog
      id="menu"
      ref={ref}
      className="menu-dialog"
      aria-label="Menu"
      onKeyDown={trap}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
    >
      <div className="sheet">
        <div className="sheet-head">
          <Lockup height={28} />
          <button type="button" className="round" aria-label="Fechar o menu" onClick={() => ref.current?.close()}>
            <IconClose />
          </button>
        </div>
        <nav aria-label="Menu">
          <ul className="sheet-links">
            {SHEET_LINKS.map(([to, label]) => (
              <li key={to}>
                <NavLink to={to} end={to === '/'} onClick={() => to === pathname && ref.current?.close()}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sheet-foot">
          <Link className="btn ember" to={navAction().to} onClick={() => ref.current?.close()}>
            {navAction().long}
          </Link>
          <div className="sheet-contacts">
            <a href={EVENT.instagram} target="_blank" rel="noreferrer">
              <IconInstagram size={20} /> @hell.160
            </a>
            <a href={`mailto:${EVENT.email}`}>
              <IconMail size={20} /> Email
            </a>
          </div>
        </div>
      </div>
    </dialog>
  )
}

function Footer() {
  const toTop = () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' })
    document.querySelector<HTMLElement>('.nav-brand')?.focus({ preventScroll: true })
  }
  return (
    <footer className="foot">
      <div className="wrap">
        <button type="button" className="totop" onClick={toTop}>
          <span className="totop-pill">
            <IconLongArrowUp />
          </span>
          <span>Voltar ao topo</span>
        </button>
        <div className="foot-grid">
          <div className="foot-brand">
            <Lockup height={56} />
            <p>Uma prova organizada para levar desfibrilhadores e formação às aldeias da margem esquerda do Guadiana, longe dos hospitais.</p>
            <Link className="btn ember" to={navAction().to}>
              {navAction().long}
            </Link>
          </div>
          <nav className="foot-links" aria-label="Rodapé">
            <ul>
              {FOOT_LINKS.map(([to, label]) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="foot-contacts">
            <a className="round" href={EVENT.instagram} target="_blank" rel="noreferrer" aria-label="HELL160 no Instagram">
              <IconInstagram />
            </a>
            <a className="round" href={`mailto:${EVENT.email}`} aria-label={`Escrever para ${EVENT.email}`}>
              <IconMail />
            </a>
            <a className="foot-mail" href={`mailto:${EVENT.email}`}>
              {EVENT.email}
            </a>
          </div>
        </div>
        <div className="foot-base">
          <span>© {new Date().getFullYear()} HELL160 · A-do-Pinto, Serpa</span>
          <span>Datas e preços 2027 sujeitos ao regulamento oficial</span>
        </div>
      </div>
    </footer>
  )
}
