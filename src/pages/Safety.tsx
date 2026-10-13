import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { pointAtKm } from '../data/route'
import { RouteMap } from '../components/RouteMap'
import { EVENT } from '../data/event'
import { VILLAGES } from '../data/listings'
import { add, uid, useCollection, type Lead, type Pledge } from '../lib/store'
import { Field } from './Register'
import '../styles/community.css'

// Proposta de rede: as aldeias do percurso e as bases de vida. Os dois DAE já instalados ainda não têm local registado.
const AED = [
  { place: 'DAE 1 · local a confirmar', km: null, status: 'instalado' },
  { place: 'DAE 2 · local a confirmar', km: null, status: 'instalado' },
  { place: 'A-do-Pinto · partida e meta', km: 0, status: 'proposto' },
  { place: 'Vale de Vargo', km: 11.8, status: 'proposto' },
  { place: 'Vila Verde de Ficalho', km: 36.2, status: 'proposto' },
  { place: 'Pias', km: 60.4, status: 'proposto' },
  { place: 'Vila Nova de São Bento', km: 72.0, status: 'proposto' },
  { place: 'Pulo do Lobo · acesso', km: 95.1, status: 'proposto' },
  { place: 'Brinches', km: 118.8, status: 'proposto' },
  { place: 'Santa Iria', km: 130.2, status: 'proposto' },
] as const

const UNIT_EUR = 1800 // DAE + armário exterior + formação — estimativa
const PROPOSED = AED.filter((a) => a.status === 'proposto')
const GOAL_EUR = PROPOSED.length * UNIT_EUR
const ANYWHERE = 'Onde fizer mais falta'
const AMOUNTS = [50, 250, UNIT_EUR] as const
const MIN_EUR = 10
const MAX_EUR = 50_000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const digits = (s: string) => s.replace(/\D/g, '')
const firstName = (s: string) => s.trim().split(/\s+/)[0] ?? ''
const mailto = (subject: string, body: string) =>
  `mailto:${EVENT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

// Euros em pt-PT; cêntimos só quando existem ("1234,50 €").
const money = (n: number) =>
  `${n.toLocaleString('pt-PT', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`

// Aceita "1.234,50", "1234,5", "1 234" e "1,234.50": o último separador com 1 ou 2 casas é o decimal, os outros são milhares.
function parseEur(input: string) {
  const t = input.replace(/\s/g, '')
  if (!t) return NaN
  const last = Math.max(t.lastIndexOf(','), t.lastIndexOf('.'))
  const n =
    last >= 0 && t.length - last - 1 <= 2
      ? Number(`${t.slice(0, last).replace(/[.,]/g, '')}.${t.slice(last + 1)}`)
      : Number(t.replace(/[.,]/g, ''))
  return Math.round(n * 100) / 100
}

// Depois de um envio falhado, leva o foco ao primeiro campo com erro (os erros só aparecem depois deste render).
function focusFirstInvalid(form: HTMLFormElement) {
  requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
}

// Sem servidor: o registo fica neste browser e só chega à organização por email. Igual nas três confirmações.
export function SendByEmail({ href, reference, again, onAgain }: {
  href: string
  reference: string
  again: string
  onAgain: () => void
}) {
  return (
    <>
      <p className="notice cm-fine">
        Simulação: o pedido fica guardado só neste browser. A organização só o recebe se o enviares por email.
      </p>
      <div className="row">
        <a className="btn small ember noarrow" href={href}>Enviar por email</a>
        <button type="button" className="btn small ghost noarrow" onClick={onAgain}>{again}</button>
      </div>
      <p className="muted cm-fine">
        ou escreve para <span className="cm-select">{EVENT.email}</span> e indica a referência {reference}.
      </p>
    </>
  )
}

// Particulares aparecem só com iniciais: "Teresa Charrua" → "T. C."
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  const pick = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts
  return pick.map((p) => `${p[0].toUpperCase()}.`).join(' ')
}

export function Safety() {
  const { hash } = useLocation()

  // A navegação entre páginas volta ao topo; se o link trouxer #patrocinar ou #formacao, desce até lá.
  useEffect(() => {
    if (!hash) return
    const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 60)
    return () => window.clearTimeout(t)
  }, [hash])

  return (
    <>
      <section className="sec tight">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <div>
            <p className="eyebrow">Segurança</p>
            <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 120px)' }}>Ninguém fica sem sinal</h1>
          </div>
          <p className="lede">
            Cada atleta é seguido por duas fontes de posição. Os desfibrilhadores que a prova traz ficam nas aldeias depois de os atletas
            partirem.
          </p>
        </div>
      </section>

      <section className="sec tight rule">
        <div className="wrap split">
          <div>
            <p className="eyebrow">Tracking</p>
            <h2 className="cond cm-h2">Duas fontes, uma posição</h2>
          </div>
          <ol className="numlist">
            <li><div><strong>App HELL160 obrigatória</strong><p className="muted">iOS e Android. Carrega o GPX oficial, guarda a posição offline e envia-a ao minuto quando há rede.</p></div></li>
            <li><div><strong>Relógio emparelhado (recomendado)</strong><p className="muted">Segunda fonte de posição. A plataforma cruza as duas e usa a que for mais fiável naquele momento.</p></div></li>
            <li><div><strong>Localizador satélite para alugar</strong><p className="muted">Para zonas sem rede, como a descida ao Pulo do Lobo. 15 € na inscrição.</p></div></li>
            <li><div><strong>Alertas automáticos</strong><p className="muted">Paragem acima de 20 min fora de abastecimento, desvio de traçado ou perda das duas fontes. A central é avisada antes de alguém dar pela falta.</p></div></li>
            <li><div><strong>Botão SOS</strong><p className="muted">Envia a posição à equipa de resgate mais próxima e liga ao posto médico.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="sec night">
        <div className="wrap">
          <div className="split">
            <div>
              <p className="eyebrow">Rede comunitária</p>
              <h2 className="display" style={{ fontSize: 'clamp(34px, 4.4vw, 68px)' }}>Desfibri&shy;lhadores nas aldeias</h2>
              <p className="lede mt">
                Já há dois. Cada aparelho novo fica na aldeia e serve quem lá vive o ano inteiro. A prova é a razão para os instalar agora.
              </p>
              <div className="stats mt" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div><b>2</b><span>instalados</span></div>
                <div><b className="ember">{PROPOSED.length}</b><span>em falta</span></div>
                <div><b className="cm-plain">{(GOAL_EUR / 1000).toFixed(1).replace('.', ',')}k</b><span>€ estimados</span></div>
              </div>
              <DaeProgress className="mt" />
              <div className="row mt cm-cta">
                <a className="btn ember" href="#patrocinar">Patrocinar um DAE</a>
                <a className="btn ghost" href="#formacao">Quero formação</a>
              </div>
            </div>
            <DaeNetwork />
          </div>
        </div>
      </section>

      <section id="patrocinar" className="sec tight cm-anchor">
        <div className="wrap split">
          <div>
            <p className="eyebrow">Patrocinar um DAE</p>
            <h2 className="cond cm-h2">Um aparelho por aldeia</h2>
            <p className="muted mt-s" style={{ maxWidth: '46ch' }}>
              {money(UNIT_EUR)} pagam um desfibrilhador, o armário exterior e a formação de quem mora perto. Qualquer valor conta para o
              total. Empresas aparecem com o nome na lista de apoios; particulares só com as iniciais.
            </p>
            <DaeBackers />
          </div>
          <DaePledgeForm />
        </div>
      </section>

      <section id="formacao" className="sec tight rule cm-anchor">
        <div className="wrap split">
          <div>
            <p className="eyebrow">Formação</p>
            <h2 className="cond cm-h2">Suporte básico de vida</h2>
            <p className="muted mt-s" style={{ maxWidth: '46ch' }}>
              Sessões curtas nas aldeias, em grupo: reconhecer uma paragem cardíaca, ligar 112, fazer compressões e usar o DAE. Para quem
              mora perto de um aparelho e para quem fica nos abastecimentos no fim de semana da prova.
            </p>
            <p className="muted mt-s" style={{ maxWidth: '46ch' }}>
              Juntamos os pedidos por aldeia e marcamos quando houver grupo.
            </p>
          </div>
          <TrainingForm />
        </div>
      </section>

      <section className="sec tight rule">
        <div className="wrap split">
          <div>
            <p className="eyebrow">Em prova</p>
            <h2 className="cond cm-h2">O que está previsto</h2>
          </div>
          <ul className="ticklist">
            <li>GPX oficial único, validado no terreno e distribuído pela app.</li>
            <li>Teste de sinal obrigatório no levantamento do dorsal.</li>
            <li>Abastecimentos com água entre bases de vida e protocolo de calor a partir dos 38 °C.</li>
            <li>Postos médicos nas três bases de vida, com a posição de todos os atletas em tempo real.</li>
            <li>Resgate noturno com coordenadas exatas, não com a última passagem.</li>
          </ul>
        </div>
        <div className="wrap mt">
          <Link to="/live" className="btn">Ver o live em simulação</Link>
        </div>
      </section>
    </>
  )
}

// ---------- componentes reutilizáveis (cada um lê os compromissos da camada de dados) ----------

function usePledgesByPlace() {
  const pledges = useCollection('pledges')
  const byPlace = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of pledges) m.set(p.place, (m.get(p.place) ?? 0) + p.amountEur)
    return m
  }, [pledges])
  return { pledges, byPlace, total: pledges.reduce((s, p) => s + p.amountEur, 0) }
}

// Mapa e lista dos locais propostos, com o valor já prometido para cada um.
export function DaeNetwork() {
  const { byPlace } = usePledgesByPlace()
  return (
    <div>
      <RouteMap labels={false}>
        {AED.map((a) => {
          if (a.km == null) return null
          const [x, y] = pointAtKm(a.km)
          const covered = (byPlace.get(a.place) ?? 0) >= UNIT_EUR
          return (
            <g key={a.place} transform={`translate(${x} ${y})`}>
              <circle r={18} fill={covered ? 'var(--ember)' : 'var(--bg)'} stroke="var(--ember)" strokeWidth={3} strokeDasharray={covered ? undefined : '4 4'} />
              <path d="M-6,-2 L-1,-2 L-3,6 L6,-4 L1,-4 L3,-10 Z" fill={covered ? 'var(--bg)' : 'var(--ember)'} />
            </g>
          )
        })}
      </RouteMap>
      <ul className="ticklist cm-places mt">
        {AED.map((a) => {
          const pledged = byPlace.get(a.place) ?? 0
          return (
            <li key={a.place}>
              <span>{a.place}</span>
              <span className="right">
                {a.status === 'proposto' && pledged > 0 && <span className="amt">{money(pledged)} prometidos</span>}
                <span className={a.status === 'instalado' ? 'tag ember' : pledged >= UNIT_EUR ? 'tag solid' : 'tag'}>
                  {a.status === 'instalado' ? 'instalado' : pledged >= UNIT_EUR ? 'coberto' : 'proposto'}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mono muted mt-s cm-plain">Localizações propostas · custo unitário estimado {money(UNIT_EUR)} (DAE, armário, formação)</p>
    </div>
  )
}

// Barra dividida em células: cada célula é um DAE ({UNIT_EUR} €).
export function DaeProgress({ className = '' }: { className?: string }) {
  const { total } = usePledgesByPlace()
  const pct = Math.min(100, Math.round((total / GOAL_EUR) * 100))
  const units = total / UNIT_EUR
  return (
    <figure className={`cm-progress ${className}`}>
      <div className="cm-head">
        <b>{money(total)}</b>
        <span className="mono muted">de {money(GOAL_EUR)} · {pct} %</span>
      </div>
      <div
        className="cm-cells"
        style={{ ['--n' as string]: PROPOSED.length }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={GOAL_EUR}
        aria-valuenow={Math.min(total, GOAL_EUR)}
        aria-valuetext={`${money(total)} prometidos de ${money(GOAL_EUR)}`}
        aria-label="Compromissos para desfibrilhadores"
      >
        {PROPOSED.map((a, i) => (
          <span key={a.place}>
            <i style={{ width: `${Math.max(0, Math.min(1, units - i)) * 100}%` }} />
          </span>
        ))}
      </div>
      <figcaption className="cm-foot mono muted cm-plain">
        <span>Compromissos registados</span>
        <span>Cada célula, um DAE</span>
      </figcaption>
    </figure>
  )
}

export function DaeBackers() {
  const { pledges } = usePledgesByPlace()
  const list = useMemo(
    () =>
      [...pledges].sort(
        (a, b) => (a.kind === b.kind ? 0 : a.kind === 'empresa' ? -1 : 1) || b.amountEur - a.amountEur || a.createdAt.localeCompare(b.createdAt),
      ),
    [pledges],
  )
  const shown = list.slice(0, 12)
  return (
    <div className="mt">
      <p className="mono muted" style={{ margin: '0 0 12px' }}>Já apoiaram</p>
      {list.length === 0 ? (
        <p className="muted cm-fine" style={{ borderTop: '2px solid var(--fg)', paddingTop: 14 }}>
          Ainda não há compromissos registados.
        </p>
      ) : (
        <>
          <ul className="cm-backers">
            {shown.map((p) => (
              <li key={p.id}>
                <span className="who">{p.kind === 'empresa' ? p.name : initials(p.name)}</span>
                <span className="val">{money(p.amountEur)}</span>
                <span className="where">{p.kind === 'empresa' ? 'Empresa' : 'Particular'} · {p.place}</span>
              </li>
            ))}
          </ul>
          {list.length > shown.length && (
            <p className="mono muted mt-s">e mais {list.length - shown.length}</p>
          )}
        </>
      )}
    </div>
  )
}

type Amount = (typeof AMOUNTS)[number] | 'outro'

export function DaePledgeForm() {
  const { byPlace } = usePledgesByPlace()
  const [kind, setKind] = useState<Pledge['kind']>('empresa')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState<Amount>(UNIT_EUR)
  const [other, setOther] = useState('')
  const [place, setPlace] = useState<string>(ANYWHERE)
  const [tried, setTried] = useState(false)
  const [done, setDone] = useState<Pledge | null>(null)
  const doneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (done) doneRef.current?.focus()
  }, [done])

  const value = amount === 'outro' ? parseEur(other) || 0 : amount
  const errors = {
    name: !name.trim() ? (kind === 'empresa' ? 'Indica o nome da empresa.' : 'Indica o teu nome.') : '',
    email: !EMAIL_RE.test(email.trim()) ? 'Email inválido.' : '',
    amount:
      value < MIN_EUR ? `Valor mínimo ${MIN_EUR} €.` : value > MAX_EUR ? `Para valores acima de ${money(MAX_EUR)}, escreve-nos.` : '',
  }
  const invalid = Object.values(errors).some(Boolean)
  const valueOk = value >= MIN_EUR && value <= MAX_EUR

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (invalid) {
      setTried(true)
      focusFirstInvalid(e.currentTarget)
      return
    }
    const p: Pledge = {
      id: uid('D27'),
      createdAt: new Date().toISOString(),
      name: name.trim(),
      email: email.trim(),
      amountEur: value,
      place,
      kind,
    }
    add('pledges', p)
    setDone(p)
  }

  function reset() {
    setKind('empresa')
    setName('')
    setEmail('')
    setAmount(UNIT_EUR)
    setOther('')
    setPlace(ANYWHERE)
    setTried(false)
    setDone(null)
  }

  if (done) {
    const body = [
      `Referência: ${done.id}`,
      `${done.kind === 'empresa' ? 'Empresa' : 'Nome'}: ${done.name}`,
      `Email: ${done.email}`,
      `Valor: ${money(done.amountEur)}`,
      `Local: ${done.place}`,
    ].join('\n')
    const subject = `Patrocínio DAE · ${done.id}`
    return (
      <div ref={doneRef} tabIndex={-1} className="summary cm-static cm-done stack" style={{ ['--s' as string]: '20px' }} role="status">
        <p className="mono ember" style={{ margin: 0 }}>Compromisso registado neste browser</p>
        <h3 className="cond">Obrigado{done.kind === 'particular' ? `, ${firstName(done.name)}` : ''}.</h3>
        <div>
          <span className="mono muted">Referência</span>
          <p className="cm-ref">{done.id}</p>
        </div>
        <dl className="kv">
          <dt>{done.kind === 'empresa' ? 'Empresa' : 'Nome'}</dt><dd>{done.name}</dd>
          <dt>Valor</dt><dd>{money(done.amountEur)}</dd>
          <dt>Local</dt><dd>{done.place}</dd>
        </dl>
        <p className="cm-fine">Nada é cobrado aqui. Com o email, a organização responde com os dados para pagamento e recibo.</p>
        <SendByEmail href={mailto(subject, body)} reference={done.id} again="Novo compromisso" onAgain={reset} />
      </div>
    )
  }

  const remaining = (p: string) => Math.max(0, UNIT_EUR - (byPlace.get(p) ?? 0))

  return (
    <form onSubmit={submit} noValidate className="summary cm-static stack" style={{ ['--s' as string]: '28px' }} aria-labelledby="dae-title">
      <p id="dae-title" className="mono muted" style={{ margin: 0 }}>Compromisso de patrocínio</p>

      <div className="field">
        <span className="label" id="dae-kind">Quem apoia</span>
        <div className="chips" role="group" aria-labelledby="dae-kind">
          {(['empresa', 'particular'] as const).map((k) => (
            <button type="button" key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k === 'empresa' ? 'Empresa' : 'Particular'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid2">
        <Field
          id="dae-nome"
          label={kind === 'empresa' ? 'Empresa' : 'Nome'}
          value={name}
          onChange={setName}
          autoComplete={kind === 'empresa' ? 'organization' : 'name'}
          error={tried ? errors.name : ''}
        />
        <Field id="dae-email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" error={tried ? errors.email : ''} />
      </div>

      <div className="field">
        <span className="label" id="dae-valor">Valor</span>
        <div className="chips cm-amounts" role="group" aria-labelledby="dae-valor">
          {AMOUNTS.map((a) => (
            <button type="button" key={a} className="chip" aria-pressed={amount === a} onClick={() => setAmount(a)}>
              {money(a)}
              {a === UNIT_EUR && <small>um DAE completo</small>}
            </button>
          ))}
          <button type="button" className="chip" aria-pressed={amount === 'outro'} onClick={() => setAmount('outro')}>
            Outro
          </button>
        </div>
      </div>
      {amount === 'outro' && (
        <Field
          id="dae-outro"
          label="Outro valor (€)"
          value={other}
          onChange={(v) => setOther(v.replace(/[^\d,.\s]/g, ''))}
          inputMode="decimal"
          placeholder="100"
          hint={`Mínimo ${MIN_EUR} €, máximo ${money(MAX_EUR)}.`}
          error={tried ? errors.amount : ''}
        />
      )}

      <div className="field">
        <label htmlFor="dae-local">Local</label>
        <select id="dae-local" value={place} onChange={(e) => setPlace(e.target.value)}>
          <option value={ANYWHERE}>{ANYWHERE}</option>
          {PROPOSED.map((a) => (
            <option key={a.place} value={a.place}>
              {a.place}{a.km > 0 ? ` · km ${a.km.toFixed(1).replace('.', ',')}` : ''}
              {remaining(a.place) === 0 ? ' · coberto' : ` · faltam ${money(remaining(a.place))}`}
            </option>
          ))}
        </select>
      </div>

      <div className="total">
        <span className="mono">Compromisso</span>
        <b>{valueOk ? money(value) : '—'}</b>
      </div>
      <p className="muted cm-fine">
        Nada é cobrado aqui. Depois de registar, envia o compromisso por email: a organização responde com os dados para pagamento e
        recibo.
      </p>
      <button className="btn ember">Registar compromisso</button>
      <p className="muted cm-fine">
        Preferes tratar por email? <a href={mailto('Patrocínio de desfibrilhadores HELL160', '')}>{EVENT.email}</a>
      </p>
    </form>
  )
}

export function TrainingForm() {
  const [f, setF] = useState({ name: '', phone: '', email: '', village: VILLAGES[0] as string, note: '' })
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const [tried, setTried] = useState(false)
  const [done, setDone] = useState<Lead | null>(null)
  const doneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (done) doneRef.current?.focus()
  }, [done])

  const errors = {
    name: !f.name.trim() ? 'Indica o teu nome.' : '',
    phone: digits(f.phone).length < 9 ? 'Telefone com pelo menos 9 dígitos.' : '',
    email: f.email.trim() && !EMAIL_RE.test(f.email.trim()) ? 'Email inválido.' : '',
  }
  const invalid = Object.values(errors).some(Boolean)

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (invalid) {
      setTried(true)
      focusFirstInvalid(e.currentTarget)
      return
    }
    const lead: Lead = {
      id: uid('L27'),
      createdAt: new Date().toISOString(),
      kind: 'formacao',
      name: f.name.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      village: f.village,
      ...(f.note.trim() ? { interest: f.note.trim() } : {}),
    }
    add('leads', lead)
    setDone(lead)
  }

  function reset() {
    setF({ name: '', phone: '', email: '', village: VILLAGES[0], note: '' })
    setTried(false)
    setDone(null)
  }

  if (done) {
    const body = [
      `Referência: ${done.id}`,
      `Nome: ${done.name}`,
      `Telefone: ${done.phone}`,
      done.email && `Email: ${done.email}`,
      `Aldeia: ${done.village}`,
      done.interest && `Notas: ${done.interest}`,
    ]
      .filter(Boolean)
      .join('\n')
    const subject = `Formação SBV/DAE · ${done.village} · ${done.id}`
    return (
      <div ref={doneRef} tabIndex={-1} className="summary cm-static cm-done stack" style={{ ['--s' as string]: '20px' }} role="status">
        <p className="mono ember" style={{ margin: 0 }}>Pedido registado neste browser</p>
        <h3 className="cond">Obrigado, {firstName(done.name)}.</h3>
        <div>
          <span className="mono muted">Referência</span>
          <p className="cm-ref">{done.id}</p>
        </div>
        <dl className="kv">
          <dt>Aldeia</dt><dd>{done.village}</dd>
          <dt>Telefone</dt><dd>{done.phone}</dd>
        </dl>
        <p className="cm-fine">Com o email, a organização junta o pedido aos de {done.village} e liga quando houver data para a sessão.</p>
        <SendByEmail href={mailto(subject, body)} reference={done.id} again="Novo pedido" onAgain={reset} />
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="summary cm-static stack" style={{ ['--s' as string]: '28px' }} aria-labelledby="sbv-title">
      <p id="sbv-title" className="mono muted" style={{ margin: 0 }}>Pedido de formação</p>
      <div className="grid2">
        <Field id="sbv-nome" label="Nome" value={f.name} onChange={set('name')} autoComplete="name" error={tried ? errors.name : ''} />
        <Field id="sbv-tel" label="Telefone" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" error={tried ? errors.phone : ''} />
      </div>
      <div className="grid2">
        <Field id="sbv-email" label="Email (opcional)" type="email" value={f.email} onChange={set('email')} autoComplete="email" error={tried ? errors.email : ''} />
        <div className="field">
          <label htmlFor="sbv-aldeia">Aldeia</label>
          <select id="sbv-aldeia" value={f.village} onChange={(e) => set('village')(e.target.value)}>
            {VILLAGES.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="sbv-notas">Notas (opcional)</label>
        <textarea
          id="sbv-notas"
          className="cm-textarea"
          rows={3}
          value={f.note}
          onChange={(e) => set('note')(e.target.value)}
          placeholder="Quantas pessoas, que dias e horas dão jeito"
        />
      </div>
      <button className="btn">Pedir formação</button>
      <p className="muted cm-fine">
        Também podes escrever para <a href={mailto('Formação em primeiros socorros', '')}>{EVENT.email}</a>
      </p>
    </form>
  )
}
