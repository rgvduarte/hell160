// Exporta os ficheiros de marca "O Dorsal" para public/brand e o favicon, a partir de src/components/logoPaths.ts.
// Uso: npm run logo   (os PNG — ícone iOS e avatar — são gerados por scripts/build-icons.cjs com o Playwright)
import { mkdirSync, writeFileSync } from 'node:fs'
import { DORSAL, DORSAL_SMALL, LOCKUP } from '../src/components/logoPaths.ts'

const INK = '#15120F'
const CHALK = '#EFE9DF'
const EMBER = '#C8361B'
const out = new URL('../public/brand/', import.meta.url)
mkdirSync(out, { recursive: true })

const svg = (vb, w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${body}</svg>\n`

const dorsal = `<path fill="${EMBER}" d="${DORSAL.field}"/><path fill="${INK}" d="${DORSAL.band}"/><path fill="${CHALK}" fill-rule="evenodd" d="${DORSAL.hell}"/><path fill="${CHALK}" fill-rule="evenodd" d="${DORSAL.n160}"/>`
const small = `<path fill="${EMBER}" d="${DORSAL_SMALL.field}"/><path fill="${CHALK}" fill-rule="evenodd" d="${DORSAL_SMALL.n160}"/>`
const lockup = (hell) => `<path fill="${hell}" fill-rule="evenodd" d="${LOCKUP.hell}"/><path fill="${EMBER}" d="${LOCKUP.box}"/><path fill="${CHALK}" fill-rule="evenodd" d="${LOCKUP.n160}"/>`

writeFileSync(new URL('hell160-dorsal.svg', out), svg('0 0 64 64', 512, 512, dorsal))
writeFileSync(new URL('hell160-dorsal-small.svg', out), svg('0 0 64 64', 64, 64, small))
writeFileSync(new URL('hell160-lockup.svg', out), svg(`0 0 ${LOCKUP.w} ${LOCKUP.h}`, LOCKUP.w * 2, LOCKUP.h * 2, lockup(INK)))
writeFileSync(
  new URL('hell160-lockup-night.svg', out),
  svg(`-24 -24 ${LOCKUP.w + 48} ${LOCKUP.h + 48}`, (LOCKUP.w + 48) * 2, (LOCKUP.h + 48) * 2,
    `<rect x="-24" y="-24" width="${LOCKUP.w + 48}" height="${LOCKUP.h + 48}" fill="${INK}"/>${lockup(CHALK)}`),
)
// favicon: a ótica pequena é a que se lê a 16 px
writeFileSync(new URL('../favicon.svg', out), svg('0 0 64 64', 64, 64, small))
console.log('brand files written to public/brand')
