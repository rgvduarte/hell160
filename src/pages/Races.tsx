import { Link, useParams } from 'react-router-dom'
import { EVENT, MANDATORY_GEAR, RACES, RECOMMENDED_GEAR, currentPrice, raceById, type Race } from '../data/event'
import { WAYPOINTS } from '../data/route'
import { ElevationProfile } from '../components/Graphics'
import { RouteMap } from '../components/RouteMap'
import { useCollection, type Registration } from '../lib/store'
import { download, raceICS, spotsLeft } from '../lib/domain'
import { NotFound } from './NotFound'
import '../styles/community.css'

// Vagas restantes de uma prova, já formatadas. `low` assinala os últimos 10 % (mínimo 5 lugares).
function spots(race: Race, regs: Registration[]) {
  const left = spotsLeft(race, regs)
  const finite = Number.isFinite(left)
  return {
    left,
    finite,
    sold: finite && left === 0,
    low: finite && race.places != null && left > 0 && left <= Math.max(5, Math.round(race.places * 0.1)),
    text: finite ? left.toLocaleString('pt-PT') : '—',
  }
}

const waitlistHref = (race: Race) =>
  `mailto:${EVENT.email}?subject=${encodeURIComponent(`Lista de espera · ${race.name} 2027`)}&body=${encodeURIComponent(
    `Prova: ${race.name}\nNome:\nTelefone:\n`,
  )}`

export function RaceTable() {
  const regs = useCollection('registrations')
  return (
    <div className="races cm-races">
      {RACES.map((r) => {
        const p = currentPrice(r)
        const sp = spots(r, regs)
        return (
          <Link key={r.id} to={`/provas/${r.id}`} className="race-row">
            <span className="num">{r.short}</span>
            <span className="name">
              {r.name}
              <small>{r.kind} · {r.start}</small>
            </span>
            <span className="v">{r.distanceKm} km<small>distância</small></span>
            <span className="v hide-sm">{r.gainM} m<small>D+</small></span>
            <span className="v hide-sm">{r.limitH} h<small>limite</small></span>
            <span className={`v hide-sm cm-left${sp.low || sp.sold ? ' low' : ''}`}>
              {sp.sold ? '0' : sp.text}
              <small>{sp.sold ? 'esgotado' : 'vagas'}</small>
            </span>
            <span className="go">
              {sp.sold ? (
                <>
                  <span className="cm-sm-only cm-left low">Esgotado · </span>
                  Lista de espera →
                </>
              ) : (
                <>
                  {sp.finite && <span className={`cm-sm-only cm-left${sp.low ? ' low' : ''}`}>{sp.text} vagas · </span>}
                  {p ? `${p.eur} € →` : 'Inscrições fechadas'}
                </>
              )}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export function Races() {
  return (
    <>
      <section className="sec tight">
        <div className="wrap">
          <p className="eyebrow">Provas 2027</p>
          <h1 className="display" style={{ fontSize: 'clamp(56px, 11vw, 168px)' }}>Provas</h1>
          <p className="lede mt">
            Três formatos a pé no primeiro fim de semana de julho. A bicicleta passa para fevereiro, longe do calor, com o traçado a
            tentar atravessar a fronteira.
          </p>
          <div className="mt-l">
            <RaceTable />
          </div>
          <p className="notice mt">
            Datas, preços e lotação de 2027 são provisórios e baseiam-se no regulamento de 2026. Os preços das estafetas são por equipa.
            Vagas restantes em simulação: contam só as inscrições feitas neste browser.
          </p>
        </div>
      </section>
      <Gear />
    </>
  )
}

function Gear() {
  return (
    <section className="sec rule">
      <div className="wrap split">
        <div>
          <p className="eyebrow">Regulamento</p>
          <h2 className="display">O que levas</h2>
          <p className="muted mt">
            Material controlado à partida e no percurso. Falta de qualquer item obrigatório implica abandono imediato e desclassificação.
            Nas estafetas, o incumprimento de um elemento afeta a equipa.
          </p>
        </div>
        <div className="grid2">
          <div>
            <h3 className="cond" style={{ marginBottom: 16 }}>Obrigatório</h3>
            <ul className="ticklist">{MANDATORY_GEAR.map((g) => <li key={g}>{g}</li>)}</ul>
          </div>
          <div>
            <h3 className="cond" style={{ marginBottom: 16 }}>Recomendado</h3>
            <ul className="ticklist">{RECOMMENDED_GEAR.map((g) => <li key={g}>{g}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export function RaceDetail() {
  const { id = '' } = useParams()
  const regs = useCollection('registrations')
  const race = raceById(id)
  if (!race) return <NotFound />
  const p = currentPrice(race)
  const is160 = race.id === 'hell160'
  const sp = spots(race, regs)
  const ics = raceICS(race.id)

  return (
    <>
      <section className="sec tight">
        <div className="wrap">
          <p className="eyebrow">
            <Link to="/provas" style={{ textDecoration: 'none' }}>Provas</Link> / {race.kind}
          </p>
          <div className="split" style={{ alignItems: 'end' }}>
            <h1 className="display" style={{ fontSize: 'clamp(56px, 10vw, 150px)' }}>{race.name}</h1>
            <div className="stack" style={{ ['--s' as string]: '16px' }}>
              <p className="lede">{race.blurb}</p>
              <p className="muted">{race.startNote}</p>
              {sp.sold && (
                <p className="mono cm-soldout" style={{ margin: 0 }}>
                  Esgotado · {race.places} vagas preenchidas
                </p>
              )}
              <div className="row">
                {sp.sold ? (
                  <a className="btn ember" href={waitlistHref(race)}>Lista de espera</a>
                ) : (
                  <Link className="btn" to={`/inscricao?prova=${race.id}`}>
                    Inscrever{p ? ` · ${p.eur} €` : ''}
                  </Link>
                )}
                <Link className="btn ghost" to="/alojamento">Alojamento</Link>
              </div>
              {sp.sold && (
                <p className="muted cm-fine">
                  A lista de espera funciona por email: {EVENT.email}. Indica a prova, o nome e um telefone.
                </p>
              )}
            </div>
          </div>
          <div className="stats mt-l">
            <div><b>{race.distanceKm}</b><span>km</span></div>
            <div><b>{race.gainM}</b><span>m D+</span></div>
            <div><b>{race.limitH}</b><span>horas limite</span></div>
            <div><b>{race.aid}</b><span>abastecimentos</span></div>
            <div><b>{race.lifeBases}</b><span>bases de vida</span></div>
            <div>
              <b className={sp.sold ? 'ember cm-word' : sp.low ? 'ember' : undefined}>{sp.sold ? 'Esgotado' : sp.text}</b>
              <span>{sp.sold ? `${race.places} vagas` : race.places != null ? `vagas de ${race.places}` : 'vagas'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sec tight">
        <div className="wrap split">
          <div>
            <h3 className="cond">Preços</h3>
            <dl className="kv mt-s">
              {race.prices.map((x) => (
                <div key={x.until} style={{ display: 'contents' }}>
                  <dt style={{ color: x === p ? 'var(--ember)' : undefined }}>{x.label}</dt>
                  <dd style={{ fontWeight: x === p ? 700 : 400 }}>{x.eur} €</dd>
                </div>
              ))}
            </dl>
            <h3 className="cond mt-l">Partida</h3>
            <p className="mono mt-s">{race.start}</p>
            <p className="muted">Pavilhão Polivalente de A-do-Pinto, Serpa</p>
            <div className="cm-cal">
              {ics ? (
                <>
                  <button
                    type="button"
                    className="btn small ghost noarrow"
                    onClick={() => download(`hell160-${race.id}.ics`, raceICS(race.id) ?? ics, 'text/calendar;charset=utf-8')}
                  >
                    Adicionar ao calendário
                  </button>
                  <span className="mono muted">Ficheiro .ics · data provisória</span>
                </>
              ) : (
                <span className="tag">Data a anunciar</span>
              )}
            </div>
          </div>
          <div>
            {is160 ? (
              <>
                <RouteMap />
                <p className="mono muted mt-s">Mapa esquemático · o GPX oficial é enviado após confirmação da inscrição</p>
              </>
            ) : (
              <p className="notice">O traçado desta prova é publicado com o regulamento 2027.</p>
            )}
          </div>
        </div>
      </section>

      {is160 && (
        <section className="sec night">
          <div className="wrap">
            <p className="eyebrow">Altimetria e abastecimentos</p>
            <ElevationProfile height={220} />
            <table className="board mt">
              <thead>
                <tr><th>km</th><th>Ponto</th><th>Tipo</th><th>Δ km</th></tr>
              </thead>
              <tbody>
                {WAYPOINTS.map((w, i) => (
                  <tr key={i} style={{ cursor: 'default' }}>
                    <td>{w.km.toFixed(1)}</td>
                    <td style={{ fontFamily: 'var(--sans)', fontSize: 15 }}>{w.name}</td>
                    <td>{w.kind === 'life' ? <span className="tag ember">Base de vida</span> : w.kind === 'start' ? (i ? 'Meta' : 'Partida') : 'Abastecimento'}</td>
                    <td className="muted">{i ? (w.km - WAYPOINTS[i - 1].km).toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mono muted mt-s">Pontos e distâncias provisórios. Sujeitos a ajuste.</p>
          </div>
        </section>
      )}
      <Gear />
    </>
  )
}
