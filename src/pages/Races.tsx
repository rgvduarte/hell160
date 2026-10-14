import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { NEWSLETTER, SITE } from '../data/site'
import { EVENT, MANDATORY_GEAR, RACES, RECOMMENDED_GEAR, currentPrice, raceById, type Race } from '../data/event'
import { WAYPOINTS } from '../data/route'
import { ROUTE_FILES, useOfficialRoute, type RouteProfile, type RouteWaypointKind } from '../data/routes'
import { ElevationProfile } from '../components/Graphics'
import { RouteMap } from '../components/RouteMap'
import { TrailMap } from '../components/TrailMap'
import { useCollection, type Registration } from '../lib/store'
import { download, raceICS, spotsLeft } from '../lib/domain'
import { NotFound } from './NotFound'
import '../styles/community.css'

const pl = (n: number, one: string, many: string) => (n === 1 ? one : many)

// Números em pt-PT (vírgula decimal). Em Schibsted Grotesk, os algarismos tabulares também alargam a vírgula
// ("164 , 6"): o separador vai num span com algarismos normais.
function Num({ n, fixed = false }: { n: number; fixed?: boolean }) {
  const s = n.toLocaleString('pt-PT', { minimumFractionDigits: fixed ? 1 : 0, maximumFractionDigits: 1 })
  const i = s.indexOf(',')
  if (i < 0) return <>{s}</>
  return (
    <>
      {s.slice(0, i)}
      <span className="cm-plain">,</span>
      {s.slice(i + 1)}
    </>
  )
}

// raceICS() marca as horas com TZID=Europe/Lisbon mas sem bloco VTIMEZONE, que o RFC 5545 (3.2.19) exige;
// alguns clientes (Outlook) importam então a hora errada. Aqui passam a UTC. Se o .ics já vier em UTC, fica igual.
function lisbonToUtc(local: string) {
  const [y, mo, d, h, mi, se] = [0, 4, 6, 9, 11, 13].map((i, k) => +local.slice(i, i + (k ? 2 : 4)))
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, se)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(asUtc))
  const get = (t: string) => +(parts.find((p) => p.type === t)?.value ?? 0)
  const offset = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - asUtc
  return `${new Date(asUtc - offset).toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
}
const icsInUtc = (ics: string) =>
  ics.replace(/(DTSTART|DTEND);TZID=Europe\/Lisbon:(\d{8}T\d{6})/g, (_m, prop: string, local: string) => `${prop}:${lisbonToUtc(local)}`)

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
            <span className="v"><Num n={r.distanceKm} /> km<small>distância</small></span>
            <span className="v hide-sm">{r.gainM} m<small>D+</small></span>
            <span className="v hide-sm">{r.limitH} h<small>limite</small></span>
            <span className={`v hide-sm cm-left${sp.low || sp.sold ? ' low' : ''}`}>
              {sp.sold ? '0' : sp.text}
              <small>{sp.sold ? 'esgotado' : pl(sp.left, 'vaga', 'vagas')}</small>
            </span>
            <span className="go">
              {sp.sold ? (
                <>
                  <span className="cm-sm-only cm-left low">Esgotado · </span>
                  Lista de espera →
                </>
              ) : (
                <>
                  {sp.finite && <span className={`cm-sm-only cm-left${sp.low ? ' low' : ''}`}>{sp.text} {pl(sp.left, 'vaga', 'vagas')} · </span>}
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
          <h1 className="display" style={{ fontSize: 'clamp(56px, 11vw, 168px)' }}>Provas 2027</h1>
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

const MAP_H = 'clamp(380px, 62vh, 540px)'
const km1 = (n: number) => n.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const KIND: Record<RouteWaypointKind, string> = {
  aid: 'Abastecimento',
  life: 'Base de vida',
  water: 'Ponto de água',
  control: 'Controlo',
}

// Legenda do mapa real: só os tipos de ponto que existem no GPX.
function MapKey({ kinds }: { kinds: Set<string> }) {
  const items: [string, string][] = [
    ['route', 'Traçado'],
    ['start', 'Partida e meta'],
    ...(['aid', 'life', 'water', 'control'] as const).filter((k) => kinds.has(k)).map((k) => [k, KIND[k]] as [string, string]),
  ]
  return (
    <ul className="route-key" aria-label="Legenda do mapa">
      {items.map(([k, t]) => (
        <li key={k}>
          <i className={k} aria-hidden="true" />
          {t}
        </li>
      ))}
    </ul>
  )
}

// Altimetria e pontos do GPX oficial (km medidos sobre o traçado).
function RealProfileSection({ race, prof }: { race: Race; prof: RouteProfile }) {
  const hasEle = prof.profile.some((p) => p[1] != null)
  const rows: { km: number; name: string; kind: RouteWaypointKind | 'start' | 'finish' }[] = [
    { km: 0, name: 'A-do-Pinto', kind: 'start' },
    ...prof.waypoints.map((w) => ({ km: w.km, name: w.name, kind: w.kind ?? ('aid' as const) })),
    { km: prof.distanceKm, name: 'A-do-Pinto', kind: 'finish' },
  ]
  return (
    <section className="sec night">
      <div className="wrap">
        <h2 className="cond" id="abastecimentos" style={{ fontSize: 'clamp(28px, 3vw, 40px)', marginBottom: 16 }}>
          {prof.waypoints.length ? 'Altimetria e abastecimentos' : 'Altimetria'}
        </h2>
        {hasEle ? (
          <TrackProfile data={prof} label={`Perfil altimétrico do ${race.name}`} />
        ) : (
          <p className="notice">O GPX oficial desta prova não tem altitude.</p>
        )}
        {prof.waypoints.length > 0 && (
          <table className="board mt">
            <thead>
              <tr><th>km</th><th>Ponto</th><th>Tipo</th><th>Δ km</th></tr>
            </thead>
            <tbody>
              {rows.map((w, i) => (
                <tr key={i} style={{ cursor: 'default' }}>
                  <td><Num n={w.km} fixed /></td>
                  <td style={{ fontFamily: 'var(--sans)', fontSize: 15 }}>{w.name}</td>
                  <td>
                    {w.kind === 'life' ? <span className="tag ember">Base de vida</span> : w.kind === 'start' ? 'Partida' : w.kind === 'finish' ? 'Meta' : KIND[w.kind]}
                  </td>
                  <td className="muted">{i ? <Num n={Math.round((w.km - rows[i - 1].km) * 10) / 10} fixed /> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mono muted mt-s cm-plain">
          Pontos e distâncias do GPX oficial da edição 2026, medidos sobre o traçado. Podem ser ajustados para 2027.
        </p>
      </div>
    </section>
  )
}

// Perfil altimétrico real: km no eixo x, altitude no y, marcas dos pontos do GPX.
// Desenhado à largura real (sem esticar o texto); ponteiro ou setas do teclado mostram km e altitude.
function TrackProfile({ data, label }: { data: RouteProfile; label: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  const [at, setAt] = useState<number | null>(null)
  const [said, setSaid] = useState('')

  useEffect(() => {
    const node = box.current
    if (!node) return
    setW(node.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setW(node.clientWidth))
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const pts = data.profile.filter((p): p is [number, number] => p[1] != null)
  const total = data.distanceKm
  const lo = Math.min(...pts.map((p) => p[1]))
  const hi = Math.max(...pts.map((p) => p[1]))
  const yStep = [10, 20, 25, 50, 100, 200, 250, 500].find((s) => (hi - lo) / s <= 4) ?? 500
  const y0 = Math.floor(lo / yStep) * yStep
  const y1 = Math.ceil(hi / yStep) * yStep
  const H = w && w < 560 ? 200 : 260
  const pad = { l: 46, r: 8, t: 12, b: 30 }
  const iw = Math.max(1, w - pad.l - pad.r)
  const ih = H - pad.t - pad.b
  const x = (km: number) => pad.l + (km / total) * iw
  const y = (e: number) => pad.t + ih - ((e - y0) / (y1 - y0)) * ih
  const xStep = [5, 10, 20, 25, 50].find((s) => total / s <= Math.max(3, Math.floor(iw / 80))) ?? 50
  const xTicks: number[] = []
  for (let k = 0; x(k) < x(total) - 60; k += xStep) xTicks.push(k)
  const yTicks: number[] = []
  for (let e = y0; e <= y1; e += yStep) yTicks.push(e)

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('')
  const area = `${line}L${x(pts[pts.length - 1][0]).toFixed(1)},${pad.t + ih}L${x(pts[0][0]).toFixed(1)},${pad.t + ih}Z`

  const idxAt = (km: number) => {
    let best = 0
    for (let i = 0; i < pts.length; i++) if (Math.abs(pts[i][0] - km) < Math.abs(pts[best][0] - km)) best = i
    return best
  }
  const cur = at == null ? null : pts[idxAt(at)]
  const wp = cur ? data.waypoints.find((p) => Math.abs(p.km - cur[0]) <= 0.25) : undefined
  const readout = (p: [number, number]) => {
    const near = data.waypoints.find((q) => Math.abs(q.km - p[0]) <= 0.25)
    return `km ${km1(p[0])}, ${p[1]} m${near ? `, ${near.name}` : ''}`
  }

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const km = ((e.clientX - r.left - pad.l) / iw) * total
    setAt(Math.max(0, Math.min(total, km)))
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 1
    const now = at ?? 0
    const next =
      e.key === 'ArrowRight' ? now + step : e.key === 'ArrowLeft' ? now - step : e.key === 'Home' ? 0 : e.key === 'End' ? total : null
    if (next == null) return
    e.preventDefault()
    const km = Math.max(0, Math.min(total, next))
    setAt(km)
    setSaid(readout(pts[idxAt(km)]))
  }

  // a etiqueta fica ao lado do cursor, no topo do gráfico, para não tapar a linha
  const tipRight = cur ? x(cur[0]) > pad.l + iw / 2 : false
  return (
    <div
      ref={box}
      className="route-profile"
      tabIndex={0}
      aria-label={`${label}: ${km1(total)} km${data.gainM != null ? `, D+ ${data.gainM} m` : ''}, altitude entre ${lo} e ${hi} m. Usa as setas para percorrer.`}
      onPointerMove={onMove}
      onPointerDown={onMove}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setAt(null)}
      onKeyDown={onKey}
      onBlur={() => setAt(null)}
    >
      {w > 0 && (
        <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} aria-hidden="true">
          {yTicks.map((e) => (
            <g key={e}>
              <line x1={pad.l} x2={w - pad.r} y1={y(e)} y2={y(e)} className={e === y0 ? 'base' : 'grid'} />
              <text x={pad.l - 8} y={y(e) + 4} textAnchor="end" className="tick">
                {e} m
              </text>
            </g>
          ))}
          {xTicks.map((k) => (
            <text key={k} x={x(k)} y={H - 8} textAnchor={k ? 'middle' : 'start'} className="tick">
              {k} km
            </text>
          ))}
          <text x={x(total)} y={H - 8} textAnchor="end" className="tick">
            {km1(total)} km
          </text>
          <path d={area} className="area" />
          <path d={line} className="line" />
          {data.waypoints.map((p, i) => (
            <line
              key={i}
              x1={x(p.km)}
              x2={x(p.km)}
              y1={pad.t + ih}
              y2={pad.t + ih - (p.kind === 'life' ? 14 : p.kind === 'water' ? 6 : 9)}
              className={`wp ${p.kind ?? 'aid'}`}
            />
          ))}
          {cur && (
            <>
              <line x1={x(cur[0])} x2={x(cur[0])} y1={pad.t} y2={pad.t + ih} className="cursor" />
              <circle cx={x(cur[0])} cy={y(cur[1])} r={5} className="dot" />
            </>
          )}
        </svg>
      )}
      {cur && (
        <div
          className="route-profile-tip"
          style={{ top: pad.t, left: x(cur[0]) + (tipRight ? -10 : 10), transform: tipRight ? 'translateX(-100%)' : undefined }}
        >
          <b>{cur[1]} m</b>
          <span>
            km {km1(cur[0])}
            {wp && ` · ${wp.name}`}
          </span>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </div>
  )
}

function Gear() {
  return (
    <section className="sec rule">
      <div className="wrap split">
        <div>
          <h2 className="display" id="material">O que levas</h2>
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
  // traçado oficial: só com ROUTE_PUBLISHED a true e ficheiros carregados; senão, fica tudo como antes
  const official = useOfficialRoute(id)
  const race = raceById(id)
  if (!race) return <NotFound />
  const p = currentPrice(race)
  const is160 = race.id === 'hell160'
  const sp = spots(race, regs)
  const ics = raceICS(race.id)
  const real = official.status === 'ready' ? official : null
  const prof = real?.profile ?? null
  // secção de altimetria: real quando há perfil; o esquema do HELL160 enquanto não houver (sem piscar durante o carregamento)
  const realProfile = !!prof
  const schematicProfile = is160 && !realProfile && official.status !== 'loading'

  return (
    <>
      <section className="sec tight">
        <div className="wrap">
          <nav className="crumbs" aria-label="Estás em">
            <Link to="/provas">Provas</Link> <span aria-hidden="true">/</span> {race.kind}
          </nav>
          <h1 className="display cm-race-title" style={{ ['--len' as string]: Math.max(...race.name.split(/\s+/).map((w) => w.length)) }}>
            {race.name}
          </h1>
          <div className="split mt" style={{ alignItems: 'start' }}>
            <p className="lede" style={{ margin: 0 }}>{race.blurb}</p>
            <div className="stack" style={{ ['--s' as string]: '16px' }}>
              <p className="muted" style={{ margin: 0 }}>{race.startNote}</p>
              {sp.sold && (
                <p className="mono cm-plain cm-soldout" style={{ marginBottom: 0 }}>
                  Esgotado · {race.places} {pl(race.places ?? 0, 'vaga preenchida', 'vagas preenchidas')}
                </p>
              )}
              <div className="row">
                {sp.sold ? (
                  <a className="btn ember" href={waitlistHref(race)}>Lista de espera</a>
                ) : (
                  SITE.registration.status === 'abertas' ? (
                    <Link className="btn" to={`/inscricao?prova=${race.id}`}>
                      Inscrever{p ? ` · ${p.eur} €` : ''}
                    </Link>
                  ) : (
                    <Link className="btn" to={NEWSLETTER}>Avisem-me quando abrirem</Link>
                  )
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
            <div><b className="cm-plain">{race.distanceKm.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}</b><span>km</span></div>
            <div><b>{race.gainM}</b><span>m D+</span></div>
            <div><b>{race.limitH}</b><span>{pl(race.limitH, 'hora limite', 'horas limite')}</span></div>
            <div><b>{race.aid}</b><span>{pl(race.aid, 'abastecimento', 'abastecimentos')}</span></div>
            <div><b>{race.lifeBases}</b><span>{pl(race.lifeBases, 'base de vida', 'bases de vida')}</span></div>
            <div>
              <b className={sp.sold ? 'ember cm-word' : sp.low ? 'ember' : undefined}>{sp.sold ? 'Esgotado' : sp.text}</b>
              <span>
                {sp.sold
                  ? `${race.places} ${pl(race.places ?? 0, 'vaga', 'vagas')}`
                  : `${pl(sp.left, 'vaga', 'vagas')}${race.places != null ? ` de ${race.places}` : ''}`}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="sec tight">
        <div className="wrap split">
          <div>
            <h2 className="cond race-sub">Preços</h2>
            <dl className="kv mt-s">
              {race.prices.map((x) => (
                <div key={x.until} style={{ display: 'contents' }}>
                  <dt style={{ color: x === p ? 'var(--ember)' : undefined }}>{x.label}</dt>
                  <dd style={{ fontWeight: x === p ? 700 : 400 }}>{x.eur} €</dd>
                </div>
              ))}
            </dl>
            <h2 className="cond race-sub mt-l">Partida</h2>
            <p className="mono mt-s cm-plain">{race.start}</p>
            <p className="muted">Pavilhão Polivalente de A-do-Pinto, Serpa</p>
            <div className="cm-cal">
              {ics ? (
                <>
                  <button
                    type="button"
                    className="btn small ghost noarrow"
                    onClick={() => download(`hell160-${race.id}.ics`, icsInUtc(raceICS(race.id) ?? ics), 'text/calendar;charset=utf-8')}
                  >
                    Adicionar ao calendário
                  </button>
                  <span className="mono muted cm-plain">Ficheiro .ics · data provisória</span>
                </>
              ) : (
                <span className="tag">Data a anunciar</span>
              )}
            </div>
          </div>
          <div>
            {real ? (
              <>
                <div className="map-frame">
                  <TrailMap routes={[real.route]} waypoints terrain3d height={MAP_H} label={`Mapa do percurso do ${race.name}`} />
                </div>
                <MapKey kinds={new Set((prof?.waypoints ?? []).map((w) => w.kind ?? 'aid'))} />
                <div className="route-files">
                  <p className="mono muted cm-plain">
                    Traçado oficial da edição 2026, igual em 2027
                    {prof && (
                      <>
                        {' '}· GPS: {km1(prof.distanceKm)} km{prof.gainM != null && <>, D+ {prof.gainM.toLocaleString('pt-PT')} m</>}
                      </>
                    )}
                  </p>
                  <a className="btn small ghost noarrow" href={real.gpxUrl} download={`${ROUTE_FILES[race.id]}-2026.gpx`}>
                    Descarregar GPX
                  </a>
                </div>
              </>
            ) : official.status === 'loading' ? (
              <div className="map-frame">
                <div className="trailmap" style={{ height: MAP_H }}>
                  <p className="trailmap-note mono">A carregar o mapa…</p>
                </div>
              </div>
            ) : is160 ? (
              <>
                <div className="cm-svg-open">
                  <RouteMap />
                </div>
                <p className="mono muted mt-s cm-plain">Mapa esquemático · o GPX oficial é enviado após confirmação da inscrição</p>
              </>
            ) : (
              <p className="notice">O traçado desta prova é publicado com o regulamento 2027.</p>
            )}
          </div>
        </div>
      </section>

      {realProfile && prof && <RealProfileSection race={race} prof={prof} />}

      {schematicProfile && (
        <section className="sec night">
          <div className="wrap">
            <h2 className="cond" id="abastecimentos" style={{ fontSize: 'clamp(28px, 3vw, 40px)', marginBottom: 16 }}>Altimetria e abastecimentos</h2>
            <div className="cm-svg-open">
              <ElevationProfile height={220} />
            </div>
            <table className="board mt">
              <thead>
                <tr><th>km</th><th>Ponto</th><th>Tipo</th><th>Δ km</th></tr>
              </thead>
              <tbody>
                {WAYPOINTS.map((w, i) => (
                  <tr key={i} style={{ cursor: 'default' }}>
                    <td><Num n={w.km} fixed /></td>
                    <td style={{ fontFamily: 'var(--sans)', fontSize: 15 }}>{w.name}</td>
                    <td>{w.kind === 'life' ? <span className="tag ember">Base de vida</span> : w.kind === 'start' ? (i ? 'Meta' : 'Partida') : 'Abastecimento'}</td>
                    <td className="muted">{i ? <Num n={w.km - WAYPOINTS[i - 1].km} fixed /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mono muted mt-s cm-plain">Pontos e distâncias provisórios. Sujeitos a ajuste.</p>
          </div>
        </section>
      )}
      <Gear />
    </>
  )
}
