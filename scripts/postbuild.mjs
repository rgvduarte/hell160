// GitHub Pages: 404.html devolve a SPA para qualquer rota (deep links), .nojekyll evita o Jekyll.
import { copyFileSync, writeFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
writeFileSync('dist/.nojekyll', '')
