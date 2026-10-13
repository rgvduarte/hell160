import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EVENT_NIGHTS, FEATURES, LISTINGS, PLATFORM_FEE, VILLAGES, listingById, type FeatureKey } from '../data/listings'
import { IMPACT } from '../data/event'
import { HousePlate } from '../components/HousePlate'
import { add, uid, useCollection, type Booking } from '../lib/store'
import { Field } from './Register'
import { NotFound } from './NotFound'

export function Stay() {
  const [village, setVillage] = useState<string>('')
  const [guests, setGuests] = useState(2)
  const [maxPrice, setMaxPrice] = useState(80)
  const [need, setNeed] = useState<FeatureKey[]>(['ac'])

  const results = useMemo(
    () =>
      LISTINGS.filter(
        (l) =>
          (!village || l.village === village) &&
          l.sleeps >= guests &&
          l.eurNight <= maxPrice &&
          need.every((f) => l.features.includes(f)),
      ).sort((a, b) => a.kmToStart - b.kmToStart),
    [village, guests, maxPrice, need],
  )

  const toggle = (f: FeatureKey) => setNeed((n) => (n.includes(f) ? n.filter((x) => x !== f) : [...n, f]))

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
          <aside className="filters">
            <div className="field">
              <label htmlFor="v">Aldeia</label>
              <select id="v" value={village} onChange={(e) => setVillage(e.target.value)}>
                <option value="">Todas</option>
                {VILLAGES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="g">Pessoas · {guests}</label>
              <input id="g" type="range" min={1} max={8} value={guests} onChange={(e) => setGuests(+e.target.value)} style={{ accentColor: 'var(--ember)', border: 0 }} />
            </div>
            <div className="field">
              <label htmlFor="p">Até {maxPrice} € / noite</label>
              <input id="p" type="range" min={50} max={80} step={5} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} style={{ accentColor: 'var(--ember)', border: 0 }} />
            </div>
            <div className="field">
              <span className="label">Precisa de</span>
              <div className="chips">
                {(Object.keys(FEATURES) as FeatureKey[]).map((f) => (
                  <button key={f} className="chip" aria-pressed={need.includes(f)} onClick={() => toggle(f)}>
                    {FEATURES[f]}
                  </button>
                ))}
              </div>
            </div>
          </aside>
          <div>
            <p className="mono muted" style={{ marginTop: 0 }}>
              {results.length} {results.length === 1 ? 'casa' : 'casas'} · ordenadas por distância à partida
            </p>
            {results.length === 0 ? (
              <p className="notice">Nenhuma casa com estes filtros. Tira um ou dois.</p>
            ) : (
              <div className="listings mt">
                {results.map((l) => (
                  <Link key={l.id} to={`/alojamento/${l.id}`} className="listing">
                    <div className="plate"><HousePlate listing={l} /></div>
                    <div className="row between mono">
                      <span>{l.village}</span>
                      <span>{l.kmToStart} km</span>
                    </div>
                    <h3>{l.title}</h3>
                    <p className="muted" style={{ margin: 0, fontSize: 15 }}>{l.note}</p>
                    <div className="row between mono">
                      <span>{l.sleeps} pessoas · {l.bedrooms} qt</span>
                      <strong>{l.eurNight} €</strong>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <p className="mono muted mt-l">Casas de exemplo · as fotografias reais entram com o onboarding dos anfitriões.</p>
          </div>
        </div>
      </section>
    </>
  )
}

export function StayDetail() {
  const { id = '' } = useParams()
  const l = listingById(id)
  const bookings = useCollection('bookings')
  const [nights, setNights] = useState<string[]>(['2027-07-02', '2027-07-03'])
  const [guests, setGuests] = useState(2)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [done, setDone] = useState<Booking | null>(null)
  if (!l) return <NotFound />

  const taken = new Set(bookings.filter((b) => b.listingId === l.id).flatMap((b) => b.nights))
  const sub = nights.length * l.eurNight
  const valid = nights.length > 0 && name && /.+@.+\..+/.test(email) && guests <= l.sleeps

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || !l) return
    const b: Booking = {
      id: uid('R27'), createdAt: new Date().toISOString(), listingId: l.id, nights, guests, name, email, totalEur: sub, status: 'pedido',
    }
    add('bookings', b)
    setDone(b)
  }

  return (
    <section className="sec tight">
      <div className="wrap">
        <p className="eyebrow"><Link to="/alojamento" style={{ textDecoration: 'none' }}>Alojamento</Link> / {l.village}</p>
        <div className="split" style={{ gridTemplateColumns: '7fr 5fr' }}>
          <div className="stack">
            <div className="plate" style={{ aspectRatio: '16 / 10', overflow: 'hidden' }}><HousePlate listing={l} /></div>
            <h1 className="display" style={{ fontSize: 'clamp(40px, 6vw, 84px)' }}>{l.title}</h1>
            <p className="lede">{l.note}</p>
            <dl className="kv" style={{ maxWidth: 480 }}>
              <dt>Anfitrião</dt><dd>{l.host}</dd>
              <dt>Aldeia</dt><dd>{l.village}</dd>
              <dt>Capacidade</dt><dd>{l.sleeps} pessoas · {l.bedrooms} quartos</dd>
              <dt>Até à partida</dt><dd>{l.kmToStart} km</dd>
            </dl>
            <ul className="ticklist">{l.features.map((f) => <li key={f}>{FEATURES[f as FeatureKey]}</li>)}</ul>
          </div>

          <aside className="summary">
            {done ? (
              <div className="stack" style={{ ['--s' as string]: '16px' }}>
                <p className="mono ember" style={{ margin: 0 }}>Pedido enviado</p>
                <h3 className="cond">{l.host} responde em 48 h</h3>
                <p className="muted">Referência <span className="mono">{done.id}</span>. Só pagas quando o anfitrião confirmar.</p>
                <Link className="btn ghost" to="/alojamento">Voltar às casas</Link>
              </div>
            ) : (
              <form onSubmit={submit} className="stack" style={{ ['--s' as string]: '24px' }}>
                <div className="row between">
                  <b style={{ font: '900 40px/1 var(--display)' }}>{l.eurNight} €</b>
                  <span className="mono muted">por noite · casa inteira</span>
                </div>
                <div>
                  <span className="mono muted">Noites</span>
                  <div className="choice mt-s">
                    {EVENT_NIGHTS.map((n) => (
                      <label key={n.iso} style={{ opacity: taken.has(n.iso) ? 0.4 : 1 }}>
                        <input
                          type="checkbox"
                          disabled={taken.has(n.iso)}
                          checked={nights.includes(n.iso)}
                          onChange={() => setNights((x) => (x.includes(n.iso) ? x.filter((y) => y !== n.iso) : [...x, n.iso].sort()))}
                        />
                        <span>
                          <strong>{n.label}</strong>
                          <span className="muted" style={{ display: 'block', fontSize: 13 }}>{taken.has(n.iso) ? 'Reservada' : n.note}</span>
                        </span>
                        <span className="mono">{l.eurNight} €</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="gs">Pessoas (máx. {l.sleeps})</label>
                  <input id="gs" type="number" min={1} max={l.sleeps} value={guests} onChange={(e) => setGuests(+e.target.value)} />
                </div>
                <Field label="Nome" value={name} onChange={setName} autoComplete="name" />
                <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
                <div className="total"><span className="mono">{nights.length} noites</span><b>{sub} €</b></div>
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                  {l.host} recebe {Math.round(sub * (1 - PLATFORM_FEE))} €. Sem custos escondidos.
                </p>
                <button className="btn" disabled={!valid}>Pedir reserva</button>
              </form>
            )}
          </aside>
        </div>
      </div>
    </section>
  )
}
