import { useState, type FormEvent } from 'react'
import { EVENT, IMPACT } from '../data/event'
import { Field } from './Register'

export function Partners() {
  const [sent, setSent] = useState(false)
  const [f, setF] = useState({ name: '', org: '', email: '', interest: 'Alojamento / hotelaria' })
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))

  function submit(e: FormEvent) {
    e.preventDefault()
    const body = encodeURIComponent(`${f.name} — ${f.org}\n${f.email}\nInteresse: ${f.interest}`)
    window.location.href = `mailto:${EVENT.email}?subject=${encodeURIComponent('Parceria HELL160 2027')}&body=${body}`
    setSent(true)
  }

  return (
    <>
      <section className="sec tight">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <div>
            <p className="eyebrow">Investidores e parceiros</p>
            <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 120px)' }}>Um caso para replicar</h1>
          </div>
          <p className="lede">
            Uma prova de ultra-resistência num território sem hotéis. A solução não é construir — é abrir o que está fechado, e provar o
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
            <h2 className="cond" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>Três frentes</h2>
          </div>
          <ol className="numlist">
            <li><div><h3 className="cond">Alojamento</h3><p className="muted">Reabilitação de casas fechadas para alojamento local e, a prazo, unidades hoteleiras de pequena escala.</p></div></li>
            <li><div><h3 className="cond">Plataforma</h3><p className="muted">Inscrição, booking comunitário e tracking num só produto, licenciável a outras provas e autarquias.</p></div></li>
            <li><div><h3 className="cond">Segurança</h3><p className="muted">Rede de desfibrilhadores e formação — o patrocínio que fica na comunidade.</p></div></li>
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
          </div>
          {sent ? (
            <div className="summary">
              <p className="mono ember" style={{ margin: 0 }}>Obrigado</p>
              <h3 className="cond mt-s">O seu cliente de email abriu com a mensagem pronta.</h3>
              <p className="muted">Se não abriu, escreva para {EVENT.email}.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="summary stack" style={{ ['--s' as string]: '28px', position: 'static' }}>
              <p className="mono muted" style={{ margin: 0 }}>Pedir dossier e convite</p>
              <Field label="Nome" value={f.name} onChange={set('name')} autoComplete="name" />
              <Field label="Organização" value={f.org} onChange={set('org')} autoComplete="organization" />
              <Field label="Email" type="email" value={f.email} onChange={set('email')} autoComplete="email" />
              <div className="field">
                <label htmlFor="pi">Interesse</label>
                <select id="pi" value={f.interest} onChange={(e) => set('interest')(e.target.value)}>
                  {['Alojamento / hotelaria', 'Plataforma / tecnologia', 'Patrocínio de segurança', 'Autarquia — replicar o modelo', 'Outro'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <button className="btn ember" disabled={!f.name || !/.+@.+\..+/.test(f.email)}>Enviar</button>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
