import { Link } from 'react-router-dom'
import { EVENT, IMPACT, RACES, currentPrice } from '../data/event'
import { LISTINGS } from '../data/listings'
import { Contours, Countdown, ElevationProfile } from '../components/Graphics'
import { HousePlate } from '../components/HousePlate'
import { RaceTable } from './Races'

export function Home() {
  const main = RACES[0]
  const price = currentPrice(main)
  return (
    <>
      <section className="hero">
        <Contours seed={3} />
        <div className="wrap">
          <div className="meta mono">
            <span>Edição {EVENT.edition}</span>
            <span>2 — 4 julho</span>
            <span>{EVENT.place}</span>
            <span className="ember">Inscrições abertas</span>
          </div>
          <div style={{ position: 'relative' }}>
            <div className="sun" aria-hidden />
            <h1 className="display">
              Hell
              <span className="row2">160</span>
              <small>Shadows and Dust</small>
            </h1>
          </div>
          <div className="foot">
            <div>
              <p className="lede" style={{ marginBottom: 28 }}>
                164 km em autonomia total pela margem esquerda do Guadiana. Parte-se às dez da noite. Volta-se quando se volta.
              </p>
              <div className="row">
                <Link className="btn" to="/inscricao">
                  Inscrever{price ? ` · ${price.eur} €` : ''}
                </Link>
                <Link className="btn ghost" to="/alojamento">
                  Dormir na aldeia
                </Link>
              </div>
            </div>
            <div>
              <p className="mono muted" style={{ margin: '0 0 10px' }}>Partida HELL160 · sex 2 jul · 22:00</p>
              <Countdown to={EVENT.startISO} />
            </div>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="stats">
          <div><b>164</b><span>km</span></div>
          <div><b>2648</b><span>m D+</span></div>
          <div><b>36</b><span>horas limite</span></div>
          <div><b>13</b><span>abastecimentos</span></div>
          <div><b>3</b><span>bases de vida</span></div>
          <div><b className="ember">45°</b><span>julho, à tarde</span></div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap split">
          <div>
            <p className="eyebrow">A prova</p>
            <h2 className="display">Pó de dia. Sombra de noite.</h2>
          </div>
          <div className="prose stack">
            <p className="lede" style={{ maxWidth: '40ch' }}>
              O HELL160 não tem montanhas. Tem distância, calor e escuro — e a planície a mostrar quanto falta.
            </p>
            <p>
              Circular pela GR15 e GR15.2, a partir do pavilhão de A-do-Pinto: estradões, montado, a descida ao Pulo do Lobo e as aldeias
              que ficam acordadas para ver passar quem ainda corre. Navegação por GPS, material obrigatório controlado à partida e no
              percurso, e uma regra simples: o que precisas, levas.
            </p>
            <p>
              Em 2027 a prova ganha uma plataforma própria — inscrição, alojamento em casas da aldeia, e tracking em direto para a
              organização, para as equipas de resgate e para quem fica em casa a ver.
            </p>
          </div>
        </div>
      </section>

      <section className="sec tight rule">
        <div className="wrap">
          <div className="row between" style={{ marginBottom: 32, alignItems: 'end' }}>
            <div>
              <p className="eyebrow">Provas 2027</p>
              <h2 className="display">Escolhe a distância</h2>
            </div>
            <Link className="btn ghost" to="/provas">Todas as provas</Link>
          </div>
          <RaceTable />
        </div>
      </section>

      <section className="sec night">
        <Contours seed={19} />
        <div className="wrap" style={{ position: 'relative' }}>
          <div className="split">
            <div>
              <p className="eyebrow">22:00 · sexta-feira</p>
              <h2 className="display">Parte-se no escuro</h2>
            </div>
            <div className="stack">
              <p className="lede">
                A partida noturna poupa as primeiras horas ao sol — e entrega a segunda noite a quem ainda estiver em prova.
              </p>
              <p className="muted">
                Cada atleta leva telemóvel com a app HELL160 e, se quiser, um relógio emparelhado. As duas fontes cruzam-se: se uma falha, a
                outra continua a dar posição. Um botão de SOS liga diretamente à equipa de resgate mais próxima.
              </p>
              <Link className="btn ember" to="/live">Ver o live (simulação)</Link>
            </div>
          </div>
          <div className="mt-l">
            <ElevationProfile height={200} />
            <p className="mono muted mt-s">Perfil esquemático · ◆ bases de vida em vermelho</p>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="split">
            <div>
              <p className="eyebrow">Alojamento comunitário</p>
              <h2 className="display">Dorme na aldeia</h2>
            </div>
            <div className="stack">
              <p className="lede">
                Não há hotéis aqui. Há {IMPACT.closedHouses} casas fechadas no concelho e famílias que as querem abrir no fim de semana da
                prova.
              </p>
              <p>
                Em 2023 vieram entre {IMPACT.visitors2023} pessoas e houve quem dormisse na escola. Em 2027, atletas e famílias reservam
                casas de gente da terra, a {IMPACT.nightly} por noite. O dinheiro vai para quem abre a porta.
              </p>
              <div className="row">
                <Link className="btn" to="/alojamento">Ver casas</Link>
                <Link className="btn ghost" to="/alojamento/anfitriao">Tenho uma casa</Link>
              </div>
            </div>
          </div>
          <div className="listings mt-l">
            {LISTINGS.slice(0, 3).map((l) => (
              <Link key={l.id} to={`/alojamento/${l.id}`} className="listing">
                <div className="plate"><HousePlate listing={l} /></div>
                <div className="row between mono">
                  <span>{l.village}</span>
                  <span>{l.eurNight} € / noite</span>
                </div>
                <h3>{l.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden>
        <div>
          {[0, 1].map((k) =>
            ['A-do-Pinto', 'Vale de Vargo', 'Vila Verde de Ficalho', 'Pias', 'Vila Nova de São Bento', 'Serpa', 'Pulo do Lobo', 'Brinches', 'Santa Iria'].map((v) => (
              <span key={k + v}>{v}</span>
            )),
          )}
        </div>
      </div>

      <section className="sec">
        <div className="wrap split">
          <div>
            <p className="eyebrow">Segurança</p>
            <h2 className="display">Ninguém fica sem sinal</h2>
          </div>
          <ol className="numlist">
            <li>
              <div>
                <h3 className="cond">Tracking redundante</h3>
                <p className="muted">Telemóvel + relógio, posição ao minuto, alertas automáticos por paragem anormal ou desvio do traçado.</p>
              </div>
            </li>
            <li>
              <div>
                <h3 className="cond">Rede de desfibrilhadores</h3>
                <p className="muted">DAE nas aldeias do percurso, que ficam para a comunidade depois da prova. Já há dois. Faltam os outros.</p>
              </div>
            </li>
            <li>
              <div>
                <h3 className="cond">Equipas no terreno</h3>
                <p className="muted">Postos médicos nas bases de vida, resgate móvel com a localização de cada atleta em tempo real.</p>
              </div>
            </li>
            <li>
              <div className="row">
                <Link className="btn ghost" to="/seguranca">Plano de segurança</Link>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="sec dust">
        <div className="wrap split">
          <div>
            <p className="eyebrow">Parceiros e investidores</p>
            <h2 className="display">Um caso para replicar</h2>
          </div>
          <div className="stack">
            <p className="lede">
              A primeira edição deixou mais de meio milhão de euros na região. A plataforma é feita para que outras autarquias façam o
              mesmo.
            </p>
            <Link className="btn" to="/parceiros">Dossier para parceiros</Link>
          </div>
        </div>
      </section>
    </>
  )
}
