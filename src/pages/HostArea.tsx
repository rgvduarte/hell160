import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EVENT } from '../data/event'
import { EVENT_NIGHTS, FEATURES, PLATFORM_FEE, type FeatureKey } from '../data/listings'
import { HousePlate } from '../components/HousePlate'
import { eur, fmtDate, hostToListing, takenNights } from '../lib/domain'
import { getAll, update, useCollection, type Booking, type HostApplication } from '../lib/store'
import { Field } from './Register'
import '../styles/flows.css'

const PRICES = [50, 60, 70, 80]
const NOTE_MAX = 140
const nightLabel = (iso: string) => EVENT_NIGHTS.find((n) => n.iso === iso)?.label ?? iso
const STATUS_ORDER: Record<Booking['status'], number> = { pedido: 0, confirmado: 1, recusado: 2, cancelado: 3 }
const STATUS_LABEL: Record<Booking['status'], string> = { pedido: 'Por responder', confirmado: 'Confirmada', recusado: 'Recusada', cancelado: 'Cancelada' }

export function HostArea() {
  const { ref = '' } = useParams()
  const hosts = useCollection('hosts')
  const app = hosts.find((h) => h.id.toUpperCase() === ref.trim().toUpperCase())

  if (!app)
    return (
      <section className="sec">
        <div className="wrap">
          <p className="eyebrow">Área do anfitrião</p>
          <h1 className="display flow-title long">Referência não encontrada</h1>
          <p className="lede mt">
            Não há nenhuma casa com a referência <span className="mono">{ref.toUpperCase()}</span> neste browser.
          </p>
          <p className="muted" style={{ maxWidth: '60ch' }}>
            Confirma a referência na mensagem que recebeste ao inscrever a casa. Neste protótipo as inscrições ficam guardadas só no browser
            onde foram feitas.
          </p>
          <div className="row mt">
            <Link className="btn" to="/alojamento/anfitriao">Voltar aos anfitriões</Link>
            <a className="btn ghost noarrow" href={`mailto:${EVENT.email}?subject=${encodeURIComponent('Referência de anfitrião')}`}>Escrever à organização</a>
          </div>
        </div>
      </section>
    )

  return <HostDashboard app={app} />
}

function HostDashboard({ app }: { app: HostApplication }) {
  const bookings = useCollection('bookings')
  const listing = hostToListing(app)
  const first = app.name.split(' ')[0]
  const approved = app.status === 'aprovado'
  const refused = app.status === 'recusado'

  const mine = bookings
    .filter((b) => b.listingId === listing.id)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.createdAt.localeCompare(a.createdAt))
  const taken = takenNights(listing.id, bookings)
  const confirmed = mine.filter((b) => b.status === 'confirmado')
  const pending = mine.filter((b) => b.status === 'pedido')
  const gross = confirmed.reduce((s, b) => s + b.totalEur, 0)
  const net = Math.round(gross * (1 - PLATFORM_FEE))

  const timeline: { t: string; d: ReactNode; s: 'done' | 'now' | 'todo' | 'off' }[] = [
    { t: 'Inscrição recebida', d: fmtDate(app.createdAt), s: 'done' },
    {
      t: 'Visita da organização',
      d: app.status === 'pendente' ? `A organização vai ligar para ${app.phone} para marcar a visita.` : approved ? 'Feita.' : 'Concluída.',
      s: app.status === 'pendente' ? 'now' : 'done',
    },
    refused
      ? {
          t: 'Recusada',
          d: (
            <>
              {app.decidedAt ? `${fmtDate(app.decidedAt)}. ` : ''}A casa não entra nesta edição. Para saber o motivo ou pedir nova visita, escreve
              para <a href={`mailto:${EVENT.email}?subject=${encodeURIComponent(`Casa ${app.id}`)}`}>{EVENT.email}</a>.
            </>
          ),
          s: 'off',
        }
      : {
          t: 'Publicada',
          d: approved ? (
            <>
              {app.decidedAt ? `Desde ${fmtDate(app.decidedAt)}. ` : ''}
              <Link to={`/alojamento/${listing.id}`}>Ver a página pública da casa</Link>
            </>
          ) : (
            'Depois da visita, a casa aparece na lista de alojamento.'
          ),
          s: approved ? 'done' : 'todo',
        },
    ...(refused
      ? []
      : [
          {
            t: 'Pedidos de reserva',
            d: approved
              ? pending.length
                ? `${pending.length} por responder.`
                : 'Sem pedidos por responder.'
              : 'Aceitas ou recusas cada pedido. Ninguém paga antes disso.',
            s: approved ? ('now' as const) : ('todo' as const),
          },
        ]),
  ]

  return (
    <>
      <section className="sec tight">
        <div className="wrap ha-head">
          <div>
            <p className="eyebrow">Área do anfitrião · {app.id}</p>
            <h1 className="display flow-title long">{listing.title}</h1>
            <p className="ha-meta mono muted">
              <span>{app.village}</span>
              <span>{app.sleeps} pessoas</span>
              <span>{app.bedrooms} {app.bedrooms === 1 ? 'quarto' : 'quartos'}</span>
              <span>{eur(app.eurNight)} / noite</span>
            </p>
            <p style={{ margin: '16px 0 0' }}>
              <span className={`tag${approved ? ' solid' : refused ? ' ember' : ''}`}>
                {approved ? 'Publicada' : refused ? 'Recusada' : 'À espera da visita'}
              </span>
            </p>
          </div>
          <div className="ha-plate"><HousePlate listing={listing} /></div>
        </div>
      </section>

      <section className="sec tight rule">
        <div className="wrap split">
          <div>
            <h2 className="cond flow-h2">Estado</h2>
            <p className="muted" style={{ maxWidth: '40ch' }}>Olá, {first}. Aqui acompanhas a casa do início ao fim de semana da prova.</p>
          </div>
          <ol className="ha-timeline">
            {timeline.map((x) => (
              <li key={x.t} data-s={x.s}>
                <div>
                  <strong>{x.t}</strong>
                  <p>{x.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {approved && (
        <section className="sec tight rule">
          <div className="wrap">
            <div className="row between" style={{ alignItems: 'baseline', marginBottom: 28 }}>
              <h2 className="cond flow-h2">Pedidos de reserva</h2>
              <Link className="mono" to={`/alojamento/${listing.id}`}>Página pública →</Link>
            </div>

            <div className="stats ha-stats">
              <div><b className={pending.length ? 'ember' : undefined}>{pending.length}</b><span>Por responder</span></div>
              <div><b>{taken.size}</b><span>{taken.size === 1 ? 'Noite confirmada' : 'Noites confirmadas'}</span></div>
              <div><b>{eur(gross)}</b><span>Valor confirmado</span></div>
              <div><b>{eur(net)}</b><span>Recebes ({Math.round((1 - PLATFORM_FEE) * 100)} %)</span></div>
            </div>
            <p className="muted flow-fine mt-s">
              Transferência na semana seguinte à prova. Simulação: neste protótipo nenhum pagamento é processado.
            </p>

            <div className="ha-nights mt" aria-label="Noites do fim de semana">
              {EVENT_NIGHTS.map((n) => {
                const conf = confirmed.find((b) => b.nights.includes(n.iso))
                const asks = pending.filter((b) => b.nights.includes(n.iso)).length
                return (
                  <div key={n.iso}>
                    <b>{n.label}</b>
                    <small>{n.note}</small>
                    {conf ? (
                      <span className="st taken">Confirmada · {conf.name.split(' ')[0]}</span>
                    ) : asks ? (
                      <span className="st pend">{asks} {asks === 1 ? 'pedido' : 'pedidos'}</span>
                    ) : (
                      <span className="st">Livre</span>
                    )}
                  </div>
                )
              })}
            </div>

            {mine.length === 0 ? (
              <p className="notice mt">
                Ainda não há pedidos. A casa está visível em Dormir na aldeia; quando alguém pedir uma noite, o pedido aparece aqui.
              </p>
            ) : (
              <BookingList bookings={mine} />
            )}
          </div>
        </section>
      )}

      {!refused && (
        <section className="sec tight rule">
          <div className="wrap split">
            <div>
              <h2 className="cond flow-h2">A casa</h2>
              <p className="muted" style={{ maxWidth: '40ch' }}>
                O nome, a frase e o preço aparecem na lista de casas{approved ? '' : ' depois da aprovação'}. Morada, capacidade e
                comodidades confirmam-se na visita; para as mudar, fala com a organização.
              </p>
            </div>
            <EditHouse key={app.id} app={app} />
          </div>
        </section>
      )}

      <section className="sec tight rule">
        <div className="wrap">
          <dl className="kv" style={{ maxWidth: 560 }}>
            <dt>Anfitrião</dt><dd>{app.name}</dd>
            <dt>Telefone</dt><dd>{app.phone}</dd>
            {app.email && (<><dt>Email</dt><dd style={{ overflowWrap: 'anywhere' }}>{app.email}</dd></>)}
            <dt>Morada</dt><dd>{app.address}, {app.village}</dd>
            <dt>Comodidades</dt><dd>{app.features.map((k) => FEATURES[k as FeatureKey] ?? k).join(', ') || '—'}</dd>
          </dl>
          <p className="mono muted mt">
            Protótipo: basta a referência para entrar. Em produção, a entrada pede um código enviado por SMS para o telefone do anfitrião.
          </p>
        </div>
      </section>
    </>
  )
}

function BookingList({ bookings }: { bookings: Booking[] }) {
  const [msg, setMsg] = useState<{ id: string; text: string; ok?: boolean } | null>(null)

  function accept(b: Booking) {
    const others = getAll().bookings.filter((x) => x.id !== b.id)
    const taken = takenNights(b.listingId, others)
    const clash = b.nights.filter((n) => taken.has(n))
    if (clash.length) {
      setMsg({
        id: b.id,
        text: `Não dá para aceitar: ${clash.map(nightLabel).join(' e ')} já ${clash.length > 1 ? 'estão confirmadas' : 'está confirmada'} noutra reserva. Recusa este pedido.`,
      })
      return
    }
    update('bookings', b.id, { status: 'confirmado', decidedAt: new Date().toISOString() })
    setMsg({ id: b.id, text: `Reserva confirmada. ${b.name.split(' ')[0]} vê a confirmação na área do atleta.`, ok: true })
  }

  function decline(b: Booking) {
    if (!window.confirm(`Recusar o pedido ${b.id} de ${b.name}?\n\nAs noites ficam livres para outros pedidos.`)) return
    update('bookings', b.id, { status: 'recusado', decidedAt: new Date().toISOString() })
    setMsg({ id: b.id, text: 'Pedido recusado.', ok: true })
  }

  const confirmedNights = (b: Booking) =>
    takenNights(
      b.listingId,
      bookings.filter((x) => x.id !== b.id),
    )

  return (
    <div className="ha-books mt">
      <div className="ha-book ha-bhead" aria-hidden="true">
        <span>Referência</span><span>Hóspede</span><span>Noites</span><span>Pessoas</span><span>Total</span><span />
      </div>
      {bookings.map((b) => {
        const open = b.status === 'pedido'
        const clash = open && b.nights.some((n) => confirmedNights(b).has(n))
        return (
          <article key={b.id} className={`ha-book${open || b.status === 'confirmado' ? '' : ' is-off'}`} aria-label={`Pedido ${b.id}`}>
            <div className="ref">
              <span className="mono">{b.id}</span>
              <span className={`tag${b.status === 'confirmado' ? ' solid' : b.status === 'pedido' ? ' ember' : ''}`}>{STATUS_LABEL[b.status]}</span>
            </div>
            <div className="who">
              <strong>{b.name}</strong>
              <span>{b.email}{b.phone ? ` · ${b.phone}` : ''}</span>
              <span className="mono" style={{ fontSize: 11 }}>Pedido {fmtDate(b.createdAt)}</span>
            </div>
            <div className="nights">
              {b.nights.map(nightLabel).join(', ')}
              {clash && <span className="clash">Sobrepõe-se a uma reserva confirmada</span>}
            </div>
            <div className="ppl">{b.guests} {b.guests === 1 ? 'pessoa' : 'pessoas'}</div>
            <div className="total">{eur(b.totalEur)}</div>
            <div className="acts">
              {open ? (
                <>
                  <button type="button" className="btn small noarrow" onClick={() => accept(b)}>Aceitar</button>
                  <button type="button" className="btn small ghost noarrow" onClick={() => decline(b)}>Recusar</button>
                </>
              ) : (
                <span className="mono muted" style={{ fontSize: 11 }}>{b.decidedAt ? fmtDate(b.decidedAt) : ''}</span>
              )}
            </div>
            <div className="msg" role="status">
              {msg?.id === b.id && <p className={msg.ok ? 'flow-ok-line' : 'flow-err-line'}>{msg.text}</p>}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function EditHouse({ app }: { app: HostApplication }) {
  const [title, setTitle] = useState(app.title ?? '')
  const [note, setNote] = useState(app.note ?? '')
  const [price, setPrice] = useState(app.eurNight)
  const [saved, setSaved] = useState<string | null>(null)
  const dirty = title.trim() !== (app.title ?? '') || note.trim() !== (app.note ?? '') || price !== app.eurNight
  const priceChanged = price !== app.eurNight

  function save(e: FormEvent) {
    e.preventDefault()
    if (!dirty) return
    update('hosts', app.id, { title: title.trim() || undefined, note: note.trim() || undefined, eurNight: price })
    setTitle(title.trim())
    setNote(note.trim())
    setSaved(new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }))
  }

  return (
    <form className="stack ha-edit" style={{ ['--s' as string]: '28px' }} onSubmit={save} noValidate>
      <Field label="Nome da casa" id="ha-title" value={title} onChange={(v) => { setTitle(v); setSaved(null) }} maxLength={48}
        placeholder={`Casa de ${app.name.split(' ')[0]}`} hint={`Se ficar vazio, aparece como “Casa de ${app.name.split(' ')[0]}”.`} />
      <Field label="Uma frase sobre a casa" id="ha-note" value={note} onChange={(v) => { setNote(v); setSaved(null) }} maxLength={NOTE_MAX}
        placeholder="Quintal com sombra, a 5 minutos a pé do largo." hint={`${note.length}/${NOTE_MAX}`} />
      <div className="field">
        <span className="label" id="ha-price-l">Preço por noite</span>
        <div className="chips" role="group" aria-labelledby="ha-price-l">
          {PRICES.map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={price === p}
              onClick={() => { setPrice(p); setSaved(null) }}>
              {p} €
            </button>
          ))}
        </div>
        <span className="hint">
          {priceChanged
            ? `Recebes ${eur(Math.round(price * (1 - PLATFORM_FEE)))} por noite. O preço novo vale para pedidos novos; os que já existem mantêm o valor.`
            : `Recebes ${eur(Math.round(price * (1 - PLATFORM_FEE)))} por noite.`}
        </span>
      </div>
      <div className="row">
        <button className="btn" disabled={!dirty}>Guardar</button>
        {saved && !dirty && <span className="mono muted" role="status">Guardado às {saved}</span>}
      </div>
    </form>
  )
}
