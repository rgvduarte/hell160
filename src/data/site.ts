// Estado público do site. É aqui que se muda o que o site diz sobre as inscrições.
//
//   status 'em-breve'  → barra no topo a pedir o email; nada no site diz "Inscrições abertas"
//                        e nenhum botão leva à inscrição.
//   status 'abertas'   → botões passam a "Inscrever", com o preço do escalão em vigor.
//   status 'fechadas'  → sem barra; os cartões dizem "Inscrições fechadas".
//
// `opens` (opcional): data de abertura em ISO (ex.: '2026-11-15'). Quando existe, aparece na barra e nos cartões.

import type { To } from 'react-router-dom'
import { EVENT } from './event'

export type RegistrationStatus = 'em-breve' | 'abertas' | 'fechadas'

export const SITE: { registration: { status: RegistrationStatus; opens?: string } } = {
  registration: {
    status: 'em-breve',
    opens: undefined,
  },
}

// Lista de novidades (formulário "Novidades" no início).
// Endereço de um serviço de listas ou formulários que aceite um POST a partir de um site estático
// e responda com 2xx (ex.: Formspree, Getform, Basin; numa conta da organização). A escolha é da organização.
// Enquanto estiver vazio, o formulário abre o email da pessoa com a mensagem pronta para enviar
// para EVENT.email: o site nunca diz que guardou um contacto que não chegou à organização.
export const NEWSLETTER_ENDPOINT = ''

// Traçados oficiais publicados, por ficheiro de public/routes/ (ver ROUTE_FILES em src/data/routes.ts;
// as estafetas usam o hell100). Converter primeiro o GPX: node scripts/gpx-to-geojson.mjs <ficheiro.gpx> <id>.
// true: a página da prova mostra o mapa real (2D/3D), o perfil, os pontos do GPX e o GPX para descarregar;
// com hell160 a true, o início e o Território também mostram o mapa real.
// false: mapa esquemático (HELL160) ou aviso de publicação. Nunca um traçado inventado.
export const ROUTE_PUBLISHED: Record<string, boolean> = { hell160: false, hell100: false, bike: false }

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

// Ação principal do início (abertura e fim das 36 horas), conforme o estado das inscrições.
export function primaryAction(priceEur?: number): { label: string; to: To } {
  const { status } = SITE.registration
  if (status === 'abertas') return { label: priceEur ? `Inscrever-me · desde ${priceEur} €` : 'Inscrever-me', to: '/inscricao' }
  if (status === 'fechadas') return { label: 'Receber novidades', to: NEWSLETTER }
  return { label: 'Avisem-me', to: NEWSLETTER }
}

// Botões do cabeçalho, do menu e do rodapé. Só com inscrições abertas levam à inscrição.
//   short: cabeçalho; long: menu e rodapé; primary: botão a brasa (senão, contorno no cabeçalho).
export function navAction(): { short: string; long: string; to: To; primary: boolean } {
  const { status } = SITE.registration
  if (status === 'abertas') return { short: 'Inscrever', long: 'Inscrever numa prova', to: '/inscricao', primary: true }
  if (status === 'fechadas') return { short: 'Novidades', long: 'Receber novidades', to: NEWSLETTER, primary: false }
  return { short: 'Avisem-me', long: 'Receber novidades', to: NEWSLETTER, primary: false }
}

// ---------- envio de formulários sem servidor ----------

// Abre o programa de email da pessoa com a mensagem pronta para a organização.
export function mailtoHref(subject: string, body: string, to: string = EVENT.email) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function openMail(href: string) {
  try {
    window.location.href = href
  } catch {
    /* o estado seguinte mostra a ligação para abrir à mão */
  }
}

// POST para um serviço de formulários. Devolve true só se o serviço confirmar (2xx).
export async function postForm(endpoint: string, data: Record<string, string>): Promise<boolean> {
  const body = new FormData()
  for (const [k, v] of Object.entries(data)) body.append(k, v)
  try {
    const res = await fetch(endpoint, { method: 'POST', body, headers: { Accept: 'application/json' } })
    return res.ok
  } catch {
    return false
  }
}
