import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { EVENT } from '../data/event'
import { Lockup, Wordmark } from './Logo'
import { Contours } from './Graphics'

const LINKS = [
  ['/provas', 'Provas'],
  ['/alojamento', 'Dormir na aldeia'],
  ['/live', 'Live'],
  ['/seguranca', 'Segurança'],
  ['/territorio', 'Território'],
  ['/parceiros', 'Parceiros'],
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
        <Wordmark height={96} />
        <p className="mono" style={{ marginTop: 20, color: '#9a8f80' }}>
          {EVENT.tagline} · {EVENT.region} · Edição {EVENT.edition}
        </p>
        <div className="cols">
          <div>
            <p style={{ maxWidth: '34ch', color: '#cfc6b8' }}>
              Uma prova feita pelas aldeias da margem esquerda do Guadiana. O que se paga para cá correr e dormir fica cá.
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
              <li><Link to="/seguranca">Rede de desfibrilhadores</Link></li>
            </ul>
          </div>
          <div>
            <span className="mono" style={{ color: '#8a7f71' }}>Seguir</span>
            <ul>
              <li><a href={EVENT.instagram} target="_blank" rel="noreferrer">Instagram</a></li>
              <li><Link to="/parceiros">Investidores e parceiros</Link></li>
              <li><Link to="/marca">Marca</Link></li>
            </ul>
          </div>
        </div>
        <div className="base">
          <span>© {EVENT.edition} HELL160 · A-do-Pinto, Serpa</span>
          <span>Protótipo · dados 2027 a confirmar</span>
        </div>
      </div>
    </footer>
  )
}
