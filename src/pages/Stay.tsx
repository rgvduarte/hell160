import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { EVENT_NIGHTS, FEATURES, PLATFORM_FEE, VILLAGES, type FeatureKey } from '../data/listings'
import { IMPACT } from '../data/event'
import { HousePlate } from '../components/HousePlate'
import { allListings, eur, findListing, takenNights } from '../lib/domain'
import { add, getAll, getSessionEmail, sameEmail, uid, useCollection, type Booking } from '../lib/store'
import { Field } from './Register'
import { NotFound } from './NotFound'
import '../styles/flows.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const digits = (s: string) => s.replace(/\D/g, '')
const phoneOk = (s: string) => /^\+?[\d\s().-]+$/.test(s.trim()) && digits(s).length >= 9 && digits(s).length <= 15
const nightLabel = (iso: string) => EVENT_NIGHTS.find((n) => n.iso === iso)?.label ?? iso

// ---------- filtros guardados no URL (?aldeia=&pessoas=&max=&precisa=) ----------

const DEFAULT_GUESTS = 2
const DEFAULT_MAX = 80
const DEFAULT_NEED: FeatureKey[] = ['ac']

type Filters = { village: string; guests: number; max: number; need: FeatureKey[] }

function readFilters(p: URLSearchParams, maxGuests: number): Filters {
  const int = (v: string | null, def: number) => (v != null && /^\d+$/.test(v) ? +v : def)
  const village = p.get('aldeia') ?? ''
  const rawNeed = p.get('precisa')
  return {
    village: (VILLAGES as readonly string[]).includes(village) ? village : '',
    guests: Math.min(maxGuests, Math.max(1, int(p.get('pessoas'), DEFAULT_GUESTS))),
    max: Math.min(80, Math.max(50, Math.round(int(p.get('max'), DEFAULT_MAX) / 5) * 5)),
    need: rawNeed == null ? DEFAULT_NEED : (rawNeed.split(',').filter((f) => f in FEATURES) as FeatureKey[]),
  }
}

function writeFilters(f: Filters) {
  const p = new URLSearchParams()
  if (f.village) p.set('aldeia', f.village)
  if (f.guests !== DEFAULT_GUESTS) p.set('pessoas', String(f.guests))
  if (f.max !== DEFAULT_MAX) p.set('max', String(f.max))
  if (f.need.join(',') !== DEFAULT_NEED.join(',')) p.set('precisa', f.need.join(','))
  return p
}

export function Stay() {
  const hosts = useCollection('hosts')
  const bookings = useCollection('bookings')
  const [params, setParams] = useSearchParams()
  const listings = useMemo(() => allListings(hosts), [hosts])
  const maxGuests = Math.max(8, ...listings.map((l) => l.sleeps))
  const f = readFilters(params, maxGuests)
  const isDefault = writeFilters(f).toString() === ''
  const search = params.toString()

  const setF = (patch: Partial<Filters>) => setParams(writeFilters({ ...f, ...patch }), { replace: true })
  const toggle = (k: FeatureKey) => setF({ need: f.need.includes(k) ? f.need.filter((x) => x !== k) : [...f.need, k] })

  const results = listings
    .filter(
      (l) =>
        (!f.village || l.village === f.village) &&
        l.sleeps >= f.guests &&
        l.eurNight <= f.max &&
        f.need.every((k) => l.features.includes(k)),
    )
    .sort((a, b) => a.kmToStart - b.kmToStart)

  return (
    <>
      <section className="sec tight">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <div>
            <p className="eyebrow">Alojamento comunitário · 1 – 4 julho 2027</p>
            <h1 className="display" style={{ fontSize: 'clamp(52px, 9vw, 140px)' }}>Dorme na aldeia</h1>
          </div>
          <div className="stack" style={{ ['--s' as string]: '16px' }}>
            <p className="lede">
              Casas de famílias do concelho de Serpa, abertas para o fim de semana da prova. {IMPACT.nightly} por noite. O anfitrião recebe
              {' '}{Math.round((1 - PLATFORM_FEE) * 100)} % do valor; o resto paga a plataforma e o seguro.
            </p>
            <Link className="btn ghost" to="/alojamento/anfitriao">Tenho uma casa para abrir</Link>
          </div>
        </div>
      </section>

      <section className="sec tight rule">
        <div className="wrap stay-layout">
          <aside className="filters" aria-label="Filtros">
            <div className="field">
              <label htmlFor="v">Aldeia</label>
              <select id="v" value={f.village} onChange={(e) => setF({ village: e.target.value })}>
                <option value="">Todas</option>
                {VILLAGES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="g">Pessoas · {f.guests}</label>
              <input id="g" type="range" min={1} max={maxGuests} value={f.guests} onChange={(e) => setF({ guests: +e.target.value })}
                style={{ accentColor: 'var(--ember)', border: 0 }} />
            </div>
            <div className="field">
              <label htmlFor="p">Até {f.max} € / noite</label>
              <input id="p" type="range" min={50} max={80} step={5} value={f.max} onChange={(e) => setF({ max: +e.target.value })}
                style={{ accentColor: 'var(--ember)', border: 0 }} />
            </div>
            <div className="field">
              <span className="label">Precisa de</span>
              <div className="chips">
                {(Object.keys(FEATURES) as FeatureKey[]).map((k) => (
                  <button type="button" key={k} className="chip" aria-pressed={f.need.includes(k)} onClick={() => toggle(k)}>
                    {FEATURES[k]}
                  </button>
                ))}
              </div>
            </div>
          </aside>
          <div>
            <div className="row flow-count">
              <p className="mono muted" style={{ margin: 0 }} aria-live="polite">
                {results.length} {results.length === 1 ? 'casa' : 'casas'} · ordenadas por distância à partida
              </p>
              {!isDefault && (
                <button type="button" className="btn small ghost noarrow" onClick={() => setParams({}, { replace: true })}>Limpar filtros</button>
              )}
            </div>
            {results.length === 0 ? (
              <p className="notice mt">Nenhuma casa com estes filtros. Tira um ou dois.</p>
            ) : (
              <div className="listings mt">
                {results.map((l) => {
                  const taken = takenNights(l.id, bookings)
                  const free = EVENT_NIGHTS.filter((n) => !taken.has(n.iso)).length
                  const to = f.guests !== DEFAULT_GUESTS ? `/alojamento/${l.id}?pessoas=${f.guests}` : `/alojamento/${l.id}`
                  return (
                    <Link key={l.id} to={to} state={{ from: search }} className={`listing${free === 0 ? ' is-full' : ''}`}>
                      <div className="plate"><HousePlate listing={l} /></div>
                      <div className="row between mono">
                        <span>{l.village}</span>
                        <span>{l.kmToStart.toLocaleString('pt-PT')} km</span>
                      </div>
                      <h3>{l.title}</h3>
                      <p className="muted" style={{ margin: 0, fontSize: 15 }}>{l.note}</p>
                      <div className="row between mono">
                        <span>{l.sleeps} pessoas · {l.bedrooms} qt</span>
                        <strong>{eur(l.eurNight)}</strong>
                      </div>
                      <span className={`flow-free${free > 0 && free < EVENT_NIGHTS.length ? ' low' : ''}`}>
                        {free === 0 ? 'Sem noites livres' : free === EVENT_NIGHTS.length ? 'Todas as noites livres' : `${free} de ${EVENT_NIGHTS.length} noites livres`}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
            <p className="mono muted mt-l">
              Protótipo: casas de exemplo e casas aprovadas neste browser. Os pedidos de reserva são uma simulação e ficam guardados só aqui.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

// ---------- página da casa e pedido de reserva ----------

type Contact = { name: string; email: string; phone: string; from: 'link' | 'session' | null }

// Pré-preenchimento: ?nome=&email=&tel= (vindo da inscrição) ou a sessão da área do atleta.
function initialContact(params: URLSearchParams): Contact {
  const q = { name: params.get('nome') ?? '', email: params.get('email') ?? '', phone: params.get('tel') ?? '' }
  if (q.name || q.email || q.phone) return { ...q, from: 'link' }
  const session = getSessionEmail()
  if (!session) return { ...q, from: null }
  const mine = getAll().registrations.filter((r) => sameEmail(r.email, session))
  const reg = [...mine].reverse().find((r) => r.status !== 'cancelada') ?? mine[mine.length - 1]
  return reg
    ? { name: `${reg.first} ${reg.last}`, email: reg.email, phone: reg.phone, from: 'session' }
    : { name: '', email: session, phone: '', from: 'session' }
}

export function StayDetail() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { state } = useLocation() as { state: { from?: string } | null }
  const hosts = useCollection('hosts')
  const bookings = useCollection('bookings')
  const l = findListing(id.toLowerCase(), hosts)

  const [contact] = useState(() => initialContact(params))
  const [nights, setNights] = useState<string[]>(['2027-07-02', '2027-07-03'])
  const [guests, setGuests] = useState(() => {
    const p = Number(params.get('pessoas'))
    return String(Number.isInteger(p) && p >= 1 ? Math.min(p, l?.sleeps ?? p) : Math.min(2, l?.sleeps ?? 2))
  })
  const [name, setName] = useState(contact.name)
  const [email, setEmail] = useState(contact.email)
  const [phone, setPhone] = useState(contact.phone)
  const [tried, setTried] = useState(false)
  const [touched, setTouched] = useState<string[]>([])
  const [doneId, setDoneId] = useState<string | null>(null)
  const [raceMsg, setRaceMsg] = useState('')
  const aside = useRef<HTMLElement>(null)

  // Os dados pessoais não ficam no URL (para o link da casa poder ser partilhado).
  useEffect(() => {
    if (!params.has('nome') && !params.has('email') && !params.has('tel')) return
    const next = new URLSearchParams(params)
    ;['nome', 'email', 'tel'].forEach((k) => next.delete(k))
    setParams(next, { replace: true, state })
  }, [params, setParams, state])

  if (!l) return <NotFound />

  const mine = bookings.filter((b) => b.listingId === l.id)
  const taken = takenNights(l.id, bookings)
  const emailOk = EMAIL_RE.test(email.trim())
  const pendingOthers = new Set(
    mine.filter((b) => b.status === 'pedido' && !(emailOk && sameEmail(b.email, email))).flatMap((b) => b.nights),
  )
  const own = emailOk ? mine.filter((b) => (b.status === 'pedido' || b.status === 'confirmado') && sameEmail(b.email, email)) : []
  const ownNights = new Set(own.flatMap((b) => b.nights))
  const selected = nights.filter((n) => !taken.has(n))
  const sub = selected.length * l.eurNight
  const g = Number(guests)
  const booking = doneId ? bookings.find((b) => b.id === doneId) : undefined
  const back = `/alojamento${state?.from ? `?${state.from}` : ''}`

  const errors: Record<string, string> = {}
  if (selected.length === 0) errors.nights = 'Escolhe pelo menos uma noite.'
  else {
    const dup = selected.filter((n) => ownNights.has(n))
    if (dup.length) errors.nights = `Já tens um pedido nesta casa para ${dup.map(nightLabel).join(' e ')}. Desmarca ${dup.length > 1 ? 'essas noites' : 'essa noite'}.`
  }
  if (!guests.trim() || !Number.isInteger(g) || g < 1) errors.guests = 'Pelo menos 1 pessoa.'
  else if (g > l.sleeps) errors.guests = `Esta casa recebe até ${l.sleeps} pessoas.`
  if (!name.trim()) errors.name = 'Falta o nome.'
  if (!email.trim()) errors.email = 'Falta o email.'
  else if (!emailOk) errors.email = 'Email inválido. Confirma se está bem escrito.'
  if (phone.trim() && !phoneOk(phone)) errors.phone = 'Número inválido: pelo menos 9 dígitos.'
  const show = (k: string) => (tried || touched.includes(k) ? errors[k] : undefined)
  const touch = (k: string) => () => setTouched((t) => (t.includes(k) ? t : [...t, k]))

  function toggleNight(iso: string) {
    setRaceMsg('')
    setNights((x) => (x.includes(iso) ? x.filter((y) => y !== iso) : [...x, iso].sort()))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!l) return
    if (Object.keys(errors).length) {
      setTried(true)
      requestAnimationFrame(() => document.querySelector<HTMLElement>('.flow-book [aria-invalid="true"]')?.focus())
      return
    }
    // outra reserva pode ter sido confirmada entretanto
    const nowTaken = takenNights(l.id, getAll().bookings)
    const lost = selected.filter((n) => nowTaken.has(n))
    if (lost.length) {
      setRaceMsg(`${lost.map(nightLabel).join(' e ')} acabou de ficar reservada. Revê as noites.`)
      return
    }
    const b: Booking = {
      id: uid('R27'),
      createdAt: new Date().toISOString(),
      listingId: l.id,
      nights: selected,
      guests: g,
      name: name.trim(),
      email: email.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      totalEur: sub,
      status: 'pedido',
    }
    add('bookings', b)
    setDoneId(b.id)
    // o painel encolhe: em ecrã estreito, trazê-lo para a vista
    requestAnimationFrame(() => {
      const r = aside.current?.getBoundingClientRect()
      if (r && (r.top < 64 || r.top > window.innerHeight * 0.6)) window.scrollTo({ top: window.scrollY + r.top - 88 })
    })
  }

  return (
    <section className="sec tight">
      <div className="wrap">
        <p className="eyebrow"><Link to={back} style={{ textDecoration: 'none' }}>Alojamento</Link> / {l.village}</p>
        <div className="split flow-split wide">
          <div className="stack">
            <div className="plate flow-plate"><HousePlate listing={l} /></div>
            <h1 className="display flow-house">{l.title}</h1>
            <p className="lede">{l.note}</p>
            <dl className="kv" style={{ maxWidth: 480 }}>
              <dt>Anfitrião</dt><dd>{l.host}</dd>
              <dt>Aldeia</dt><dd>{l.village}</dd>
              <dt>Capacidade</dt><dd>{l.sleeps} pessoas · {l.bedrooms} {l.bedrooms === 1 ? 'quarto' : 'quartos'}</dd>
              <dt>Até à partida</dt><dd>{l.kmToStart.toLocaleString('pt-PT')} km</dd>
            </dl>
            <ul className="ticklist">{l.features.map((k) => <li key={k}>{FEATURES[k as FeatureKey] ?? k}</li>)}</ul>
          </div>

          <aside className="summary" aria-live="polite" ref={aside}>
            {booking ? (
              <div className="stack" style={{ ['--s' as string]: '20px' }}>
                <p className="mono ember" style={{ margin: 0 }}>
                  {booking.status === 'confirmado' ? 'Reserva confirmada' : booking.status === 'pedido' ? 'Pedido enviado' : 'Pedido recusado'}
                </p>
                <h3 className="cond">
                  {booking.status === 'pedido' ? `${l.host} responde em 48 h` : booking.status === 'confirmado' ? `${l.host} aceitou` : 'Procura outra casa'}
                </h3>
                <p className="flow-ref">{booking.id}</p>
                <dl className="kv">
                  <dt>Noites</dt><dd>{booking.nights.map(nightLabel).join(', ')}</dd>
                  <dt>Pessoas</dt><dd>{booking.guests}</dd>
                  <dt>Total</dt><dd>{eur(booking.totalEur)}</dd>
                </dl>
                <p className="muted" style={{ marginBottom: 0, fontSize: 15 }}>
                  Guarda a referência. Só pagas depois de {l.host} aceitar o pedido.
                </p>
                <div className="row">
                  <Link className="btn" to={`/conta?${new URLSearchParams({ email: booking.email, ref: booking.id })}`}>Acompanhar na área do atleta</Link>
                  <Link className="btn ghost noarrow" to={back}>Voltar às casas</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="stack flow-book" style={{ ['--s' as string]: '24px' }} noValidate>
                <div className="row between">
                  <b style={{ font: '900 40px/1 var(--display)' }}>{eur(l.eurNight)}</b>
                  <span className="mono muted">por noite · casa inteira</span>
                </div>
                <fieldset style={{ border: 0, padding: 0, marginLeft: 0, marginRight: 0, marginBottom: 0, minWidth: 0 }}>
                  <legend className="mono muted" style={{ padding: 0 }}>Noites</legend>
                  <div className="choice flow-choice mt-s">
                    {EVENT_NIGHTS.map((n) => {
                      const isTaken = taken.has(n.iso)
                      const note = isTaken
                        ? 'Reservada'
                        : ownNights.has(n.iso)
                          ? 'Já pediste esta noite'
                          : pendingOthers.has(n.iso)
                            ? 'Há um pedido pendente'
                            : n.note
                      return (
                        <label key={n.iso}>
                          <input type="checkbox" disabled={isTaken} checked={!isTaken && nights.includes(n.iso)} onChange={() => toggleNight(n.iso)}
                            aria-invalid={show('nights') ? true : undefined} />
                          <span>
                            <strong>{n.label}</strong>
                            <span className={`flow-night-note${!isTaken && note !== n.note ? ' warn' : ''}`}>{note}</span>
                          </span>
                          <span className="mono">{isTaken ? '—' : eur(l.eurNight)}</span>
                        </label>
                      )
                    })}
                  </div>
                  {show('nights') && <p className="flow-err-line mt-s" role="alert">{errors.nights}</p>}
                  {raceMsg && <p className="flow-err-line mt-s" role="alert">{raceMsg}</p>}
                  {pendingOthers.size > 0 && selected.some((n) => pendingOthers.has(n)) && (
                    <p className="muted flow-fine mt-s">
                      Um pedido pendente não bloqueia a noite: {l.host} escolhe qual aceita. Se aceitar outro, o teu fica recusado.
                    </p>
                  )}
                </fieldset>
                <Field label="Pessoas" id="bk-guests" type="number" value={guests} onChange={setGuests} onBlur={touch('guests')} inputMode="numeric"
                  error={show('guests')} hint={`Máximo ${l.sleeps}.`} />
                <Field label="Nome" id="bk-name" value={name} onChange={setName} onBlur={touch('name')} error={show('name')} autoComplete="name" />
                <Field label="Email" id="bk-email" type="email" value={email} onChange={setEmail} onBlur={touch('email')} error={show('email')} autoComplete="email" />
                <Field label="Telemóvel (opcional)" id="bk-tel" type="tel" value={phone} onChange={setPhone} onBlur={touch('phone')} error={show('phone')}
                  autoComplete="tel" inputMode="tel" hint="Para combinares a hora de chegada com o anfitrião." />
                {contact.from && (
                  <p className="mono muted flow-fine">
                    {contact.from === 'link' ? 'Dados preenchidos a partir da tua inscrição.' : 'Dados preenchidos a partir da área do atleta.'}
                  </p>
                )}
                <div className="total">
                  <span className="mono">{selected.length} {selected.length === 1 ? 'noite' : 'noites'}</span>
                  <b>{eur(sub)}</b>
                </div>
                <p className="muted flow-fine">
                  {l.host} recebe {eur(Math.round(sub * (1 - PLATFORM_FEE)))}. Não pagas nada agora: o pedido só passa a reserva quando {l.host} aceitar.
                </p>
                <button className="btn">Pedir reserva</button>
                {own.length > 0 && (
                  <p className="notice flow-block">
                    Já tens {own.length === 1 ? 'um pedido' : `${own.length} pedidos`} nesta casa ({own.map((b) => b.id).join(', ')}).{' '}
                    <Link to={`/conta?${new URLSearchParams({ email: own[0].email, ref: own[0].id })}`}>Ver na área do atleta</Link>.
                  </p>
                )}
              </form>
            )}
          </aside>
        </div>
      </div>
    </section>
  )
}
