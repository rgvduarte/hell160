import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FEATURES, PLATFORM_FEE, VILLAGES, type FeatureKey } from '../data/listings'
import { IMPACT } from '../data/event'
import { eur } from '../lib/domain'
import { add, uid, type HostApplication } from '../lib/store'
import { Field } from './Register'
import '../styles/flows.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const digits = (s: string) => s.replace(/\D/g, '')
const phoneOk = (s: string) => /^\+?[\d\s().-]+$/.test(s.trim()) && digits(s).length >= 9 && digits(s).length <= 15
const NOTE_MAX = 140
const intIn = (v: string, min: number, max: number) => /^\d+$/.test(v.trim()) && +v >= min && +v <= max

const EMPTY = {
  name: '', phone: '', email: '', village: 'A-do-Pinto', address: '', title: '', note: '',
  sleeps: '4', bedrooms: '2', eurNight: 60, features: ['ac'] as string[], state: 'pronta',
}

export function Host() {
  const [f, setF] = useState(EMPTY)
  const [sent, setSent] = useState<HostApplication | null>(null)
  const [tried, setTried] = useState(false)
  const [touched, setTouched] = useState<string[]>([])
  const panel = useRef<HTMLDivElement>(null)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  const touch = (k: string) => () => setTouched((t) => (t.includes(k) ? t : [...t, k]))
  const perWeekend = f.eurNight * 3 * (1 - PLATFORM_FEE)
  const first = f.name.trim().split(/\s+/)[0]

  const errors: Record<string, string> = {}
  if (!f.name.trim()) errors.name = 'Falta o nome.'
  if (!f.phone.trim()) errors.phone = 'Falta o telefone. É para este número que ligamos.'
  else if (!phoneOk(f.phone)) errors.phone = 'Número inválido: pelo menos 9 dígitos.'
  if (f.email.trim() && !EMAIL_RE.test(f.email.trim())) errors.email = 'Email inválido. Confirma se está bem escrito.'
  if (!f.address.trim()) errors.address = 'Falta a morada.'
  if (!intIn(f.sleeps, 1, 12)) errors.sleeps = 'Entre 1 e 12.'
  if (!intIn(f.bedrooms, 1, 8)) errors.bedrooms = 'Entre 1 e 8.'
  const show = (k: string) => (tried || touched.includes(k) ? errors[k] : undefined)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (Object.keys(errors).length) {
      setTried(true)
      requestAnimationFrame(() => document.querySelector<HTMLElement>('.flow-host [aria-invalid="true"]')?.focus())
      return
    }
    const app: HostApplication = {
      id: uid('A27'),
      createdAt: new Date().toISOString(),
      name: f.name.trim(),
      phone: f.phone.trim(),
      village: f.village,
      address: f.address.trim(),
      sleeps: Number(f.sleeps.trim()),
      bedrooms: Number(f.bedrooms.trim()),
      eurNight: f.eurNight,
      features: f.features,
      state: f.state,
      status: 'pendente',
      ...(f.email.trim() ? { email: f.email.trim() } : {}),
      ...(f.title.trim() ? { title: f.title.trim() } : {}),
      ...(f.note.trim() ? { note: f.note.trim() } : {}),
    }
    add('hosts', app)
    setSent(app)
    requestAnimationFrame(() => {
      const r = panel.current?.getBoundingClientRect()
      if (r && (r.top < 64 || r.top > window.innerHeight * 0.6)) window.scrollTo({ top: window.scrollY + r.top - 88 })
    })
  }

  function again() {
    setSent(null)
    setF(EMPTY)
    setTried(false)
    setTouched([])
  }

  return (
    <>
      <section className="sec tight">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <div>
            <p className="eyebrow">Anfitriões</p>
            <h1 className="display flow-title">Abre a casa</h1>
          </div>
          <p className="lede">
            Há {IMPACT.closedHouses} casas fechadas no concelho. Num fim de semana de julho, uma delas pode receber uma família que veio ver
            alguém correr 160 km.
          </p>
        </div>
      </section>

      <section className="sec tight rule">
        <div className="wrap split">
          <ol className="numlist">
            <li><div><h3 className="cond">Inscreve a casa</h3><p className="muted">Este formulário. Não precisas de fotografias agora.</p></div></li>
            <li><div><h3 className="cond">Visita da organização</h3><p className="muted">Alguém da equipa passa, tira fotografias e confirma condições básicas: água quente, camas, ar condicionado ou ventoinhas.</p></div></li>
            <li><div><h3 className="cond">Recebes pedidos</h3><p className="muted">Aceitas ou recusas na área do anfitrião. Ninguém paga até aceitares.</p></div></li>
            <li><div><h3 className="cond">Recebes o dinheiro</h3><p className="muted">{Math.round((1 - PLATFORM_FEE) * 100)} % do valor, transferido na semana seguinte à prova. Ajudamos com o registo de alojamento local.</p></div></li>
          </ol>

          <p className="sr-only" role="status">{sent ? `Casa inscrita. Referência ${sent.id}.` : ''}</p>
          {sent ? (
            <div className="summary stack" style={{ position: 'static', ['--s' as string]: '20px' }} ref={panel}>
              <p className="mono ember" style={{ margin: 0 }}>Recebido</p>
              <h3 className="cond">Obrigado, {sent.name.split(' ')[0]}.</h3>
              <p className="muted" style={{ marginBottom: 0 }}>
                Ligamos para {sent.phone} para marcar a visita. Guarda a referência: é com ela que entras na área do anfitrião.
              </p>
              <div>
                <span className="mono muted">Referência</span>
                <p className="flow-ref">{sent.id}</p>
              </div>
              <dl className="kv">
                <dt>Casa</dt><dd>{sent.title || `Casa de ${sent.name.split(' ')[0]}`}</dd>
                <dt>Aldeia</dt><dd>{sent.village}</dd>
                <dt>Capacidade</dt><dd>{sent.sleeps} pessoas · {sent.bedrooms} {sent.bedrooms === 1 ? 'quarto' : 'quartos'}</dd>
                <dt>Preço</dt><dd>{eur(sent.eurNight)} / noite</dd>
              </dl>
              <div className="row">
                <Link className="btn" to={`/anfitriao/${sent.id}`}>Área do anfitrião</Link>
                <button type="button" className="btn ghost noarrow" onClick={again}>Inscrever outra casa</button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="summary stack flow-host" style={{ ['--s' as string]: '28px', position: 'static' }} noValidate>
              <div className="grid2">
                <Field label="Nome" id="h-name" value={f.name} onChange={(v) => set('name', v)} onBlur={touch('name')} error={show('name')} autoComplete="name" />
                <Field label="Telefone" id="h-phone" type="tel" value={f.phone} onChange={(v) => set('phone', v)} onBlur={touch('phone')} error={show('phone')}
                  autoComplete="tel" inputMode="tel" placeholder="912 345 678" />
              </div>
              <Field label="Email (opcional)" id="h-email" type="email" value={f.email} onChange={(v) => set('email', v)} onBlur={touch('email')}
                error={show('email')} autoComplete="email" hint="Para te enviarmos os pedidos de reserva por escrito." />
              <div className="grid2">
                <div className="field">
                  <label htmlFor="hv">Aldeia</label>
                  <select id="hv" value={f.village} onChange={(e) => set('village', e.target.value)}>
                    {VILLAGES.map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <Field label="Morada" id="h-address" value={f.address} onChange={(v) => set('address', v)} onBlur={touch('address')} error={show('address')}
                  autoComplete="street-address" hint="Só a organização vê a morada." />
              </div>
              <Field label="Nome da casa (opcional)" id="h-title" value={f.title} onChange={(v) => set('title', v)} maxLength={48}
                placeholder={first ? `Casa de ${first}` : 'Casa da Rua Direita'} hint="É o título na lista de casas." />
              <Field label="Uma frase sobre a casa (opcional)" id="h-note" value={f.note} onChange={(v) => set('note', v)} maxLength={NOTE_MAX}
                placeholder="Quintal com sombra, a 5 minutos a pé do largo." hint={`${f.note.length}/${NOTE_MAX}. O que um atleta gostaria de saber antes de escolher.`} />
              <div className="grid3">
                <div className="field">
                  <label htmlFor="hs">Pessoas</label>
                  <input id="hs" type="number" min={1} max={12} step={1} inputMode="numeric" value={f.sleeps} onChange={(e) => set('sleeps', e.target.value)}
                    onBlur={touch('sleeps')} aria-invalid={show('sleeps') ? true : undefined} aria-describedby={show('sleeps') ? 'hs-msg' : undefined} />
                  {show('sleeps') && <span id="hs-msg" className="hint flow-err">{errors.sleeps}</span>}
                </div>
                <div className="field">
                  <label htmlFor="hb">Quartos</label>
                  <input id="hb" type="number" min={1} max={8} step={1} inputMode="numeric" value={f.bedrooms} onChange={(e) => set('bedrooms', e.target.value)}
                    onBlur={touch('bedrooms')} aria-invalid={show('bedrooms') ? true : undefined} aria-describedby={show('bedrooms') ? 'hb-msg' : undefined} />
                  {show('bedrooms') && <span id="hb-msg" className="hint flow-err">{errors.bedrooms}</span>}
                </div>
                <div className="field">
                  <label htmlFor="he">€ / noite</label>
                  <select id="he" value={f.eurNight} onChange={(e) => set('eurNight', +e.target.value)}>
                    {[50, 60, 70, 80].map((v) => <option key={v} value={v}>{v} €</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="hst">Estado da casa</label>
                <select id="hst" value={f.state} onChange={(e) => set('state', e.target.value)}>
                  <option value="pronta">Pronta a receber</option>
                  <option value="pequenas">Precisa de pequenas arrumações</option>
                  <option value="fechada">Fechada há anos, quero ajuda para reabrir</option>
                </select>
              </div>
              <div className="field">
                <span className="label">A casa tem</span>
                <div className="chips">
                  {(Object.keys(FEATURES) as FeatureKey[]).map((k) => (
                    <button type="button" key={k} className="chip" aria-pressed={f.features.includes(k)}
                      onClick={() => set('features', f.features.includes(k) ? f.features.filter((x) => x !== k) : [...f.features, k])}>
                      {FEATURES[k]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="total">
                <span className="mono">3 noites, para ti</span>
                <b>{eur(Math.round(perWeekend))}</b>
              </div>
              <button className="btn">Inscrever a casa</button>
            </form>
          )}
        </div>
      </section>

      <HostLogin />
    </>
  )
}

function HostLogin() {
  const navigate = useNavigate()
  const [ref, setRef] = useState('')
  const [err, setErr] = useState('')

  function go(e: FormEvent) {
    e.preventDefault()
    const r = ref.replace(/\s+/g, '').toUpperCase()
    if (!r) return setErr('Escreve a referência.')
    if (!/^A27-[A-Z0-9]+$/.test(r)) return setErr('A referência de uma casa começa por A27-, por exemplo A27-K3F9QX2.')
    navigate(`/anfitriao/${r}`)
  }

  return (
    <section className="sec tight rule">
      <div className="wrap split">
        <div>
          <p className="eyebrow">Já te inscreveste?</p>
          <h2 className="cond flow-h2">Área do anfitrião</h2>
        </div>
        <div className="stack" style={{ ['--s' as string]: '20px' }}>
          <p className="muted" style={{ margin: 0, maxWidth: '52ch' }}>
            Estado da visita, pedidos de reserva, valores a receber e preço da casa. Entras com a referência que recebeste ao inscrever a casa.
          </p>
          <form className="flow-refform" onSubmit={go} noValidate>
            <div className="field">
              <label htmlFor="host-ref">Referência</label>
              <input id="host-ref" value={ref} onChange={(e) => { setRef(e.target.value); setErr('') }} placeholder="A27-…" autoCapitalize="characters"
                spellCheck={false} aria-invalid={err ? true : undefined} aria-describedby={err ? 'host-ref-err' : undefined} />
            </div>
            <button className="btn">Entrar</button>
            {err && <p className="flow-err-line" id="host-ref-err" role="alert">{err}</p>}
          </form>
        </div>
      </div>
    </section>
  )
}
