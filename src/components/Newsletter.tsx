import { useId, useState, type FormEvent } from 'react'
import { EVENT } from '../data/event'
import { add, getAll, sameEmail, uid } from '../lib/store'
import { IconArrowUpRight, IconInstagram } from './Icons'

// Novidades: lista de email com consentimento explícito. Guardada em leads (kind 'newsletter').

export function Newsletter() {
  const id = useId()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; consent?: string }>({})
  const [done, setDone] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const value = email.trim()
    const next: typeof errors = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) next.email = 'Escreve um email válido, por exemplo nome@exemplo.pt.'
    if (!consent) next.consent = 'Para te enviarmos emails, precisamos que aceites.'
    setErrors(next)
    if (next.email || next.consent) {
      document.getElementById(next.email ? `${id}-e` : `${id}-c`)?.focus()
      return
    }
    const exists = getAll().leads.some((l) => l.kind === 'newsletter' && sameEmail(l.email, value))
    if (!exists)
      add('leads', { id: uid('N27'), createdAt: new Date().toISOString(), kind: 'newsletter', name: '', email: value, interest: 'Novidades e abertura das inscrições 2027' })
    setDone(value)
  }

  return (
    <section className="sec news band-panel" id="novidades" aria-labelledby={`${id}-t`}>
      <div className="wrap news-grid">
        <div className="news-card">
          <h2 className="news-title" id={`${id}-t`}>
            Recebe as novidades do HELL160
          </h2>
          {done ? (
            <div className="news-done" role="status">
              <p className="news-lede">Ficaste na lista.</p>
              <p>Enviamos um email para {done} quando as inscrições 2027 abrirem e quando houver datas e preços confirmados.</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <p className="news-lede">Avisamos quando as inscrições 2027 abrirem e quando houver datas e preços confirmados.</p>
              <label className="news-label" htmlFor={`${id}-e`}>
                Email
              </label>
              <input
                id={`${id}-e`}
                className="pill-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="nome@exemplo.pt"
                value={email}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? `${id}-ee` : undefined}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && (
                <p className="news-err" id={`${id}-ee`}>
                  {errors.email}
                </p>
              )}
              <label className="check">
                <input
                  id={`${id}-c`}
                  type="checkbox"
                  checked={consent}
                  aria-invalid={!!errors.consent}
                  aria-describedby={errors.consent ? `${id}-ce` : undefined}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>Aceito receber emails do HELL160 e li a política de privacidade.</span>
              </label>
              {errors.consent && (
                <p className="news-err" id={`${id}-ce`}>
                  {errors.consent}
                </p>
              )}
              <button className="btn news-submit">Quero receber</button>
            </form>
          )}
        </div>
        <div className="news-ig">
          <h2 className="news-title">
            <a href={EVENT.instagram} target="_blank" rel="noreferrer">
              @hell.160
            </a>
          </h2>
          <p>Fotografias, percurso e notícias da prova no Instagram.</p>
          <a className="btn ghost" href={EVENT.instagram} target="_blank" rel="noreferrer">
            <IconInstagram size={20} /> Seguir no Instagram <IconArrowUpRight size={18} />
          </a>
        </div>
      </div>
    </section>
  )
}
