# HELL160 · 2027

Webapp da edição 2027 do HELL160 — Shadows and Dust (A-do-Pinto, Serpa, margem esquerda do Guadiana).

Publicada em **https://rgvduarte.github.io/hell160/**

## O que tem

- Provas, regulamento, altimetria e abastecimentos
- Inscrição em 5 passos (prova, atleta, segurança/tracking, alojamento, confirmação)
- Alojamento comunitário: marketplace de casas da aldeia (50–80 €/noite) e onboarding de anfitriões
- Live tracking (simulação): telemóvel + relógio, alertas SOS, vista pública vs organização
- Segurança: plano de tracking, rede de desfibrilhadores, lições de 2026
- Território, parceiros/investidores, página de marca com SVG para download

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:5173/hell160/
npm run build      # gera dist/ (inclui 404.html para deep links no Pages)
npm run logo       # regenera public/brand/*.svg e o favicon a partir de src/components/logoPaths.ts
```

O deploy é automático: cada push para `main` (ou para o branch de desenvolvimento) corre `.github/workflows/deploy.yml`,
que publica `dist/` no branch `gh-pages`.

## Traçados oficiais (GPX)

O site mostra o traçado real de uma prova (mapa 2D/3D, perfil, pontos e GPX para descarregar) só quando o GPX foi convertido
e a prova está ativa. Para publicar ou atualizar:

1. Converter o GPX oficial (é lido só como dados):

   ```bash
   node scripts/gpx-to-geojson.mjs caminho/para/hell160-2026.gpx hell160
   node scripts/gpx-to-geojson.mjs caminho/para/hell100-2026.gpx hell100   # serve o HELL100 e as duas estafetas
   node scripts/gpx-to-geojson.mjs caminho/para/bike.gpx bike
   ```

   Escreve em `public/routes/`: `<id>.gpx` (cópia do original, para download), `<id>.geojson` (traçado simplificado, com
   altitude) e `<id>.profile.json` (distância, D+, perfil a cada 100 m e pontos públicos com o km medido sobre o traçado).
2. Ler o resumo no terminal: km, D+, pontos públicos, pontos deixados de fora e avisos. Só vão para o mapa e para a tabela
   os PA (abastecimentos), BV (passam a "Base de vida N"), Água e Ponto de controlo. Notas internas (Estrada, Pedras, WC,
   Duches, Meta volante…) ficam fora do site, mas continuam no GPX descarregável.
3. Ativar em `src/data/site.ts`, por ficheiro: `ROUTE_PUBLISHED = { hell160: true, hell100: true, bike: false }`.
   As provas usam o ficheiro indicado em `ROUTE_FILES` (`src/data/routes.ts`): relay2 e relay4 usam o hell100.
4. `npm run build` e ver `/provas/<prova>`. Com `hell160: true`, o início e o Território também passam a mostrar o mapa real.

Com `false`, ou se os ficheiros não carregarem, cada página mostra o que mostrava antes (mapa esquemático no HELL160, aviso
nas outras provas). Nunca um traçado inventado.

Notas: altitudes ≤ 0 m contam como em falta (falha do GPS no arranque). O D+ do GPS usa altitude suavizada e limiar de 3 m
e pode diferir do número oficial, que fica em `src/data/event.ts`. O relevo 3D (AWS Terrain Tiles, Mapzen) só é pedido quando
alguém carrega em "Ver em 3D" e está exagerado 1,6× (o Alentejo é plano).

## Notas

- Protótipo sem backend: inscrições, reservas e anfitriões ficam guardados no browser (`localStorage`). A camada de dados está
  isolada em `src/lib/store.ts` para ser trocada por uma API.
- Datas, preços e traçado de 2027 são provisórios (base: regulamento 2026). O mapa e a altimetria são esquemáticos até haver o GPX oficial.
