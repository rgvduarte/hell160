import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <section className="sec">
      <div className="wrap">
        <p className="eyebrow">404</p>
        <h1 className="display" style={{ fontSize: 'clamp(48px, 10vw, 150px)' }}>Fora do traçado</h1>
        <p className="lede mt">Esta página não existe. Volta ao último ponto de controlo.</p>
        <Link className="btn mt" to="/">Início</Link>
      </div>
    </section>
  )
}
