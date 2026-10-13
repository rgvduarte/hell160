import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EVENT } from '../data/event'
import { VILLAGES } from '../data/listings'
import { mailtoHref, openMail } from '../data/site'
import { add, uid } from '../lib/store'
import { eur } from '../lib/domain'
import { Media } from '../components/Media'
import { MailDone } from '../components/MailDone'
import { Field } from './Register'

// A causa: o HELL160 organiza-se para levar meios de saúde e segurança às aldeias da margem esquerda.
// Página pública. Nada de informação interna (incidentes, decisões técnicas, investidores).
// Sem servidor: os formulários abrem o email da pessoa com a mensagem pronta (e guardam uma cópia local).

const AMOUNTS = [50, 250, 1000]
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

export function Cause() {
  return (
    <>
      <section className="page-hero cause-hero" aria-labelledby="causa-h">
        <Media slot="causa" tone="night" eager />
        <div className="wrap">
          <h1 className="display" id="causa-h">
            Saúde perto de casa
          </h1>
          <p className="lede">
            Nas aldeias da margem esquerda do Guadiana o hospital fica longe. O HELL160 é organizado para lá deixar desfibrilhadores e pessoas
            formadas para os usar.
          </p>
          <p className="cause-count">
            <b>2</b>
            <span>desfibrilhadores já conseguidos para a rede</span>
          </p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap split">
          <h2 className="display cause-h2">Desfibrilhadores nas aldeias</h2>
          <div className="stack">
            <p className="lede">
              Cada aparelho fica instalado na aldeia, ao alcance de quem lá vive, e fica lá depois de os atletas partirem. Queremos alargar a rede
              às aldeias do percurso e formar residentes e voluntários em suporte básico de vida.
            </p>
          </div>
        </div>
      </section>

      <section className="sec band-panel">
        <div className="wrap">
          <h2 className="cond cause-h3">Como ajudar</h2>
          <div className="cause-ways mt">
            <div>
              <h3 className="cond">Correr</h3>
              <p className="muted">A prova existe para isto. Cada atleta que vem às aldeias faz parte da rede.</p>
              <Link className="btn" to="/provas">
                Ver as provas
              </Link>
            </div>
            <div>
              <h3 className="cond">Patrocinar um aparelho</h3>
              <p className="muted">Empresas e instituições podem dar o nome a um desfibrilhador numa aldeia.</p>
              <a className="btn ghost" href="#apoiar">
                Patrocinar
              </a>
            </div>
            <div>
              <h3 className="cond">Aprender a usar</h3>
              <p className="muted">Formação em suporte básico de vida para residentes e voluntários.</p>
              <a className="btn ghost" href="#formacao">
                Quero formação
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" id="apoiar">
        <div className="wrap split">
          <h2 className="cond cause-h3">Patrocinar ou doar</h2>
          <PledgeForm />
        </div>
      </section>

      <section className="sec rule" id="formacao">
        <div className="wrap split">
          <h2 className="cond cause-h3">Formação em suporte básico de vida</h2>
          <TrainingForm />
        </div>
      </section>

      <section className="sec band-panel">
        <div className="wrap split">
          <h2 className="cond cause-h3">Segurança em prova</h2>
          <ul className="ticklist">
            <li>Todos os atletas são acompanhados em tempo real pela app HELL160, com relógio GPS como segunda fonte.</li>
            <li>Localizador por satélite disponível na inscrição para quem quer cobertura total.</li>
            <li>Postos médicos nas bases de vida e equipas de resgate no percurso, dia e noite.</li>
            <li>Material obrigatório verificado à partida e em prova.</li>
          </ul>
        </div>
      </section>
    </>
  )
}

const PLEDGE_SUBJECT = 'Apoio à rede de desfibrilhadores HELL160'

function PledgeForm() {
  const [f, setF] = useState({ name: '', email: '', kind: 'empresa' as 'empresa' | 'particular', amount: AMOUNTS[0], other: '' })
  const [errors, setErrors] = useState<{ name?: string; email?: string; amount?: string }>({})
  const [href, setHref] = useState<string | null>(null)
  const amount = f.amount > 0 ? f.amount : Number(f.other.replace(',', '.'))

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!f.name.trim()) next.name = f.kind === 'empresa' ? 'Escreve o nome da empresa ou instituição.' : 'Escreve o teu nome.'
    if (!validEmail(f.email)) next.email = 'Escreve um email válido, por exemplo nome@exemplo.pt.'
    if (!(amount >= 5)) next.amount = 'Indica um valor a partir de 5 €.'
    setErrors(next)
    const firstBad = next.name ? 'pl-name' : next.email ? 'pl-email' : next.amount ? 'pl-other' : null
    if (firstBad) {
      if (firstBad === 'pl-other' && f.amount !== 0) setF({ ...f, amount: 0 })
      requestAnimationFrame(() => document.getElementById(firstBad)?.focus())
      return
    }
    add('pledges', { id: uid('D27'), createdAt: new Date().toISOString(), name: f.name.trim(), email: f.email.trim(), amountEur: Math.round(amount), place: 'Rede de desfibrilhadores', kind: f.kind })
    const h = mailtoHref(
      PLEDGE_SUBJECT,
      `${f.kind === 'empresa' ? 'Empresa ou instituição' : 'Nome'}: ${f.name.trim()}\nEmail: ${f.email.trim()}\nApoio que gostaria de dar: ${eur(Math.round(amount))}\n\nPeço os dados para o pagamento.`,
    )
    openMail(h)
    setHref(h)
  }

  if (href)
    return (
      <MailDone href={href} subject={PLEDGE_SUBJECT}>
        <p>A mensagem indica um apoio de {eur(Math.round(amount))}. Os dados para o pagamento combinam-se por email com a organização.</p>
      </MailDone>
    )

  return (
    <form onSubmit={submit} className="stack" style={{ ['--s' as string]: '24px' }} noValidate>
      <div className="chips" role="radiogroup" aria-label="Tipo de apoio">
        {(['empresa', 'particular'] as const).map((k) => (
          <button type="button" key={k} className="chip" role="radio" aria-checked={f.kind === k} onClick={() => setF({ ...f, kind: k })}>
            {k === 'empresa' ? 'Empresa ou instituição' : 'Particular'}
          </button>
        ))}
      </div>
      <div className="grid2">
        <Field
          id="pl-name"
          label={f.kind === 'empresa' ? 'Empresa' : 'Nome'}
          value={f.name}
          onChange={(v) => setF({ ...f, name: v })}
          autoComplete={f.kind === 'empresa' ? 'organization' : 'name'}
          error={errors.name}
        />
        <Field id="pl-email" label="Email" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} autoComplete="email" error={errors.email} />
      </div>
      <div className="field">
        <span className="label" id="pl-amount">
          Valor
        </span>
        <div className="chips" role="group" aria-labelledby="pl-amount">
          {AMOUNTS.map((v) => (
            <button type="button" key={v} className="chip" aria-pressed={f.amount === v} onClick={() => setF({ ...f, amount: v })}>
              {eur(v)}
            </button>
          ))}
          <button type="button" className="chip" aria-pressed={f.amount === 0} onClick={() => setF({ ...f, amount: 0 })}>
            Outro
          </button>
        </div>
        {f.amount === 0 && (
          <input
            id="pl-other"
            aria-label="Outro valor em euros"
            inputMode="decimal"
            placeholder="Valor em €"
            value={f.other}
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? 'pl-other-msg' : undefined}
            onChange={(e) => setF({ ...f, other: e.target.value })}
          />
        )}
        {errors.amount && (
          <span className="hint flow-err" id="pl-other-msg">
            {errors.amount}
          </span>
        )}
      </div>
      <button className="btn ember">Quero apoiar</button>
      <p className="muted form-how">
        Abre o teu email com a mensagem pronta para a organização. Também podes escrever para <a href={`mailto:${EVENT.email}`}>{EVENT.email}</a>.
      </p>
    </form>
  )
}

const TRAINING_SUBJECT = 'Formação em suporte básico de vida'

function TrainingForm() {
  const [f, setF] = useState({ name: '', phone: '', email: '', village: 'A-do-Pinto' })
  const [errors, setErrors] = useState<{ name?: string; contact?: string }>({})
  const [href, setHref] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    const phoneOk = f.phone.replace(/\D/g, '').length >= 9
    const emailOk = validEmail(f.email)
    if (!f.name.trim()) next.name = 'Escreve o teu nome.'
    if (!phoneOk && !emailOk) next.contact = 'Deixa um telefone com 9 dígitos ou um email válido.'
    setErrors(next)
    if (next.name || next.contact) {
      document.getElementById(next.name ? 'tr-name' : 'tr-phone')?.focus()
      return
    }
    add('leads', { id: uid('F27'), createdAt: new Date().toISOString(), kind: 'formacao', name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), village: f.village })
    const h = mailtoHref(
      `${TRAINING_SUBJECT} · ${f.village}`,
      `Nome: ${f.name.trim()}\nAldeia: ${f.village}\nTelefone: ${f.phone.trim() || '-'}\nEmail: ${f.email.trim() || '-'}\n\nQuero participar numa sessão de formação em suporte básico de vida.`,
    )
    openMail(h)
    setHref(h)
  }

  if (href) return <MailDone href={href} subject={`${TRAINING_SUBJECT} · ${f.village}`} />

  return (
    <form onSubmit={submit} className="stack" style={{ ['--s' as string]: '24px' }} noValidate>
      <p className="muted" style={{ margin: 0 }}>
        Sessões nas aldeias para residentes e voluntários. Deixa o contacto para a organização te avisar quando houver uma perto de ti.
      </p>
      <div className="grid2">
        <Field id="tr-name" label="Nome" value={f.name} onChange={(v) => setF({ ...f, name: v })} autoComplete="name" error={errors.name} />
        <div className="field">
          <label htmlFor="tr-v">Aldeia</label>
          <select id="tr-v" value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })}>
            {VILLAGES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <Field id="tr-phone" label="Telefone" type="tel" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} autoComplete="tel" error={errors.contact} />
        <Field id="tr-email" label="Email (opcional)" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} autoComplete="email" />
      </div>
      <button className="btn">Pedir formação</button>
      <p className="muted form-how">Abre o teu email com o pedido pronto para a organização.</p>
    </form>
  )
}
