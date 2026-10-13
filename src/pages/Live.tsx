import { useEffect, useMemo, useState } from 'react'
import { ROUTE_KM, WAYPOINTS, pointAtKm } from '../data/route'
import { RouteMap } from '../components/RouteMap'
import { ElevationProfile } from '../components/Graphics'

// Simulação do tracking em direto. Em produção, as posições chegam da app (telemóvel)
// e do relógio emparelhado; aqui são geradas para mostrar o fluxo e os alertas.

const FIRST = ['Ana', 'João', 'Marta', 'Rui', 'Inês', 'Pedro', 'Sara', 'Tiago', 'Rita', 'Nuno', 'Carla', 'Hugo', 'Lucía', 'Javier', 'Sofia', 'Miguel', 'Teresa', 'Bruno', 'Elena', 'Diogo']
const LAST = ['S.', 'F.', 'M.', 'C.', 'R.', 'A.', 'P.', 'G.', 'L.', 'B.']

type Runner = {
  bib: number
  name: string
  country: string
  v: number // km/h inicial
  fatigue: number
  dnfKm: number | null
  sos: { at: number; dur: number } | null
}

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

const RUNNERS: Runner[] = (() => {
  const r = rng(160)
  return Array.from({ length: 36 }, (_, i) => {
    const v = 4.2 + r() * 4.4
    return {
      bib: 101 + i,
      name: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`,
      country: r() < 0.78 ? 'PT' : r() < 0.6 ? 'ES' : 'FR',
      v,
      fatigue: 0.15 + r() * 0.3,
      dnfKm: r() < 0.14 ? 40 + r() * 100 : null,
      sos: i === 17 ? { at: 14.2, dur: 0.6 } : null,
    }
  })
})()

const LIFE = WAYPOINTS.filter((w) => w.kind === 'life').map((w) => w.km)

function rawKm(rn: Runner, h: number) {
  // abrandamento progressivo e 25 min parados em cada base de vida
  const f = (t: number) => rn.v * t * (1 - (rn.fatigue * t) / 72)
  const stops = (LIFE.filter((b) => f(h) > b).length * 25) / 60
  return Math.min(f(Math.max(0, h - stops)), ROUTE_KM)
}

function kmAt(rn: Runner, h: number): { km: number; out: boolean; sos?: boolean; rescued?: boolean } {
  if (rn.sos && h >= rn.sos.at) {
    const km = rawKm(rn, rn.sos.at)
    return h < rn.sos.at + rn.sos.dur ? { km, out: false, sos: true } : { km, out: true, rescued: true }
  }
  const km = rawKm(rn, h)
  if (rn.dnfKm != null && km >= rn.dnfKm) return { km: rn.dnfKm, out: true }
  return { km, out: false }
}

// zona sem rede móvel: descida ao Pulo do Lobo
const NO_COVERAGE: [number, number] = [92, 110]

function statusOf(rn: Runner, h: number) {
  const p = kmAt(rn, h)
  const fin = p.km >= ROUTE_KM
  const phoneOk = !(p.km > NO_COVERAGE[0] && p.km < NO_COVERAGE[1])
  const lastCp = [...WAYPOINTS].reverse().find((w) => w.km <= p.km)
  const st = p.sos ? 'sos' : fin ? 'fin' : p.out ? 'out' : !phoneOk ? 'warn' : 'ok'
  return { ...p, fin, phoneOk, lastCp, st }
}

const fmt = (h: number) => {
  const total = Math.round(h * 60)
  const day = 22 * 60 + total
  const hh = Math.floor(day / 60) % 24
  const mm = day % 60
  const dlabel = day < 24 * 60 ? 'Sex' : day < 48 * 60 ? 'Sáb' : 'Dom'
  return `${dlabel} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}
const elapsed = (h: number) => `${Math.floor(h)}h${String(Math.round((h % 1) * 60)).padStart(2, '0')}`

export function Live() {
  const [h, setH] = useState(13.6)
  const [speed, setSpeed] = useState(0)
  const [sel, setSel] = useState<number | null>(118)
  const [view, setView] = useState<'org' | 'public'>('org')

  useEffect(() => {
    if (!speed) return
    const id = window.setInterval(() => setH((x) => (x >= 36 ? 36 : x + speed / 3600)), 1000)
    return () => window.clearInterval(id)
  }, [speed])

  const rows = useMemo(
    () =>
      RUNNERS.map((rn) => ({ rn, s: statusOf(rn, h) })).sort((a, b) => {
        const rank = (x: typeof a) => (x.s.st === 'out' ? 1 : 0)
        return rank(a) - rank(b) || b.s.km - a.s.km
      }),
    [h],
  )
  const sos = rows.filter((r) => r.s.st === 'sos')
  const selected = rows.find((r) => r.rn.bib === sel)
  const counts = {
    race: rows.filter((r) => r.s.st === 'ok' || r.s.st === 'warn').length,
    fin: rows.filter((r) => r.s.st === 'fin').length,
    out: rows.filter((r) => r.s.st === 'out').length,
  }

  return (
    <section className="night" style={{ minHeight: 'calc(100svh - 64px)' }}>
      <div className="wrap" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="row between" style={{ alignItems: 'end' }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>HELL160 · Live · simulação</p>
            <div className="clock">{fmt(h)} <span className="muted" style={{ fontSize: '0.5em' }}>+{elapsed(h)}</span></div>
          </div>
          <div className="controls">
            {(['org', 'public'] as const).map((v) => (
              <button key={v} className="chip" aria-pressed={view === v} onClick={() => setView(v)}>
                {v === 'org' ? 'Organização' : 'Público'}
              </button>
            ))}
            <span style={{ width: 16 }} />
            {[0, 600, 3600].map((s) => (
              <button key={s} className="chip" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                {s === 0 ? 'Pausa' : s === 600 ? '×600' : '×3600'}
              </button>
            ))}
          </div>
        </div>
        <input
          type="range" min={0} max={36} step={0.05} value={h} onChange={(e) => setH(+e.target.value)}
          aria-label="Tempo de prova" style={{ width: '100%', accentColor: 'var(--ember)', marginTop: 16 }}
        />
        <div className="row mono muted" style={{ gap: 24, fontSize: 12 }}>
          <span>Em prova {counts.race}</span><span>Chegados {counts.fin}</span><span>Desistências {counts.out}</span>
          <span>Sem rede móvel: km {NO_COVERAGE[0]}–{NO_COVERAGE[1]}</span>
        </div>
      </div>

      {view === 'org' && sos.map(({ rn, s }) => (
        <div key={rn.bib} className="alert">
          <span><b>SOS · #{rn.bib} {rn.name}</b> · km {s.km.toFixed(1)} · posição por relógio e telemóvel · equipa de resgate 2 a caminho</span>
          <button className="chip" style={{ borderColor: 'currentColor', color: 'inherit' }} onClick={() => setSel(rn.bib)}>Ver</button>
        </div>
      ))}

      <div className="live-grid">
        <div className="live-map">
          <RouteMap labels>
            {rows.filter((r) => !r.s.out || r.s.fin).map(({ rn, s }) => {
              const [x, y] = pointAtKm(view === 'public' ? (s.lastCp?.km ?? 0) : s.km)
              const cls = `runner${rn.bib === sel ? ' sel' : ''}${s.st === 'sos' && view === 'org' ? ' sos' : ''}`
              return (
                <g key={rn.bib} className={cls} style={{ transform: `translate(${x}px, ${y}px)` }} onClick={() => setSel(rn.bib)}>
                  <circle r={rn.bib === sel ? 10 : 6} fill={rn.bib === sel ? 'var(--ember)' : s.st === 'warn' && view === 'org' ? '#e0a43a' : '#efe9df'} />
                </g>
              )
            })}
          </RouteMap>
          {selected && (
            <div className="mt">
              <div className="row between">
                <h3 className="cond">#{selected.rn.bib} {selected.rn.name} <span className="muted">· {selected.rn.country}</span></h3>
                <span className="mono">{selected.s.km.toFixed(1)} / {ROUTE_KM} km</span>
              </div>
              <ElevationProfile height={140} marks progressKm={selected.s.km} />
              <dl className="kv mt-s" style={{ maxWidth: 560 }}>
                <dt>Último controlo</dt><dd>{selected.s.lastCp?.name} · km {selected.s.lastCp?.km.toFixed(1)}</dd>
                <dt>Ritmo médio</dt><dd>{h > 0 && selected.s.km > 0 ? `${((h * 60) / selected.s.km).toFixed(1)} min/km` : '—'}</dd>
                {view === 'org' && (
                  <>
                    <dt>Telemóvel</dt><dd style={{ color: selected.s.phoneOk ? undefined : '#e0a43a' }}>{selected.s.phoneOk ? 'GPS + rede · há 1 min' : 'Sem rede · último sinal no km ' + NO_COVERAGE[0]}</dd>
                    <dt>Relógio</dt><dd>GPS · há 1 min</dd>
                    <dt>Posição usada</dt><dd>{selected.s.phoneOk ? 'Telemóvel (relógio confirma)' : 'Relógio, via satélite'}</dd>
                  </>
                )}
              </dl>
            </div>
          )}
        </div>
        <div className="live-side">
          <table className="board">
            <thead><tr><th>#</th><th>Dorsal</th><th>Atleta</th><th>km</th><th /></tr></thead>
            <tbody>
              {rows.map(({ rn, s }, i) => (
                <tr key={rn.bib} className={rn.bib === sel ? 'sel' : ''} onClick={() => setSel(rn.bib)}>
                  <td>{s.st === 'out' ? '—' : i + 1}</td>
                  <td>{rn.bib}</td>
                  <td style={{ fontFamily: 'var(--sans)' }}>{rn.name}</td>
                  <td>{s.fin ? 'META' : s.st === 'out' ? (s.rescued ? 'RESG.' : 'DNF') : (view === 'public' ? s.lastCp?.km.toFixed(0) : s.km.toFixed(1))}</td>
                  <td><span className={`st ${s.st === 'fin' ? '' : view === 'public' && s.st !== 'out' ? '' : s.st}`} title={s.st} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
