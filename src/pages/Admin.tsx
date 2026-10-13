import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RACES, raceById } from '../data/event'
import { EVENT_NIGHTS, FEATURES } from '../data/listings'
import { activeRegs, download, eur, findListing, fmtDate, hostToListing, markPaid, takenNights, toCSV } from '../lib/domain'
import { seedDemo } from '../lib/demo'
import {
  getAll,
  replaceAll,
  resetAll,
  update,
  useStore,
  type Booking,
  type Collections,
  type HostApplication,
  type Lead,
  type MedicalCert,
  type Payment,
  type Registration,
} from '../lib/store'
import '../styles/admin.css'

// Back-office da organização. Protótipo sem servidor: lê e escreve na mesma camada de dados das páginas públicas,
// por isso uma aprovação aqui aparece logo no site. O PIN só esconde o ecrã, não protege dados.

const PIN = '2027'
const UNLOCK_KEY = 'hell160.admin'
const AED_UNIT_EUR = 1800
const AED_TARGET = 8
const AED_GOAL_EUR = AED_UNIT_EUR * AED_TARGET

const TABS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'inscricoes', label: 'Inscrições' },
  { id: 'alojamento', label: 'Alojamento' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'parceiros', label: 'Parceiros' },
  { id: 'dados', label: 'Dados' },
] as const
type TabId = (typeof TABS)[number]['id']

const REG_STATUS: Record<Registration['status'], string> = { pendente: 'Pendente', paga: 'Paga', cancelada: 'Cancelada' }
const BOOKING_STATUS: Record<Booking['status'], string> = { pedido: 'Pedido', confirmado: 'Confirmada', recusado: 'Recusada', cancelado: 'Cancelada' }
const HOST_STATUS: Record<HostApplication['status'], string> = { pendente: 'Por decidir', aprovado: 'Aprovada', recusado: 'Recusada' }
const METHOD: Record<Payment['method'], string> = { mbway: 'MB WAY', multibanco: 'Multibanco', cartao: 'Cartão' }
const DEVICE: Record<Registration['device'], string> = { phone: 'Só telemóvel', 'phone+watch': 'Telemóvel + relógio', rental: 'Localizador alugado' }
const HOUSE_STATE: Record<string, string> = {
  pronta: 'Pronta a receber',
  pequenas: 'Precisa de pequenas arrumações',
  fechada: 'Fechada há anos, pede ajuda para reabrir',
}

const MED_FILTERS = [
  ['', 'Todos'],
  ['sem', 'Sem atestado'],
  ['validacao', 'Em validação'],
  ['validado', 'Validado'],
  ['recusado', 'Recusado'],
] as const
const medKey = (r: Registration) => (!r.medical ? 'sem' : r.medical.status === 'em validação' ? 'validacao' : r.medical.status)

// ---------- utilitários locais ----------

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const nowISO = () => new Date().toISOString()
const nightLabel = (iso: string) => EVENT_NIGHTS.find((n) => n.iso === iso)?.label ?? iso
const listWords = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`)
const featureLabel = (f: string) => (FEATURES as Record<string, string>)[f] ?? f

function stamp() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function exportCSV(base: string, rows: object[]) {
  if (!rows.length) return
  download(`${base}-${stamp()}.csv`, toCSV(rows), 'text/csv;charset=utf-8')
}

function readUnlocked() {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}

function writeUnlocked(on: boolean) {
  try {
    if (on) sessionStorage.setItem(UNLOCK_KEY, '1')
    else sessionStorage.removeItem(UNLOCK_KEY)
  } catch {
    /* sem sessionStorage: o desbloqueio dura até recarregar a página */
  }
}

type Flash = { tone: 'ok' | 'error'; text: ReactNode } | null

function FlashNote({ flash, onClose }: { flash: Flash; onClose: () => void }) {
  // Aviso fixo no fundo do ecrã: as ações acontecem a meio de tabelas longas, longe do topo.
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (flash?.tone !== 'ok') return
    const id = window.setTimeout(() => close.current(), 9000)
    return () => window.clearTimeout(id)
  }, [flash])
  if (!flash) return null
  return (
    <div className={`notice adm-toast${flash.tone === 'ok' ? ' adm-ok' : ''}`} role={flash.tone === 'error' ? 'alert' : 'status'}>
      <div>{flash.text}</div>
      <button type="button" className="adm-x" onClick={onClose}>
        Fechar
      </button>
    </div>
  )
}

function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="adm-sechead">
      <h2 className="cond adm-h2">{title}</h2>
      {children && <div className="row">{children}</div>}
    </div>
  )
}

// Emails longos partem antes do @ para as tabelas caberem no ecrã.
function Email({ value, link = false }: { value: string; link?: boolean }) {
  const at = value.indexOf('@')
  const body =
    at > 0 ? (
      <>
        {value.slice(0, at)}
        <wbr />
        {value.slice(at)}
      </>
    ) : (
      value
    )
  return link ? <a href={`mailto:${value}`}>{body}</a> : body
}

// ---------- entrada ----------

export function Admin() {
  const [unlocked, setUnlocked] = useState(readUnlocked)
  if (!unlocked)
    return (
      <Gate
        onUnlock={() => {
          writeUnlocked(true)
          setUnlocked(true)
        }}
      />
    )
  return (
    <Console
      onExit={() => {
        writeUnlocked(false)
        setUnlocked(false)
      }}
    />
  )
}

function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (pin.trim() === PIN) return onUnlock()
    setWrong(true)
    setPin('')
  }

  return (
    <section className="sec tight adm">
      <div className="wrap split" style={{ alignItems: 'end' }}>
        <div>
          <p className="eyebrow">Organização · edição 2027</p>
          <h1 className="display adm-title">Back-office</h1>
          <p className="lede mt">Inscrições, pagamentos, atestados, alojamento e contactos num só sítio.</p>
        </div>
        <form onSubmit={submit} className="summary stack adm-gate" style={{ ['--s' as string]: '24px' }}>
          <div className="field">
            <label htmlFor="adm-pin">PIN</label>
            <input
              id="adm-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pin}
              autoFocus
              aria-invalid={wrong}
              aria-describedby="adm-pin-help"
              onChange={(e) => {
                setPin(e.target.value)
                setWrong(false)
              }}
            />
            {wrong && (
              <span className="hint ember" role="alert">
                PIN errado.
              </span>
            )}
          </div>
          <button className="btn" disabled={!pin.trim()}>
            Entrar
          </button>
          <p className="notice" id="adm-pin-help" style={{ marginBottom: 0 }}>
            PIN de demonstração: 2027. Este controlo é só no browser e não protege dados reais.
          </p>
        </form>
      </div>
    </section>
  )
}

function Console({ onExit }: { onExit: () => void }) {
  const data = useStore()
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TabId = TABS.find((t) => t.id === raw)?.id ?? 'resumo'
  const headRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // ao mudar de separador a partir de um link a meio da página, volta ao topo do painel
  useEffect(() => {
    const el = headRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top
    if (top < 64) window.scrollTo({ top: window.scrollY + top - 80 })
  }, [tab])

  const badge: Partial<Record<TabId, number>> = {
    inscricoes: data.registrations.filter((r) => r.status !== 'cancelada' && r.medical?.status === 'em validação').length,
    alojamento: data.bookings.filter((b) => b.status === 'pedido').length + data.hosts.filter((h) => h.status === 'pendente').length,
  }

  const go = (id: TabId) => setParams({ tab: id })

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    // parte do separador com foco: o estado do router pode ainda não ter mudado entre duas teclas rápidas
    const focused = TABS.findIndex((t) => tabRefs.current[t.id] === document.activeElement)
    const i = focused >= 0 ? focused : TABS.findIndex((t) => t.id === tab)
    const next =
      e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1
    if (next < 0) return
    e.preventDefault()
    go(TABS[next].id)
    tabRefs.current[TABS[next].id]?.focus()
  }

  return (
    <div className="adm">
      <section className="adm-head">
        <div className="wrap" ref={headRef}>
          <div className="row between">
            <p className="eyebrow" style={{ margin: 0 }}>
              Organização · edição 2027
            </p>
            <button type="button" className="btn ghost small noarrow" onClick={onExit}>
              Sair
            </button>
          </div>
          <h1 className="display adm-title">Back-office</h1>
          <p className="mono muted adm-sub">Simulação · os dados ficam guardados só neste browser</p>
          <div className="adm-tabs" role="tablist" aria-label="Secções do back-office" onKeyDown={onKey}>
            {TABS.map((t) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el
                }}
                type="button"
                role="tab"
                id={`adm-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="adm-panel"
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => go(t.id)}
              >
                {t.label}
                {!!badge[t.id] && (
                  <span className="adm-badge" aria-label={`${badge[t.id]} por tratar`}>
                    {badge[t.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="adm-body">
        <div className="wrap" role="tabpanel" id="adm-panel" aria-labelledby={`adm-tab-${tab}`}>
          {tab === 'resumo' && <Overview data={data} />}
          {tab === 'inscricoes' && <Registrations data={data} />}
          {tab === 'alojamento' && <Lodging data={data} />}
          {tab === 'seguranca' && <SafetyTab data={data} />}
          {tab === 'parceiros' && <PartnersTab leads={data.leads} />}
          {tab === 'dados' && <DataTab data={data} />}
        </div>
      </section>
    </div>
  )
}

// ---------- resumo ----------

function Overview({ data }: { data: Collections }) {
  const { registrations: regs, bookings, hosts, pledges, leads } = data
  const active = activeRegs(regs)
  const paid = regs.filter((r) => r.status === 'paga')
  const pending = regs.filter((r) => r.status === 'pendente')
  const received = sum(paid.map((r) => r.priceEur))
  const owed = sum(pending.map((r) => r.priceEur))
  const medPending = active.filter((r) => r.medical?.status === 'em validação').length
  const medRefused = active.filter((r) => r.medical?.status === 'recusado').length
  const paidNoMed = paid.filter((r) => !r.medical).length
  const bookingsPending = bookings.filter((b) => b.status === 'pedido')
  const conflicts = bookingsPending.filter((b) => {
    const taken = takenNights(b.listingId, bookings)
    return b.nights.some((n) => taken.has(n))
  }).length
  const hostsPending = hosts.filter((h) => h.status === 'pendente').length
  const pledged = sum(pledges.map((p) => p.amountEur))
  const training = leads.filter((l) => l.kind === 'formacao').length
  const partners = leads.filter((l) => l.kind === 'parceiro').length
  const total = regs.length + bookings.length + hosts.length + pledges.length + leads.length
  const recent = [...regs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)

  const todo: { n: number; text: string; to: string; urgent?: boolean }[] = [
    { n: medPending, text: `${medPending === 1 ? 'atestado' : 'atestados'} por validar`, to: '?tab=inscricoes&atestado=validacao', urgent: true },
    { n: conflicts, text: `${conflicts === 1 ? 'pedido de reserva' : 'pedidos de reserva'} sobre noites já confirmadas`, to: '?tab=alojamento', urgent: true },
    { n: bookingsPending.length, text: `${bookingsPending.length === 1 ? 'reserva' : 'reservas'} por confirmar`, to: '?tab=alojamento' },
    { n: hostsPending, text: `${hostsPending === 1 ? 'anfitrião' : 'anfitriões'} por aprovar`, to: '?tab=alojamento' },
    { n: pending.length, text: `${pending.length === 1 ? 'inscrição' : 'inscrições'} por pagar`, to: '?tab=inscricoes&estado=pendente' },
    { n: paidNoMed, text: `${paidNoMed === 1 ? 'inscrição paga' : 'inscrições pagas'} sem atestado enviado`, to: '?tab=inscricoes&estado=paga&atestado=sem' },
    { n: medRefused, text: `${medRefused === 1 ? 'atestado recusado' : 'atestados recusados'}, à espera de novo envio`, to: '?tab=inscricoes&atestado=recusado' },
    { n: training, text: `${training === 1 ? 'pedido' : 'pedidos'} de formação`, to: '?tab=seguranca' },
    { n: partners, text: `${partners === 1 ? 'contacto' : 'contactos'} de parceiros`, to: '?tab=parceiros' },
  ].filter((t) => t.n > 0)

  return (
    <>
      {total === 0 && <EmptyStore />}

      <div className="stats adm-kpis">
        <div>
          <b>{active.length}</b>
          <span>inscrições ativas</span>
        </div>
        <div>
          <b>{paid.length}</b>
          <span>pagas</span>
        </div>
        <div>
          <b>{eur(received)}</b>
          <span>receita recebida</span>
        </div>
        <div>
          <b className="muted">{eur(owed)}</b>
          <span>receita pendente</span>
        </div>
        <div>
          <b className={medPending ? 'ember' : undefined}>{medPending}</b>
          <span>atestados por validar</span>
        </div>
        <div>
          <b className={bookingsPending.length ? 'ember' : undefined}>{bookingsPending.length}</b>
          <span>reservas por confirmar</span>
        </div>
        <div>
          <b className={hostsPending ? 'ember' : undefined}>{hostsPending}</b>
          <span>anfitriões por aprovar</span>
        </div>
        <div>
          <b>{eur(pledged)}</b>
          <div className="adm-mini" role="img" aria-label={`${Math.round((pledged / AED_GOAL_EUR) * 100)} % do objetivo`}>
            <div style={{ width: `${Math.min(100, (pledged / AED_GOAL_EUR) * 100)}%` }} />
          </div>
          <span>angariado DAE · objetivo {eur(AED_GOAL_EUR)}</span>
        </div>
      </div>

      <div className="adm-cols mt-l">
        <div>
          <SectionHead title="Ocupação por prova">
            <BarLegend />
          </SectionHead>
          <RaceBars regs={regs} />
        </div>
        <div>
          <SectionHead title="Precisa de atenção" />
          {todo.length ? (
            <ul className="adm-todo">
              {todo.map((t) => (
                <li key={t.text}>
                  <Link to={t.to}>
                    <b className={t.urgent ? 'ember' : undefined}>{t.n}</b>
                    <span>{t.text}</span>
                    <span className="go">Abrir</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">Nada pendente.</p>
          )}
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mt-l">
          <SectionHead title="Últimas inscrições">
            <Link className="mono" to="?tab=inscricoes">
              Ver todas
            </Link>
          </SectionHead>
          <div className="adm-scroll">
            <table className="board adm-table" style={{ ['--min' as string]: '640px' }}>
              <thead>
                <tr>
                  <th>Ref.</th>
                  <th>Atleta</th>
                  <th>Prova</th>
                  <th>Estado</th>
                  <th className="num">Total</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className={r.status === 'cancelada' ? 'off' : undefined}>
                    <td>
                      <Link to={`?tab=inscricoes&q=${encodeURIComponent(r.id)}`}>{r.id}</Link>
                    </td>
                    <td className="who">
                      {r.first} {r.last}
                    </td>
                    <td>{raceById(r.race)?.name ?? r.race}</td>
                    <td>
                      <RegTag status={r.status} />
                    </td>
                    <td className="num">{eur(r.priceEur)}</td>
                    <td>{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

function EmptyStore() {
  return (
    <div className="notice adm-flash" style={{ marginBottom: 32 }}>
      <div>
        Ainda não há dados neste browser. Faz uma inscrição no site ou carrega os dados de demonstração (simulação com nomes fictícios).
      </div>
      <button type="button" className="btn small noarrow" onClick={() => seedDemo()}>
        Carregar demonstração
      </button>
    </div>
  )
}

function BarLegend() {
  return (
    <div className="adm-legend mono" aria-hidden="true">
      <span>
        <i className="paid" />
        Pagas
      </span>
      <span>
        <i className="pend" />
        Pendentes
      </span>
      <span>
        <i className="free" />
        Vagas livres
      </span>
    </div>
  )
}

function RaceBars({ regs }: { regs: Registration[] }) {
  return (
    <div className="adm-bars">
      {RACES.map((race) => {
        const act = activeRegs(regs, race.id)
        const p = act.filter((r) => r.status === 'paga').length
        const q = act.length - p
        const cap = race.places ?? Math.max(act.length, 1)
        const free = race.places == null ? null : Math.max(0, race.places - act.length)
        const w = (n: number) => `${Math.min(100, (n / cap) * 100)}%`
        const desc = `${race.name}: ${p} pagas, ${q} pendentes${free != null ? `, ${free} vagas livres de ${race.places}` : ''}`
        return (
          <div className="adm-bar" key={race.id}>
            <div className="adm-bar-head">
              <strong>{race.name}</strong>
              <span className="mono">
                <b>{act.length}</b> / {race.places ?? 'sem limite'}
              </span>
            </div>
            <div className="adm-track" role="img" aria-label={desc} title={desc}>
              {p > 0 && <span className="paid" style={{ width: w(p) }} />}
              {q > 0 && <span className="pend" style={{ width: w(q) }} />}
            </div>
            <div className="adm-bar-foot mono muted">
              <span>{p} pagas</span>
              <span>{q} pendentes</span>
              {free != null && <span>{free} livres</span>}
              <span>{Math.round((act.length / cap) * 100)} % ocupado</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RegTag({ status }: { status: Registration['status'] }) {
  return <span className={status === 'paga' ? 'tag solid' : status === 'cancelada' ? 'tag adm-dim' : 'tag'}>{REG_STATUS[status]}</span>
}

function MedTag({ med }: { med?: MedicalCert }) {
  if (!med) return <span className="muted">Sem atestado</span>
  const cls = med.status === 'em validação' ? 'tag ember' : med.status === 'validado' ? 'tag solid' : 'tag adm-warn'
  return <span className={cls}>{med.status}</span>
}

// ---------- inscrições ----------

function regCSV(r: Registration, hosts: HostApplication[]) {
  const stay = r.stayId ? findListing(r.stayId, hosts) : undefined
  return {
    referencia: r.id,
    criada_em: r.createdAt,
    prova: raceById(r.race)?.name ?? r.race,
    nome: r.first,
    apelido: r.last,
    email: r.email,
    telefone: r.phone,
    nascimento: r.birth,
    nacionalidade: r.nationality,
    emergencia_nome: r.emergencyName,
    emergencia_telefone: r.emergencyPhone,
    dispositivo: DEVICE[r.device] ?? r.device,
    tshirt: r.shirt,
    estado: r.status,
    dorsal: r.bib ?? '',
    total_eur: r.priceEur,
    pagamento_metodo: r.payment ? METHOD[r.payment.method] : '',
    pagamento_entidade: r.payment?.entity ?? '',
    pagamento_referencia: r.payment?.reference ?? '',
    pagamento_telemovel: r.payment?.phone ?? '',
    pagamento_cartao_final: r.payment?.last4 ?? '',
    pagamento_pedido_em: r.payment?.requestedAt ?? '',
    pagamento_pago_em: r.payment?.paidAt ?? '',
    atestado_estado: r.medical?.status ?? '',
    atestado_ficheiro: r.medical?.fileName ?? '',
    atestado_enviado_em: r.medical?.uploadedAt ?? '',
    alojamento_id: r.stayId ?? '',
    alojamento: stay ? `${stay.title}, ${stay.village}` : '',
    material_verificado: (r.gearChecked ?? []).join(' | '),
  }
}

const FILTER_KEYS = ['q', 'prova', 'estado', 'atestado', 'ordem'] as const
type RegFilters = Record<(typeof FILTER_KEYS)[number], string>

function Registrations({ data }: { data: Collections }) {
  const [params, setParams] = useSearchParams()
  // Os filtros vivem em estado local (resposta imediata ao escrever) e são espelhados no URL sem criar entradas no histórico.
  const [f, setF] = useState<RegFilters>(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ''])) as RegFilters)
  const [open, setOpen] = useState<string | null>(null)
  const [flash, setFlash] = useState<Flash>(null)
  const { q, prova: race, estado: status, atestado: med } = f
  const asc = f.ordem === 'asc'
  const set = (key: keyof RegFilters, value: string) => setF((x) => ({ ...x, [key]: value }))

  useEffect(() => {
    const next = new URLSearchParams({ tab: 'inscricoes' })
    for (const k of FILTER_KEYS) if (f[k]) next.set(k, f[k])
    if (next.toString() !== window.location.search.replace(/^\?/, '')) setParams(next, { replace: true })
    // depende só dos filtros: setParams muda de identidade a cada navegação
  }, [f])

  const rows = useMemo(() => {
    const needle = norm(q.trim().replace(/^#/, ''))
    const numeric = /^\d+$/.test(needle)
    return data.registrations
      .filter(
        (r) =>
          (!race || r.race === race) &&
          (!status || r.status === status) &&
          (!med || medKey(r) === med) &&
          (!needle ||
            (numeric
              ? r.bib === Number(needle) || (needle.length > 3 && (r.id.includes(needle) || r.phone.replace(/\D/g, '').includes(needle)))
              : norm(`${r.first} ${r.last} ${r.email} ${r.id}`).includes(needle))),
      )
      .sort((a, b) => (asc ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)))
  }, [data.registrations, q, race, status, med, asc])

  const filtered = !!(q || race || status || med)

  function clear() {
    setF((x) => ({ q: '', prova: '', estado: '', atestado: '', ordem: x.ordem }))
  }

  function pay(r: Registration) {
    markPaid(r.id)
    const bib = getAll().registrations.find((x) => x.id === r.id)?.bib
    setFlash({ tone: 'ok', text: `${r.id} marcada como paga (${eur(r.priceEur)}). Dorsal atribuído: ${bib}.` })
  }

  function setMedical(r: Registration, next: MedicalCert['status']) {
    if (!r.medical) return
    update('registrations', r.id, { medical: { ...r.medical, status: next } })
    const verb = next === 'validado' ? 'validado' : next === 'recusado' ? 'recusado' : 'reposto em validação'
    setFlash({ tone: next === 'recusado' ? 'error' : 'ok', text: `Atestado de ${r.first} ${r.last} ${verb}.` })
  }

  function cancel(r: Registration) {
    const extra =
      r.status === 'paga'
        ? ` Está paga (${eur(r.priceEur)}): o reembolso faz-se fora da plataforma. O dorsal ${r.bib} não volta a ser atribuído.`
        : ''
    if (!window.confirm(`Cancelar a inscrição ${r.id} de ${r.first} ${r.last}?${extra} A vaga fica livre.`)) return
    update('registrations', r.id, { status: 'cancelada' })
    setFlash({ tone: 'ok', text: `${r.id} cancelada. A vaga voltou a ficar disponível.` })
  }

  return (
    <>
      <div className="adm-toolbar">
        <div className="field adm-search">
          <label htmlFor="adm-q">Pesquisar</label>
          <input id="adm-q" type="search" placeholder="Nome, email, referência ou dorsal" value={q} onChange={(e) => set('q', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="adm-race">Prova</label>
          <select id="adm-race" value={race} onChange={(e) => set('prova', e.target.value)}>
            <option value="">Todas</option>
            {RACES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="adm-status">Estado</label>
          <select id="adm-status" value={status} onChange={(e) => set('estado', e.target.value)}>
            <option value="">Todos</option>
            {(Object.keys(REG_STATUS) as Registration['status'][]).map((s) => (
              <option key={s} value={s}>
                {REG_STATUS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="adm-med">Atestado</label>
          <select id="adm-med" value={med} onChange={(e) => set('atestado', e.target.value)}>
            {MED_FILTERS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="adm-count">
        <p className="mono" aria-live="polite" style={{ margin: 0 }}>
          {rows.length} de {plural(data.registrations.length, 'inscrição', 'inscrições')}
          {filtered && (
            <>
              {' · '}
              <button type="button" className="adm-link" onClick={clear}>
                Limpar filtros
              </button>
            </>
          )}
        </p>
        <button
          type="button"
          className="btn small ghost noarrow"
          disabled={!rows.length}
          onClick={() => exportCSV('inscricoes', rows.map((r) => regCSV(r, data.hosts)))}
        >
          Exportar CSV · {rows.length}
        </button>
      </div>

      <FlashNote flash={flash} onClose={() => setFlash(null)} />

      {rows.length === 0 ? (
        <p className="adm-empty">{data.registrations.length ? 'Nenhuma inscrição com estes filtros.' : 'Ainda não há inscrições.'}</p>
      ) : (
        <div className="adm-scroll">
          <table className="board adm-table" style={{ ['--min' as string]: '1180px' }}>
            <thead>
              <tr>
                <th>Ref.</th>
                <th>Atleta</th>
                <th>Prova</th>
                <th>Estado</th>
                <th className="num">Dorsal</th>
                <th>Atestado</th>
                <th>Pagamento</th>
                <th className="num">Total</th>
                <th aria-sort={asc ? 'ascending' : 'descending'}>
                  <button type="button" className="adm-sort" onClick={() => set('ordem', asc ? '' : 'asc')}>
                    Data {asc ? '↑' : '↓'}
                    <span className="sr-only">{asc ? ', mais antigas primeiro' : ', mais recentes primeiro'}</span>
                  </button>
                </th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isOpen = open === r.id
                return (
                  <Fragment key={r.id}>
                    <tr className={`${r.status === 'cancelada' ? 'off' : ''}${isOpen ? ' adm-opened' : ''}`}>
                      <td>{r.id}</td>
                      <td className="adm-wrap">
                        <button type="button" className="adm-who" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.id)}>
                          {r.first} {r.last}
                        </button>
                        <small>
                          <Email value={r.email} />
                        </small>
                      </td>
                      <td>{raceById(r.race)?.name ?? r.race}</td>
                      <td>
                        <RegTag status={r.status} />
                      </td>
                      <td className="num">{r.bib ?? '—'}</td>
                      <td>
                        <MedTag med={r.medical} />
                        {r.medical?.status === 'em validação' && r.status !== 'cancelada' && (
                          <div className="adm-acts mt-s" style={{ marginTop: 8 }}>
                            <button type="button" className="chip adm-act go" title="Validar atestado" onClick={() => setMedical(r, 'validado')}>
                              Validar atestado
                            </button>
                            <button type="button" className="chip adm-act danger" title="Recusar atestado" onClick={() => setMedical(r, 'recusado')}>
                              Recusar atestado
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <PaymentCell p={r.payment} />
                      </td>
                      <td className="num">{eur(r.priceEur)}</td>
                      <td>{fmtDate(r.createdAt)}</td>
                      <td>
                        <div className="adm-acts">
                          {r.status === 'pendente' && (
                            <button type="button" className="chip adm-act go" onClick={() => pay(r)}>
                              Marcar paga
                            </button>
                          )}
                          {r.status !== 'cancelada' && (
                            <button type="button" className="chip adm-act" onClick={() => cancel(r)}>
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="adm-detail">
                        <td colSpan={10}>
                          <RegDetail r={r} hosts={data.hosts} onMedical={(s) => setMedical(r, s)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function PaymentCell({ p }: { p?: Payment }) {
  if (!p) return <span className="muted">Sem pedido</span>
  const detail =
    p.method === 'multibanco'
      ? p.reference
        ? `${p.entity ? `${p.entity} · ` : ''}${p.reference}`
        : ''
      : p.method === 'mbway'
        ? p.phone ?? ''
        : p.last4
          ? `•••• ${p.last4}`
          : ''
  return (
    <>
      <span>{METHOD[p.method]}</span>
      {detail && <small>{detail}</small>}
      <small className={p.paidAt ? 'adm-okt' : undefined}>{p.paidAt ? `recebido ${fmtDate(p.paidAt)}` : 'por pagar'}</small>
    </>
  )
}

function RegDetail({ r, hosts, onMedical }: { r: Registration; hosts: HostApplication[]; onMedical: (s: MedicalCert['status']) => void }) {
  const stay = r.stayId ? findListing(r.stayId, hosts) : undefined
  return (
    <div className="adm-detail-grid">
      <dl className="kv adm-kv">
        <dt>Telefone</dt>
        <dd>
          <a href={`tel:${r.phone.replace(/\s/g, '')}`}>{r.phone}</a>
        </dd>
        <dt>Nascimento</dt>
        <dd>{r.birth || '—'}</dd>
        <dt>Nacionalidade</dt>
        <dd>{r.nationality}</dd>
        <dt>T-shirt</dt>
        <dd>{r.shirt}</dd>
      </dl>
      <dl className="kv adm-kv">
        <dt>Emergência</dt>
        <dd>
          {r.emergencyName} · {r.emergencyPhone}
        </dd>
        <dt>Tracking</dt>
        <dd>{DEVICE[r.device] ?? r.device}</dd>
        <dt>Alojamento</dt>
        <dd>{stay ? `${stay.title}, ${stay.village}` : r.stayId ? r.stayId : '—'}</dd>
        <dt>Material</dt>
        <dd>{r.gearChecked?.length ? `${r.gearChecked.length} itens confirmados` : '—'}</dd>
      </dl>
      <dl className="kv adm-kv">
        <dt>Atestado</dt>
        <dd>
          {r.medical ? (
            <>
              {r.medical.fileName} · {Math.round(r.medical.size / 1000)} kB · {fmtDate(r.medical.uploadedAt)}
              {r.medical.status !== 'em validação' && r.status !== 'cancelada' && (
                <>
                  {' · '}
                  <button type="button" className="adm-link" onClick={() => onMedical('em validação')}>
                    Repor em validação
                  </button>
                </>
              )}
            </>
          ) : (
            'Ainda não enviado'
          )}
        </dd>
        <dt>Pedido pagamento</dt>
        <dd>{r.payment ? fmtDate(r.payment.requestedAt) : '—'}</dd>
        <dt>Simulação</dt>
        <dd className="muted">O ficheiro do atestado não é guardado; só o nome e o estado.</dd>
      </dl>
    </div>
  )
}

// ---------- alojamento ----------

function bookingCSV(b: Booking, hosts: HostApplication[]) {
  const l = findListing(b.listingId, hosts)
  return {
    referencia: b.id,
    criada_em: b.createdAt,
    casa_id: b.listingId,
    casa: l?.title ?? '',
    aldeia: l?.village ?? '',
    anfitriao: l?.host ?? '',
    noites: b.nights.join(' | '),
    numero_noites: b.nights.length,
    pessoas: b.guests,
    hospede: b.name,
    email: b.email,
    telefone: b.phone ?? '',
    total_eur: b.totalEur,
    estado: b.status,
    decidida_em: b.decidedAt ?? '',
  }
}

function Lodging({ data }: { data: Collections }) {
  const { hosts, bookings } = data
  const [flash, setFlash] = useState<Flash>(null)
  const [filter, setFilter] = useState<'' | Booking['status']>('')

  const pendingHosts = hosts.filter((h) => h.status === 'pendente').sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const decidedHosts = hosts.filter((h) => h.status !== 'pendente').sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''))
  const list = bookings.filter((b) => !filter || b.status === filter).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function approve(h: HostApplication) {
    update('hosts', h.id, { status: 'aprovado', decidedAt: nowISO() })
    const l = hostToListing(h)
    setFlash({
      tone: 'ok',
      text: (
        <>
          {l.title} ({h.village}) aprovada. Já aparece em <Link to={`/alojamento/${l.id}`}>Dormir na aldeia</Link>.
        </>
      ),
    })
  }

  function refuse(h: HostApplication) {
    if (!window.confirm(`Recusar a candidatura de ${h.name} (${h.village})?`)) return
    update('hosts', h.id, { status: 'recusado', decidedAt: nowISO() })
    setFlash({ tone: 'ok', text: `Candidatura de ${h.name} recusada.` })
  }

  function reopen(h: HostApplication) {
    update('hosts', h.id, { status: 'pendente', decidedAt: undefined })
    setFlash({ tone: 'ok', text: `Candidatura de ${h.name} voltou a estar por decidir.` })
  }

  function confirmBooking(b: Booking) {
    const { bookings: all, hosts: hs } = getAll()
    const listing = findListing(b.listingId, hs)
    const title = listing?.title ?? b.listingId
    const taken = takenNights(b.listingId, all)
    const clash = b.nights.filter((n) => taken.has(n))
    if (clash.length) {
      const owners = all
        .filter((o) => o.status === 'confirmado' && o.listingId === b.listingId && o.nights.some((n) => clash.includes(n)))
        .map((o) => o.id)
      setFlash({
        tone: 'error',
        text: `Não é possível confirmar ${b.id}. ${listWords(clash.map(nightLabel))} já ${clash.length === 1 ? 'está confirmada' : 'estão confirmadas'} em ${title} (${owners.join(', ')}). Recusa este pedido ou cancela primeiro a outra reserva.`,
      })
      return
    }
    if (!listing) {
      setFlash({ tone: 'error', text: `Não é possível confirmar ${b.id}: a casa ${b.listingId} já não está publicada.` })
      return
    }
    update('bookings', b.id, { status: 'confirmado', decidedAt: nowISO() })
    const now = all.filter((o) => o.id !== b.id && o.status === 'pedido' && o.listingId === b.listingId && o.nights.some((n) => b.nights.includes(n)))
    setFlash({
      tone: 'ok',
      text:
        `${b.id} confirmada: ${title}, ${listWords(b.nights.map(nightLabel))}.` +
        (now.length
          ? ` ${now.length === 1 ? 'O pedido' : 'Os pedidos'} ${now.map((o) => o.id).join(', ')} para as mesmas noites ${now.length === 1 ? 'fica' : 'ficam'} em conflito.`
          : ''),
    })
  }

  function refuseBooking(b: Booking) {
    if (!window.confirm(`Recusar o pedido ${b.id} de ${b.name}?`)) return
    update('bookings', b.id, { status: 'recusado', decidedAt: nowISO() })
    setFlash({ tone: 'ok', text: `Pedido ${b.id} recusado.` })
  }

  function cancelBooking(b: Booking) {
    if (!window.confirm(`Cancelar a reserva confirmada ${b.id} de ${b.name}? As noites voltam a ficar livres.`)) return
    update('bookings', b.id, { status: 'cancelado', decidedAt: nowISO() })
    setFlash({ tone: 'ok', text: `Reserva ${b.id} cancelada. As noites voltaram a ficar livres.` })
  }

  return (
    <>
      <FlashNote flash={flash} onClose={() => setFlash(null)} />

      <SectionHead title="Anfitriões">
        <span className="mono muted">{plural(pendingHosts.length, 'candidatura por decidir', 'candidaturas por decidir')}</span>
      </SectionHead>
      <p className="muted adm-intro">Ao aprovar, a casa entra logo em Dormir na aldeia e pode receber pedidos.</p>
      {pendingHosts.length === 0 ? (
        <p className="adm-empty">Nenhuma candidatura por decidir.</p>
      ) : (
        <div className="adm-apps">
          {pendingHosts.map((h) => (
            <HostApp key={h.id} h={h} onApprove={() => approve(h)} onRefuse={() => refuse(h)} />
          ))}
        </div>
      )}

      {decidedHosts.length > 0 && (
        <div className="mt">
          <p className="mono muted">Decididas</p>
          <div className="adm-scroll">
            <table className="board adm-table" style={{ ['--min' as string]: '720px' }}>
              <thead>
                <tr>
                  <th>Ref.</th>
                  <th>Anfitrião</th>
                  <th>Casa</th>
                  <th>Aldeia</th>
                  <th>Estado</th>
                  <th>Decidida</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {decidedHosts.map((h) => {
                  const l = hostToListing(h)
                  return (
                    <tr key={h.id} className={h.status === 'recusado' ? 'off' : undefined}>
                      <td>{h.id}</td>
                      <td className="who">{h.name}</td>
                      <td>{l.title}</td>
                      <td>{h.village}</td>
                      <td>
                        <span className={h.status === 'aprovado' ? 'tag solid' : 'tag adm-dim'}>{HOST_STATUS[h.status]}</span>
                      </td>
                      <td>{h.decidedAt ? fmtDate(h.decidedAt) : '—'}</td>
                      <td>
                        {h.status === 'aprovado' ? (
                          <Link to={`/alojamento/${l.id}`}>Ver casa</Link>
                        ) : (
                          <button type="button" className="chip adm-act" onClick={() => reopen(h)}>
                            Reconsiderar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-l">
        <SectionHead title="Reservas">
          <div className="field adm-inline">
            <label htmlFor="adm-bk">Estado</label>
            <select id="adm-bk" value={filter} onChange={(e) => setFilter(e.target.value as '' | Booking['status'])}>
              <option value="">Todas</option>
              {(Object.keys(BOOKING_STATUS) as Booking['status'][]).map((s) => (
                <option key={s} value={s}>
                  {BOOKING_STATUS[s]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn small ghost noarrow"
            disabled={!list.length}
            onClick={() => exportCSV('reservas', list.map((b) => bookingCSV(b, hosts)))}
          >
            Exportar CSV · {list.length}
          </button>
        </SectionHead>
        <p className="muted adm-intro">
          Confirmar bloqueia as noites da casa. Um pedido sobre noites já confirmadas não pode ser confirmado.
        </p>
        {list.length === 0 ? (
          <p className="adm-empty">{bookings.length ? 'Nenhuma reserva neste estado.' : 'Ainda não há pedidos de reserva.'}</p>
        ) : (
          <div className="adm-scroll">
            <table className="board adm-table" style={{ ['--min' as string]: '1120px' }}>
              <thead>
                <tr>
                  <th>Ref.</th>
                  <th>Casa</th>
                  <th>Noites</th>
                  <th>Hóspede</th>
                  <th>Email</th>
                  <th className="num">Pessoas</th>
                  <th className="num">Total</th>
                  <th>Estado</th>
                  <th>Pedido</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((b) => {
                  const l = findListing(b.listingId, hosts)
                  const taken = takenNights(b.listingId, bookings)
                  const clash = b.status === 'pedido' && b.nights.some((n) => taken.has(n))
                  return (
                    <tr key={b.id} className={b.status === 'recusado' || b.status === 'cancelado' ? 'off' : undefined}>
                      <td>{b.id}</td>
                      <td className="who">
                        {l ? <Link to={`/alojamento/${l.id}`}>{l.title}</Link> : b.listingId}
                        <small>{l ? `${l.village} · ${l.host}` : 'casa indisponível'}</small>
                      </td>
                      <td className="adm-wrap">
                        {b.nights.map(nightLabel).join(', ')}
                        {clash && (
                          <small>
                            <span className="tag ember">conflito</span>
                          </small>
                        )}
                      </td>
                      <td className="who">{b.name}</td>
                      <td className="adm-wrap">
                        <Email value={b.email} link />
                      </td>
                      <td className="num">{b.guests}</td>
                      <td className="num">{eur(b.totalEur)}</td>
                      <td>
                        <span className={b.status === 'confirmado' ? 'tag solid' : b.status === 'pedido' ? 'tag' : 'tag adm-dim'}>
                          {BOOKING_STATUS[b.status]}
                        </span>
                      </td>
                      <td>{fmtDate(b.createdAt)}</td>
                      <td>
                        <div className="adm-acts">
                          {b.status === 'pedido' && (
                            <>
                              <button type="button" className="chip adm-act go" onClick={() => confirmBooking(b)}>
                                Confirmar
                              </button>
                              <button type="button" className="chip adm-act danger" onClick={() => refuseBooking(b)}>
                                Recusar
                              </button>
                            </>
                          )}
                          {b.status === 'confirmado' && (
                            <button type="button" className="chip adm-act" onClick={() => cancelBooking(b)}>
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function HostApp({ h, onApprove, onRefuse }: { h: HostApplication; onApprove: () => void; onRefuse: () => void }) {
  const title = hostToListing(h).title
  const weekend = Math.round(h.eurNight * 3)
  return (
    <article className="adm-app">
      <div>
        <p className="mono muted" style={{ margin: 0 }}>
          {h.id} · {fmtDate(h.createdAt)}
        </p>
        <h3 className="cond adm-app-title">{title}</h3>
        <p style={{ margin: '6px 0 0' }}>
          {h.village} · {h.address}
        </p>
        {!h.features.includes('ac') && (
          <p className="mt-s" style={{ marginBottom: 0 }}>
            <span className="tag ember">sem ar condicionado</span> <span className="muted" style={{ fontSize: 14 }}>verificar na visita</span>
          </p>
        )}
      </div>
      <div>
        <dl className="kv adm-kv">
          <dt>Anfitrião</dt>
          <dd>{h.name}</dd>
          <dt>Telefone</dt>
          <dd>
            <a href={`tel:${h.phone.replace(/\s/g, '')}`}>{h.phone}</a>
          </dd>
          <dt>Email</dt>
          <dd>{h.email ? <a href={`mailto:${h.email}`}>{h.email}</a> : '—'}</dd>
          <dt>Capacidade</dt>
          <dd>
            {h.sleeps} pessoas · {plural(h.bedrooms, 'quarto', 'quartos')}
          </dd>
          <dt>Preço</dt>
          <dd>
            {eur(h.eurNight)} / noite · {eur(weekend)} por 3 noites
          </dd>
          <dt>Estado</dt>
          <dd>{HOUSE_STATE[h.state] ?? h.state}</dd>
          <dt>Tem</dt>
          <dd>{h.features.length ? h.features.map(featureLabel).join(', ') : '—'}</dd>
        </dl>
        {h.note && <p className="adm-note">{h.note}</p>}
      </div>
      <div className="adm-app-acts">
        <button type="button" className="btn small" onClick={onApprove}>
          Aprovar
        </button>
        <button type="button" className="btn small ghost noarrow" onClick={onRefuse}>
          Recusar
        </button>
      </div>
    </article>
  )
}

// ---------- segurança ----------

function SafetyTab({ data }: { data: Collections }) {
  const pledges = [...data.pledges].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const training = data.leads.filter((l) => l.kind === 'formacao').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const total = sum(pledges.map((p) => p.amountEur))
  const pct = Math.round((total / AED_GOAL_EUR) * 100)
  const funded = Math.min(AED_TARGET, Math.floor(total / AED_UNIT_EUR))

  return (
    <>
      <SectionHead title="Desfibrilhadores">
        <button
          type="button"
          className="btn small ghost noarrow"
          disabled={!pledges.length}
          onClick={() =>
            exportCSV(
              'compromissos-dae',
              pledges.map((p) => ({ referencia: p.id, criado_em: p.createdAt, nome: p.name, tipo: p.kind, email: p.email, local: p.place, valor_eur: p.amountEur })),
            )
          }
        >
          Exportar CSV · {pledges.length}
        </button>
      </SectionHead>
      <p className="muted adm-intro">
        Objetivo: {AED_TARGET} DAE × {eur(AED_UNIT_EUR)} (aparelho, armário exterior e formação) = {eur(AED_GOAL_EUR)}. Valores comprometidos, ainda por
        cobrar.
      </p>

      <div className="stats adm-kpis">
        <div>
          <b>{eur(total)}</b>
          <span>comprometido</span>
        </div>
        <div>
          <b className="muted">{eur(Math.max(0, AED_GOAL_EUR - total))}</b>
          <span>em falta</span>
        </div>
        <div>
          <b className="ember">{pct} %</b>
          <span>do objetivo</span>
        </div>
        <div>
          <b>
            {funded}
            <small className="adm-of"> / {AED_TARGET}</small>
          </b>
          <span>DAE cobertos</span>
        </div>
      </div>

      <div className="adm-aed mt" role="img" aria-label={`${eur(total)} de ${eur(AED_GOAL_EUR)}: ${funded} de ${AED_TARGET} desfibrilhadores cobertos`}>
        {Array.from({ length: AED_TARGET }, (_, i) => {
          const fill = Math.max(0, Math.min(1, (total - i * AED_UNIT_EUR) / AED_UNIT_EUR))
          return (
            <div key={i}>
              <div className="cell">
                <i style={{ width: `${fill * 100}%` }} />
              </div>
              <span className="mono">DAE {i + 1}</span>
            </div>
          )
        })}
      </div>

      {pledges.length === 0 ? (
        <p className="adm-empty mt">Ainda não há compromissos.</p>
      ) : (
        <div className="adm-scroll mt">
          <table className="board adm-table" style={{ ['--min' as string]: '720px' }}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Local</th>
                <th>Email</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {pledges.map((p) => (
                <tr key={p.id}>
                  <td>{fmtDate(p.createdAt)}</td>
                  <td className="who">{p.name}</td>
                  <td>{p.kind === 'empresa' ? 'Empresa' : 'Particular'}</td>
                  <td>{p.place}</td>
                  <td className="adm-wrap">
                    <Email value={p.email} link />
                  </td>
                  <td className="num">{eur(p.amountEur)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>Total · {plural(pledges.length, 'compromisso', 'compromissos')}</td>
                <td className="num">{eur(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="mt-l">
        <SectionHead title="Formação em primeiros socorros">
          <button
            type="button"
            className="btn small ghost noarrow"
            disabled={!training.length}
            onClick={() => exportCSV('formacao', training.map(leadCSV))}
          >
            Exportar CSV · {training.length}
          </button>
        </SectionHead>
        <LeadTable leads={training} kind="formacao" />
      </div>
    </>
  )
}

// ---------- parceiros ----------

function leadCSV(l: Lead) {
  return {
    referencia: l.id,
    criado_em: l.createdAt,
    tipo: l.kind,
    nome: l.name,
    organizacao: l.org ?? '',
    email: l.email,
    telefone: l.phone ?? '',
    aldeia: l.village ?? '',
    interesse: l.interest ?? '',
  }
}

function LeadTable({ leads, kind }: { leads: Lead[]; kind: Lead['kind'] }) {
  if (!leads.length) return <p className="adm-empty">{kind === 'parceiro' ? 'Ainda não há contactos de parceiros.' : 'Ainda não há pedidos de formação.'}</p>
  return (
    <div className="adm-scroll">
      <table className="board adm-table" style={{ ['--min' as string]: '820px' }}>
        <thead>
          <tr>
            <th>Data</th>
            <th>Nome</th>
            <th>{kind === 'parceiro' ? 'Organização' : 'Aldeia'}</th>
            <th>Interesse</th>
            <th>Email</th>
            <th>Telefone</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td>{fmtDate(l.createdAt)}</td>
              <td className="who">
                {l.name}
                {kind === 'formacao' && l.org && <small>{l.org}</small>}
              </td>
              <td>{(kind === 'parceiro' ? l.org : l.village) || '—'}</td>
              <td className="adm-wrap">{l.interest || '—'}</td>
              <td className="adm-wrap">
                <Email value={l.email} link />
              </td>
              <td>{l.phone ? <a href={`tel:${l.phone.replace(/\s/g, '')}`}>{l.phone}</a> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PartnersTab({ leads }: { leads: Lead[] }) {
  const list = leads.filter((l) => l.kind === 'parceiro').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <>
      <SectionHead title="Parceiros e investidores">
        <button type="button" className="btn small ghost noarrow" disabled={!list.length} onClick={() => exportCSV('parceiros', list.map(leadCSV))}>
          Exportar CSV · {list.length}
        </button>
      </SectionHead>
      <p className="muted adm-intro">Pedidos de dossier e convite feitos na página de parceiros.</p>
      <LeadTable leads={list} kind="parceiro" />
    </>
  )
}

// ---------- dados ----------

const KEYS = ['registrations', 'bookings', 'hosts', 'pledges', 'leads'] as const
type Key = (typeof KEYS)[number]
const KEY_LABEL: Record<Key, string> = {
  registrations: 'Inscrições',
  bookings: 'Reservas',
  hosts: 'Anfitriões',
  pledges: 'Compromissos DAE',
  leads: 'Contactos',
}

const KEY_NOUN: Record<Key, string> = {
  registrations: 'inscrições',
  bookings: 'reservas',
  hosts: 'anfitriões',
  pledges: 'compromissos DAE',
  leads: 'contactos',
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const isStr = (x: unknown) => typeof x === 'string'
const isNum = (x: unknown) => typeof x === 'number' && Number.isFinite(x)
const oneOf = (x: unknown, xs: readonly string[]) => typeof x === 'string' && xs.includes(x)

const CHECK: Record<Key, (x: unknown) => boolean> = {
  registrations: (x) =>
    isObj(x) && isStr(x.id) && isStr(x.createdAt) && isStr(x.race) && isStr(x.first) && isStr(x.last) && isStr(x.email) && isNum(x.priceEur) &&
    oneOf(x.status, ['pendente', 'paga', 'cancelada']),
  bookings: (x) =>
    isObj(x) && isStr(x.id) && isStr(x.createdAt) && isStr(x.listingId) && Array.isArray(x.nights) && x.nights.every(isStr) && isNum(x.guests) &&
    isStr(x.name) && isStr(x.email) && isNum(x.totalEur) && oneOf(x.status, ['pedido', 'confirmado', 'recusado', 'cancelado']),
  hosts: (x) =>
    isObj(x) && isStr(x.id) && isStr(x.createdAt) && isStr(x.name) && isStr(x.village) && isNum(x.sleeps) && isNum(x.bedrooms) && isNum(x.eurNight) &&
    Array.isArray(x.features) && oneOf(x.status, ['pendente', 'aprovado', 'recusado']),
  pledges: (x) => isObj(x) && isStr(x.id) && isStr(x.createdAt) && isStr(x.name) && isNum(x.amountEur),
  leads: (x) => isObj(x) && isStr(x.id) && isStr(x.createdAt) && isStr(x.name) && isStr(x.email) && oneOf(x.kind, ['parceiro', 'formacao']),
}

function parseBackup(text: string): { ok: true; data: Partial<Collections> } | { ok: false; error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'O ficheiro não é JSON válido.' }
  }
  if (!isObj(raw)) return { ok: false, error: 'Formato inesperado: o ficheiro devia ter um objeto com as coleções.' }
  const found = KEYS.filter((k) => k in raw)
  if (!found.length) return { ok: false, error: 'Nenhuma coleção reconhecida (registrations, bookings, hosts, pledges, leads).' }
  const out: Partial<Record<Key, unknown[]>> = {}
  for (const k of found) {
    const list = raw[k]
    if (!Array.isArray(list)) return { ok: false, error: `"${k}" devia ser uma lista.` }
    const bad = list.findIndex((item) => !CHECK[k](item))
    if (bad >= 0) return { ok: false, error: `${KEY_LABEL[k]}, registo ${bad + 1}: campos em falta ou com tipo errado.` }
    const ids = new Set(list.map((item) => (item as { id: string }).id))
    if (ids.size !== list.length) return { ok: false, error: `${KEY_LABEL[k]}: há referências repetidas.` }
    out[k] = list
  }
  return { ok: true, data: out as Partial<Collections> }
}

function DataTab({ data }: { data: Collections }) {
  const [flash, setFlash] = useState<Flash>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const total = sum(KEYS.map((k) => data[k].length))

  function loadDemo() {
    if (total > 0 && !window.confirm(`Já há ${plural(total, 'registo', 'registos')} neste browser. Substituir tudo pelos dados de demonstração?`)) return
    const d = seedDemo()
    setFlash({
      tone: 'ok',
      text: `Dados de demonstração carregados: ${d.registrations.length} inscrições, ${d.bookings.length} reservas, ${d.hosts.length} anfitriões, ${d.pledges.length} compromissos e ${d.leads.length} contactos.`,
    })
  }

  function exportAll() {
    download(`hell160-dados-${stamp()}.json`, JSON.stringify(getAll(), null, 2), 'application/json;charset=utf-8')
    setFlash({ tone: 'ok', text: `Exportados ${plural(total, 'registo', 'registos')}.` })
  }

  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5_000_000) {
      setFlash({ tone: 'error', text: 'Ficheiro demasiado grande (máximo 5 MB).' })
      return
    }
    const res = parseBackup(await file.text())
    if (!res.ok) {
      setFlash({ tone: 'error', text: `Importação recusada. ${res.error}` })
      return
    }
    const summary = KEYS.filter((k) => res.data[k]).map((k) => `${res.data[k]!.length} ${KEY_NOUN[k]}`)
    const missing = KEYS.filter((k) => !res.data[k]).map((k) => KEY_NOUN[k])
    const warn = missing.length ? ` O ficheiro não traz ${listWords(missing)}: essas coleções ficam vazias.` : ''
    if (!window.confirm(`Importar ${file.name}: ${listWords(summary)}?${warn} Os dados atuais deste browser são substituídos.`)) return
    replaceAll(res.data)
    setFlash({ tone: 'ok', text: `Importado ${file.name}: ${listWords(summary)}.` })
  }

  function wipe() {
    if (!window.confirm(`Apagar ${plural(total, 'registo', 'registos')} deste browser? Não dá para desfazer. Exporta antes se precisares deles.`)) return
    resetAll()
    setFlash({ tone: 'ok', text: 'Todos os dados foram apagados deste browser.' })
  }

  return (
    <>
      <FlashNote flash={flash} onClose={() => setFlash(null)} />
      <div className="adm-cols">
        <div>
          <SectionHead title="Guardado neste browser" />
          <dl className="kv adm-counts">
            {KEYS.map((k) => (
              <Fragment key={k}>
                <dt>{KEY_LABEL[k]}</dt>
                <dd className="mono">{data[k].length}</dd>
              </Fragment>
            ))}
          </dl>
          <div className="total">
            <span className="mono">Total</span>
            <b>{total}</b>
          </div>
          <p className="notice mt">
            Sem servidor: tudo fica no armazenamento local deste browser. Limpar os dados do site apaga-os. Exporta uma cópia antes de trocar de computador.
          </p>
        </div>
        <div>
          <SectionHead title="Operações" />
          <ul className="adm-ops">
            <li>
              <div>
                <strong>Carregar dados de demonstração</strong>
                <p className="muted">60 inscrições, 10 reservas, 4 anfitriões por aprovar, 6 compromissos DAE e 5 contactos. Nomes fictícios. Substitui o que está guardado.</p>
              </div>
              <button type="button" className="btn small noarrow" onClick={loadDemo}>
                Carregar demonstração
              </button>
            </li>
            <li>
              <div>
                <strong>Exportar tudo (JSON)</strong>
                <p className="muted">Cópia de segurança de todas as coleções, para guardar ou passar a outro computador.</p>
              </div>
              <button type="button" className="btn small ghost noarrow" onClick={exportAll} disabled={!total}>
                Exportar JSON
              </button>
            </li>
            <li>
              <div>
                <strong>Importar JSON</strong>
                <p className="muted">Repõe uma cópia exportada daqui. O ficheiro é validado antes de substituir os dados.</p>
              </div>
              <button type="button" className="btn small ghost noarrow" onClick={() => fileRef.current?.click()}>
                Escolher ficheiro
              </button>
              <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} aria-label="Ficheiro JSON a importar" onChange={importFile} />
            </li>
            <li>
              <div>
                <strong>Apagar tudo</strong>
                <p className="muted">Remove inscrições, reservas, anfitriões, compromissos e contactos deste browser.</p>
              </div>
              <button type="button" className="btn small ghost noarrow adm-danger" onClick={wipe} disabled={!total}>
                Apagar tudo
              </button>
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}
