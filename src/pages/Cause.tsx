import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EVENT } from '../data/event'
import { VILLAGES } from '../data/listings'
import { add, uid, useCollection } from '../lib/store'
import { eur } from '../lib/domain'
import { Field } from './Register'

// A causa: o HELL160 organiza-se para levar meios de saúde e segurança às aldeias da margem esquerda.
// Página pública. Nada de informação interna (incidentes, decisões técnicas, investidores).

const UNIT_EUR = 1800 // custo indicativo de um DAE com armário exterior e formação

export function Cause() {
  const pledges = useCollection('pledges')
  const raised = pledges.reduce((s, p) => s + p.amountEur, 0)

  return (
    <>
      <section className="sec">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <h1 className="display cause-title">Saúde perto de casa</h1>
          <div className="stack">
            <p className="lede">
              O HELL160 é organizado para as aldeias da margem esquerda do Guadiana. Aqui o hospital fica longe e cada minuto conta.
              A prova traz para estas aldeias desfibrilhadores e pessoas formadas para os usar, e esses meios ficam cá depois de os
              atletas partirem.
            </p>
          </div>
        </div>
      </section>

      <section className="sec night">
        <div className="wrap split">
          <div>
            <h2 className="display" style={{ fontSize: 'clamp(26px, 3.4vw, 52px)' }}>Um desfibrilhador em cada aldeia do percurso</h2>
          </div>
          <div className="stack">
            <div className="cause-count">
              <b>2</b>
              <span>desfibrilhadores já conseguidos para a rede</span>
            </div>
            <p className="lede">
              Cada aparelho fica instalado na aldeia, ao alcance de quem lá vive. Queremos que cada aldeia tenha também voluntários
              formados em suporte básico de vida, e que a rede cresça a cada edição.
            </p>
            {raised > 0 && (
              <p className="mono muted">{eur(raised)} prometidos através deste site · um aparelho completo custa cerca de {eur(UNIT_EUR)}</p>
            )}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <h2 className="cond" style={{ fontSize: 'clamp(30px, 3.4vw, 46px)' }}>Como ajudar</h2>
          <div className="cause-ways mt">
            <div>
              <h3 className="cond">Correr</h3>
              <p className="muted">A prova existe para isto. Cada atleta que vem às aldeias faz parte da rede.</p>
              <Link className="btn" to="/inscricao">Inscrever</Link>
            </div>
            <div>
              <h3 className="cond">Patrocinar um aparelho</h3>
              <p className="muted">Empresas e instituições podem dar o nome a um desfibrilhador numa aldeia.</p>
              <a className="btn ghost" href="#apoiar">Patrocinar</a>
            </div>
            <div>
              <h3 className="cond">Aprender a usar</h3>
              <p className="muted">Formação em suporte básico de vida para residentes e voluntários.</p>
              <a className="btn ghost" href="#formacao">Quero formação</a>
            </div>
          </div>
        </div>
      </section>

      <section className="sec rule" id="apoiar">
        <div className="wrap split">
          <h2 className="cond" style={{ fontSize: 'clamp(30px, 3.4vw, 46px)' }}>Patrocinar ou doar</h2>
          <PledgeForm />
        </div>
      </section>

      <section className="sec rule" id="formacao">
        <div className="wrap split">
          <h2 className="cond" style={{ fontSize: 'clamp(30px, 3.4vw, 46px)' }}>Formação em suporte básico de vida</h2>
          <TrainingForm />
        </div>
      </section>

      <section className="sec dust">
        <div className="wrap split">
          <h2 className="cond" style={{ fontSize: 'clamp(30px, 3.4vw, 46px)' }}>Segurança em prova</h2>
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

function PledgeForm() {
  const [f, setF] = useState({ name: '', email: '', kind: 'empresa' as 'empresa' | 'particular', amount: UNIT_EUR, other: '' })
  const [done, setDone] = useState<string | null>(null)
  const amount = f.amount > 0 ? f.amount : Number(f.other.replace(',', '.'))
  const valid = f.name.trim() && /.+@.+\..+/.test(f.email) && amount >= 5

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    const id = uid('D27')
    add('pledges', { id, createdAt: new Date().toISOString(), name: f.name.trim(), email: f.email.trim(), amountEur: Math.round(amount), place: 'Rede de desfibrilhadores', kind: f.kind })
    setDone(id)
  }

  if (done)
    return (
      <div className="summary" style={{ position: 'static' }}>
        <h3 className="cond">Obrigado, {f.name.split(' ')[0]}.</h3>
        <p className="muted">Recebemos a tua intenção de apoio ({eur(amount)}). Entramos em contacto por email para os dados de pagamento. Referência <span className="mono">{done}</span>.</p>
      </div>
    )

  return (
    <form onSubmit={submit} className="stack" style={{ ['--s' as string]: '24px' }}>
      <div className="chips" role="radiogroup" aria-label="Tipo de apoio">
        {(['empresa', 'particular'] as const).map((k) => (
          <button type="button" key={k} className="chip" aria-pressed={f.kind === k} onClick={() => setF({ ...f, kind: k })}>
            {k === 'empresa' ? 'Empresa ou instituição' : 'Particular'}
          </button>
        ))}
      </div>
      <div className="grid2">
        <Field label={f.kind === 'empresa' ? 'Empresa' : 'Nome'} value={f.name} onChange={(v) => setF({ ...f, name: v })} autoComplete={f.kind === 'empresa' ? 'organization' : 'name'} />
        <Field label="Email" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} autoComplete="email" />
      </div>
      <div className="field">
        <span className="label">Valor</span>
        <div className="chips">
          {[50, 250, UNIT_EUR].map((v) => (
            <button type="button" key={v} className="chip" aria-pressed={f.amount === v} onClick={() => setF({ ...f, amount: v })}>
              {v === UNIT_EUR ? `${eur(v)} · um aparelho` : eur(v)}
            </button>
          ))}
          <button type="button" className="chip" aria-pressed={f.amount === 0} onClick={() => setF({ ...f, amount: 0 })}>Outro</button>
        </div>
        {f.amount === 0 && (
          <input aria-label="Outro valor em euros" inputMode="decimal" placeholder="Valor em €" value={f.other} onChange={(e) => setF({ ...f, other: e.target.value })} />
        )}
      </div>
      <button className="btn ember" disabled={!valid}>Quero apoiar</button>
      <p className="muted" style={{ fontSize: 14, margin: 0 }}>
        Também podes escrever para <a href={`mailto:${EVENT.email}`}>{EVENT.email}</a>.
      </p>
    </form>
  )
}

function TrainingForm() {
  const [f, setF] = useState({ name: '', phone: '', email: '', village: 'A-do-Pinto' })
  const [done, setDone] = useState(false)
  const valid = f.name.trim() && (f.phone.replace(/\D/g, '').length >= 9 || /.+@.+\..+/.test(f.email))

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    add('leads', { id: uid('F27'), createdAt: new Date().toISOString(), kind: 'formacao', name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), village: f.village })
    setDone(true)
  }

  if (done)
    return (
      <div className="summary" style={{ position: 'static' }}>
        <h3 className="cond">Inscrição registada.</h3>
        <p className="muted">Avisamos quando houver sessão em {f.village}.</p>
      </div>
    )

  return (
    <form onSubmit={submit} className="stack" style={{ ['--s' as string]: '24px' }}>
      <p className="muted" style={{ margin: 0 }}>Sessões nas aldeias para residentes e voluntários. Deixa o contacto e avisamos quando houver uma perto de ti.</p>
      <div className="grid2">
        <Field label="Nome" value={f.name} onChange={(v) => setF({ ...f, name: v })} autoComplete="name" />
        <div className="field">
          <label htmlFor="tr-v">Aldeia</label>
          <select id="tr-v" value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })}>
            {VILLAGES.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <Field label="Telefone" type="tel" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} autoComplete="tel" />
        <Field label="Email (opcional)" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} autoComplete="email" />
      </div>
      <button className="btn" disabled={!valid}>Inscrever na formação</button>
    </form>
  )
}
