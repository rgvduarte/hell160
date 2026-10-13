import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RACES, currentPrice, raceById } from '../data/event'
import { LISTINGS, listingById } from '../data/listings'
import { add, uid, type Registration } from '../lib/store'

const STEPS = ['Prova', 'Atleta', 'Segurança', 'Alojamento', 'Confirmar']
const RENTAL_EUR = 15

type Draft = Omit<Registration, 'id' | 'createdAt' | 'priceEur'>

export function Register() {
  const [params] = useSearchParams()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState<Registration | null>(null)
  const [d, setD] = useState<Draft>({
    race: raceById(params.get('prova') ?? '')?.id ?? 'hell160',
    first: '', last: '', email: '', phone: '', birth: '', nationality: 'Portugal',
    emergencyName: '', emergencyPhone: '', device: 'phone+watch', shirt: 'M', stayId: undefined,
  })
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const race = raceById(d.race)!
  const price = currentPrice(race)
  const extra = d.device === 'rental' ? RENTAL_EUR : 0
  const total = (price?.eur ?? 0) + extra
  const stay = d.stayId ? listingById(d.stayId) : undefined

  const valid = [
    !!price,
    d.first && d.last && /.+@.+\..+/.test(d.email) && d.phone && d.birth && isAdult(d.birth),
    d.emergencyName && d.emergencyPhone,
    true,
    true,
  ]

  function next(e: FormEvent) {
    e.preventDefault()
    if (!valid[step]) return
    if (step < STEPS.length - 1) return setStep(step + 1)
    const reg: Registration = { ...d, id: uid('H27'), createdAt: new Date().toISOString(), priceEur: total }
    add('registrations', reg)
    setDone(reg)
  }

  if (done) return <Done reg={done} />

  return (
    <section className="sec tight">
      <div className="wrap">
        <p className="eyebrow">Inscrição · edição 2027</p>
        <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 120px)', marginBottom: 48 }}>Inscrição</h1>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i <= step ? 'on' : ''}><span>{s}</span></li>
          ))}
        </ol>
        <div className="split" style={{ gridTemplateColumns: '7fr 4fr' }}>
          <form onSubmit={next} className="stack" style={{ ['--s' as string]: '32px' }}>
            {step === 0 && (
              <div className="choice" role="radiogroup">
                {RACES.map((r) => {
                  const p = currentPrice(r)
                  return (
                    <label key={r.id}>
                      <input type="radio" name="race" checked={d.race === r.id} disabled={!p} onChange={() => set('race', r.id)} />
                      <span>
                        <strong style={{ fontSize: 19 }}>{r.name}</strong>
                        <span className="muted" style={{ display: 'block', fontSize: 14 }}>
                          {r.distanceKm} km · {r.gainM} m D+ · {r.limitH} h · {r.start}
                        </span>
                      </span>
                      <span className="mono">{p ? `${p.eur} €` : 'Fechado'}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {step === 1 && (
              <div className="grid2">
                <Field label="Nome" value={d.first} onChange={(v) => set('first', v)} autoComplete="given-name" />
                <Field label="Apelido" value={d.last} onChange={(v) => set('last', v)} autoComplete="family-name" />
                <Field label="Email" type="email" value={d.email} onChange={(v) => set('email', v)} autoComplete="email" />
                <Field label="Telemóvel" type="tel" value={d.phone} onChange={(v) => set('phone', v)} autoComplete="tel" hint="O número que vais levar na prova." />
                <Field label="Data de nascimento" type="date" value={d.birth} onChange={(v) => set('birth', v)}
                  hint={d.birth && !isAdult(d.birth) ? 'Idade mínima: 18 anos no dia da prova.' : 'Idade mínima: 18 anos.'} />
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
                <div className="field">
                  <span className="label">Atestado médico</span>
                  <input type="file" accept=".pdf,image/*" aria-label="Atestado médico" />
                  <span className="hint">Obrigatório. Podes enviar mais tarde, até 15 de junho.</span>
                </div>
              </div>
            )}

            {step === 2 && (
              <>
                <div className="grid2">
                  <Field label="Contacto de emergência" value={d.emergencyName} onChange={(v) => set('emergencyName', v)} />
                  <Field label="Telefone de emergência" type="tel" value={d.emergencyPhone} onChange={(v) => set('emergencyPhone', v)} />
                </div>
                <div>
                  <p className="field"><span className="label">Dispositivo de tracking</span></p>
                  <div className="choice mt-s">
                    {([
                      ['phone', 'Só telemóvel', 'App HELL160 em iOS ou Android. Mínimo obrigatório.', '0 €'],
                      ['phone+watch', 'Telemóvel + relógio', 'Recomendado. Duas fontes de posição: se uma falha, a outra continua.', '0 €'],
                      ['rental', 'Alugar localizador', 'Localizador satélite da organização, levantado com o dorsal.', `${RENTAL_EUR} €`],
                    ] as const).map(([v, t, s, eur]) => (
                      <label key={v}>
                        <input type="radio" name="device" checked={d.device === v} onChange={() => set('device', v)} />
                        <span><strong>{t}</strong><span className="muted" style={{ display: 'block', fontSize: 14 }}>{s}</span></span>
                        <span className="mono">{eur}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="notice">
                  Em autonomia total, levar um dispositivo contactável é obrigatório. A tua posição é visível para a organização e equipas
                  de resgate durante toda a prova; no live público aparece apenas o último ponto de controlo.
                </p>
              </>
            )}

            {step === 3 && (
              <>
                <p className="lede">Precisas de cama? Estas casas ficam perto da partida. Reserva fica como pedido ao anfitrião.</p>
                <div className="choice">
                  <label>
                    <input type="radio" name="stay" checked={!d.stayId} onChange={() => set('stayId', undefined)} />
                    <span><strong>Já tenho onde ficar</strong></span>
                    <span />
                  </label>
                  {LISTINGS.filter((l) => l.kmToStart < 13).slice(0, 6).map((l) => (
                    <label key={l.id}>
                      <input type="radio" name="stay" checked={d.stayId === l.id} onChange={() => set('stayId', l.id)} />
                      <span>
                        <strong>{l.title}</strong>
                        <span className="muted" style={{ display: 'block', fontSize: 14 }}>
                          {l.village} · {l.sleeps} pessoas · {l.kmToStart} km da partida
                        </span>
                      </span>
                      <span className="mono">{l.eurNight} €/noite</span>
                    </label>
                  ))}
                </div>
                <Link to="/alojamento" className="mono">Ver todas as casas →</Link>
              </>
            )}

            {step === 4 && (
              <div className="stack">
                <dl className="kv" style={{ maxWidth: 520 }}>
                  <dt>Prova</dt><dd>{race.name}</dd>
                  <dt>Atleta</dt><dd>{d.first} {d.last}</dd>
                  <dt>Email</dt><dd>{d.email}</dd>
                  <dt>Emergência</dt><dd>{d.emergencyName} · {d.emergencyPhone}</dd>
                  <dt>Tracking</dt><dd>{deviceLabel(d.device)}</dd>
                  <dt>Alojamento</dt><dd>{stay ? `${stay.title}, ${stay.village}` : '—'}</dd>
                </dl>
                <label className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <input type="checkbox" required style={{ accentColor: 'var(--ember)', width: 18, height: 18, marginTop: 3 }} />
                  <span>Li o regulamento, aceito o termo de responsabilidade e confirmo que levo todo o material obrigatório.</span>
                </label>
                <p className="muted" style={{ fontSize: 14 }}>Pagamento por MB WAY, Multibanco ou cartão (por integrar no protótipo).</p>
              </div>
            )}

            <div className="row">
              {step > 0 && <button type="button" className="btn ghost noarrow" onClick={() => setStep(step - 1)}>← Voltar</button>}
              <button className="btn" disabled={!valid[step]}>{step === STEPS.length - 1 ? `Confirmar · ${total} €` : 'Continuar'}</button>
            </div>
          </form>

          <aside className="summary">
            <p className="mono muted" style={{ margin: 0 }}>Resumo</p>
            <h3 className="cond mt-s">{race.name}</h3>
            <p className="muted" style={{ fontSize: 14 }}>{race.start}</p>
            <dl className="kv mt">
              <dt>Inscrição</dt><dd>{price ? `${price.eur} €` : '—'}</dd>
              {extra > 0 && (<><dt>Localizador</dt><dd>{extra} €</dd></>)}
              <dt>Escalão de preço</dt><dd>{price?.label ?? 'fechado'}</dd>
            </dl>
            {stay && (
              <p className="muted" style={{ fontSize: 14, marginTop: 16 }}>
                Alojamento pago diretamente na reserva: {stay.eurNight} €/noite, {stay.title}.
              </p>
            )}
            <div className="total"><span className="mono">Total</span><b>{total} €</b></div>
          </aside>
        </div>
      </div>
    </section>
  )
}

function Done({ reg }: { reg: Registration }) {
  const race = raceById(reg.race)!
  return (
    <section className="sec">
      <div className="wrap" style={{ maxWidth: 900 }}>
        <p className="eyebrow">Inscrição registada</p>
        <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 120px)' }}>Até julho, {reg.first}.</h1>
        <dl className="kv mt-l" style={{ maxWidth: 520 }}>
          <dt>Referência</dt><dd className="mono">{reg.id}</dd>
          <dt>Prova</dt><dd>{race.name}</dd>
          <dt>Total</dt><dd>{reg.priceEur} €</dd>
        </dl>
        <ol className="numlist mt-l">
          <li><div><strong>Pagamento</strong><p className="muted">Recebes a referência Multibanco / MB WAY por email.</p></div></li>
          <li><div><strong>Atestado médico</strong><p className="muted">Envia até 15 de junho de 2027.</p></div></li>
          <li><div><strong>App HELL160</strong><p className="muted">Instala, entra com o email da inscrição e faz o teste de sinal antes de vir.</p></div></li>
        </ol>
        <div className="row mt">
          {reg.stayId ? (
            <Link className="btn" to={`/alojamento/${reg.stayId}`}>Concluir reserva da casa</Link>
          ) : (
            <Link className="btn" to="/alojamento">Procurar alojamento</Link>
          )}
          <Link className="btn ghost" to="/">Início</Link>
        </div>
      </div>
    </section>
  )
}

export function Field({ label, value, onChange, type = 'text', hint, autoComplete }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; hint?: string; autoComplete?: string
}) {
  const id = label.toLowerCase().replace(/\W+/g, '-')
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

function isAdult(birth: string) {
  return new Date(birth) <= new Date('2009-07-02')
}

function deviceLabel(d: Registration['device']) {
  return d === 'phone' ? 'Telemóvel' : d === 'phone+watch' ? 'Telemóvel + relógio' : 'Localizador alugado'
}
