import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EVENT, IMPACT } from '../data/event'
import { add, uid, type Lead } from '../lib/store'
import { Field } from './Register'
import '../styles/community.css'

const INTERESTS = [
  'Alojamento / hotelaria',
  'Plataforma / tecnologia',
  'Patrocínio de segurança',
  'Autarquia: replicar o modelo',
  'Outro',
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const EMPTY = { name: '', org: '', email: '', phone: '', interest: INTERESTS[0] }

export function Partners() {
  const [f, setF] = useState(EMPTY)
  const [tried, setTried] = useState(false)
  const [sent, setSent] = useState<Lead | null>(null)
  const doneRef = useRef<HTMLDivElement>(null)
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    if (sent) doneRef.current?.focus()
  }, [sent])

  const errors = {
    name: !f.name.trim() ? 'Indica o teu nome.' : '',
    email: !EMAIL_RE.test(f.email.trim()) ? 'Email inválido.' : '',
  }
  const invalid = Object.values(errors).some(Boolean)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (invalid) {
      setTried(true)
      return
    }
    const lead: Lead = {
      id: uid('L27'),
      createdAt: new Date().toISOString(),
      kind: 'parceiro',
      name: f.name.trim(),
      email: f.email.trim(),
      interest: f.interest,
      ...(f.org.trim() ? { org: f.org.trim() } : {}),
      ...(f.phone.trim() ? { phone: f.phone.trim() } : {}),
    }
    add('leads', lead)
    setSent(lead)
  }

  function reset() {
    setF(EMPTY)
    setTried(false)
    setSent(null)
  }

  const mail = sent
    ? `mailto:${EVENT.email}?subject=${encodeURIComponent(`Parceria HELL160 2027 · ${sent.id}`)}&body=${encodeURIComponent(
        [
          `Referência: ${sent.id}`,
          `Nome: ${sent.name}`,
          sent.org && `Organização: ${sent.org}`,
          `Email: ${sent.email}`,
          sent.phone && `Telefone: ${sent.phone}`,
          `Interesse: ${sent.interest}`,
        ]
          .filter(Boolean)
          .join('\n'),
      )}`
    : ''

  return (
    <>
      <section className="sec tight">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <div>
            <p className="eyebrow">Investidores e parceiros</p>
            <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 120px)' }}>Um caso para replicar</h1>
          </div>
          <p className="lede">
            Uma prova de ultra-resistência num território sem hotéis. Em vez de construir, abrir as casas que estão fechadas, e provar o
            modelo para outras autarquias.
          </p>
        </div>
      </section>

      <section className="wrap">
        <div className="stats">
          <div><b>{IMPACT.economicImpact.replace(' 000 €', 'k')}</b><span>€ de impacto, 1.ª edição</span></div>
          <div><b>3–4k</b><span>pessoas em 2023</span></div>
          <div><b>10 000</b><span>casas na área</span></div>
          <div><b className="ember">5 000</b><span>fechadas</span></div>
          <div><b>50–80</b><span>€ / noite</span></div>
          <div><b>0</b><span>hotéis na aldeia</span></div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap split">
          <div>
            <p className="eyebrow">Onde entrar</p>
            <h2 className="cond cm-h2">Três frentes</h2>
          </div>
          <ol className="numlist">
            <li><div><h3 className="cond">Alojamento</h3><p className="muted">Reabilitação de casas fechadas para alojamento local e, a prazo, unidades hoteleiras de pequena escala.</p></div></li>
            <li><div><h3 className="cond">Plataforma</h3><p className="muted">Inscrição, booking comunitário e tracking num só produto, licenciável a outras provas e autarquias.</p></div></li>
            <li>
              <div>
                <h3 className="cond">Segurança</h3>
                <p className="muted">
                  Rede de desfibrilhadores e formação. O patrocínio fica na comunidade.{' '}
                  <Link to="/seguranca#patrocinar">Ver a rede e os compromissos</Link>
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="sec night">
        <div className="wrap split">
          <div>
            <p className="eyebrow">Dezembro 2026</p>
            <h2 className="display">Apresentação do piloto</h2>
            <p className="lede mt">
              Evento de apresentação com embaixadas, investidores e redes de comércio internacionais, entre elas a Câmara de Comércio
              Luso-Israelita.
            </p>
            <p className="muted mt">
              Ou diretamente: <a href={`mailto:${EVENT.email}?subject=${encodeURIComponent('Parceria HELL160 2027')}`}>{EVENT.email}</a>
            </p>
          </div>
          {sent ? (
            <div ref={doneRef} tabIndex={-1} className="summary cm-static cm-done stack" style={{ ['--s' as string]: '20px' }} role="status">
              <p className="mono ember" style={{ margin: 0 }}>Pedido registado</p>
              <h3 className="cond">Obrigado, {sent.name.split(/\s+/)[0]}.</h3>
              <div>
                <span className="mono muted">Referência</span>
                <p className="cm-ref">{sent.id}</p>
              </div>
              <dl className="kv">
                {sent.org && <><dt>Organização</dt><dd>{sent.org}</dd></>}
                <dt>Email</dt><dd>{sent.email}</dd>
                <dt>Interesse</dt><dd>{sent.interest}</dd>
              </dl>
              <p className="cm-fine">O dossier segue para {sent.email}. O convite para a apresentação chega quando a data estiver fechada.</p>
              <p className="notice cm-fine">
                Este site ainda não tem servidor: o pedido fica guardado neste browser. Para chegar já à organização, envia também por email.
              </p>
              <div className="row">
                <a className="btn small ghost noarrow" href={mail}>Enviar também por email</a>
                <button type="button" className="btn small ghost noarrow" onClick={reset}>Novo pedido</button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="summary cm-static stack" style={{ ['--s' as string]: '28px' }} aria-labelledby="pc-title">
              <p id="pc-title" className="mono muted" style={{ margin: 0 }}>Pedir dossier e convite</p>
              <div className="grid2">
                <Field id="pc-nome" label="Nome" value={f.name} onChange={set('name')} autoComplete="name" error={tried ? errors.name : ''} />
                <Field id="pc-org" label="Organização" value={f.org} onChange={set('org')} autoComplete="organization" />
              </div>
              <div className="grid2">
                <Field id="pc-email" label="Email" type="email" value={f.email} onChange={set('email')} autoComplete="email" error={tried ? errors.email : ''} />
                <Field id="pc-tel" label="Telefone (opcional)" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" />
              </div>
              <div className="field">
                <label htmlFor="pc-interesse">Interesse</label>
                <select id="pc-interesse" value={f.interest} onChange={(e) => set('interest')(e.target.value)}>
                  {INTERESTS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <button className="btn ember">Enviar pedido</button>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
