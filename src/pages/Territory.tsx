import { Link } from 'react-router-dom'
import { TrailMap } from '../components/TrailMap'
import { mapRoute } from '../data/routes'
import { Contours } from '../components/Graphics'

const PLACES = [
  ['A-do-Pinto', 'Partida e meta. A aldeia que organiza e que abre as portas.'],
  ['Serpa', 'Muralhas, queijo e cante alentejano. A vila do concelho.'],
  ['Pulo do Lobo', 'O Guadiana aperta-se entre rochas e cai numa garganta funda.'],
  ['Montado', 'Azinheiras e sobreiros a perder de vista, estradões de terra e pouca sombra.'],
  ['As aldeias', 'Casas caiadas com barras azuis e amarelas, gente à porta a ver passar quem corre.'],
] as const

export function Territory() {
  return (
    <>
      <section className="sec tight" style={{ overflow: 'hidden' }}>
        <Contours seed={11} />
        <div className="wrap split" style={{ position: 'relative', alignItems: 'end' }}>
          <div>
            <p className="eyebrow">Território</p>
            <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 120px)' }}>Margem esquerda</h1>
          </div>
          <p className="lede">
            O lado do Guadiana que fica para lá do rio, para quem vem de Lisboa. Montado, planície, aldeias brancas e um calor que não
            pede desculpa.
          </p>
        </div>
      </section>
      <section className="sec tight rule">
        <div className="wrap split">
          <ol className="numlist">
            {PLACES.map(([n, t]) => (
              <li key={n}><div><h3 className="cond">{n}</h3><p className="muted">{t}</p></div></li>
            ))}
          </ol>
          <div>
            <TrailMap routes={[mapRoute('hell160')!]} height={560} label="Mapa do território e do percurso do HELL160" />
            <p className="mono muted mt-s">GR15 e GR15.2 · margem esquerda do Guadiana</p>
          </div>
        </div>
      </section>
      <section className="sec dust">
        <div className="wrap split">
          <div>
            <p className="eyebrow">Para quem acompanha</p>
            <h2 className="cond" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>Ver passar</h2>
          </div>
          <div className="stack">
            <p>
              As aldeias do percurso são os melhores sítios para apoiar. Com o live consegues saber a que horas o teu atleta passa em cada
              uma — e chegar antes dele.
            </p>
            <div className="row">
              <Link className="btn" to="/live">Live</Link>
              <Link className="btn ghost" to="/alojamento">Dormir na aldeia</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
