import { useState, type FormEvent } from 'react'
import { FEATURES, PLATFORM_FEE, VILLAGES, type FeatureKey } from '../data/listings'
import { IMPACT } from '../data/event'
import { add, uid, useCollection, type HostApplication } from '../lib/store'
import { Field } from './Register'

export function Host() {
  const apps = useCollection('hosts')
  const [f, setF] = useState({
    name: '', phone: '', village: 'A-do-Pinto', address: '', sleeps: 4, bedrooms: 2, eurNight: 60, features: ['ac'] as string[], state: 'pronta',
  })
  const [sent, setSent] = useState<HostApplication | null>(null)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  const valid = f.name && f.phone && f.address
  const perWeekend = f.eurNight * 3 * (1 - PLATFORM_FEE)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    const app: HostApplication = { ...f, id: uid('A27'), createdAt: new Date().toISOString() }
    add('hosts', app)
    setSent(app)
  }

  return (
    <>
      <section className="sec tight">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <div>
            <p className="eyebrow">Anfitriões</p>
            <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 120px)' }}>Abre a casa</h1>
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
            <li><div><h3 className="cond">Recebes pedidos</h3><p className="muted">Aceitas ou recusas. Ninguém paga até aceitares.</p></div></li>
            <li><div><h3 className="cond">Recebes o dinheiro</h3><p className="muted">{Math.round((1 - PLATFORM_FEE) * 100)} % do valor, transferido na semana seguinte à prova. Ajudamos com o registo de alojamento local.</p></div></li>
          </ol>

          {sent ? (
            <div className="summary">
              <p className="mono ember" style={{ margin: 0 }}>Recebido</p>
              <h3 className="cond mt-s">Obrigado, {sent.name.split(' ')[0]}.</h3>
              <p className="muted">Ligamos para {sent.phone} para marcar a visita. Referência <span className="mono">{sent.id}</span>.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="summary stack" style={{ ['--s' as string]: '28px', position: 'static' }}>
              <div className="grid2">
                <Field label="Nome" value={f.name} onChange={(v) => set('name', v)} autoComplete="name" />
                <Field label="Telefone" type="tel" value={f.phone} onChange={(v) => set('phone', v)} autoComplete="tel" />
              </div>
              <div className="grid2">
                <div className="field">
                  <label htmlFor="hv">Aldeia</label>
                  <select id="hv" value={f.village} onChange={(e) => set('village', e.target.value)}>
                    {VILLAGES.map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <Field label="Morada" value={f.address} onChange={(v) => set('address', v)} autoComplete="street-address" />
              </div>
              <div className="grid3">
                <div className="field">
                  <label htmlFor="hs">Pessoas</label>
                  <input id="hs" type="number" min={1} max={12} value={f.sleeps} onChange={(e) => set('sleeps', +e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="hb">Quartos</label>
                  <input id="hb" type="number" min={1} max={8} value={f.bedrooms} onChange={(e) => set('bedrooms', +e.target.value)} />
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
                  <option value="fechada">Fechada há anos — quero ajuda para reabrir</option>
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
                <b>{Math.round(perWeekend)} €</b>
              </div>
              <button className="btn" disabled={!valid}>Inscrever a casa</button>
            </form>
          )}
        </div>
      </section>

      {apps.length > 0 && (
        <section className="sec tight rule">
          <div className="wrap">
            <p className="eyebrow">Casas inscritas neste dispositivo</p>
            <table className="board">
              <thead><tr><th>Ref.</th><th>Nome</th><th>Aldeia</th><th>Pessoas</th><th>€/noite</th><th>Estado</th></tr></thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id} style={{ cursor: 'default' }}>
                    <td>{a.id}</td><td>{a.name}</td><td>{a.village}</td><td>{a.sleeps}</td><td>{a.eurNight}</td><td>{a.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
