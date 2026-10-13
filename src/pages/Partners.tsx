import { useEffect, useRef, useState, type FormEvent } from 'react'
import { EVENT } from '../data/event'
import { add, uid, type Lead } from '../lib/store'
import { Field } from './Register'
import { SendByEmail } from './Safety'
import '../styles/community.css'

// Formulário de contacto para empresas e instituições que querem apoiar a prova (página /apoiar).
// Valida os campos, guarda o pedido na camada de dados (Admin → Parceiros) e dá uma referência
// para o email. A antiga página de investidores saiu do site público: esse material fica no briefing interno.

export const PARTNER_INTERESTS = [
  'Desfibrilhadores',
  'Abastecimentos',
  'Alojamento nas aldeias',
  'Produtos da terra',
  'Outro',
] as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function PartnerLeadForm({
  interests = PARTNER_INTERESTS,
  title = 'Pedido de contacto',
}: {
  interests?: readonly string[]
  title?: string
}) {
  const empty = { name: '', org: '', email: '', phone: '', interest: interests[0] ?? 'Outro', msg: '' }
  const [f, setF] = useState(empty)
  const [tried, setTried] = useState(false)
  const [sent, setSent] = useState<Lead | null>(null)
  const doneRef = useRef<HTMLDivElement>(null)
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    if (sent) doneRef.current?.focus()
  }, [sent])

  const errors = {
    name: !f.name.trim() ? 'Indica o teu nome.' : '',
    org: !f.org.trim() ? 'Indica a empresa ou instituição.' : '',
    email: !EMAIL_RE.test(f.email.trim()) ? 'Email inválido.' : '',
  }
  const invalid = Object.values(errors).some(Boolean)

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (invalid) {
      setTried(true)
      const form = e.currentTarget
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    const msg = f.msg.trim()
    const lead: Lead = {
      id: uid('P27'),
      createdAt: new Date().toISOString(),
      kind: 'parceiro',
      name: f.name.trim(),
      org: f.org.trim(),
      email: f.email.trim(),
      interest: msg ? `${f.interest} · ${msg}` : f.interest,
      ...(f.phone.trim() ? { phone: f.phone.trim() } : {}),
    }
    add('leads', lead)
    setSent(lead)
  }

  function reset() {
    setF(empty)
    setTried(false)
    setSent(null)
  }

  if (sent) {
    const subject = `Apoio HELL160 2027 · ${sent.id}`
    const body = [
      `Referência: ${sent.id}`,
      `Nome: ${sent.name}`,
      `Empresa ou instituição: ${sent.org}`,
      `Email: ${sent.email}`,
      sent.phone && `Telefone: ${sent.phone}`,
      `Interesse: ${sent.interest}`,
    ]
      .filter(Boolean)
      .join('\n')
    return (
      <div ref={doneRef} tabIndex={-1} className="summary cm-static cm-done stack" style={{ ['--s' as string]: '20px' }} role="status">
        <p className="mono ember" style={{ margin: 0 }}>Pedido registado neste browser</p>
        <h3 className="cond">Obrigado, {sent.name.split(/\s+/)[0]}.</h3>
        <div>
          <span className="mono muted">Referência</span>
          <p className="cm-ref">{sent.id}</p>
        </div>
        <dl className="kv">
          <dt>Organização</dt><dd>{sent.org}</dd>
          <dt>Email</dt><dd>{sent.email}</dd>
          <dt>Interesse</dt><dd>{sent.interest}</dd>
        </dl>
        <SendByEmail
          href={`mailto:${EVENT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
          reference={sent.id}
          again="Novo pedido"
          onAgain={reset}
        />
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="summary cm-static stack" style={{ ['--s' as string]: '28px' }} aria-labelledby="pc-title">
      <p id="pc-title" className="mono muted" style={{ margin: 0 }}>{title}</p>
      <div className="grid2">
        <Field id="pc-nome" label="Nome" value={f.name} onChange={set('name')} autoComplete="name" error={tried ? errors.name : ''} />
        <Field id="pc-org" label="Empresa ou instituição" value={f.org} onChange={set('org')} autoComplete="organization" error={tried ? errors.org : ''} />
      </div>
      <div className="grid2">
        <Field id="pc-email" label="Email" type="email" value={f.email} onChange={set('email')} autoComplete="email" error={tried ? errors.email : ''} />
        <Field id="pc-tel" label="Telefone (opcional)" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" />
      </div>
      <div className="field">
        <label htmlFor="pc-interesse">Interesse</label>
        <select id="pc-interesse" value={f.interest} onChange={(e) => set('interest')(e.target.value)}>
          {interests.map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="pc-msg">Mensagem (opcional)</label>
        <textarea id="pc-msg" className="cm-textarea" rows={3} value={f.msg} onChange={(e) => set('msg')(e.target.value)} />
      </div>
      <button className="btn ember">Registar pedido</button>
      <p className="muted cm-fine">
        Simulação: o pedido fica neste browser até o enviares por email. Também podes escrever diretamente para{' '}
        <span className="cm-select">{EVENT.email}</span>.
      </p>
    </form>
  )
}
