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

## Notas

- Protótipo sem backend: inscrições, reservas e anfitriões ficam guardados no browser (`localStorage`). A camada de dados está
  isolada em `src/lib/store.ts` para ser trocada por uma API.
- Datas, preços e traçado de 2027 são provisórios (base: regulamento 2026). O mapa e a altimetria são esquemáticos até haver o GPX oficial.
