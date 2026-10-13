// Fotografias e vídeos do site, por lugar fixo na página ("slot").
//
// Para pôr uma fotografia:
//   1. copiar o ficheiro para public/photos/ (ex.: public/photos/hero.jpg; JPG ou WebP, 2400 px de largura chega)
//   2. escrever o nome em `src` (ex.: src: 'hero.jpg') e rever o `alt` para descrever a fotografia real
// Opcional:
//   mobile    recorte vertical para telemóvel (ex.: 'hero-vertical.jpg')
//   position  ponto de interesse da imagem, como em CSS object-position (ex.: '50% 30%')
//   credit    nome de quem fotografou
//   video     id de um vídeo do YouTube (os 11 caracteres depois de "v=") ou um ficheiro .mp4 em public/photos/
//
// Enquanto `src` estiver vazio, o site mostra uma superfície escura com o texto por cima. Nunca imagens falsas.
// As secções que só fazem sentido com conteúdo real (vídeo da edição, testemunhos, imprensa) ficam escondidas
// até haver conteúdo aqui.

export type MediaItem = {
  src?: string
  mobile?: string
  alt: string
  credit?: string
  position?: string
  video?: string
}

export type MediaSlot =
  | 'hero'
  | 'causa'
  | 'prova-hell160'
  | 'prova-hell100'
  | 'prova-estafetas'
  | 'prova-bike'
  | 'territorio'
  | 'video-edicao'
  | 'fecho'

export const MEDIA: Record<MediaSlot, MediaItem> = {
  hero: { alt: 'Partida noturna do HELL160 em A-do-Pinto' },
  causa: { alt: 'Desfibrilhador instalado numa aldeia da margem esquerda do Guadiana' },
  'prova-hell160': { alt: 'Atleta do HELL160 num estradão do montado' },
  'prova-hell100': { alt: 'Atleta do HELL100 junto ao Guadiana' },
  'prova-estafetas': { alt: 'Troca de estafeta numa base de vida' },
  'prova-bike': { alt: 'Ciclistas da HELL100 Bike num caminho de terra' },
  territorio: { alt: 'Pulo do Lobo, a garganta do Guadiana' },
  'video-edicao': { alt: 'Vídeo da edição do HELL160' },
  fecho: { alt: 'Frontais acesos na noite de partida' },
}

// Testemunhos de atletas, voluntários ou anfitriões (só reais, com autorização).
export type Testimonial = { quote: string; name: string; role: string; src?: string; alt?: string }
export const TESTIMONIALS: Testimonial[] = []

// Artigos sobre a prova.
export type PressItem = { outlet: string; title: string; href: string; date?: string }
export const PRESS: PressItem[] = []

const BASE = import.meta.env.BASE_URL

export function mediaUrl(file: string) {
  return /^(https?:)?\/\//.test(file) || file.startsWith('/') ? file : `${BASE}photos/${file}`
}

export const isYouTube = (v: string) => /^[\w-]{11}$/.test(v)

export function hasMedia(slot: MediaSlot) {
  const m = MEDIA[slot]
  return Boolean(m.src || m.video)
}

export const RACE_SLOT: Record<string, MediaSlot> = {
  hell160: 'prova-hell160',
  hell100: 'prova-hell100',
  relay2: 'prova-estafetas',
  relay4: 'prova-estafetas',
  bike: 'prova-bike',
}
