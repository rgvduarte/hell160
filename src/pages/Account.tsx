import { useEffect, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { EVENT, MANDATORY_GEAR, RACES, raceById, type Race } from '../data/event'
import { EVENT_NIGHTS } from '../data/listings'
import { HousePlate } from '../components/HousePlate'
import { PaymentPanel } from '../components/PaymentPanel'
import { download, eur, findListing, raceICS, takenNights } from '../lib/domain'
import {
  getAll,
  getSessionEmail,
  sameEmail,
  setSessionEmail,
  update,
  useSessionEmail,
  useStore,
  type Booking,
  type Collections,
  type HostApplication,
  type PayMethod,
  type Registration,
} from '../lib/store'
import '../styles/account.css'

// Área do atleta: entrada por email + referência (sem palavra-passe), inscrições, pagamento, preparação e reservas.
// Sem backend: os dados vêm da camada local (localStorage). Em produção, a entrada passa a link mágico por email.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_CERT_BYTES = 5 * 1024 * 1024
const CERT_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const CERT_EXT = /\.(pdf|jpe?g|png)$/i

// Partidas conhecidas (hora de Lisboa). A bike ainda não tem data.
const RACE_START: Partial<Record<Race['id'], string>> = {
  hell160: '2027-07-02T22:00:00+01:00',
  hell100: '2027-07-03T08:00:00+01:00',
  relay2: '2027-07-03T08:00:00+01:00',
  relay4: '2027-07-03T08:00:00+01:00',
}
// A bike é em fevereiro de 2027 (dia a anunciar): até ao fim do mês é a primeira prova do calendário.
const BIKE_MONTH_END = '2027-03-01T00:00:00Z'

// Proposta para o regulamento 2027 (ainda não publicado).
const REFUND_TIERS = [
  { minDays: 90, pct: 80 },
  { minDays: 30, pct: 50 },
]
const REFUND_TEXT =
  'Reembolso (proposta para o regulamento 2027, a confirmar): 80 % até 90 dias antes da partida, 50 % até 30 dias antes, depois sem reembolso. Devolvido pelo mesmo meio de pagamento.'

const STATUS_TAG: Record<Registration['status'] | Booking['status'], string> = {
  pendente: 'tag ember',
  paga: 'tag solid',
  cancelada: 'tag muted',
  pedido: 'tag ember',
  confirmado: 'tag solid',
  recusado: 'tag muted',
  cancelado: 'tag muted',
}

const METHOD_LABEL: Record<PayMethod, string> = { mbway: 'MB WAY', multibanco: 'Multibanco', cartao: 'Cartão' }

const DEVICE: Record<Registration['device'], [string, string]> = {
  phone: [
    'Só telemóvel',
    'O mínimo obrigatório. A app HELL160 envia a tua posição ao minuto quando há rede e guarda-a quando não há. Leva bateria de reserva: sem telemóvel ligado não há tracking.',
  ],
  'phone+watch': [
    'Telemóvel + relógio',
    'Duas fontes de posição. A plataforma cruza as duas e usa a mais fiável em cada momento; se uma falha, a outra continua. Emparelha o relógio na app antes de vir.',
  ],
  rental: [
    'Localizador alugado',
    'Localizador satélite da organização, entregue com o dorsal e devolvido na meta. Funciona onde não há rede móvel, como na descida ao Pulo do Lobo. Os 15 € estão incluídos no total da inscrição.',
  ],
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const pad = (n: number) => String(n).padStart(2, '0')
const fmtDay = (iso: string) => {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
const fmtDayTime = (iso: string) => {
  const d = new Date(iso)
  return `${fmtDay(iso)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fmtMoney = (n: number) =>
  `${n.toLocaleString('pt-PT', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`
const fmtBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} MB`
// Acima do limite arredonda para cima, para nunca mostrar "5 MB" num ficheiro que passa dos 5 MB.
const fmtMbUp = (n: number) => `${(Math.ceil((n / 1024 / 1024) * 10) / 10).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} MB`
// Números PT-PT com separador de milhares também em 4 dígitos (2 648, não 2648).
const NUM = new Intl.NumberFormat('pt-PT', { useGrouping: 'always', maximumFractionDigits: 1 } as unknown as Intl.NumberFormatOptions)
const fmtNum = (n: number) => NUM.format(n)
const newestFirst = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)
const nightLabel = (iso: string) => EVENT_NIGHTS.find((n) => n.iso === iso)?.label ?? iso
const nightList = (isos: string[]) => {
  const l = [...isos].sort().map(nightLabel)
  return l.length > 1 ? `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}` : l[0] ?? ''
}

function daysUntil(iso: string, now = new Date()) {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000)
}

function refundFor(reg: Registration, now = new Date()) {
  const start = RACE_START[reg.race as Race['id']]
  if (reg.status !== 'paga' || !start) return null
  const days = daysUntil(start, now)
  const pct = REFUND_TIERS.find((t) => days >= t.minDays)?.pct ?? 0
  return { days, pct, amount: Math.round(reg.priceEur * pct) / 100 }
}

// ---------- entrada ----------

type LoginCheck = { ok: true; email: string } | { ok: false; error: string; field: 'email' | 'ref' }

const fieldId = (field: 'email' | 'ref') => (field === 'email' ? 'acc-email' : 'acc-ref')

function checkLogin(emailRaw: string, refRaw: string, data: Collections): LoginCheck {
  const email = emailRaw.trim()
  const ref = refRaw.replace(/\s+/g, '').toUpperCase()
  if (!email) return { ok: false, field: 'email', error: 'Falta o email.' }
  if (!EMAIL_RE.test(email)) return { ok: false, field: 'email', error: 'Email inválido. Confirma se está bem escrito.' }
  if (!ref) return { ok: false, field: 'ref', error: 'Falta a referência. Está no email de confirmação.' }
  if (!/^(H27|R27)-[A-Z0-9]+$/.test(ref))
    return { ok: false, field: 'ref', error: 'A referência começa por H27- (inscrição) ou R27- (reserva de alojamento).' }
  const found = ref.startsWith('H27')
    ? data.registrations.some((r) => r.id.toUpperCase() === ref && sameEmail(r.email, email))
    : data.bookings.some((b) => b.id.toUpperCase() === ref && sameEmail(b.email, email))
  if (!found)
    return {
      ok: false,
      field: 'ref',
      error:
        'Email e referência não correspondem a nenhuma inscrição ou reserva neste browser. No protótipo os dados ficam guardados só no browser onde foram criados.',
    }
  return { ok: true, email }
}

export function Account() {
  const session = useSessionEmail()
  const data = useStore()
  const [params, setParams] = useSearchParams()
  const qEmail = params.get('email')
  const qRef = params.get('ref')
  const [form, setForm] = useState({ email: '', ref: '' })
  const [error, setError] = useState<{ msg: string; field: 'email' | 'ref' } | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  // Link só com email de outra pessoa quando já há sessão aberta
  const [switchTo, setSwitchTo] = useState<string | null>(null)
  // Elemento a focar depois do próximo render (campo com erro, título da área pessoal)
  const [focusId, setFocusId] = useState<string | null>(null)

  useEffect(() => {
    if (!focusId) return
    document.getElementById(focusId)?.focus()
    setFocusId(null)
  }, [focusId, session])

  // Links diretos:
  // /conta?email=…&ref=…  enviado pela inscrição e pela reserva: entra se o par corresponder
  // /conta?email=…        aviso de inscrição duplicada: só pré-preenche o email
  useEffect(() => {
    if (qEmail == null && qRef == null) return
    setParams({}, { replace: true })
    const email = (qEmail ?? '').trim()
    const ref = (qRef ?? '').trim()
    const current = getSessionEmail()

    if (email && ref) {
      const res = checkLogin(email, ref, getAll())
      if (res.ok) {
        setLinkError(null)
        setError(null)
        setSwitchTo(null)
        setSessionEmail(res.email)
        setFocusId('acc-title')
      } else {
        setForm({ email, ref })
        setError({ msg: res.error, field: res.field })
        setLinkError(`O link de acesso não é válido. ${res.error}`)
        if (!current) setFocusId(fieldId(res.field))
      }
      return
    }

    // Link incompleto: não é um erro. Com sessão aberta no mesmo email, ignora-se.
    if (current) {
      if (email && !sameEmail(email, current)) setSwitchTo(email)
      return
    }
    setError(null)
    setLinkError(null)
    setForm({ email, ref })
    setFocusId(email ? 'acc-ref' : 'acc-email')
  }, [qEmail, qRef, setParams])

  function login(e: FormEvent) {
    e.preventDefault()
    const res = checkLogin(form.email, form.ref, getAll())
    if (!res.ok) {
      setError({ msg: res.error, field: res.field })
      setFocusId(fieldId(res.field))
      return
    }
    setError(null)
    setLinkError(null)
    setSwitchTo(null)
    setSessionEmail(res.email)
    setFocusId('acc-title')
  }

  function logout(prefill = '') {
    setForm({ email: prefill, ref: '' })
    setError(null)
    setLinkError(null)
    setSwitchTo(null)
    setSessionEmail(null)
    setFocusId(prefill ? 'acc-ref' : 'acc-email')
  }

  if (session)
    return (
      <Dashboard
        email={session}
        data={data}
        linkError={linkError}
        switchTo={switchTo}
        onDismiss={() => {
          setLinkError(null)
          setSwitchTo(null)
        }}
        onSwitch={() => switchTo && logout(switchTo)}
        onLogout={() => logout()}
      />
    )

  return (
    <section className="sec tight acc-page no-reveal">
      <div className="wrap">
        <p className="eyebrow">Área do atleta</p>
        <h1 className="display acc-hello">Entrar</h1>
      </div>
      <div className="wrap split acc-login">
        <div>
          <p className="lede" style={{ marginTop: 0 }}>Inscrição, pagamento, dorsal, atestado e reservas de alojamento, num só sítio.</p>
          <p className="muted">
            Entras com o email que usaste e uma referência: <span className="mono">H27-…</span> de uma inscrição ou{' '}
            <span className="mono">R27-…</span> de uma reserva. Estão no email de confirmação.
          </p>
        </div>
        <div className="stack">
          <form onSubmit={login} className="stack acc-form" style={{ ['--s' as string]: '28px' }} noValidate>
            <div className="field">
              <label htmlFor="acc-email">Email</label>
              <input
                id="acc-email"
                type="email"
                autoComplete="email"
                value={form.email}
                aria-invalid={error?.field === 'email'}
                aria-describedby={error?.field === 'email' ? 'acc-err' : undefined}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="acc-ref">Referência</label>
              <input
                id="acc-ref"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="H27-XXXXXXXX"
                value={form.ref}
                aria-invalid={error?.field === 'ref'}
                aria-describedby={error?.field === 'ref' ? 'acc-err' : undefined}
                onChange={(e) => setForm({ ...form, ref: e.target.value })}
              />
            </div>
            {error && (
              <p id="acc-err" className="notice acc-error" role="alert" style={{ margin: 0 }}>
                {error.msg}
              </p>
            )}
            <button className="btn">Entrar</button>
          </form>
          <div className="acc-alt">
            <p className="mono muted" style={{ margin: 0 }}>Ainda sem referência</p>
            <div className="row mt-s">
              <Link className="btn ghost small" to="/inscricao">Inscrever</Link>
              <Link className="btn ghost small" to="/alojamento">Procurar alojamento</Link>
            </div>
          </div>
          <p className="mono muted acc-fine">Protótipo · sem palavra-passe · os dados ficam neste browser</p>
        </div>
      </div>
    </section>
  )
}

// ---------- área pessoal ----------

function Dashboard({ email, data, linkError, switchTo, onDismiss, onSwitch, onLogout }: {
  email: string
  data: Collections
  linkError: string | null
  switchTo: string | null
  onDismiss: () => void
  onSwitch: () => void
  onLogout: () => void
}) {
  const [printId, setPrintId] = useState<string | null>(null)
  const regs = data.registrations.filter((r) => sameEmail(r.email, email)).sort(newestFirst)
  const books = data.bookings.filter((b) => sameEmail(b.email, email)).sort(newestFirst)
  const first = regs[0]?.first.trim() || books[0]?.name.trim().split(/\s+/)[0] || ''
  const active = regs.filter((r) => r.status !== 'cancelada')
  // Pedidos que já não podem ser confirmados (casa fora da plataforma, noites ocupadas) não contam como ativos
  const activeBooks = books.filter(
    (b) => b.status === 'confirmado' || (b.status === 'pedido' && !bookingIssue(b, data.hosts, data.bookings)),
  )

  // Próxima prova: a bike (fevereiro, dia a anunciar) vem antes das provas de julho
  const bikeFirst = active.some((r) => r.race === 'bike') && Date.now() < Date.parse(BIKE_MONTH_END)
  const next = active
    .map((r) => ({ race: raceById(r.race), start: RACE_START[r.race as Race['id']] }))
    .filter((x): x is { race: Race; start: string } => !!x.race && !!x.start)
    .sort((a, b) => a.start.localeCompare(b.start))[0]

  useEffect(() => {
    const clear = () => setPrintId(null)
    window.addEventListener('afterprint', clear)
    return () => window.removeEventListener('afterprint', clear)
  }, [])

  function print(id: string) {
    flushSync(() => setPrintId(id))
    window.print()
  }

  const printReg = printId ? regs.find((r) => r.id === printId && r.status === 'paga') : undefined

  return (
    <div className={`acc-page no-reveal${printReg ? ' printing' : ''}`}>
      <div className="acc-screen">
        <section className="sec tight">
          <div className="wrap">
            {linkError && (
              <div className="notice acc-linkerr" role="alert">
                <span>{linkError}</span>
                <button className="btn small ghost noarrow" onClick={onDismiss}>Fechar</button>
              </div>
            )}
            {!linkError && switchTo && (
              <div className="notice acc-linkerr" role="status">
                <span>
                  O link que abriste é para <strong className="acc-email">{switchTo}</strong>. Tens sessão aberta com{' '}
                  <span className="acc-email">{email}</span>.
                </span>
                <span className="row" style={{ gap: 8 }}>
                  <button className="btn small noarrow" onClick={onSwitch}>Sair e entrar com esse email</button>
                  <button className="btn small ghost noarrow" onClick={onDismiss}>Manter sessão</button>
                </span>
              </div>
            )}
            <div className="acc-head">
              <div>
                <p className="eyebrow">Área do atleta</p>
                <h1 id="acc-title" tabIndex={-1} className="display acc-hello">{first ? `Olá, ${first}.` : 'Olá.'}</h1>
              </div>
              <div className="acc-who">
                <span className="mono muted">Sessão</span>
                <span className="acc-email">{email}</span>
                <button className="btn small ghost noarrow" onClick={onLogout}>Sair</button>
              </div>
            </div>
            <div className="stats acc-stats mt-l">
              <div><b>{active.length}</b><span>{active.length === 1 ? 'Inscrição ativa' : 'Inscrições ativas'}</span></div>
              <div><b>{activeBooks.length}</b><span>{activeBooks.length === 1 ? 'Reserva ativa' : 'Reservas ativas'}</span></div>
              <div>
                {bikeFirst ? (
                  <><b>fev</b><span>Próxima prova: {raceById('bike')?.name}, dia a anunciar</span></>
                ) : next ? (
                  <><b>{Math.max(0, daysUntil(next.start))}</b><span>Dias até à partida · {next.race.name}</span></>
                ) : (
                  <><b>{Math.max(0, daysUntil(EVENT.startISO))}</b><span>Dias até ao HELL160</span></>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="sec tight rule">
          <div className="wrap">
            <div className="row between acc-sechead">
              <h2 className="cond acc-h2">Inscrições</h2>
              {regs.length > 0 && <Link className="mono" to="/inscricao">Nova inscrição →</Link>}
            </div>
            {regs.length === 0 ? (
              <div className="acc-empty">
                <p className="lede" style={{ margin: 0 }}>Não há inscrições com {email}.</p>
                <p className="muted">Se te inscreveste com outro email, sai e entra com esse. Se ainda não te inscreveste, as inscrições estão abertas.</p>
                <div className="row">
                  <Link className="btn" to="/inscricao">Inscrever</Link>
                  <Link className="btn ghost" to="/provas">Ver provas</Link>
                </div>
              </div>
            ) : (
              <div className="acc-list">
                {regs.map((r) => <RegistrationBlock key={r.id} reg={r} onPrint={() => print(r.id)} />)}
              </div>
            )}
          </div>
        </section>

        <section className="sec tight rule">
          <div className="wrap">
            <div className="row between acc-sechead">
              <h2 className="cond acc-h2">Alojamento</h2>
              {books.length > 0 && <Link className="mono" to="/alojamento">Procurar casas →</Link>}
            </div>
            <Bookings regs={active} books={books} hosts={data.hosts} all={data.bookings} />
          </div>
        </section>
      </div>
      {printReg && <Receipt reg={printReg} />}
    </div>
  )
}

// ---------- inscrição ----------

function RegistrationBlock({ reg, onPrint }: { reg: Registration; onPrint: () => void }) {
  const race = raceById(reg.race) ?? RACES[0]
  const cancelled = reg.status === 'cancelada'

  function cancel() {
    const refund = refundFor(reg)
    const money =
      reg.status !== 'paga'
        ? 'Ainda não pagaste: não há valores a devolver.'
        : refund
          ? refund.pct > 0
            ? `Reembolso previsto: ${fmtMoney(refund.amount)} (${refund.pct} %), pelo mesmo meio de pagamento.`
            : 'A menos de 30 dias da partida não há reembolso.'
          : 'O reembolso segue o regulamento da prova.'
    if (!window.confirm(`Cancelar a inscrição ${reg.id} (${race.name})?\n\n${money}\n\nO lugar fica livre para outro atleta. Esta ação não se desfaz.`)) return
    update('registrations', reg.id, { status: 'cancelada' })
  }

  return (
    <article className={`acc-reg${cancelled ? ' is-off' : ''}`} aria-labelledby={`h-${reg.id}`}>
      <header className="acc-reg-head">
        <div>
          <h3 id={`h-${reg.id}`} className="cond acc-race">{race.name}</h3>
          <p className="mono muted acc-meta">
            <span>{reg.id}</span>
            <span>Inscrição a {fmtDay(reg.createdAt)}</span>
            <span>{race.start}</span>
          </p>
        </div>
        <span className={STATUS_TAG[reg.status]}>{reg.status}</span>
      </header>

      <div className="acc-reg-body">
        <div className="acc-col">
          {reg.status === 'pendente' && (
            <div className="stack" style={{ ['--s' as string]: '20px' }}>
              <div>
                <p className="mono muted" style={{ margin: 0 }}>Pagamento em falta</p>
                <div className="total" style={{ marginTop: 8 }}>
                  <span className="mono">Total</span>
                  <b>{eur(reg.priceEur)}</b>
                </div>
              </div>
              <PaymentPanel reg={reg} />
              <p className="muted acc-small">O dorsal é atribuído quando o pagamento entra. Até lá o lugar fica reservado.</p>
            </div>
          )}

          {reg.status === 'paga' && <Paid reg={reg} race={race} onPrint={onPrint} />}

          {cancelled && (
            <p className="notice" style={{ margin: 0 }}>
              Inscrição cancelada.{' '}
              {reg.payment?.paidAt
                ? 'O reembolso, quando aplicável, é feito pelo mesmo meio de pagamento em até 14 dias.'
                : 'Não houve pagamento, não há valores a devolver.'}
            </p>
          )}

          <dl className="kv acc-kv">
            <dt>Atleta</dt><dd>{reg.first} {reg.last}</dd>
            <dt>Telemóvel</dt><dd>{reg.phone || '—'}</dd>
            <dt>Emergência</dt><dd>{reg.emergencyName ? `${reg.emergencyName} · ${reg.emergencyPhone}` : '—'}</dd>
            <dt>T-shirt</dt><dd>{reg.shirt}</dd>
          </dl>
          {!cancelled && (
            <p className="muted acc-small">
              Para corrigir dados, escreve para{' '}
              <a href={`mailto:${EVENT.email}?subject=${encodeURIComponent(`Inscrição ${reg.id}`)}`}>{EVENT.email}</a> com a referência.
            </p>
          )}
        </div>

        {!cancelled && (
          <ol className="acc-prep" aria-label="Preparação">
            <li><MedicalCert reg={reg} race={race} /></li>
            <li><GearChecklist reg={reg} /></li>
            <li><GpsTest /></li>
            <li><Device reg={reg} /></li>
            <li><Gpx race={race} /></li>
          </ol>
        )}
      </div>

      {!cancelled && (
        <footer className="acc-reg-foot">
          <p className="muted acc-small" style={{ margin: 0 }}>{REFUND_TEXT}</p>
          <button className="btn small ghost noarrow" onClick={cancel}>Cancelar inscrição</button>
        </footer>
      )}
    </article>
  )
}

function Paid({ reg, race, onPrint }: { reg: Registration; race: Race; onPrint: () => void }) {
  const ics = raceICS(race.id)
  const pay = reg.payment
  return (
    <div className="stack" style={{ ['--s' as string]: '20px' }}>
      <div className="acc-bibbox">
        <p className="mono muted" style={{ margin: 0 }}>Dorsal</p>
        <p className="display acc-bib">{reg.bib ?? '—'}</p>
      </div>
      <dl className="kv acc-kv">
        <dt>Valor</dt><dd>{eur(reg.priceEur)}</dd>
        <dt>Pagamento</dt><dd>{pay ? methodText(pay.method, pay.last4) : '—'}</dd>
        <dt>Pago a</dt><dd>{pay?.paidAt ? fmtDayTime(pay.paidAt) : '—'}</dd>
      </dl>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn small" onClick={onPrint}>Imprimir comprovativo</button>
        <button
          className="btn small ghost noarrow"
          disabled={!ics}
          onClick={() => ics && download(`hell160-${race.id}.ics`, ics, 'text/calendar;charset=utf-8')}
        >
          {ics ? 'Adicionar ao calendário' : 'Calendário · data a anunciar'}
        </button>
      </div>
      <p className="muted acc-small" style={{ marginBottom: 0 }}>
        {race.id === 'bike'
          ? 'Levantamento do dorsal no dia da prova. A data é anunciada com o traçado.'
          : `Levantamento do dorsal na quinta-feira, 1 de julho, no ${EVENT.base}. Horário a confirmar.`}
      </p>
    </div>
  )
}

function methodText(method: PayMethod, last4?: string) {
  return method === 'cartao' && last4 ? `Cartão terminado em ${last4}` : METHOD_LABEL[method]
}

// ---------- preparação ----------

function StepHead({ title, status, tone }: { title: string; status: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="acc-step-head">
      <h4>{title}</h4>
      <span className={`mono acc-state${tone ? ` ${tone}` : ''}`}>{status}</span>
    </div>
  )
}

function MedicalCert({ reg, race }: { reg: Registration; race: Race }) {
  const [err, setErr] = useState<string | null>(null)
  const cert = reg.medical
  const deadline = race.id === 'bike' ? 'Prazo anunciado com a data da prova.' : 'Prazo: 15 de junho de 2027.'

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!CERT_TYPES.includes(file.type) && !CERT_EXT.test(file.name))
      return setErr(`«${file.name}» não é PDF, JPG ou PNG.`)
    if (file.size > MAX_CERT_BYTES) return setErr(`O ficheiro tem ${fmtMbUp(file.size)}, acima do limite de 5 MB.`)
    if (file.size === 0) return setErr('O ficheiro está vazio.')
    setErr(null)
    update('registrations', reg.id, {
      medical: { fileName: file.name, size: file.size, uploadedAt: new Date().toISOString(), status: 'em validação' },
    })
  }

  const status = cert ? cert.status : 'em falta'
  const tone = cert?.status === 'validado' ? 'ok' : !cert || cert.status === 'recusado' ? 'warn' : undefined

  // Substituir um atestado já validado obriga a nova validação: pede confirmação antes de abrir o seletor
  function guard(e: MouseEvent<HTMLInputElement>) {
    if (cert?.status !== 'validado') return
    if (!window.confirm('O atestado atual já está validado. Se o substituíres, volta a ficar à espera de validação. Continuar?'))
      e.preventDefault()
  }

  return (
    <div className="acc-step">
      <StepHead title="Atestado médico" status={status} tone={tone} />
      {cert ? (
        <dl className="kv acc-kv acc-kv-tight">
          <dt>Ficheiro</dt><dd className="acc-file-name">{cert.fileName}</dd>
          <dt>Tamanho</dt><dd>{fmtBytes(cert.size)}</dd>
          <dt>Enviado a</dt><dd>{fmtDayTime(cert.uploadedAt)}</dd>
        </dl>
      ) : (
        <p className="muted acc-small">Obrigatório para levantar o dorsal. {deadline}</p>
      )}
      {cert?.status === 'recusado' && (
        <p className="notice acc-small">A organização recusou este documento. Envia um atestado legível, assinado e com data deste ano.</p>
      )}
      {cert?.status === 'em validação' && <p className="muted acc-small">A organização valida em até 5 dias úteis. {deadline}</p>}
      <label className="btn small ghost noarrow acc-file">
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onClick={guard} onChange={pick} />
        {cert ? 'Substituir ficheiro' : 'Enviar atestado'}
      </label>
      {err && <p className="acc-err-line" role="alert">{err}</p>}
      <p className="muted acc-fine">PDF, JPG ou PNG até 5 MB. Protótipo: só o nome e o tamanho ficam guardados; em produção o ficheiro segue para a organização.</p>
    </div>
  )
}

function GearChecklist({ reg }: { reg: Registration }) {
  const checked = new Set(reg.gearChecked ?? [])
  const done = MANDATORY_GEAR.filter((g) => checked.has(g)).length
  const total = MANDATORY_GEAR.length

  function toggle(item: string) {
    const next = new Set(checked)
    if (next.has(item)) next.delete(item)
    else next.add(item)
    update('registrations', reg.id, { gearChecked: MANDATORY_GEAR.filter((g) => next.has(g)) })
  }

  return (
    <div className="acc-step">
      <StepHead title="Material obrigatório" status={`${done} de ${total}`} tone={done === total ? 'ok' : undefined} />
      <div className="acc-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Material verificado">
        <span style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <ul className="acc-gear">
        {MANDATORY_GEAR.map((g) => (
          <li key={g}>
            <label>
              <input type="checkbox" checked={checked.has(g)} onChange={() => toggle(g)} />
              <span>{g}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="muted acc-fine">Controlado à partida e no percurso. Falta de um item obrigatório implica desclassificação.</p>
    </div>
  )
}

type GpsState =
  | { s: 'idle' }
  | { s: 'busy' }
  | { s: 'ok'; lat: number; lon: number; acc: number; at: number }
  | { s: 'error'; msg: string }

function GpsTest() {
  const [g, setG] = useState<GpsState>({ s: 'idle' })

  function run() {
    if (!('geolocation' in navigator)) {
      return setG({ s: 'error', msg: 'Este browser não dá acesso à localização. Faz o teste no telemóvel que vais levar na prova.' })
    }
    if (!window.isSecureContext) {
      return setG({ s: 'error', msg: 'A localização só funciona em ligação segura (https). Abre a página pelo endereço oficial.' })
    }
    setG({ s: 'busy' })
    navigator.geolocation.getCurrentPosition(
      (p) => setG({ s: 'ok', lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, at: p.timestamp || Date.now() }),
      (e) =>
        setG({
          s: 'error',
          msg:
            e.code === e.PERMISSION_DENIED
              ? 'Sem permissão para a localização. Autoriza este site nas definições do browser e repete o teste.'
              : e.code === e.TIMEOUT
                ? 'Sem posição em 15 segundos. Vai para a rua ou para junto de uma janela e repete.'
                : 'Posição indisponível. Liga o GPS (serviços de localização) e repete ao ar livre.',
        }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    )
  }

  const quality =
    g.s !== 'ok' ? null : g.acc <= 20 ? 'Bom: posição de GPS.' : g.acc <= 100 ? 'Aceitável. Ao ar livre deve melhorar.' : 'Fraco: provavelmente posição pela rede, não por GPS. Repete ao ar livre com o GPS ligado.'

  return (
    <div className="acc-step">
      <StepHead
        title="Teste de sinal GPS"
        status={g.s === 'ok' ? `± ${Math.round(g.acc)} m` : g.s === 'busy' ? 'a procurar' : g.s === 'error' ? 'falhou' : 'por fazer'}
        tone={g.s === 'ok' ? (g.acc <= 100 ? 'ok' : 'warn') : g.s === 'error' ? 'warn' : undefined}
      />
      <p className="muted acc-small">
        É o mesmo teste feito no levantamento do dorsal: o dispositivo tem de dar posição antes de saíres. Faz agora para não teres surpresas.
      </p>
      <button className="btn small ghost noarrow" onClick={run} disabled={g.s === 'busy'}>
        {g.s === 'busy' ? 'A procurar sinal…' : g.s === 'idle' ? 'Testar sinal' : 'Repetir teste'}
      </button>
      <div aria-live="polite">
        {g.s === 'ok' && (
          <>
            <dl className="kv acc-kv acc-kv-tight">
              <dt>Latitude</dt><dd className="mono">{g.lat.toFixed(5)}</dd>
              <dt>Longitude</dt><dd className="mono">{g.lon.toFixed(5)}</dd>
              <dt>Precisão</dt><dd className="mono">± {Math.round(g.acc)} m</dd>
              <dt>Hora</dt><dd className="mono">{new Date(g.at).toLocaleTimeString('pt-PT')}</dd>
            </dl>
            <p className="acc-small">{quality}</p>
            <p className="muted acc-fine">A posição fica só neste ecrã; não é enviada nem guardada.</p>
          </>
        )}
        {g.s === 'error' && <p className="acc-err-line" role="alert">{g.msg}</p>}
      </div>
    </div>
  )
}

function Device({ reg }: { reg: Registration }) {
  const [label, text] = DEVICE[reg.device] ?? DEVICE.phone
  return (
    <div className="acc-step">
      <StepHead title="Tracking" status={label} />
      <p className="muted acc-small">{text}</p>
      <p className="muted acc-fine">
        Para mudar de dispositivo escreve para <a href={`mailto:${EVENT.email}?subject=${encodeURIComponent(`Tracking ${reg.id}`)}`}>{EVENT.email}</a>.{' '}
        <Link to="/live">Ver a simulação do tracking em direto</Link>
      </p>
    </div>
  )
}

function Gpx({ race }: { race: Race }) {
  const when = race.id === 'bike' ? 'com a data da prova' : 'em junho de 2027'
  return (
    <div className="acc-step">
      <StepHead title="Track da prova" status="em preparação" />
      <button className="btn small ghost noarrow" disabled>GPX oficial · disponível {when}</button>
      <p className="muted acc-small">
        Por segurança: o mapa deste site é esquemático e nunca deve ser usado para navegar. O GPX oficial é validado no terreno e chega pela app.
      </p>
    </div>
  )
}

// ---------- alojamento ----------

function Bookings({ regs, books, hosts }: { regs: Registration[]; books: Booking[]; hosts: HostApplication[] }) {
  // Casa escolhida na inscrição mas ainda sem pedido de reserva
  const live = books.filter((b) => b.status === 'pedido' || b.status === 'confirmado')
  const missingStay = regs
    .map((r) => r.stayId)
    .filter((id): id is string => !!id && !live.some((b) => b.listingId === id))
    .map((id) => findListing(id, hosts))
    .find((l) => !!l)

  return (
    <div className="stack">
      {missingStay && (
        <div className="notice acc-stay-hint">
          <span>
            Na inscrição escolheste <strong>{missingStay.title}</strong>, {missingStay.village}. Falta pedir a reserva ao anfitrião.
          </span>
          <Link className="btn small" to={`/alojamento/${missingStay.id}`}>Pedir reserva</Link>
        </div>
      )}
      {books.length === 0 ? (
        <div className="acc-empty">
          <p className="lede" style={{ margin: 0 }}>Sem reservas de alojamento.</p>
          <p className="muted">Casas de famílias das aldeias, perto da partida, para as noites de 1 a 4 de julho. Só pagas quando o anfitrião confirmar.</p>
          <div className="row">
            <Link className="btn" to="/alojamento">Procurar alojamento</Link>
          </div>
        </div>
      ) : (
        <div className="acc-books">
          {books.map((b) => <BookingRow key={b.id} b={b} hosts={hosts} />)}
        </div>
      )}
    </div>
  )
}

function BookingRow({ b, hosts }: { b: Booking; hosts: HostApplication[] }) {
  const l = findListing(b.listingId, hosts)
  const open = b.status === 'pedido' || b.status === 'confirmado'

  function cancel() {
    const who = l ? `${l.title}, ${l.village}` : 'esta casa'
    const note = b.status === 'confirmado' ? `\n\nO anfitrião já tinha confirmado: as noites voltam a ficar livres.` : ''
    if (!window.confirm(`Cancelar a reserva ${b.id} (${who})?${note}\n\nEsta ação não se desfaz.`)) return
    update('bookings', b.id, { status: 'cancelado' })
  }

  const explain =
    b.status === 'pedido'
      ? `À espera de resposta${l ? ` de ${l.host}` : ' do anfitrião'} (até 48 h). Só pagas quando confirmar.`
      : b.status === 'confirmado'
        ? `Confirmada${b.decidedAt ? ` a ${fmtDay(b.decidedAt)}` : ''}. ${l ? `${l.host} espera-te` : 'O anfitrião espera-te'} nas noites marcadas.`
        : b.status === 'recusado'
          ? 'O anfitrião não pode receber nestas noites. Escolhe outra casa.'
          : 'Cancelada por ti.'

  return (
    <article className={`acc-book${open ? '' : ' is-off'}`}>
      <div className="acc-book-plate">{l ? <HousePlate listing={l} /> : null}</div>
      <div className="acc-book-main">
        <p className="mono muted acc-meta" style={{ marginTop: 0 }}>
          <span>{b.id}</span>
          <span>Pedido a {fmtDay(b.createdAt)}</span>
        </p>
        <h3 className="acc-book-title">
          {l ? <Link to={`/alojamento/${l.id}`}>{l.title}</Link> : 'Casa já não disponível na plataforma'}
        </h3>
        <p className="muted acc-small" style={{ margin: '4px 0 0' }}>
          {l ? `${l.village} · ${l.kmToStart.toLocaleString('pt-PT')} km da partida · ` : ''}
          {b.guests} {b.guests === 1 ? 'pessoa' : 'pessoas'}
        </p>
        <div className="acc-nights">
          {[...b.nights].sort().map((n) => <span key={n} className="tag">{nightLabel(n)}</span>)}
        </div>
        <p className="acc-small" style={{ margin: '12px 0 0' }}>{explain}</p>
      </div>
      <div className="acc-book-side">
        <span className={STATUS_TAG[b.status]}>{b.status}</span>
        <b className="acc-book-total">{eur(b.totalEur)}</b>
        <span className="mono muted">{b.nights.length} {b.nights.length === 1 ? 'noite' : 'noites'}</span>
        <div className="acc-book-actions">
          {l && <Link className="btn small ghost" to={`/alojamento/${l.id}`}>Ver casa</Link>}
          {b.status === 'recusado' && <Link className="btn small" to="/alojamento">Outras casas</Link>}
          {open && <button className="btn small ghost noarrow" onClick={cancel}>Cancelar reserva</button>}
        </div>
      </div>
    </article>
  )
}

// ---------- comprovativo (só impressão) ----------

function Receipt({ reg }: { reg: Registration }) {
  const race = raceById(reg.race) ?? RACES[0]
  const pay = reg.payment
  return (
    <div className="acc-receipt">
      <p className="mono">Comprovativo de inscrição</p>
      <h1 className="display">{EVENT.name} {EVENT.edition}</h1>
      <p className="acc-receipt-sub">{EVENT.tagline} · {EVENT.place}</p>
      <div className="acc-receipt-bib">
        <span className="mono">Dorsal</span>
        <b>{reg.bib ?? '—'}</b>
      </div>
      <dl className="kv">
        <dt>Prova</dt><dd>{race.name} · {fmtNum(race.distanceKm)} km · {fmtNum(race.gainM)} m D+</dd>
        <dt>Partida</dt><dd>{race.start}</dd>
        <dt>Atleta</dt><dd>{reg.first} {reg.last}</dd>
        <dt>Email</dt><dd>{reg.email.trim().toLowerCase()}</dd>
        <dt>Referência</dt><dd>{reg.id}</dd>
        <dt>Valor</dt><dd>{eur(reg.priceEur)}</dd>
        <dt>Método</dt><dd>{pay ? methodText(pay.method, pay.last4) : '—'}</dd>
        {pay?.method === 'multibanco' && pay.reference && (<><dt>Ref. Multibanco</dt><dd>{pay.entity} · {pay.reference}</dd></>)}
        <dt>Pago a</dt><dd>{pay?.paidAt ? fmtDayTime(pay.paidAt) : '—'}</dd>
      </dl>
      <p className="acc-receipt-foot">
        Emitido a {fmtDayTime(new Date().toISOString())} · {EVENT.email}
        <br />
        Protótipo: pagamento simulado, nenhum valor foi cobrado. Datas 2027 a confirmar.
      </p>
    </div>
  )
}
