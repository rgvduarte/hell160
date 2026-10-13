import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ROUTE_KM, WAYPOINTS, pointAtKm } from '../data/route'
import { RouteMap } from '../components/RouteMap'
import { ElevationProfile } from '../components/Graphics'
import '../styles/community.css'

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

const BIBS = new Set(RUNNERS.map((r) => r.bib))
const FIRST_BIB = RUNNERS[0].bib
const LAST_BIB = RUNNERS[RUNNERS.length - 1].bib
const DEFAULT_BIB = 118

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

type St = 'ok' | 'warn' | 'sos' | 'out' | 'fin'
const ST_LABEL: Record<St, string> = { ok: 'Em prova', warn: 'Sem rede móvel', sos: 'SOS', out: 'Fora de prova', fin: 'Chegou' }

function statusOf(rn: Runner, h: number) {
  const p = kmAt(rn, h)
  const fin = p.km >= ROUTE_KM
  const phoneOk = !(p.km > NO_COVERAGE[0] && p.km < NO_COVERAGE[1])
  const lastCp = [...WAYPOINTS].reverse().find((w) => w.km <= p.km)
  const st: St = p.sos ? 'sos' : fin ? 'fin' : p.out ? 'out' : !phoneOk ? 'warn' : 'ok'
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
const elapsed = (h: number) => {
  const m = Math.round(h * 60)
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
}

// ---------- pesquisa ----------

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

function matches(rn: Runner, query: string) {
  const q = fold(query).replace(/^#/, '')
  if (!q) return true
  if (/^\d+$/.test(q)) return String(rn.bib).startsWith(q)
  return fold(rn.name).includes(q)
}

// ---------- atletas seguidos (só neste browser) ----------

const FOLLOW_KEY = 'hell160.follow'

function readFollow(): number[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(FOLLOW_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x) && BIBS.has(x)) : []
  } catch {
    return []
  }
}

function useFollow() {
  const [follow, setFollow] = useState<number[]>(readFollow)
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === FOLLOW_KEY) setFollow(readFollow())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  const toggle = useCallback((bib: number) => {
    setFollow((cur) => {
      const next = cur.includes(bib) ? cur.filter((b) => b !== bib) : [...cur, bib]
      try {
        localStorage.setItem(FOLLOW_KEY, JSON.stringify(next))
      } catch {
        /* sem armazenamento: fica só nesta visita */
      }
      return next
    })
  }, [])
  return [follow, toggle] as const
}

// ---------- copiar link ----------

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* tenta o método antigo */
  }
  const active = document.activeElement as HTMLElement | null
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  } finally {
    active?.focus()
  }
}

export function Live() {
  const [h, setH] = useState(13.6)
  const [speed, setSpeed] = useState(0)
  const [view, setView] = useState<'org' | 'public'>('org')
  const [query, setQuery] = useState('')
  const [onlyFollowed, setOnlyFollowed] = useState(false)
  const [follow, toggleFollow] = useFollow()
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  // O dorsal selecionado vive no URL (?dorsal=123), para o link poder ser partilhado. Trocar de atleta substitui a entrada do histórico.
  const [params, setParams] = useSearchParams()
  const param = params.get('dorsal')?.trim() || null
  const paramBib = param != null && /^#?\d+$/.test(param) ? Number(param.replace(/\D/g, '')) : NaN
  const badParam = param != null && !BIBS.has(paramBib)
  const sel: number | null = param == null ? DEFAULT_BIB : badParam ? null : paramBib

  const setSel = useCallback(
    (bib: number) => {
      setCopied(null)
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('dorsal', String(bib))
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  useEffect(() => {
    if (!speed) return
    const id = window.setInterval(() => setH((x) => (x >= 36 ? 36 : x + speed / 3600)), 1000)
    return () => window.clearInterval(id)
  }, [speed])

  const rows = useMemo(
    () =>
      RUNNERS.map((rn) => ({ rn, s: statusOf(rn, h) }))
        .sort((a, b) => {
          const rank = (x: typeof a) => (x.s.st === 'out' ? 1 : 0)
          return rank(a) - rank(b) || b.s.km - a.s.km
        })
        .map((r, i) => ({ ...r, pos: r.s.st === 'out' ? null : i + 1 })),
    [h],
  )
  const visible = rows.filter((r) => (!onlyFollowed || follow.includes(r.rn.bib)) && matches(r.rn, query))
  const sos = rows.filter((r) => r.s.st === 'sos')
  const selected = rows.find((r) => r.rn.bib === sel)
  const counts = {
    race: rows.filter((r) => r.s.st === 'ok' || r.s.st === 'warn' || r.s.st === 'sos').length,
    fin: rows.filter((r) => r.s.st === 'fin').length,
    out: rows.filter((r) => r.s.st === 'out').length,
  }

  // Linha escolhida (pesquisa, link, mapa) sempre visível dentro da tabela, quando a tabela tem scroll próprio.
  // Sem ?dorsal= no URL a tabela abre no topo, com a liderança à vista.
  useEffect(() => {
    const box = boardRef.current
    if (!box || sel == null || param == null || box.scrollHeight <= box.clientHeight + 1) return
    const row = box.querySelector<HTMLElement>(`tr[data-bib="${sel}"]`)
    if (!row) return
    const head = box.querySelector('thead')?.getBoundingClientRect().height ?? 0
    const b = box.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    if (r.top < b.top + head || r.bottom > b.bottom) {
      box.scrollTop += r.top - b.top - head - (b.height - head - r.height) / 2
    }
    // corre só quando muda o atleta, não a cada atualização do relógio
  }, [sel])

  function search(v: string) {
    setQuery(v)
    const q = fold(v).replace(/^#/, '')
    if (!q) return
    const exact = /^\d+$/.test(q) && BIBS.has(Number(q)) ? Number(q) : null
    const hits = RUNNERS.filter((rn) => matches(rn, v))
    if (exact != null) setSel(exact)
    else if (hits.length === 1) setSel(hits[0].bib)
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (visible[0]) setSel(visible[0].rn.bib)
    } else if (e.key === 'Escape') {
      setQuery('')
    }
  }

  function onRowKey(e: KeyboardEvent<HTMLTableRowElement>, bib: number) {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSel(bib)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const sib = e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling
      if (sib instanceof HTMLElement && sib.tabIndex === 0) sib.focus()
    }
  }

  const shareUrl = sel != null ? `${window.location.origin}${window.location.pathname}?dorsal=${sel}` : ''

  async function copyLink() {
    setCopied((await copyText(shareUrl)) ? 'ok' : 'fail')
  }

  useEffect(() => {
    if (copied !== 'ok') return
    const t = window.setTimeout(() => setCopied(null), 2500)
    return () => window.clearTimeout(t)
  }, [copied])

  const followed = (bib: number) => follow.includes(bib)

  return (
    <section className="night cm-live" style={{ minHeight: 'calc(100svh - 64px)' }}>
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
        <div className="row mono muted" style={{ gap: '6px 24px', fontSize: 12 }}>
          <span>Em prova {counts.race}</span><span>Chegados {counts.fin}</span><span>Desistências {counts.out}</span>
          <span>Sem rede móvel: km {NO_COVERAGE[0]}–{NO_COVERAGE[1]}</span>
        </div>
        <p className="muted cm-live-note" style={{ margin: '12px 0 0' }}>
          Simulação com 36 atletas fictícios. Na prova, as posições chegam da app e do relógio de cada atleta.
        </p>
      </div>

      {view === 'org' && sos.map(({ rn, s }) => (
        <div key={rn.bib} className="alert" role="alert">
          <span><b>SOS · #{rn.bib} {rn.name}</b> · km {s.km.toFixed(1)} · posição por relógio e telemóvel · equipa de resgate 2 a caminho</span>
          <button className="chip" style={{ borderColor: 'currentColor', color: 'inherit' }} onClick={() => setSel(rn.bib)}>Ver</button>
        </div>
      ))}

      <div className="live-grid">
        <div className="live-map">
          <RouteMap labels>
            {rows.filter((r) => !r.s.out || r.s.fin).map(({ rn, s }) => {
              const [x, y] = pointAtKm(view === 'public' ? (s.lastCp?.km ?? 0) : s.km)
              const isSel = rn.bib === sel
              const cls = [
                'runner',
                isSel && 'sel',
                s.st === 'sos' && view === 'org' && 'sos',
                followed(rn.bib) && 'cm-followed',
                onlyFollowed && !followed(rn.bib) && !isSel && 'cm-dim',
              ].filter(Boolean).join(' ')
              return (
                <g key={rn.bib} className={cls} style={{ transform: `translate(${x}px, ${y}px)` }} onClick={() => setSel(rn.bib)}>
                  <title>#{rn.bib} {rn.name}</title>
                  <circle r={isSel ? 10 : 6} fill={isSel ? 'var(--ember)' : s.st === 'warn' && view === 'org' ? '#e0a43a' : '#efe9df'} />
                </g>
              )
            })}
          </RouteMap>

          {badParam && (
            <p className="notice mt" role="status">
              O dorsal {param} não existe nesta simulação. Os dorsais vão de {FIRST_BIB} a {LAST_BIB}.
            </p>
          )}

          {selected && (
            <div className="mt">
              <div className="cm-runner-head">
                <h3 className="cond">#{selected.rn.bib} {selected.rn.name} <span className="muted">· {selected.rn.country}</span></h3>
                <span className="mono">{selected.s.km.toFixed(1)} / {ROUTE_KM} km</span>
              </div>
              <div className="cm-runner-actions mt-s">
                <button
                  type="button"
                  className="btn small ghost noarrow"
                  aria-pressed={followed(selected.rn.bib)}
                  onClick={() => toggleFollow(selected.rn.bib)}
                >
                  {followed(selected.rn.bib) ? 'A seguir' : 'Seguir'}
                </button>
                <button type="button" className="btn small ghost noarrow" onClick={copyLink}>Copiar link</button>
                <span className="mono muted" role="status" aria-live="polite">
                  {copied === 'ok' ? 'Link copiado' : ''}
                </span>
              </div>
              {copied === 'fail' && (
                <div className="mt-s">
                  <label className="mono muted" htmlFor="live-share">Copia o link à mão</label>
                  <input id="live-share" className="cm-copy-field mt-s" readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} autoFocus />
                </div>
              )}
              <div className="mt-s">
                <ElevationProfile height={140} marks progressKm={selected.s.km} />
              </div>
              <dl className="kv mt-s" style={{ maxWidth: 560 }}>
                <dt>Estado</dt><dd>{ST_LABEL[selected.s.st]}{selected.pos ? ` · ${selected.pos}.º` : ''}</dd>
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
          <div className="cm-tools">
            <div className="cm-search">
              <label htmlFor="live-q" className="sr-only">Procurar por dorsal ou nome</label>
              <input
                id="live-q"
                type="search"
                value={query}
                onChange={(e) => search(e.target.value)}
                onKeyDown={onSearchKey}
                placeholder="Dorsal ou nome"
                autoComplete="off"
                enterKeyHint="search"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')}>Limpar</button>
              )}
            </div>
            <div className="row between" style={{ gap: 8 }}>
              <button type="button" className="chip" aria-pressed={onlyFollowed} onClick={() => setOnlyFollowed((x) => !x)}>
                Só os que sigo · {follow.length}
              </button>
              <span className="mono muted" style={{ fontSize: 11 }} aria-live="polite">
                {visible.length === rows.length ? `${rows.length} atletas` : `${visible.length} de ${rows.length}`}
              </span>
            </div>
          </div>
          <div className="cm-board" ref={boardRef}>
            <table className="board" aria-label="Classificação em direto (simulação)">
              <thead>
                <tr>
                  <th>#</th><th>Dorsal</th><th>Atleta</th><th>km</th><th><span className="sr-only">Estado</span></th>
                  <th className="cm-fcol"><span className="sr-only">Seguir</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ rn, s, pos }) => {
                  const isSel = rn.bib === sel
                  const dot = s.st === 'fin' ? '' : view === 'public' && s.st !== 'out' ? '' : s.st
                  return (
                    <tr
                      key={rn.bib}
                      data-bib={rn.bib}
                      className={isSel ? 'sel' : ''}
                      tabIndex={0}
                      aria-selected={isSel}
                      onClick={() => setSel(rn.bib)}
                      onKeyDown={(e) => onRowKey(e, rn.bib)}
                    >
                      <td>{pos ?? '—'}</td>
                      <td>{rn.bib}</td>
                      <td className="cm-name">{rn.name}</td>
                      <td>{s.fin ? 'META' : s.st === 'out' ? (s.rescued ? 'RESG.' : 'DNF') : (view === 'public' ? s.lastCp?.km.toFixed(0) : s.km.toFixed(1))}</td>
                      <td>
                        <span className={`st ${dot}`} title={ST_LABEL[s.st]} />
                        <span className="sr-only">{ST_LABEL[s.st]}</span>
                      </td>
                      <td className="cm-fcol">
                        <button
                          type="button"
                          className="cm-follow"
                          aria-pressed={followed(rn.bib)}
                          aria-label={`Seguir ${rn.name}, dorsal ${rn.bib}`}
                          title={followed(rn.bib) ? 'A seguir' : 'Seguir'}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFollow(rn.bib)
                          }}
                        />
                      </td>
                    </tr>
                  )
                })}
                {visible.length === 0 && (
                  <tr className="empty">
                    <td colSpan={6}>
                      {onlyFollowed && follow.length === 0
                        ? 'Ainda não segues ninguém. Carrega no + ao lado de um atleta para o acompanhares aqui.'
                        : `Nenhum atleta corresponde a «${query.trim()}».`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
