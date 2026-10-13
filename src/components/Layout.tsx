import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { EVENT } from '../data/event'
import { Lockup } from './Logo'
import { Contours } from './Graphics'

const LINKS = [
  ['/provas', 'Provas'],
  ['/causa', 'A causa'],
  ['/alojamento', 'Dormir na aldeia'],
  ['/live', 'Live'],
  ['/territorio', 'Território'],
] as const

export function Layout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <header className="nav">
        <div className="wrap">
          <Link to="/" className="brand" aria-label="HELL160 — início">
            <Lockup height={30} />
          </Link>
          <button className="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? 'Fechar' : 'Menu'}
          </button>
          <ul className={open ? 'open' : ''}>
            {LINKS.map(([to, label]) => (
              <li key={to}>
                <NavLink to={to}>
                  {to === '/live' && <span className="live-dot" />}
                  {label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to="/conta">Área do atleta</NavLink>
            </li>
            <li>
              <Link to="/inscricao" className="btn small ember noarrow" style={{ marginLeft: 8 }}>
                Inscrição 2027
              </Link>
            </li>
          </ul>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <Contours seed={41} className="big" />
      <div className="wrap" style={{ position: 'relative' }}>
        <Lockup height={88} />
        <p className="mono" style={{ marginTop: 20, color: '#9a8f80' }}>
          {EVENT.tagline} · {EVENT.region} · Edição {EVENT.edition}
        </p>
        <div className="cols">
          <div>
            <p style={{ maxWidth: '34ch', color: '#cfc6b8' }}>
              Uma prova organizada para levar desfibrilhadores e socorro às aldeias da margem esquerda do Guadiana.
            </p>
            <p className="mt-s">
              <a href={`mailto:${EVENT.email}`}>{EVENT.email}</a>
            </p>
          </div>
          <div>
            <span className="mono" style={{ color: '#8a7f71' }}>Prova</span>
            <ul>
              <li><Link to="/provas">Provas e regulamento</Link></li>
              <li><Link to="/inscricao">Inscrição</Link></li>
              <li><Link to="/live">Seguir em direto</Link></li>
            </ul>
          </div>
          <div>
            <span className="mono" style={{ color: '#8a7f71' }}>Comunidade</span>
            <ul>
              <li><Link to="/alojamento">Dormir na aldeia</Link></li>
              <li><Link to="/alojamento/anfitriao">Abrir a minha casa</Link></li>
              <li><Link to="/causa">Desfibrilhadores nas aldeias</Link></li>
            </ul>
          </div>
          <div>
            <span className="mono" style={{ color: '#8a7f71' }}>Seguir</span>
            <ul>
              <li><a href={EVENT.instagram} target="_blank" rel="noreferrer">Instagram</a></li>
              <li><Link to="/apoiar">Apoiar a prova</Link></li>
              <li><Link to="/marca">Marca</Link></li>
            </ul>
          </div>
        </div>
        <div className="base">
          <span>© {EVENT.edition} HELL160 · A-do-Pinto, Serpa</span>
          <span>Datas e preços 2027 sujeitos ao regulamento oficial</span>
        </div>
      </div>
    </footer>
  )
}
