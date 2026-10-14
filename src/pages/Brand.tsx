import { Logo } from '../components/Logo'
import { FIRE_STOPS, LOGO_TONES } from '../components/logoArt'

// Marca: o logótipo oficial HELL160 (arte final da associação) e os ficheiros para imprensa e parceiros.

const BASE = import.meta.env.BASE_URL
const FIRE = `linear-gradient(to top, ${FIRE_STOPS.map(([o, c]) => `${c} ${Math.round(o * 100)}%`).join(', ')})`

const VERSIONS = [
  ['horizontal', 'Horizontal', 522, 161],
  ['centrado', 'Centrado', 385, 260],
  ['vertical', 'Vertical', 222, 319],
] as const

const COLORS = [
  ['Fogo', FIRE, 'A chama e o 160, em degradê do vermelho ao laranja', '#E20613 → #F8AB02'],
  ['Pó', LOGO_TONES.light.hell, 'O HELL em fundo claro', LOGO_TONES.light.hell],
  ['Areia', LOGO_TONES.dark.hell, 'O HELL em fundo escuro', LOGO_TONES.dark.hell],
  ['Sombra', LOGO_TONES.light.tag, 'A assinatura em fundo claro (em fundo escuro, branco)', LOGO_TONES.light.tag],
] as const

const FILES = [
  ['hell160-horizontal.svg', 'Horizontal', 'Fundo claro'],
  ['hell160-horizontal-negativo.svg', 'Horizontal negativo', 'Fundo escuro'],
  ['hell160-centrado.svg', 'Centrado', 'Fundo claro'],
  ['hell160-centrado-negativo.svg', 'Centrado negativo', 'Fundo escuro'],
  ['hell160-vertical.svg', 'Vertical', 'Fundo claro'],
  ['hell160-vertical-negativo.svg', 'Vertical negativo', 'Fundo escuro'],
  ['hell160-compacto.svg', 'Compacto, sem assinatura', 'Tamanhos pequenos, fundo claro'],
  ['hell160-compacto-negativo.svg', 'Compacto negativo', 'Tamanhos pequenos, fundo escuro'],
  ['hell160-chama.svg', 'Chama', 'Ícone, favicon, redes sociais'],
  ['hell160-avatar.png', 'Avatar 512 px', 'Instagram, Strava, WhatsApp'],
  ['hell160-partilha.png', 'Imagem de partilha 1200 × 630', 'Ligações partilhadas em redes sociais'],
] as const

export function Brand() {
  return (
    <>
      <section className="sec tight">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 112px)' }}>
            Marca
          </h1>
          <p className="lede">
            O logótipo oficial do HELL160: a chama, o HELL, o 160 em fogo e a assinatura Shadows and Dust. Para imprensa, parceiros e
            patrocinadores.
          </p>
        </div>
      </section>

      <section className="rule">
        <div className="wrap brand-grid">
          {VERSIONS.map(([file, name, w, h]) => (
            <figure key={file}>
              <img src={`${BASE}brand/hell160-${file}.svg`} alt={`Logótipo HELL160, versão ${name.toLowerCase()}`} width={w} height={h} />
              <figcaption className="mono muted">{name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="night">
        <div className="wrap brand-grid">
          {VERSIONS.map(([file, name, w, h]) => (
            <figure key={file}>
              <img src={`${BASE}brand/hell160-${file}-negativo.svg`} alt={`Logótipo HELL160, versão ${name.toLowerCase()} em negativo`} width={w} height={h} />
              <figcaption className="mono muted">{name} · negativo</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="rule">
        <div className="wrap brand-small">
          <div className="row" style={{ alignItems: 'end', gap: 28, flexWrap: 'wrap' }}>
            <Logo height={48} />
            <Logo height={32} />
            <Logo variant="flame" height={48} />
            <Logo variant="flame" height={24} />
            <Logo variant="flame" height={16} />
          </div>
          <p className="mono muted mt-s">
            Em tamanhos pequenos, sem a assinatura: compacto no cabeçalho do site, só a chama no ícone.
          </p>
        </div>
      </section>

      <section className="sec tight">
        <div className="wrap">
          <h2 className="cond" style={{ fontSize: 'clamp(28px, 3vw, 40px)' }}>Cores do logótipo</h2>
          <div className="brand-colors mt-s">
            {COLORS.map(([n, bg, use, code]) => (
              <div key={n}>
                <div style={{ background: bg, height: 120 }} />
                <p style={{ margin: '12px 0 0' }}>
                  <strong>{n}</strong> <span className="mono muted">{code}</span>
                </p>
                <p className="muted" style={{ fontSize: 14, margin: '4px 0 0' }}>
                  {use}
                </p>
              </div>
            ))}
          </div>

          <h2 className="cond mt-l" style={{ fontSize: 'clamp(28px, 3vw, 40px)' }}>Uso</h2>
          <ul className="ticklist mt-s" style={{ maxWidth: 760 }}>
            <li>Em fundo claro, a versão normal. Em fundo escuro ou sobre fotografia, a versão negativo.</li>
            <li>Os ficheiros são vetoriais: aumentam sem perder qualidade. Não redesenhar, esticar nem mudar as cores.</li>
            <li>Abaixo de 120 px de largura, a assinatura deixa de se ler: usar o compacto ou só a chama.</li>
          </ul>

          <h2 className="cond mt-l" style={{ fontSize: 'clamp(28px, 3vw, 40px)' }}>Ficheiros</h2>
          <table className="board mt-s">
            <tbody>
              {FILES.map(([file, name, use]) => (
                <tr key={file} style={{ cursor: 'default' }}>
                  <td style={{ fontFamily: 'var(--sans)', fontSize: 15 }}>{name}</td>
                  <td className="muted">{use}</td>
                  <td style={{ textAlign: 'right' }}>
                    <a href={`${BASE}brand/${file}`} download>
                      {file}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
