import { useEffect, useRef, type ReactNode } from 'react'
import { EVENT } from '../data/event'

// Estado final dos formulários que seguem por email (enquanto não há servidor).
// Diz só o que aconteceu: abriu-se o email com a mensagem pronta. Nada foi enviado nem recebido ainda.
// Recebe o foco quando aparece, para quem usa teclado ou leitor de ecrã não perder o sítio.

export function MailDone({ href, subject, title = 'Falta um passo', children, className = '' }: { href: string; subject: string; title?: string; children?: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])
  return (
    <div className={`mail-done ${className}`} ref={ref} tabIndex={-1} role="status">
      <p className="mail-done-t">{title}</p>
      <p>Abrimos o teu programa de email com a mensagem pronta. Envia-a para chegar à organização.</p>
      {children}
      <p>
        Se não abriu, escreve para <a href={`mailto:${EVENT.email}`}>{EVENT.email}</a> com o assunto «{subject}».
      </p>
      <a className="btn ghost" href={href}>
        Abrir o email outra vez
      </a>
    </div>
  )
}
