import { Link } from 'react-router-dom'
import { TrailMap } from '../components/TrailMap'
import { Media } from '../components/Media'
import { mapRoute } from '../data/routes'

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
      <section className="page-hero" aria-labelledby="terr-h">
        <Media slot="territorio" tone="night" eager />
        <div className="wrap">
          <h1 className="display" id="terr-h">
            Margem esquerda
          </h1>
          <p className="lede">
            O lado do Guadiana que fica para lá do rio, para quem vem de Lisboa. Montado, planície, aldeias brancas e um calor que não pede
            desculpa.
          </p>
        </div>
      </section>
      <section className="sec tight">
        <div className="wrap split">
          <ol className="numlist">
            {PLACES.map(([n, t]) => (
              <li key={n}>
                <div>
                  <h2 className="cond">{n}</h2>
                  <p className="muted">{t}</p>
                </div>
              </li>
            ))}
          </ol>
          <div>
            <div className="map-frame">
              <TrailMap routes={[mapRoute('hell160')!]} height={560} label="Mapa do território e do percurso do HELL160" />
            </div>
            <p className="muted mt-s">GR15 e GR15.2 · margem esquerda do Guadiana</p>
          </div>
        </div>
      </section>
      <section className="sec band-panel">
        <div className="wrap split">
          <h2 className="display">Ver passar</h2>
          <div className="stack">
            <p className="lede">
              As aldeias do percurso são os melhores sítios para apoiar. Com o live sabes a que horas o teu atleta passa em cada uma, e chegas
              antes dele.
            </p>
            <div className="pill-row">
              <Link className="btn" to="/live">
                Seguir no live
              </Link>
              <Link className="btn ghost" to="/alojamento">
                Dormir na aldeia
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
