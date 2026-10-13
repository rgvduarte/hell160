import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <section className="sec">
      <div className="wrap stack">
        <h1 className="display" style={{ fontSize: 'clamp(48px, 10vw, 150px)' }}>
          Fora do traçado
        </h1>
        <p className="lede">Esta página não existe (erro 404). Volta ao último ponto de controlo.</p>
        <div className="pill-row">
          <Link className="btn" to="/">
            Início
          </Link>
          <Link className="btn ghost" to="/provas">
            Provas
          </Link>
        </div>
      </div>
    </section>
  )
}
