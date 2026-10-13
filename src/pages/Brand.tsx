import { Mark, Wordmark, Lockup } from '../components/Logo'
import { Contours } from '../components/Graphics'

const COLORS = [
  ['Cal', '#EFE9DF', 'Fundo. A parede caiada.'],
  ['Pó', '#D3C4AD', 'Áreas, altimetria.'],
  ['Ocre', '#A9763B', 'Terra de julho.'],
  ['Brasa', '#C8361B', 'Acento. Uma vez por ecrã.'],
  ['Sombra', '#15120F', 'Texto e noite.'],
] as const

export function Brand() {
  return (
    <>
      <section className="sec tight">
        <div className="wrap">
          <p className="eyebrow">Marca</p>
          <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 120px)' }}>Identidade</h1>
          <p className="lede mt">
            Letragem desenhada de raiz em grelha — nada de fonte genérica com chamas. O símbolo é um H: as duas hastes são as margens, a
            travessa é o Guadiana. A margem esquerda, onde a prova acontece, é a que tem cor.
          </p>
        </div>
      </section>

      <section className="rule">
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 0 }}>
          <div style={{ padding: '64px 24px', display: 'grid', placeItems: 'center', borderRight: '1px solid var(--line)' }}>
            <Mark size={180} />
          </div>
          <div style={{ padding: '64px 24px', display: 'grid', placeItems: 'center' }}>
            <Wordmark height={64} />
          </div>
        </div>
      </section>

      <section className="night" style={{ position: 'relative', overflow: 'hidden' }}>
        <Contours seed={5} />
        <div className="wrap" style={{ padding: '96px var(--gutter)', display: 'grid', placeItems: 'center', position: 'relative' }}>
          <Lockup height={96} />
        </div>
      </section>

      <section className="sec tight">
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0, borderTop: '2px solid var(--fg)' }}>
            {COLORS.map(([n, hex, use]) => (
              <div key={n} style={{ borderRight: '1px solid var(--line)' }}>
                <div style={{ background: hex, height: 140, borderBottom: '1px solid var(--line)' }} />
                <div style={{ padding: 16 }}>
                  <strong>{n}</strong>
                  <div className="mono muted">{hex}</div>
                  <p className="muted" style={{ fontSize: 14, margin: '8px 0 0' }}>{use}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid3 mt-l">
            <div>
              <p className="mono muted">Display · Archivo Expanded 900</p>
              <p className="display" style={{ fontSize: 56 }}>Pó e sombra</p>
            </div>
            <div>
              <p className="mono muted">Texto · Instrument Sans</p>
              <p style={{ fontSize: 22 }}>Parte-se às dez da noite. Volta-se quando se volta.</p>
            </div>
            <div>
              <p className="mono muted">Dados · JetBrains Mono</p>
              <p className="mono" style={{ fontSize: 22, textTransform: 'none' }}>164.6 km · 2648 m D+ · 36:00:00</p>
            </div>
          </div>

          <div className="row mt-l">
            <a className="btn" href={`${import.meta.env.BASE_URL}brand/hell160-lockup.svg`} download>Lockup SVG</a>
            <a className="btn ghost" href={`${import.meta.env.BASE_URL}brand/hell160-mark.svg`} download>Símbolo SVG</a>
            <a className="btn ghost" href={`${import.meta.env.BASE_URL}brand/hell160-wordmark.svg`} download>Wordmark SVG</a>
            <a className="btn ghost" href={`${import.meta.env.BASE_URL}brand/hell160-lockup-night.svg`} download>Lockup noite</a>
          </div>
        </div>
      </section>
    </>
  )
}
