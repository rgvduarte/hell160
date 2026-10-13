import { useRef, useState, type ChangeEvent, type FormEvent, type HTMLAttributes } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { RACES, currentPrice, raceById, type Race } from '../data/event'
import { EVENT_NIGHTS } from '../data/listings'
import { HousePlate } from '../components/HousePlate'
import { PaymentPanel } from '../components/PaymentPanel'
import { activeRegs, allListings, download, eur, findListing, fmtDate, raceICS, spotsLeft, takenNights } from '../lib/domain'
import { add, getAll, sameEmail, uid, useCollection, type Registration } from '../lib/store'
import '../styles/flows.css'

const STEPS = ['Prova', 'Atleta', 'Segurança', 'Alojamento', 'Confirmar']
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

// Cada navegação para /inscricao (ex.: o botão do menu) começa uma inscrição nova.
export function Register() {
  const { key } = useLocation()
  return <RegisterFlow key={key} />
}

function RegisterFlow() {
  const [params] = useSearchParams()
  const regs = useCollection('registrations')
  const hosts = useCollection('hosts')
  const bookings = useCollection('bookings')
  const top = useRef<HTMLOListElement>(null)

  // ?prova= escolhe a prova à entrada, se ainda tiver vagas
  const [wanted] = useState(() => {
    const w = raceById(params.get('prova') ?? '')
    if (!w) return null
    const a = availability(w, getAll().registrations)
    return { race: w, open: a.open, full: !!a.price && a.left === 0 }
  })
  const [d, setD] = useState<Draft>(() => {
    const now = getAll().registrations
    const race = wanted?.open ? wanted.race : (RACES.find((r) => availability(r, now).open) ?? RACES[0])
    return {
      race: race.id, first: '', last: '', email: '', phone: '', birth: '', nationality: 'Portugal',
      emergencyName: '', emergencyPhone: '', device: 'phone+watch', shirt: 'M', stayId: undefined,
    }
  })
  const [step, setStep] = useState(0)
  const [tried, setTried] = useState<number[]>([])
  const [touched, setTouched] = useState<string[]>([])
  const [cert, setCert] = useState<File | null>(null)
  const [certErr, setCertErr] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [raceNote, setRaceNote] = useState(
    wanted && !wanted.open
      ? wanted.full
        ? `${wanted.race.name} está esgotado. Escolhe outra prova.`
        : `As inscrições para ${wanted.race.name} estão fechadas. Escolhe outra prova.`
      : '',
  )
  const [doneId, setDoneId] = useState<string | null>(null)

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const touch = (k: string) => () => setTouched((t) => (t.includes(k) ? t : [...t, k]))

  const race = raceById(d.race) ?? RACES[0]
  const av = availability(race, regs)
  const extra = d.device === 'rental' ? RENTAL_EUR : 0
  const total = (av.price?.eur ?? 0) + extra
  const listings = allListings(hosts)
  const stay = d.stayId ? findListing(d.stayId, hosts) : undefined
  const near = listings.filter((l) => l.kmToStart < 13).sort((a, b) => a.kmToStart - b.kmToStart).slice(0, 8)
  const freeNights = (id: string) => {
    const taken = takenNights(id, bookings)
    return EVENT_NIGHTS.filter((n) => !taken.has(n.iso)).length
  }
  const duplicate = EMAIL_RE.test(d.email.trim()) ? activeRegs(regs, d.race).find((r) => sameEmail(r.email, d.email)) : undefined

  const errors: Errors[] = [
    av.open ? {} : { race: av.price ? `${race.name} esgotou. Escolhe outra prova.` : `As inscrições para ${race.name} estão fechadas.` },
    athleteErrors(d, certErr),
    safetyErrors(d),
    {},
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
    if (Object.keys(errors[step]).length > 0 || (step === 1 && duplicate)) {
      setTried((t) => (t.includes(step) ? t : [...t, step]))
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
    setDoneId(reg.id)
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

  if (doneId) return <Done id={doneId} />

  return (
    <section className="sec tight">
      <div className="wrap">
        <p className="eyebrow">Inscrição · edição 2027</p>
        <h1 className="display flow-title" style={{ marginBottom: 48 }}>Inscrição</h1>
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
                    hint="Idade mínima: 18 anos no dia da prova." />
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
                      {certErr || `PDF ou fotografia, até ${CERT_MAX_MB} MB. Obrigatório, mas podes enviar mais tarde na área do atleta, até 15 de junho de 2027.`}
                    </span>
                  </div>
                </div>
                {duplicate && (
                  <p className="notice flow-block" role="alert">
                    Já existe uma inscrição ativa em {race.name} com {d.email.trim()} (<span className="mono">{duplicate.id}</span>). Para a ver ou
                    pagar, <Link to={`/conta?email=${encodeURIComponent(d.email.trim())}`}>entra na área do atleta</Link>. Para inscrever outra pessoa,
                    usa o email dela.
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
                  Precisas de cama? Estas casas ficam a menos de 13 km da partida. Escolher aqui não reserva: no fim abrimos a página da casa para
                  fazeres o pedido ao anfitrião.
                </p>
                <div className="choice flow-choice flow-houses" role="radiogroup" aria-label="Alojamento">
                  <label>
                    <input type="radio" name="stay" checked={!d.stayId} onChange={() => set('stayId', undefined)} />
                    <span className="flow-none">
                      <strong>Já tenho onde ficar</strong>
                      <span className="muted" style={{ display: 'block', fontSize: 14 }}>Podes procurar casa mais tarde.</span>
                    </span>
                    <span />
                  </label>
                  {near.map((l) => {
                    const free = freeNights(l.id)
                    return (
                      <label key={l.id}>
                        <input type="radio" name="stay" checked={d.stayId === l.id} disabled={free === 0} onChange={() => set('stayId', l.id)} />
                        <span className="flow-thumb" aria-hidden="true"><HousePlate listing={l} /></span>
                        <span>
                          <strong>{l.title}</strong>
                          <span className="muted" style={{ display: 'block', fontSize: 14 }}>
                            {l.village} · {l.sleeps} pessoas · {l.kmToStart.toLocaleString('pt-PT')} km da partida
                          </span>
                          <span className={`flow-left${free > 0 && free < EVENT_NIGHTS.length ? ' low' : ''}`}>
                            {free === 0 ? 'Sem noites livres' : `${free} de ${EVENT_NIGHTS.length} noites livres`}
                          </span>
                        </span>
                        <span className="mono flow-price">{eur(l.eurNight)}<small>/ noite</small></span>
                      </label>
                    )
                  })}
                </div>
                <Link to="/alojamento" className="mono">Ver todas as casas →</Link>
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
                  <dt>Alojamento</dt><dd>{stay ? `${stay.title}, ${stay.village}` : '—'}</dd>
                </dl>
                <label className="flow-check">
                  <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} aria-invalid={show('accept') ? true : undefined}
                    aria-describedby={show('accept') ? 'accept-err' : undefined} />
                  <span>Li o regulamento, aceito o termo de responsabilidade e confirmo que levo todo o material obrigatório.</span>
                </label>
                {show('accept') && <p className="flow-err-line" id="accept-err" role="alert">{errors[4].accept}</p>}
                <p className="muted flow-fine" style={{ fontSize: 14 }}>
                  A seguir pagas por MB WAY, Multibanco ou cartão. Neste protótipo o pagamento é uma simulação: nada é cobrado.
                </p>
              </>
            )}

            <div className="row">
              {step > 0 && <button type="button" className="btn ghost noarrow" onClick={() => goTo(step - 1)}>← Voltar</button>}
              <button className="btn" disabled={step === 0 && !av.open}>
                {step === STEPS.length - 1 ? `Confirmar · ${eur(total)}` : 'Continuar'}
              </button>
            </div>
          </form>

          <aside className="summary" aria-label="Resumo">
            <p className="mono muted" style={{ margin: 0 }}>Resumo</p>
            <h3 className="cond mt-s">{race.name}</h3>
            <p className="muted" style={{ fontSize: 14 }}>{race.start}</p>
            <dl className="kv mt">
              <dt>Vagas</dt><dd>{av.price ? spotsLabel(race, av.left) : '—'}</dd>
              <dt>Inscrição</dt><dd>{av.price ? eur(av.price.eur) : '—'}</dd>
              {extra > 0 && (<><dt>Localizador</dt><dd>{eur(extra)}</dd></>)}
              <dt>Escalão de preço</dt><dd>{av.price?.label ?? 'fechado'}</dd>
            </dl>
            {stay && (
              <p className="muted" style={{ fontSize: 14, marginTop: 16, marginBottom: 0 }}>
                {stay.title}, {eur(stay.eurNight)}/noite. O alojamento paga-se à parte, ao anfitrião, depois de ele aceitar o pedido.
              </p>
            )}
            <div className="total"><span className="mono">Total</span><b>{eur(total)}</b></div>
          </aside>
        </div>
      </div>
    </section>
  )
}

function athleteErrors(d: Draft, certErr: string): Errors {
  const e: Errors = {}
  if (!d.first.trim()) e.first = 'Falta o nome.'
  if (!d.last.trim()) e.last = 'Falta o apelido.'
  if (!d.email.trim()) e.email = 'Falta o email.'
  else if (!EMAIL_RE.test(d.email.trim())) e.email = 'Email inválido. Confirma se está bem escrito.'
  if (!d.phone.trim()) e.phone = 'Falta o telemóvel.'
  else if (!phoneOk(d.phone)) e.phone = 'Número inválido: pelo menos 9 dígitos. Fora de Portugal, com indicativo (+34…).'
  if (!d.birth) e.birth = 'Falta a data de nascimento.'
  else if (d.birth < '1920-01-01' || Number.isNaN(Date.parse(d.birth))) e.birth = 'Data inválida.'
  else if (!isAdult(d.birth)) e.birth = 'Idade mínima: 18 anos no dia da prova.'
  if (certErr) e.cert = certErr
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
  const reg = regs.find((r) => r.id === id)

  if (!reg)
    return (
      <section className="sec">
        <div className="wrap">
          <p className="eyebrow">Inscrição</p>
          <h1 className="display flow-title long">Inscrição não encontrada</h1>
          <p className="lede mt">A inscrição {id} já não existe neste browser. Pode ter sido apagada pela organização.</p>
          <Link className="btn mt" to="/inscricao">Nova inscrição</Link>
        </div>
      </section>
    )

  const race = raceById(reg.race) ?? RACES[0]
  const paid = reg.status === 'paga'
  const stay = reg.stayId ? findListing(reg.stayId, hosts) : undefined
  const account = `/conta?${new URLSearchParams({ email: reg.email, ref: reg.id })}`
  const stayLink = stay && `/alojamento/${stay.id}?${new URLSearchParams({ nome: `${reg.first} ${reg.last}`, email: reg.email, tel: reg.phone })}`
  const ics = raceICS(reg.race)
  const method = reg.payment?.method === 'mbway' ? 'MB WAY' : reg.payment?.method === 'cartao' ? 'cartão' : 'Multibanco'

  return (
    <section className="sec tight">
      <div className="wrap">
        <p className="eyebrow">{paid ? 'Inscrição confirmada' : 'Inscrição registada · falta o pagamento'}</p>
        <h1 className="display flow-title">{race.id === 'bike' ? 'Até fevereiro' : 'Até julho'}, {reg.first}.</h1>

        <div className="flow-done mt-l">
          <div className="info">
            <dl className="kv flow-kv">
              <dt>Referência</dt><dd className="mono">{reg.id}</dd>
              <dt>Prova</dt><dd>{race.name}</dd>
              <dt>Partida</dt><dd>{race.start}</dd>
              <dt>Atleta</dt><dd>{reg.first} {reg.last}</dd>
              <dt>Total</dt><dd>{eur(reg.priceEur)}</dd>
              <dt>Estado</dt><dd>{paid ? 'Paga' : 'Pendente de pagamento'}</dd>
            </dl>
            <p className="muted flow-fine" style={{ marginTop: 16 }}>Guarda a referência: entras na área do atleta com ela e com o teu email.</p>
          </div>

          <aside className="pay-col summary" aria-live="polite">
            {paid ? (
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
                  <span className="mono">Pagamento</span>
                  <b style={{ font: '900 32px/1 var(--display)' }}>{eur(reg.priceEur)}</b>
                </div>
                <PaymentPanel reg={reg} />
              </>
            )}
          </aside>

          <div className="next">
            <ol className="numlist">
              <li><div>
                <strong>Pagamento</strong>
                <p className="muted" style={{ margin: '4px 0 0' }}>
                  {paid
                    ? `Recebido. O dorsal ${reg.bib} é teu.`
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
                    Escolheste {stay.title}, em {stay.village}. Falta escolher as noites e enviar o pedido a {stay.host}.
                  </p>
                </div></li>
              )}
            </ol>
            <div className="row mt">
              <Link className="btn" to={account}>Área do atleta</Link>
              {stayLink ? (
                <Link className="btn ghost" to={stayLink}>Concluir reserva da casa</Link>
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
          </div>
        </div>
      </div>
    </section>
  )
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

function isAdult(birth: string) {
  return new Date(birth) <= new Date('2009-07-02')
}

function fileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function deviceLabel(d: Registration['device']) {
  return d === 'phone' ? 'Telemóvel' : d === 'phone+watch' ? 'Telemóvel + relógio' : 'Localizador alugado'
}
