import { Link } from 'react-router-dom'
import { RouteMap } from '../components/RouteMap'
import { Contours } from '../components/Graphics'

const PLACES = [
  ['A-do-Pinto', 'Partida e meta. A aldeia que organiza e que abre as portas.'],
  ['Vila Verde de Ficalho', 'Junto à fronteira com Espanha. Primeira base de vida.'],
  ['Serpa', 'Muralhas, queijo, cante. Segunda base de vida, a meio da prova.'],
  ['Pulo do Lobo', 'O Guadiana a apertar-se entre rochas. O troço mais técnico — e o mais bonito.'],
  ['Brinches · Santa Iria', 'A última noite. Terceira base de vida e o regresso pelo montado.'],
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
            <RouteMap />
            <p className="mono muted mt-s">Mapa esquemático · GR15 e GR15.2 · bases de vida provisórias</p>
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
