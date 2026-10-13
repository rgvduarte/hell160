import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EVENT } from '../data/event'
import { mailtoHref, openMail } from '../data/site'
import { add, uid } from '../lib/store'
import { MailDone } from '../components/MailDone'
import { Field } from './Register'

// Apoiar: patrocínios e parcerias, em versão pública. A informação para sócios e investidores
// fica no briefing interno, fora do site. Sem servidor: o formulário abre o email da pessoa com a mensagem pronta.

const WAYS = [
  ['Desfibrilhadores', 'Dar o nome a um aparelho instalado numa aldeia do percurso.'],
  ['Abastecimentos', 'Água e comida nos 13 abastecimentos, incluindo as 3 bases de vida.'],
  ['Alojamento nas aldeias', 'Ajudar famílias a preparar casas para receber atletas no fim de semana da prova.'],
  ['Produtos da terra', 'Oferecer produtos da região, como queijo, azeite ou pão, para os abastecimentos e a meta.'],
] as const

const SUBJECT = 'Apoio HELL160 2027'

export function Support() {
  const [f, setF] = useState({ name: '', org: '', email: '', interest: WAYS[0][0] as string, msg: '' })
  const [errors, setErrors] = useState<{ name?: string; org?: string; email?: string }>({})
  const [href, setHref] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!f.name.trim()) next.name = 'Escreve o teu nome.'
    if (!f.org.trim()) next.org = 'Escreve o nome da empresa ou instituição.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) next.email = 'Escreve um email válido, por exemplo nome@exemplo.pt.'
    setErrors(next)
    const firstBad = next.name ? 'sup-name' : next.org ? 'sup-org' : next.email ? 'sup-email' : null
    if (firstBad) {
      document.getElementById(firstBad)?.focus()
      return
    }
    add('leads', { id: uid('P27'), createdAt: new Date().toISOString(), kind: 'parceiro', name: f.name.trim(), org: f.org.trim(), email: f.email.trim(), interest: f.interest + (f.msg ? ` · ${f.msg}` : '') })
    const h = mailtoHref(SUBJECT, `${f.name.trim()} (${f.org.trim()})\n${f.email.trim()}\nInteresse: ${f.interest}\n\n${f.msg}`)
    openMail(h)
    setHref(h)
  }

  return (
    <>
      <section className="sec">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 112px)' }}>
            Apoiar
          </h1>
          <p className="lede">Os apoios vão para a prova e para a rede de desfibrilhadores que fica nas aldeias da margem esquerda do Guadiana.</p>
        </div>
      </section>

      <section className="sec tight rule">
        <div className="wrap">
          <ol className="numlist support-ways">
            {WAYS.map(([t, d]) => (
              <li key={t}>
                <div>
                  <h2 className="cond">{t}</h2>
                  <p className="muted">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt">
            <Link to="/causa">Porque organizamos esta prova</Link>
          </p>
        </div>
      </section>

      <section className="sec band-panel">
        <div className="wrap split">
          <h2 className="cond cause-h3">Falar connosco</h2>
          {href ? (
            <MailDone href={href} subject={SUBJECT} />
          ) : (
            <form onSubmit={submit} className="stack" style={{ ['--s' as string]: '24px' }} noValidate>
              <div className="grid2">
                <Field id="sup-name" label="Nome" value={f.name} onChange={(v) => setF({ ...f, name: v })} autoComplete="name" error={errors.name} />
                <Field
                  id="sup-org"
                  label="Empresa ou instituição"
                  value={f.org}
                  onChange={(v) => setF({ ...f, org: v })}
                  autoComplete="organization"
                  error={errors.org}
                />
              </div>
              <Field id="sup-email" label="Email" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} autoComplete="email" error={errors.email} />
              <div className="field">
                <label htmlFor="sup-i">Interesse</label>
                <select id="sup-i" value={f.interest} onChange={(e) => setF({ ...f, interest: e.target.value })}>
                  {WAYS.map(([t]) => (
                    <option key={t}>{t}</option>
                  ))}
                  <option>Outro</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="sup-m">Mensagem (opcional)</label>
                <textarea id="sup-m" rows={3} value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} />
              </div>
              <button className="btn ember">Escrever à organização</button>
              <p className="muted form-how">
                Abre o teu email com a mensagem pronta. Também podes escrever para <a href={`mailto:${EVENT.email}`}>{EVENT.email}</a>.
              </p>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
