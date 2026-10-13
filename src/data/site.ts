// Estado público do site. É aqui que se muda o que o site diz sobre as inscrições.
//
//   status 'em-breve'  → barra no topo a pedir o email; nada no site diz "Inscrições abertas".
//   status 'abertas'   → botões passam a "Inscrever-me", com o preço do escalão em vigor.
//   status 'fechadas'  → sem barra; os cartões dizem "Inscrições fechadas".
//
// `opens` (opcional): data de abertura em ISO (ex.: '2026-11-15'). Quando existe, aparece na barra e nos cartões.

import type { To } from 'react-router-dom'

export type RegistrationStatus = 'em-breve' | 'abertas' | 'fechadas'

export const SITE: { registration: { status: RegistrationStatus; opens?: string } } = {
  registration: {
    status: 'em-breve',
    opens: undefined,
  },
}

export const NEWSLETTER: To = { pathname: '/', hash: '#novidades' }

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function longDate(iso: string) {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} de ${MONTHS[m - 1]}`
}

export function registrationLabel(): string {
  const { status, opens } = SITE.registration
  if (status === 'abertas') return 'Inscrições abertas'
  if (status === 'fechadas') return 'Inscrições fechadas'
  return opens ? `Inscrições abrem a ${longDate(opens)}` : 'Inscrições em breve'
}

// Barra de aviso no topo. O `id` muda com o conteúdo, para voltar a aparecer a quem a fechou antes.
export function announcement(): { id: string; text: string; to: To } | null {
  const { status, opens } = SITE.registration
  if (status === 'em-breve')
    return {
      id: `inscricoes-2027-${opens ?? 'em-breve'}`,
      text: opens
        ? `Inscrições 2027 abrem a ${longDate(opens)}. Deixa o email e avisamos primeiro.`
        : 'Inscrições 2027 abrem em breve. Deixa o email e avisamos primeiro.',
      to: NEWSLETTER,
    }
  if (status === 'abertas') return { id: 'inscricoes-2027-abertas', text: 'Inscrições 2027 abertas.', to: '/inscricao' }
  return null
}

// Ação principal do início, conforme o estado das inscrições.
export function primaryAction(priceEur?: number): { label: string; to: To } {
  const { status } = SITE.registration
  if (status === 'abertas') return { label: priceEur ? `Inscrever-me · desde ${priceEur} €` : 'Inscrever-me', to: '/inscricao' }
  if (status === 'fechadas') return { label: 'Receber novidades', to: NEWSLETTER }
  return { label: 'Quero ser avisado', to: NEWSLETTER }
}
