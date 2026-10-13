// Exporta os ficheiros de marca para public/brand a partir de src/components/logoPaths.ts.
// Uso: npm run logo
import { mkdirSync, writeFileSync } from 'node:fs'
import { layout, MARK } from '../src/components/logoPaths.ts'

const INK = '#15120F'
const CHALK = '#EFE9DF'
const EMBER = '#C8361B'
const out = new URL('../public/brand/', import.meta.url)
mkdirSync(out, { recursive: true })

const word = layout('HELL160')
const glyphs = (fg) =>
  word.glyphs
    .map((g, i) => `<path transform="translate(${g.x} 0)" fill="${i >= 4 ? EMBER : fg}" fill-rule="evenodd" d="${g.d}"/>`)
    .join('')
const mark = (fg) =>
  `<path fill="${EMBER}" d="${MARK.left}"/><path fill="${fg}" d="${MARK.right}"/><path fill="${fg}" d="${MARK.river}"/>`
const svg = (w, h, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 4}" height="${h * 4}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>\n`

// lockup: símbolo 64 + espaço 26 + wordmark escalado para 40 de altura, centrado
const s = 40 / 60
const lockW = 64 + 26 + word.width * s
const lock = (fg) => `${mark(fg)}<g transform="translate(90 12) scale(${s})">${glyphs(fg)}</g>`

writeFileSync(new URL('hell160-mark.svg', out), svg(64, 64, mark(INK)))
writeFileSync(new URL('hell160-wordmark.svg', out), svg(word.width, 60, glyphs(INK)))
writeFileSync(new URL('hell160-lockup.svg', out), svg(lockW, 64, lock(INK)))
writeFileSync(
  new URL('hell160-lockup-night.svg', out),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-24 -24 ${lockW + 48} 112" width="${(lockW + 48) * 4}" height="448"><rect x="-24" y="-24" width="${lockW + 48}" height="112" fill="${INK}"/>${lock(CHALK)}</svg>\n`,
)
writeFileSync(
  new URL('../favicon.svg', out),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="${CHALK}"/>${mark(INK)}</svg>\n`,
)
console.log('brand files written to public/brand')
