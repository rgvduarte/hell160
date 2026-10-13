// Letragem própria do HELL160: geometria em grelha de 60 de altura, haste de 16.
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

// Identidade "O Dorsal": um dorsal de prova, HELL numa faixa escura sobre o 160 a brasa.
// Três formatos do mesmo desenho:
//   DORSAL       bloco empilhado 64×64, símbolo principal (avatar, medalha, ícone, página da marca)
//   DORSAL_SMALL só o 160 sobre brasa, para favicon e tamanhos ≤ 24 px, onde HELL deixa de se ler
//   LOCKUP       HELL + caixa brasa com 160, horizontal, para cabeçalho e rodapé
export const DORSAL = {
  size: 64,
  field: 'M0,0H64V64H0Z',
  band: 'M0,0H64V24H0Z',
  hell: 'M4,4H8V10H14V4H18V20H14V14H8V20H4Z M20,4H32V8H24V10H30V14H24V16H32V20H20Z M34,4H38V16H46V20H34Z M48,4H52V16H60V20H48Z',
  n160: 'M4,32H16V56H10V38H4Z M24,32H36V38H24V40H32Q38,40 38,46V50Q38,56 32,56H24Q18,56 18,50V38Q18,32 24,32Z M24,46V50H32V46Z M46,32H54Q60,32 60,38V50Q60,56 54,56H46Q40,56 40,50V38Q40,32 46,32Z M46,38V50H54V38Z',
}

// Ótica pequena: só o 160, em blocos de 8 unidades (2 px a 16 px), cantos retos, como um número de dorsal
// impresso. Encaixa nos píxeis de 16, 24 e 32.
export const DORSAL_SMALL = {
  size: 64,
  field: 'M0,0H64V64H0Z',
  n160: 'M3,12H15V52H7V20H3Z M19,12H39V20H27V30H39V52H19Z M27,38H31V44H27Z M42,12H62V52H42Z M50,20H54V44H50Z',
}

// Horizontal: HELL com a letragem do wordmark + caixa brasa (x 221–389) com o 160.
export const LOCKUP = {
  w: 389,
  h: 82,
  hell: 'M0,11H16V33H40V11H56V71H40V49H16V71H0Z M61,11H107V26H77V34H101V48H77V56H107V71H61Z M112,11H128V56H156V71H112Z M161,11H177V56H205V71H161Z',
  box: 'M221,0H389V82H221Z',
  n160: 'M233,11H263V71H247V25H233Z M282,11H318V25H284V33H306Q320,33 320,47V57Q320,71 306,71H282Q268,71 268,57V25Q268,11 282,11Z M284,47V57H304V47Z M339,11H363Q377,11 377,25V57Q377,71 363,71H339Q325,71 325,57V25Q325,11 339,11Z M341,25V57H361V25Z',
}
