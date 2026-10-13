import { Lockup, Mark, MarkSmall } from '../components/Logo'

const BASE = import.meta.env.BASE_URL

const COLORS = [
  ['Cal', '#EFE9DF', 'Os números do dorsal, o fundo claro'],
  ['Brasa', '#C8361B', 'O campo do 160. Uma vez por ecrã'],
  ['Sombra', '#15120F', 'A faixa do HELL, o texto, a noite'],
] as const

const FILES = [
  ['hell160-dorsal.svg', 'Dorsal', 'Símbolo principal'],
  ['hell160-dorsal-small.svg', 'Dorsal pequeno', 'Favicon e ≤ 24 px'],
  ['hell160-lockup.svg', 'Horizontal', 'Fundo claro'],
  ['hell160-lockup-night.svg', 'Horizontal noite', 'Fundo escuro'],
  ['hell160-avatar.png', 'Avatar 512 px', 'Instagram, Strava, WhatsApp'],
] as const

export function Brand() {
  return (
    <>
      <section className="sec tight">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 112px)' }}>O Dorsal</h1>
          <p className="lede">
            O símbolo é um dorsal de prova: HELL numa faixa escura, 160 no campo vermelho. A letragem é desenhada em grelha, haste 16
            em altura 60, e é a mesma no dorsal, no cabeçalho e na medalha.
          </p>
        </div>
      </section>

      <section className="rule">
        <div className="wrap brand-grid">
          <figure>
            <Mark size={240} />
            <figcaption className="mono muted">Dorsal · símbolo principal</figcaption>
          </figure>
          <figure>
            <div className="row" style={{ alignItems: 'end', gap: 28 }}>
              <Mark size={64} />
              <Mark size={32} />
              <MarkSmall size={24} />
              <MarkSmall size={16} />
            </div>
            <figcaption className="mono muted">64 · 32 · 24 · 16 px · abaixo de 28 px fica só o 160</figcaption>
          </figure>
        </div>
      </section>

      <section className="rule">
        <div className="wrap" style={{ padding: '72px var(--gutter)' }}>
          <Lockup height={88} />
          <p className="mono muted mt-s">Horizontal · cabeçalho, rodapé, e-mail, patrocínios</p>
        </div>
      </section>

      <section className="night">
        <div className="wrap" style={{ padding: '72px var(--gutter)' }}>
          <Lockup height={88} />
          <p className="mono muted mt-s">Sobre fundo escuro o HELL passa a cal; a caixa do 160 não muda</p>
        </div>
      </section>

      <section className="sec tight">
        <div className="wrap">
          <h2 className="cond" style={{ fontSize: 'clamp(28px, 3vw, 40px)' }}>Regras</h2>
          <ul className="ticklist mt-s" style={{ maxWidth: 760 }}>
            <li>O dorsal não roda, não leva contorno, sombra nem gradiente.</li>
            <li>Área de proteção: a altura da faixa do HELL à volta de todo o símbolo.</li>
            <li>Tamanho mínimo do dorsal completo: 28 px. Abaixo disso usa-se o dorsal pequeno.</li>
            <li>Uma cor só (carimbo, gravação, bordado): tudo a sombra, com os números vazados.</li>
          </ul>

          <div className="brand-colors mt-l">
            {COLORS.map(([n, hex, use]) => (
              <div key={n}>
                <div style={{ background: hex, height: 120 }} />
                <p style={{ margin: '12px 0 0' }}><strong>{n}</strong> <span className="mono muted">{hex}</span></p>
                <p className="muted" style={{ fontSize: 14, margin: '4px 0 0' }}>{use}</p>
              </div>
            ))}
          </div>

          <h2 className="cond mt-l" style={{ fontSize: 'clamp(28px, 3vw, 40px)' }}>Ficheiros</h2>
          <table className="board mt-s">
            <tbody>
              {FILES.map(([file, name, use]) => (
                <tr key={file} style={{ cursor: 'default' }}>
                  <td style={{ fontFamily: 'var(--sans)', fontSize: 15 }}>{name}</td>
                  <td className="muted">{use}</td>
                  <td style={{ textAlign: 'right' }}>
                    <a href={`${BASE}brand/${file}`} download>{file}</a>
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
