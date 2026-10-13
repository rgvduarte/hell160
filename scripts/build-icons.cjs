// Gera os PNG da marca (ícone iOS 180, avatar 512) a partir de public/brand/hell160-dorsal.svg.
// Uso: node scripts/build-icons.cjs   (precisa do Playwright com Chromium instalado)
const { readFileSync } = require('node:fs')
const path = require('node:path')
let pw
try { pw = require('playwright') } catch { pw = require('/opt/node22/lib/node_modules/playwright') }

;(async () => {
  const svg = readFileSync(path.join(__dirname, '../public/brand/hell160-dorsal.svg'), 'utf8')
  const browser = await pw.chromium.launch()
  for (const [name, size] of [['apple-touch-icon.png', 180], ['brand/hell160-avatar.png', 512]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } })
    await page.setContent(`<html><body style="margin:0">${svg.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`)}</body></html>`)
    await page.screenshot({ path: path.join(__dirname, '../public', name), omitBackground: false })
    await page.close()
  }
  await browser.close()
  console.log('icons written')
})()
