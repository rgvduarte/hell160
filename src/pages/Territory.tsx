import { Link } from 'react-router-dom'
import { TrailMap } from '../components/TrailMap'
import { Media } from '../components/Media'
import { mapRoute } from '../data/routes'
import { ROUTE_PUBLISHED } from '../data/site'

const PLACES = [
  ['A-do-Pinto', 'Partida e meta, no Pavilhão Polivalente.'],
  ['Serpa', 'A cidade, sede do concelho. Muralhas, queijo e cante alentejano.'],
  ['Pulo do Lobo', 'O Guadiana aperta-se entre rochas e cai numa garganta funda.'],
  ['Montado', 'Azinheiras e sobreiros a perder de vista, estradões de terra e pouca sombra.'],
  ['As aldeias', 'Casas caiadas e ruas estreitas. É nas aldeias que ficam os desfibrilhadores e as casas para dormir.'],
] as const

export function Territory() {
  const route = ROUTE_PUBLISHED.hell160
  return (
    <>
      <section className="page-hero" aria-labelledby="terr-h">
        <Media slot="territorio" tone="night" eager />
        <div className="wrap">
          <h1 className="display" id="terr-h">
            Margem esquerda
          </h1>
          <p className="lede">
            A margem esquerda do Guadiana, a partir de <span className="nw">A-do-Pinto</span>, no concelho de Serpa. Montado, planície, aldeias
            brancas e calor forte em julho.
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
          {route ? (
            <div>
              <div className="map-frame">
                <TrailMap routes={[mapRoute('hell160')!]} height={560} label="Mapa do território e do percurso do HELL160" />
              </div>
              <p className="muted mt-s">GR15 e GR15.2 · margem esquerda do Guadiana</p>
            </div>
          ) : (
            <aside className="panel terr-route" aria-labelledby="terr-route-t">
              <h2 className="cond" id="terr-route-t">
                O percurso
              </h2>
              <p>Circular a partir de A-do-Pinto, pela GR15 e pela GR15.2. O traçado oficial do HELL160 ainda não foi publicado.</p>
              <Link className="btn ghost" to="/provas/hell160">
                Ver o HELL160
              </Link>
            </aside>
          )}
        </div>
      </section>
      <section className="sec band-panel">
        <div className="wrap split">
          <h2 className="display">Ver passar</h2>
          <div className="stack">
            <p className="lede">
              As aldeias do percurso são os melhores sítios para apoiar. Com o live sabes a que horas cada atleta passa em cada uma.
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
