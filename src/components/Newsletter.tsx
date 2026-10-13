import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { EVENT } from '../data/event'
import { NEWSLETTER_ENDPOINT, mailtoHref, openMail, postForm } from '../data/site'
import { add, getAll, sameEmail, uid } from '../lib/store'
import { IconArrowUpRight, IconInstagram } from './Icons'
import { MailDone } from './MailDone'

// Novidades: lista de email com consentimento explícito.
// Com NEWSLETTER_ENDPOINT (src/data/site.ts): envia para o serviço e só confirma se o serviço responder 2xx.
// Sem endereço: abre o email da pessoa com o pedido pronto para a organização. Fica sempre uma cópia local (leads).

const SUBJECT = 'Novidades HELL160 2027'
const CONSENT = 'Aceito receber emails do HELL160 sobre a prova.'

type State = { kind: 'form' } | { kind: 'sending' } | { kind: 'mail'; href: string } | { kind: 'saved'; email: string } | { kind: 'failed' }

export function Newsletter() {
  const id = useId()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; consent?: string }>({})
  const [state, setState] = useState<State>({ kind: 'form' })
  const savedRef = useRef<HTMLDivElement>(null)
  const viaMail = !NEWSLETTER_ENDPOINT

  useEffect(() => {
    if (state.kind === 'saved') savedRef.current?.focus({ preventScroll: true })
  }, [state.kind])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (state.kind === 'sending') return
    const value = email.trim()
    const next: typeof errors = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) next.email = 'Escreve um email válido, por exemplo nome@exemplo.pt.'
    if (!consent) next.consent = 'Para te enviarmos emails, marca esta caixa.'
    setErrors(next)
    if (next.email || next.consent) {
      document.getElementById(next.email ? `${id}-e` : `${id}-c`)?.focus()
      return
    }
    // cópia local (área da organização neste browser)
    const exists = getAll().leads.some((l) => l.kind === 'newsletter' && sameEmail(l.email, value))
    if (!exists)
      add('leads', { id: uid('N27'), createdAt: new Date().toISOString(), kind: 'newsletter', name: '', email: value, interest: 'Novidades e abertura das inscrições 2027' })

    if (viaMail) {
      const href = mailtoHref(SUBJECT, `Quero receber as novidades do HELL160 2027 neste endereço: ${value}\n\n${CONSENT}`)
      openMail(href)
      setState({ kind: 'mail', href })
      return
    }
    setState({ kind: 'sending' })
    const ok = await postForm(NEWSLETTER_ENDPOINT, { email: value, consentimento: CONSENT, origem: 'site HELL160 · novidades' })
    setState(ok ? { kind: 'saved', email: value } : { kind: 'failed' })
  }

  return (
    <section className="sec news band-panel" id="novidades" aria-labelledby={`${id}-t`}>
      <div className="wrap news-grid">
        <div className="news-card">
          <h2 className="news-title" id={`${id}-t`}>
            Recebe as novidades do HELL160
          </h2>
          {state.kind === 'mail' ? (
            <MailDone href={state.href} subject={SUBJECT} className="news-done" />
          ) : state.kind === 'saved' ? (
            <div className="news-done" role="status" tabIndex={-1} ref={savedRef}>
              <p className="news-lede">O teu email ficou registado.</p>
              <p>Vais receber as novidades em {state.email}. Para deixar de as receber, responde «sair» a qualquer email ou escreve para {EVENT.email}.</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <p className="news-lede">Inscrições 2027, datas e preços confirmados: avisamos por email.</p>
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
                  aria-describedby={errors.consent ? `${id}-ce ${id}-p` : `${id}-p`}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>{CONSENT}</span>
              </label>
              {errors.consent && (
                <p className="news-err" id={`${id}-ce`}>
                  {errors.consent}
                </p>
              )}
              <p className="news-privacy" id={`${id}-p`}>
                Quem trata o teu email é a organização do HELL160 ({EVENT.email}), só para avisar da abertura das inscrições 2027 e de novidades da
                prova. Para deixar de receber, responde «sair» a qualquer email.
              </p>
              {state.kind === 'failed' && (
                <p className="news-err" role="alert">
                  Não foi possível registar o email. Tenta outra vez ou escreve para <a href={`mailto:${EVENT.email}`}>{EVENT.email}</a>.
                </p>
              )}
              <button className="btn news-submit" disabled={state.kind === 'sending'} aria-describedby={viaMail ? `${id}-m` : undefined}>
                {state.kind === 'sending' ? 'A enviar…' : 'Quero receber'}
              </button>
              {viaMail && (
                <p className="news-how" id={`${id}-m`}>
                  Abre o teu email com a mensagem pronta para enviares à organização.
                </p>
              )}
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
