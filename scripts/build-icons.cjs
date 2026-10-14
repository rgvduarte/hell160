// Gera os PNG da marca a partir do logótipo oficial (public/brand/hell160-chama.svg):
// ícone iOS 180 px e avatar 512 px (a chama centrada sobre preto) e a imagem de partilha 1200×630.
// Uso: node scripts/build-icons.cjs   (precisa do Playwright com Chromium instalado)
const { readFileSync } = require('node:fs')
const path = require('node:path')
let pw
try { pw = require('playwright') } catch { pw = require('/opt/node22/lib/node_modules/playwright') }

;(async () => {
  const svg = readFileSync(path.join(__dirname, '../public/brand/hell160-chama.svg'), 'utf8')
  const browser = await pw.chromium.launch()
  for (const [name, size] of [['apple-touch-icon.png', 180], ['brand/hell160-avatar.png', 512]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } })
    const h = Math.round(size * 0.62)
    await page.setContent(
      `<html><body style="margin:0;width:${size}px;height:${size}px;background:#000;display:grid;place-items:center">` +
        svg.replace('<svg ', `<svg height="${h}" `) +
        '</body></html>',
    )
    await page.screenshot({ path: path.join(__dirname, '../public', name) })
    await page.close()
  }
  // imagem de partilha (WhatsApp, Facebook, LinkedIn): logótipo centrado em negativo
  const og = readFileSync(path.join(__dirname, '../public/brand/hell160-centrado-negativo.svg'), 'utf8')
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await page.setContent(
    '<html><body style="margin:0;width:1200px;height:630px;background:#000;display:grid;place-items:center">' +
      og.replace('<svg ', '<svg height="330" ') +
      '</body></html>',
  )
  await page.screenshot({ path: path.join(__dirname, '../public/brand/hell160-partilha.png') })
  await page.close()
  await browser.close()
  console.log('icons written')
})()
