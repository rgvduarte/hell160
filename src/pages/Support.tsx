import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EVENT } from '../data/event'
import { add, uid } from '../lib/store'
import { Field } from './Register'

// Apoiar: patrocínios e parcerias, em versão pública. A informação para sócios e investidores
// fica no briefing interno, fora do site.

const WAYS = [
  ['Desfibrilhadores', 'Dar o nome a um aparelho instalado numa aldeia do percurso.'],
  ['Abastecimentos', 'Água, fruta e comida quente nos 13 abastecimentos, incluindo as 3 bases de vida.'],
  ['Alojamento nas aldeias', 'Ajudar famílias a preparar casas para receber atletas no fim de semana da prova.'],
  ['Produtos da terra', 'Queijo, azeite, pão e vinho da região no kit do atleta e na meta.'],
] as const

export function Support() {
  const [f, setF] = useState({ name: '', org: '', email: '', interest: WAYS[0][0] as string, msg: '' })
  const [sent, setSent] = useState<string | null>(null)
  const valid = f.name.trim() && f.org.trim() && /.+@.+\..+/.test(f.email)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    const id = uid('P27')
    add('leads', { id, createdAt: new Date().toISOString(), kind: 'parceiro', name: f.name.trim(), org: f.org.trim(), email: f.email.trim(), interest: f.interest + (f.msg ? ` · ${f.msg}` : '') })
    setSent(id)
  }

  const mail = `mailto:${EVENT.email}?subject=${encodeURIComponent('Apoio HELL160 2027')}&body=${encodeURIComponent(`${f.name} (${f.org})\n${f.email}\nInteresse: ${f.interest}\n\n${f.msg}`)}`

  return (
    <>
      <section className="sec">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 112px)' }}>Apoiar</h1>
          <p className="lede">
            O HELL160 faz-se com as aldeias e com quem as quer ver vivas. Os apoios vão para a prova e para a rede de desfibrilhadores
            que fica na região.
          </p>
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
          <p className="mt"><Link to="/causa">Porque organizamos esta prova</Link></p>
        </div>
      </section>

      <section className="sec night">
        <div className="wrap split">
          <h2 className="cond" style={{ fontSize: 'clamp(30px, 3.4vw, 46px)' }}>Falar connosco</h2>
          {sent ? (
            <div className="summary" style={{ position: 'static' }}>
              <h3 className="cond">Obrigado.</h3>
              <p className="muted">Respondemos em breve para {f.email}. Referência <span className="mono">{sent}</span>.</p>
              <a href={mail}>Enviar também por email</a>
            </div>
          ) : (
            <form onSubmit={submit} className="stack" style={{ ['--s' as string]: '24px' }}>
              <div className="grid2">
                <Field label="Nome" value={f.name} onChange={(v) => setF({ ...f, name: v })} autoComplete="name" />
                <Field label="Empresa ou instituição" value={f.org} onChange={(v) => setF({ ...f, org: v })} autoComplete="organization" />
              </div>
              <Field label="Email" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} autoComplete="email" />
              <div className="field">
                <label htmlFor="sup-i">Interesse</label>
                <select id="sup-i" value={f.interest} onChange={(e) => setF({ ...f, interest: e.target.value })}>
                  {WAYS.map(([t]) => <option key={t}>{t}</option>)}
                  <option>Outro</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="sup-m">Mensagem (opcional)</label>
                <textarea id="sup-m" rows={3} value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} />
              </div>
              <button className="btn ember" disabled={!valid}>Enviar</button>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
