import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type HTMLAttributes } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { EVENT, RACES, currentPrice, raceById, type Race } from '../data/event'
import { EVENT_NIGHTS } from '../data/listings'
import { HousePicker, stayProblem, type StayPick } from '../components/HousePicker'
import { PaymentPanel } from '../components/PaymentPanel'
import { NEWSLETTER, SITE, registrationLabel } from '../data/site'
import { activeRegs, allListings, download, eur, findListing, fmtDate, raceICS, spotsLeft } from '../lib/domain'
import { add, getAll, sameEmail, setSessionEmail, uid, useCollection, useSessionEmail, type Registration } from '../lib/store'
import '../styles/flows.css'

const STEPS = ['Prova', 'Atleta', 'Segurança', 'Alojamento', 'Confirmar']
// Enquanto as inscrições não abrem (src/data/site.ts), o fluxo guarda uma pré-inscrição, sem pagamento.
const preview = () => SITE.registration.status !== 'abertas'
const RENTAL_EUR = 15
const CERT_MAX_MB = 10
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type Draft = Pick<
  Registration,
  'race' | 'first' | 'last' | 'email' | 'phone' | 'birth' | 'nationality' | 'emergencyName' | 'emergencyPhone' | 'device' | 'shirt' | 'stayId'
>
type ErrKey = keyof Draft | 'cert' | 'accept'
type Errors = Partial<Record<ErrKey, string>>

const digits = (s: string) => s.replace(/\D/g, '')
// Validação larga: PT e ES têm 9 dígitos; números de fora levam indicativo (+33…, +44…).
const phoneOk = (s: string) => /^\+?[\d\s().-]+$/.test(s.trim()) && digits(s).length >= 9 && digits(s).length <= 15

function availability(race: Race, regs: Registration[]) {
  const price = currentPrice(race)
  const left = spotsLeft(race, regs)
  return { price, left, open: !!price && left > 0 }
}

function spotsLabel(race: Race, left: number) {
  if (race.places == null) return 'Sem limite de vagas'
  if (left === 0) return 'Esgotado'
  return `${left} de ${race.places} vagas`
}

// Dia de cada prova, para a idade mínima. A bike ainda não tem data: conta 1 de fevereiro.
const RACE_DAY: Record<string, string> = {
  hell160: '2027-07-02', hell100: '2027-07-03', relay2: '2027-07-03', relay4: '2027-07-03', bike: '2027-02-01',
}

// ---------- rascunho: sobrevive ao Back/Forward e ao recarregar a página ----------
// Guardado por entrada do histórico (location.key): uma navegação nova para /inscricao começa vazia.
// O atestado (File) não é serializável: fica só em memória, enquanto a página não recarrega.

const DRAFT = 'hell160.regdraft'
type Saved = { key: string; d: Draft; step: number; accepted: boolean; pick?: StayPick }
const DEFAULT_PICK: StayPick = { nights: ['2027-07-02', '2027-07-03'], guests: 1 }
let certMemo: { key: string; file: File } | null = null

function loadDraft(key: string): Saved | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(DRAFT) ?? 'null') as Saved | null
    return s && s.key === key && s.d && raceById(s.d.race) ? s : null
  } catch {
    return null
  }
}

function saveDraft(s: Saved) {
  try {
    sessionStorage.setItem(DRAFT, JSON.stringify(s))
  } catch {
    /* sem armazenamento: o rascunho fica só em memória */
  }
}

function clearDraft() {
  certMemo = null
  try {
    sessionStorage.removeItem(DRAFT)
  } catch {
    /* ignorar */
  }
}

// /inscricao?ref=H27-…  mostra a inscrição feita (pagamento e dorsal), também depois de recarregar.
// Cada navegação nova para /inscricao (ex.: o botão do menu) começa uma inscrição nova.
export function Register() {
  const { key, search } = useLocation()
  const ref = new URLSearchParams(search).get('ref')
  if (ref) return <Done id={ref.trim().toUpperCase()} />
  return <RegisterFlow key={key} />
}

function RegisterFlow() {
  const [params] = useSearchParams()
  const { key } = useLocation()
  const navigate = useNavigate()
  const regs = useCollection('registrations')
  const hosts = useCollection('hosts')
  const bookings = useCollection('bookings')
  const top = useRef<HTMLOListElement>(null)
  const [saved] = useState(() => loadDraft(key))

  // ?prova= escolhe a prova à entrada, se ainda tiver vagas
  const [wanted] = useState(() => {
    const w = raceById(params.get('prova') ?? '')
    if (!w) return null
    const a = availability(w, getAll().registrations)
    return { race: w, open: a.open, full: !!a.price && a.left === 0 }
  })
  const [d, setD] = useState<Draft>(() => {
    if (saved) return saved.d
    const now = getAll().registrations
    const race = wanted?.open ? wanted.race : (RACES.find((r) => availability(r, now).open) ?? RACES[0])
    return {
      race: race.id, first: '', last: '', email: '', phone: '', birth: '', nationality: 'Portugal',
      emergencyName: '', emergencyPhone: '', device: 'phone+watch', shirt: 'M', stayId: undefined,
    }
  })
  const [step, setStep] = useState(() => Math.min(saved?.step ?? 0, STEPS.length - 1))
  const [tried, setTried] = useState<number[]>([])
  const [touched, setTouched] = useState<string[]>([])
  const [cert, setCert] = useState<File | null>(() => (certMemo?.key === key ? certMemo.file : null))
  const [certErr, setCertErr] = useState('')
  const [accepted, setAccepted] = useState(saved?.accepted ?? false)
  const [pick, setPick] = useState<StayPick>(saved?.pick ?? DEFAULT_PICK)
  const [raceNote, setRaceNote] = useState(
    !saved && wanted && !wanted.open
      ? wanted.full
        ? `${wanted.race.name} está esgotado. Escolhe outra prova.`
        : `As inscrições para ${wanted.race.name} estão fechadas. Escolhe outra prova.`
      : '',
  )
  const created = useRef(false)

  useEffect(() => {
    if (created.current) return
    saveDraft({ key, d, step, accepted, pick })
    certMemo = cert ? { key, file: cert } : null
  }, [key, d, step, accepted, cert, pick])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const touch = (k: string) => () => setTouched((t) => (t.includes(k) ? t : [...t, k]))

  const race = raceById(d.race) ?? RACES[0]
  const av = availability(race, regs)
  const extra = d.device === 'rental' ? RENTAL_EUR : 0
  const total = (av.price?.eur ?? 0) + extra
  const listings = allListings(hosts)
  const stay = d.stayId ? findListing(d.stayId, hosts) : undefined
  const stayIssue = stayProblem(stay, pick, bookings)
  const stayTotal = stay ? stay.eurNight * pick.nights.length : 0
  const duplicate = EMAIL_RE.test(d.email.trim()) ? activeRegs(regs, d.race).find((r) => sameEmail(r.email, d.email)) : undefined

  const errors: Errors[] = [
    av.open ? {} : { race: av.price ? `${race.name} esgotou. Escolhe outra prova.` : `As inscrições para ${race.name} estão fechadas.` },
    athleteErrors(d),
    safetyErrors(d),
    stayIssue ? { stayId: stayIssue } : {},
    accepted ? {} : { accept: 'Para concluir tens de aceitar o regulamento e o termo de responsabilidade.' },
  ]
  const show = (k: ErrKey) => (tried.includes(step) || touched.includes(k) ? errors[step][k] : undefined)

  function goTo(s: number) {
    setStep(s)
    const el = top.current
    if (el && el.getBoundingClientRect().top < 64) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 96 })
  }

  function next(e: FormEvent) {
    e.preventDefault()
    // no último passo revalida tudo (ex.: rascunho recuperado com dados que deixaram de valer)
    const bad = step === STEPS.length - 1 ? errors.findIndex((x, i) => Object.keys(x).length > 0 || (i === 1 && !!duplicate)) : -1
    const at = bad >= 0 ? bad : step
    if (Object.keys(errors[at]).length > 0 || (at === 1 && duplicate)) {
      setTried((t) => (t.includes(at) ? t : [...t, at]))
      if (at !== step) goTo(at)
      requestAnimationFrame(() => document.querySelector<HTMLElement>('.flow-form [aria-invalid="true"]')?.focus())
      return
    }
    if (step < STEPS.length - 1) return goTo(step + 1)
    create()
  }

  function create() {
    const fresh = getAll().registrations
    const a = availability(race, fresh)
    if (!a.open) {
      setRaceNote(`${race.name} esgotou enquanto preenchias a inscrição. Escolhe outra prova; os teus dados ficam guardados no formulário.`)
      return goTo(0)
    }
    if (activeRegs(fresh, d.race).some((r) => sameEmail(r.email, d.email))) return goTo(1)
    const now = new Date().toISOString()
    const reg: Registration = {
      ...d,
      first: d.first.trim(),
      last: d.last.trim(),
      email: d.email.trim(),
      phone: d.phone.trim(),
      emergencyName: d.emergencyName.trim(),
      emergencyPhone: d.emergencyPhone.trim(),
      id: uid('H27'),
      createdAt: now,
      priceEur: (a.price?.eur ?? 0) + extra,
      status: 'pendente',
    }
    if (!reg.stayId) delete reg.stayId
    if (cert) reg.medical = { fileName: cert.name, size: cert.size, uploadedAt: now, status: 'em validação' }
    add('registrations', reg)
    // a casa escolhida segue logo como pedido de reserva ao anfitrião
    if (stay && !stayProblem(stay, pick, getAll().bookings)) {
      add('bookings', {
        id: uid('R27'),
        createdAt: now,
        listingId: stay.id,
        nights: pick.nights,
        guests: pick.guests,
        name: `${reg.first} ${reg.last}`,
        email: reg.email,
        phone: reg.phone,
        totalEur: stay.eurNight * pick.nights.length,
        status: 'pedido',
      })
    }
    created.current = true
    clearDraft()
    // a sessão da área do atleta abre já; o URL com ?ref= mantém o ecrã de pagamento ao recarregar
    setSessionEmail(reg.email)
    navigate(`/inscricao?ref=${reg.id}`, { replace: true })
    window.scrollTo(0, 0)
  }

  function pickCert(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const okType = f.type === 'application/pdf' || f.type.startsWith('image/') || /\.(pdf|jpe?g|png|heic)$/i.test(f.name)
    if (!okType) return setCertErr('Formato não aceite. Envia um PDF ou uma fotografia (JPG, PNG).')
    if (f.size > CERT_MAX_MB * 1024 * 1024) return setCertErr(`O ficheiro tem ${fileSize(f.size)}. O máximo é ${CERT_MAX_MB} MB.`)
    setCertErr('')
    setCert(f)
  }

  return (
    <section className="sec tight">
      <div className="wrap">
        <h1 className="display flow-title" style={{ marginBottom: preview() ? 24 : 48 }}>Inscrição 2027</h1>
        {preview() && (
          <p className="notice flow-preview" role="status">
            {registrationLabel()}. Podes preparar a inscrição já: fica guardada como pré-inscrição e, quando abrirem, avisamos por
            email para confirmares a vaga e pagares. <Link to={NEWSLETTER}>Receber o aviso de abertura</Link>
          </p>
        )}
        <ol className="steps" ref={top}>
          {STEPS.map((s, i) => (
            <li key={s} className={i <= step ? 'on' : ''} aria-current={i === step ? 'step' : undefined}><span>{s}</span></li>
          ))}
        </ol>
        <p className="mono muted flow-steplabel">Passo {step + 1} de {STEPS.length} · {STEPS[step]}</p>

        <div className="split flow-split">
          <form onSubmit={next} className="stack flow-form" style={{ ['--s' as string]: '32px' }} noValidate>
            {step === 0 && (
              <>
                {raceNote && <p className="notice flow-block" role="status">{raceNote}</p>}
                <div className="choice flow-choice" role="radiogroup" aria-label="Prova">
                  {RACES.map((r) => {
                    const a = availability(r, regs)
                    return (
                      <label key={r.id}>
                        <input type="radio" name="race" checked={d.race === r.id} disabled={!a.open} onChange={() => { set('race', r.id); setRaceNote('') }} />
                        <span>
                          <strong style={{ fontSize: 19 }}>{r.name}</strong>
                          <span className="muted" style={{ display: 'block', fontSize: 14 }}>
                            {r.distanceKm} km · {r.gainM} m D+ · {r.limitH} h · {r.start}
                          </span>
                          <span className={`flow-left${a.open && r.places != null && a.left <= 20 ? ' low' : ''}`}>
                            {a.price ? spotsLabel(r, a.left) : 'Inscrições fechadas'}
                          </span>
                        </span>
                        <span className="mono flow-price">{!a.price ? 'Fechado' : a.left === 0 ? 'Esgotado' : eur(a.price.eur)}</span>
                      </label>
                    )
                  })}
                </div>
                {errors[0].race && !raceNote && <p className="flow-err-line" role="alert">{errors[0].race}</p>}
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid2">
                  <Field label="Nome" value={d.first} onChange={(v) => set('first', v)} onBlur={touch('first')} error={show('first')} autoComplete="given-name" />
                  <Field label="Apelido" value={d.last} onChange={(v) => set('last', v)} onBlur={touch('last')} error={show('last')} autoComplete="family-name" />
                  <Field label="Email" type="email" value={d.email} onChange={(v) => set('email', v)} onBlur={touch('email')} error={show('email')}
                    autoComplete="email" hint="É com este email que entras na área do atleta." />
                  <Field label="Telemóvel" type="tel" value={d.phone} onChange={(v) => set('phone', v)} onBlur={touch('phone')} error={show('phone')}
                    autoComplete="tel" inputMode="tel" placeholder="912 345 678" hint="O número que levas na prova. Fora de Portugal, com indicativo." />
                  <Field label="Data de nascimento" type="date" value={d.birth} onChange={(v) => set('birth', v)} onBlur={touch('birth')} error={show('birth')}
                    hint={ageHint(d.race)} />
                  <div className="field">
                    <label htmlFor="nat">Nacionalidade</label>
                    <select id="nat" value={d.nationality} onChange={(e) => set('nationality', e.target.value)}>
                      {['Portugal', 'Espanha', 'França', 'Reino Unido', 'Brasil', 'Outra'].map((n) => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="shirt">T-shirt</label>
                    <select id="shirt" value={d.shirt} onChange={(e) => set('shirt', e.target.value)}>
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((n) => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="field flow-file flow-span">
                    <span className="label" id="cert-label">Atestado médico</span>
                    <div className="flow-file-row">
                      {cert ? (
                        <>
                          <span className="name">{cert.name}</span>
                          <span className="mono muted">{fileSize(cert.size)}</span>
                          <button type="button" className="btn small ghost noarrow" onClick={() => setCert(null)}>Remover</button>
                        </>
                      ) : (
                        <>
                          <label className="btn small ghost noarrow flow-filebtn">
                            <input type="file" className="sr-only" accept=".pdf,image/*" aria-labelledby="cert-label" aria-describedby="cert-hint"
                              onChange={pickCert} />
                            Escolher ficheiro
                          </label>
                          <span className="muted" style={{ fontSize: 15 }}>Nenhum ficheiro escolhido</span>
                        </>
                      )}
                    </div>
                    <span id="cert-hint" className={certErr ? 'hint flow-err' : 'hint'} role={certErr ? 'alert' : undefined}>
                      {certErr
                        ? `${certErr} Também podes continuar sem atestado e enviá-lo mais tarde na área do atleta.`
                        : `PDF ou fotografia, até ${CERT_MAX_MB} MB. Obrigatório, mas podes enviar mais tarde na área do atleta, até 15 de junho de 2027.`}
                    </span>
                  </div>
                </div>
                {duplicate && (
                  <p className="notice flow-block" role="alert">
                    Já existe uma inscrição ativa em {race.name} com este email. Para a ver ou pagar,{' '}
                    <Link to={`/conta?email=${encodeURIComponent(d.email.trim())}`}>entra na área do atleta</Link> com a referência que recebeste.
                    Para inscrever outra pessoa, usa o email dela.
                  </p>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid2">
                  <Field label="Contacto de emergência" value={d.emergencyName} onChange={(v) => set('emergencyName', v)} onBlur={touch('emergencyName')}
                    error={show('emergencyName')} hint="Nome de quem ligamos se te acontecer alguma coisa." />
                  <Field label="Telefone de emergência" type="tel" value={d.emergencyPhone} onChange={(v) => set('emergencyPhone', v)}
                    onBlur={touch('emergencyPhone')} error={show('emergencyPhone')} inputMode="tel" hint="De alguém que não esteja a correr." />
                </div>
                <div>
                  <p className="field" style={{ margin: 0 }}><span className="label">Dispositivo de tracking</span></p>
                  <div className="choice mt-s" role="radiogroup" aria-label="Dispositivo de tracking">
                    {([
                      ['phone', 'Só telemóvel', 'App HELL160 em iOS ou Android. Mínimo obrigatório.', '0 €'],
                      ['phone+watch', 'Telemóvel + relógio', 'Recomendado. Duas fontes de posição: se uma falha, a outra continua.', '0 €'],
                      ['rental', 'Alugar localizador', 'Localizador satélite da organização, levantado com o dorsal.', eur(RENTAL_EUR)],
                    ] as const).map(([v, t, s, price]) => (
                      <label key={v}>
                        <input type="radio" name="device" checked={d.device === v} onChange={() => set('device', v)} />
                        <span><strong>{t}</strong><span className="muted" style={{ display: 'block', fontSize: 14 }}>{s}</span></span>
                        <span className="mono">{price}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="notice flow-block">
                  Em autonomia total, levar um dispositivo contactável é obrigatório. A tua posição é visível para a organização e equipas
                  de resgate durante toda a prova; no live público aparece apenas o último ponto de controlo.
                </p>
              </>
            )}

            {step === 3 && (
              <>
                <p className="lede" style={{ margin: 0 }}>
                  Onde vais dormir? Casas de famílias das aldeias, perto da partida. Escolhe as noites e a casa: o pedido segue para o
                  anfitrião quando confirmares a inscrição, e só pagas a casa quando a reserva for aceite.
                </p>
                <HousePicker
                  listings={listings}
                  bookings={bookings}
                  selectedId={d.stayId}
                  pick={pick}
                  onSelect={(id) => set('stayId', id)}
                  onPick={setPick}
                />
                {show('stayId') && <p className="flow-err-line" role="alert">{errors[3].stayId}</p>}
                {stay && (
                  <div className="hp-sticky" role="status">
                    <span>
                      <strong>{stay.title}</strong>
                      <span className="muted"> · {pick.nights.length} {pick.nights.length === 1 ? 'noite' : 'noites'} · {eur(stayTotal)}</span>
                    </span>
                    <button className="btn small">Continuar</button>
                  </div>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <dl className="kv flow-kv">
                  <dt>Prova</dt><dd>{race.name}</dd>
                  <dt>Partida</dt><dd>{race.start}</dd>
                  <dt>Atleta</dt><dd>{d.first.trim()} {d.last.trim()}</dd>
                  <dt>Email</dt><dd>{d.email.trim()}</dd>
                  <dt>Telemóvel</dt><dd>{d.phone.trim()}</dd>
                  <dt>Nascimento</dt><dd>{d.birth ? new Date(d.birth).toLocaleDateString('pt-PT') : '—'}</dd>
                  <dt>Emergência</dt><dd>{d.emergencyName.trim()} · {d.emergencyPhone.trim()}</dd>
                  <dt>Tracking</dt><dd>{deviceLabel(d.device)}</dd>
                  <dt>T-shirt</dt><dd>{d.shirt}</dd>
                  <dt>Atestado</dt><dd>{cert ? cert.name : 'Envias mais tarde, até 15 jun 2027'}</dd>
                  <dt>Alojamento</dt><dd>{stay ? `${stay.title}, ${stay.village} · ${pick.nights.length} ${pick.nights.length === 1 ? 'noite' : 'noites'} · ${eur(stayTotal)} (pedido ao anfitrião)` : '—'}</dd>
                </dl>
                <label className="flow-check">
                  <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} aria-invalid={show('accept') ? true : undefined}
                    aria-describedby={show('accept') ? 'accept-err' : undefined} />
                  <span>Li o regulamento, aceito o termo de responsabilidade e confirmo que levo todo o material obrigatório.</span>
                </label>
                {show('accept') && <p className="flow-err-line" id="accept-err" role="alert">{errors[4].accept}</p>}
                <p className="muted flow-fine" style={{ fontSize: 14 }}>
                  {preview()
                    ? 'Fica como pré-inscrição: não pagas nada agora. Quando as inscrições abrirem, recebes um email para confirmar e pagar.'
                    : 'A seguir pagas por MB WAY, Multibanco ou cartão.'}
                </p>
              </>
            )}

            <div className="row">
              {step > 0 && <button type="button" className="btn ghost noarrow" onClick={() => goTo(step - 1)}>← Voltar</button>}
              <button className="btn" disabled={step === 0 && !av.open}>
                {step === STEPS.length - 1 ? (preview() ? 'Guardar pré-inscrição' : `Confirmar · ${eur(total)}`) : 'Continuar'}
              </button>
            </div>
          </form>

          <aside className="summary" aria-label="Resumo">
            <p className="mono muted" style={{ margin: 0 }}>Resumo</p>
            <h2 className="cond mt-s flow-sum-title">{race.name}</h2>
            <p className="muted" style={{ fontSize: 14 }}>{race.start}</p>
            <dl className="kv mt">
              <dt>Vagas</dt><dd>{av.price ? spotsLabel(race, av.left) : '—'}</dd>
              <dt>Inscrição</dt><dd>{av.price ? eur(av.price.eur) : '—'}</dd>
              {extra > 0 && (<><dt>Localizador</dt><dd>{eur(extra)}</dd></>)}
              <dt>Escalão de preço</dt><dd>{av.price?.label ?? 'fechado'}</dd>
            </dl>
            {stay && (
              <div className="hp-summary">
                <p style={{ margin: 0 }}><strong>{stay.title}</strong>, {stay.village}</p>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
                  {pick.nights.length} {pick.nights.length === 1 ? 'noite' : 'noites'} · {pick.guests} {pick.guests === 1 ? 'pessoa' : 'pessoas'} · {eur(stayTotal)}
                </p>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Pago ao anfitrião quando a reserva for aceite. Não entra no total da inscrição.</p>
              </div>
            )}
            <div className="total"><span className="mono">Total</span><b>{eur(total)}</b></div>
          </aside>
        </div>
      </div>
    </section>
  )
}

function athleteErrors(d: Draft): Errors {
  const e: Errors = {}
  if (!d.first.trim()) e.first = 'Falta o nome.'
  if (!d.last.trim()) e.last = 'Falta o apelido.'
  if (!d.email.trim()) e.email = 'Falta o email.'
  else if (!EMAIL_RE.test(d.email.trim())) e.email = 'Email inválido. Confirma se está bem escrito.'
  if (!d.phone.trim()) e.phone = 'Falta o telemóvel.'
  else if (!phoneOk(d.phone)) e.phone = 'Número inválido: pelo menos 9 dígitos. Fora de Portugal, com indicativo (+34…).'
  if (!d.birth) e.birth = 'Falta a data de nascimento.'
  else if (d.birth < '1920-01-01' || Number.isNaN(Date.parse(d.birth))) e.birth = 'Data inválida.'
  else if (d.birth > adultCutoff(d.race))
    e.birth = `Idade mínima: 18 anos no dia da prova. Para ${raceById(d.race)?.name ?? 'esta prova'}, nascido até ${fmtDay(adultCutoff(d.race))}.`
  return e
}

function safetyErrors(d: Draft): Errors {
  const e: Errors = {}
  if (!d.emergencyName.trim()) e.emergencyName = 'Falta o nome do contacto de emergência.'
  if (!d.emergencyPhone.trim()) e.emergencyPhone = 'Falta o telefone de emergência.'
  else if (!phoneOk(d.emergencyPhone)) e.emergencyPhone = 'Número inválido: pelo menos 9 dígitos.'
  else if (digits(d.emergencyPhone).slice(-9) === digits(d.phone).slice(-9))
    e.emergencyPhone = 'É o teu próprio número. Indica o de outra pessoa.'
  return e
}

// ---------- inscrição registada: pagamento e dorsal ----------

function Done({ id }: { id: string }) {
  const regs = useCollection('registrations')
  const hosts = useCollection('hosts')
  const bookings = useCollection('bookings')
  const session = useSessionEmail()
  // só quem tem a sessão desse email vê a inscrição pelo URL
  const reg = regs.find((r) => r.id.toUpperCase() === id && sameEmail(r.email, session))

  if (!reg)
    return (
      <section className="sec">
        <div className="wrap">
          <h1 className="display flow-title long">Inscrição não encontrada</h1>
          <p className="lede mt">
            Não há nenhuma inscrição <span className="mono">{id}</span> na sessão aberta neste browser. Pode ter sido apagada pela organização,
            ou saíste da área do atleta.
          </p>
          <div className="row mt">
            <Link className="btn" to="/conta">Entrar na área do atleta</Link>
            <Link className="btn ghost" to="/inscricao">Nova inscrição</Link>
          </div>
        </div>
      </section>
    )

  const race = raceById(reg.race) ?? RACES[0]
  const cancelled = reg.status === 'cancelada'
  const paid = !cancelled && reg.status === 'paga'
  const stay = reg.stayId ? findListing(reg.stayId, hosts) : undefined
  const account = `/conta?${new URLSearchParams({ email: reg.email, ref: reg.id })}`
  const stayLink = stay && `/alojamento/${stay.id}?${new URLSearchParams({ nome: `${reg.first} ${reg.last}`, email: reg.email, tel: reg.phone })}`
  // pedido de reserva criado com a inscrição (mesma casa, mesmo email)
  const stayBooking = stay ? bookings.filter((b) => b.listingId === stay.id && sameEmail(b.email, reg.email)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : undefined
  const nightsText = (isos: string[]) => EVENT_NIGHTS.filter((n) => isos.includes(n.iso)).map((n) => n.label.toLowerCase()).join(', ')
  const ics = raceICS(reg.race)
  const method = reg.payment?.method === 'mbway' ? 'MB WAY' : reg.payment?.method === 'cartao' ? 'cartão' : 'Multibanco'
  const mail = `mailto:${EVENT.email}?subject=${encodeURIComponent(`Inscrição ${reg.id}`)}`
  // PaymentPanel só aceita 9xxxxxxxx: tira o indicativo +351 / 00351 ao número pré-preenchido
  const payReg = { ...reg, phone: mbwayPhone(reg.phone) }

  return (
    <section className="sec tight">
      <div className="wrap">
        <h1 className={`display flow-title${cancelled ? ' long' : ''}`}>
          {cancelled ? 'Inscrição cancelada' : `${race.id === 'bike' ? 'Até fevereiro' : 'Até julho'}, ${reg.first}.`}
        </h1>
        <p className="lede flow-status">
          {cancelled ? `Inscrição · ${race.name}` : paid ? 'Inscrição confirmada' : preview() ? 'Pré-inscrição guardada · avisamos quando as inscrições abrirem' : 'Inscrição registada · falta o pagamento'}
        </p>

        <div className="flow-done mt-l">
          <div className="info">
            <dl className="kv flow-kv">
              <dt>Referência</dt><dd className="mono">{reg.id}</dd>
              <dt>Prova</dt><dd>{race.name}</dd>
              <dt>Partida</dt><dd>{race.start}</dd>
              <dt>Atleta</dt><dd>{reg.first} {reg.last}</dd>
              <dt>Total</dt><dd>{eur(reg.priceEur)}</dd>
              <dt>Estado</dt><dd>{cancelled ? 'Cancelada' : paid ? 'Paga' : 'Pendente de pagamento'}</dd>
            </dl>
            <p className="muted flow-fine" style={{ marginTop: 16 }}>Guarda a referência: entras na área do atleta com ela e com o teu email.</p>
          </div>

          <aside className="pay-col summary" aria-label={cancelled ? 'Inscrição cancelada' : 'Pagamento'}>
            <p className="sr-only" role="status">{paid ? `Pago. Dorsal ${reg.bib}.` : cancelled ? 'Inscrição cancelada.' : ''}</p>
            {cancelled ? (
              <div className="flow-bibbox">
                <p className="mono ember" style={{ margin: 0 }}>Cancelada</p>
                <p style={{ margin: '12px 0 0' }}>
                  Esta inscrição já não está ativa e não há nada a pagar. A vaga voltou a ficar disponível.
                </p>
                <p className="muted" style={{ margin: '12px 0 24px', fontSize: 15 }}>
                  Se não pediste o cancelamento, ou se já tinhas pago, escreve para{' '}
                  <a href={mail} style={{ overflowWrap: 'anywhere' }}>{EVENT.email}</a> com a referência.
                </p>
                <div className="row">
                  <Link className="btn" to="/inscricao">Nova inscrição</Link>
                </div>
              </div>
            ) : paid ? (
              <div className="flow-bibbox">
                <p className="mono ember" style={{ margin: 0 }}>
                  Pago · {method}{reg.payment?.paidAt ? ` · ${fmtDate(reg.payment.paidAt)}` : ''}
                </p>
                <p className="mono muted" style={{ margin: '20px 0 0' }}>Dorsal</p>
                <b className="display flow-bib">{reg.bib}</b>
                <p className="muted" style={{ fontSize: 14, marginBottom: 0 }}>
                  Levantas o dorsal no secretariado da prova, com documento de identificação.
                </p>
              </div>
            ) : (
              <>
                <div className="row between" style={{ marginBottom: 20 }}>
                  <span className="mono">{preview() ? 'A pagar na abertura' : 'Pagamento'}</span>
                  <b style={{ font: '900 32px/1 var(--display)' }}>{eur(reg.priceEur)}</b>
                </div>
                {preview() ? (
                  <p className="muted" style={{ margin: 0 }}>
                    {registrationLabel()}. Quando abrirem, recebes um email em {reg.email} para confirmar a vaga e pagar. Até lá não há nada
                    a pagar.
                  </p>
                ) : (
                  <PaymentPanel reg={payReg} />
                )}
              </>
            )}
          </aside>

          <div className="next">
            {cancelled ? (
              <div className="row">
                <Link className="btn ghost" to={account}>Área do atleta</Link>
              </div>
            ) : (
              <>
                <ol className="numlist">
                  <li><div>
                    <strong>Pagamento</strong>
                    <p className="muted" style={{ margin: '4px 0 0' }}>
                      {paid
                        ? `Recebido. O dorsal ${reg.bib} é teu.`
                        : preview()
                          ? 'Ainda não há pagamento. Quando as inscrições abrirem, confirmas a vaga e pagas na área do atleta.'
                          : 'A vaga fica reservada, mas a inscrição só conta depois de paga. Podes pagar aqui ou mais tarde na área do atleta.'}
                    </p>
                  </div></li>
                  <li><div>
                    <strong>Atestado médico</strong>
                    <p className="muted" style={{ margin: '4px 0 0' }}>
                      {reg.medical
                        ? `Recebemos ${reg.medical.fileName} (${fileSize(reg.medical.size)}). Está em validação pela organização.`
                        : 'Envia na área do atleta até 15 de junho de 2027.'}
                    </p>
                  </div></li>
                  <li><div>
                    <strong>Material obrigatório</strong>
                    <p className="muted" style={{ margin: '4px 0 0' }}>Confirma a lista na área do atleta antes de vir.</p>
                  </div></li>
                  {stay && (
                    <li><div>
                      <strong>Alojamento</strong>
                      <p className="muted" style={{ margin: '4px 0 0' }}>
                        {stayBooking
                          ? stayBooking.status === 'confirmado'
                            ? `${stay.host} aceitou: ${stay.title}, ${nightsText(stayBooking.nights)}. Total ${eur(stayBooking.totalEur)}.`
                            : stayBooking.status === 'pedido'
                              ? `Pedido enviado a ${stay.host}: ${stay.title}, ${nightsText(stayBooking.nights)}, ${stayBooking.guests} ${stayBooking.guests === 1 ? 'pessoa' : 'pessoas'}, ${eur(stayBooking.totalEur)}. Recebes resposta em 48 horas e só pagas a casa quando a reserva for aceite.`
                              : `O pedido para ${stay.title} já não está ativo. Escolhe outra casa em Dormir na aldeia.`
                          : `Escolheste ${stay.title}, em ${stay.village}. Falta enviar o pedido a ${stay.host}.`}
                      </p>
                    </div></li>
                  )}
                </ol>
                <div className="row mt">
                  <Link className="btn" to={account}>Área do atleta</Link>
                  {stayLink && !stayBooking ? (
                    <Link className="btn ghost" to={stayLink}>Concluir reserva da casa</Link>
                  ) : stayBooking ? (
                    <Link className="btn ghost" to={`/alojamento/${stay!.id}`}>Ver a casa</Link>
                  ) : (
                    <Link className="btn ghost" to="/alojamento">Procurar alojamento</Link>
                  )}
                  {ics && (
                    <button type="button" className="btn ghost noarrow small" onClick={() => download(`${race.id}-2027.ics`, ics, 'text/calendar;charset=utf-8')}>
                      Calendário (.ics)
                    </button>
                  )}
                </div>
                <p className="mt">
                  <Link className="mono" to="/inscricao">Inscrever outra pessoa →</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// Número para o MB WAY: +351 912 345 678 → 912 345 678. Outros formatos ficam como estão.
function mbwayPhone(phone: string) {
  const n = phone.replace(/\D/g, '').replace(/^(00)?351/, '')
  return /^9\d{8}$/.test(n) ? n.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : phone
}

// ---------- campo de texto partilhado (Stay, Host, HostArea, Partners) ----------

export function Field({
  label, value, onChange, type = 'text', hint, autoComplete, error, onBlur, id: idProp, placeholder, inputMode, maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  hint?: string
  autoComplete?: string
  error?: string
  onBlur?: () => void
  id?: string
  placeholder?: string
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
  maxLength?: number
}) {
  const id = idProp ?? label.toLowerCase().replace(/\W+/g, '-')
  const msg = error || hint
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={msg ? `${id}-msg` : undefined}
      />
      {msg && <span id={`${id}-msg`} className={error ? 'hint flow-err' : 'hint'}>{msg}</span>}
    </div>
  )
}

// Nasceu até esta data → tem 18 anos no dia da prova.
function adultCutoff(raceId: string) {
  const day = RACE_DAY[raceId] ?? RACE_DAY.hell160
  return `${+day.slice(0, 4) - 18}${day.slice(4)}`
}

function ageHint(raceId: string) {
  const day = RACE_DAY[raceId] ?? RACE_DAY.hell160
  return raceId === 'bike'
    ? `Idade mínima: 18 anos a ${fmtDay(day)} (a data da prova ainda não está marcada).`
    : `Idade mínima: 18 anos no dia da prova, ${fmtDay(day)}.`
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const fmtDay = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`

function fileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function deviceLabel(d: Registration['device']) {
  return d === 'phone' ? 'Telemóvel' : d === 'phone+watch' ? 'Telemóvel + relógio' : 'Localizador alugado'
}
