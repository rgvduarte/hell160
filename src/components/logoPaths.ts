// Letragem própria do HELL160 — geometria em grelha de 60 de altura, haste de 16.
// Usada no componente <Logo> e no script que exporta os SVG de marca (scripts/build-logo.mjs).

export const GLYPHS: Record<string, { w: number; d: string }> = {
  H: { w: 56, d: 'M0,0H16V22H40V0H56V60H40V38H16V60H0Z' },
  E: { w: 46, d: 'M0,0H46V15H16V23H40V37H16V45H46V60H0Z' },
  L: { w: 44, d: 'M0,0H16V45H44V60H0Z' },
  '1': { w: 30, d: 'M0,0H30V60H14V14H0Z' },
  '6': {
    w: 52,
    d: 'M14,0H50V14H16V22H38Q52,22 52,36V46Q52,60 38,60H14Q0,60 0,46V14Q0,0 14,0Z M16,36V46H36V36Z',
  },
  '0': {
    w: 52,
    d: 'M14,0H38Q52,0 52,14V46Q52,60 38,60H14Q0,60 0,46V14Q0,0 14,0Z M16,14V46H36V14Z',
  },
}

export const GAP = 5

export function layout(text: string) {
  let x = 0
  const out: { ch: string; x: number; d: string }[] = []
  for (const ch of text) {
    const g = GLYPHS[ch]
    out.push({ ch, x, d: g.d })
    x += g.w + GAP
  }
  return { glyphs: out, width: x - GAP }
}

// Símbolo: um H cujas hastes são as duas margens e a travessa é o Guadiana.
// A margem esquerda — onde a prova acontece — é a haste a cor.
export const MARK = {
  size: 64,
  left: 'M6,6H22V58H6Z',
  right: 'M42,6H58V58H42Z',
  river: 'M22,25.5 L23,23.95 L24,22.56 L25,21.45 L26,20.74 L27,20.5 L28,20.74 L29,21.45 L30,22.56 L31,23.95 L32,25.5 L33,27.05 L34,28.44 L35,29.55 L36,30.26 L37,30.5 L38,30.26 L39,29.55 L40,28.44 L41,27.05 L42,25.5 L42,38.5 L41,40.05 L40,41.44 L39,42.55 L38,43.26 L37,43.5 L36,43.26 L35,42.55 L34,41.44 L33,40.05 L32,38.5 L31,36.95 L30,35.56 L29,34.45 L28,33.74 L27,33.5 L26,33.74 L25,34.45 L24,35.56 L23,36.95 L22,38.5Z',
}
