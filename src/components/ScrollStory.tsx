import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ROUTE_KM, elevationAt } from '../data/route'
import { ElevationProfile } from './Graphics'
import { usePrefersReducedMotion, useStickyProgress } from '../lib/scroll'

// "36 horas num scroll": o relógio da prova anda com o scroll, de sexta às 22:00 a domingo de manhã.
// Narrativa de um atleta a meio da tabela; percurso, altimetria e temperaturas são esquemáticos.

const STORY_H = 34 // sexta 22:00 → domingo 08:00

const BEATS = [
  { at: 0, kicker: 'Partida', text: 'Pavilhão de A-do-Pinto, sexta às dez da noite. Frontal ligado e 36 horas de limite.' },
  { at: 0.12, kicker: 'Primeira noite', text: 'O mundo fica do tamanho do círculo do frontal. O caminho está no relógio, não nas placas.' },
  { at: 0.27, kicker: 'Amanhecer', text: 'Clareia perto da fronteira. Primeira base de vida: comer, trocar de meias, voltar a sair.' },
  { at: 0.44, kicker: 'Calor', text: 'Meio da tarde no montado. Pouca sombra, o chão a devolver o calor, água contada até ao abastecimento seguinte.' },
  { at: 0.66, kicker: 'Segunda noite', text: 'O Pulo do Lobo ficou para trás. Volta o escuro, agora com as pernas de 120 quilómetros.' },
  { at: 0.88, kicker: 'Meta', text: 'A-do-Pinto outra vez, domingo de manhã. Na aldeia ninguém pergunta o tempo, perguntam se chegaste.' },
]

// cor do céu por hora do dia (0–24)
const SKY: [number, string][] = [
  [0, '#0f0d0b'], [5, '#141110'], [6.3, '#4a2a1e'], [7.5, '#b7896a'], [9, '#e5ddcf'],
  [13, '#e9d9bd'], [16, '#e3c79c'], [18.8, '#c98f6a'], [20.2, '#5a2c1d'], [21.3, '#171310'], [24, '#0f0d0b'],
]

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

function skyAt(hour: number) {
  const i = SKY.findIndex(([t]) => t > hour)
  const [t1, c1] = SKY[Math.max(0, i - 1)]
  const [t2, c2] = SKY[i < 0 ? SKY.length - 1 : i]
  const k = t2 === t1 ? 0 : (hour - t1) / (t2 - t1)
  const a = hex(c1)
  const b = hex(c2)
  const rgb = a.map((v, j) => Math.round(v + (b[j] - v) * k))
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255
  return { bg: `rgb(${rgb.join(',')})`, dark: lum < 0.45 }
}

// modelo simples de julho no Baixo Alentejo: mínima ~19 °C às 6 h, máxima ~41 °C às 16 h
function tempAt(hour: number) {
  const x = ((hour - 6 + 24) % 24) / 24
  const rising = x < 10 / 24
  const k = rising ? (1 - Math.cos((x / (10 / 24)) * Math.PI)) / 2 : (1 + Math.cos(((x - 10 / 24) / (14 / 24)) * Math.PI)) / 2
  return Math.round(19 + 22 * k)
}

// atleta a meio da tabela: começa mais depressa, abranda
const kmAt = (p: number) => ROUTE_KM * (1 - Math.pow(1 - p, 1.28))

function clock(p: number) {
  const mins = Math.round(22 * 60 + p * STORY_H * 60)
  const day = ['Sexta', 'Sábado', 'Domingo'][Math.min(2, Math.floor(mins / 1440))]
  const m = mins % 1440
  return { day, hm: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, hour: m / 60 }
}

export function ScrollStory() {
  const ref = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()
  const p = useStickyProgress(ref, !reduced)

  if (reduced) return <StoryStatic />

  const { day, hm, hour } = clock(p)
  const km = kmAt(p)
  const sky = skyAt(hour)
  const beat = BEATS.reduce((acc, b, i) => (p >= b.at ? i : acc), 0)
  const isDay = hour >= 6.2 && hour <= 20.4
  // arco do sol (6h→20.4h) e da lua (20.4h→6.2h)
  const arcK = isDay ? (hour - 6.2) / 14.2 : (((hour - 20.4 + 24) % 24) / 9.8)
  const arcSin = Math.sin(arcK * Math.PI)

  return (
    <section
      ref={ref}
      className={`story ${sky.dark ? 'is-dark' : 'is-light'}`}
      aria-label="A prova em 36 horas"
      style={{ ['--sky' as string]: sky.bg }}
    >
      <div className="story-pin">
        <div className="story-bar" style={{ transform: `scaleX(${p})` }} />
        <div
          className={`story-orb ${isDay ? 'sun' : 'moon'}`}
          style={{ ['--k' as string]: arcK, ['--sin' as string]: arcSin }}
          aria-hidden
        />
        <div className="wrap story-grid">
          <div className="story-read">
            <p className="mono story-kicker">
              {BEATS[beat].kicker}
            </p>
            <div className="story-clock" aria-live="off">
              <span className="mono">{day}</span>
              <b>{hm}</b>
            </div>
            <dl className="story-data mono">
              <div><dt>km</dt><dd>{km.toFixed(1)}</dd></div>
              <div><dt>altitude</dt><dd>{elevationAt(km)} m</dd></div>
              <div><dt>temperatura</dt><dd>{tempAt(hour)} °C</dd></div>
            </dl>
          </div>
          <div className="story-text">
            {BEATS.map((b, i) => (
              <p key={b.kicker} className={`story-beat${i === beat ? ' on' : ''}`} aria-hidden={i !== beat}>
                {b.text}
              </p>
            ))}
            <div className={`story-cta${p > 0.93 ? ' on' : ''}`}>
              <Link className="btn ember" to="/inscricao" tabIndex={p > 0.93 ? 0 : -1}>Inscrever na edição 2027</Link>
            </div>
          </div>
        </div>
        <div className="wrap story-profile">
          <ElevationProfile height={150} progressKm={km} marker />
          <p className="mono story-note">Atleta a meio da tabela · percurso, altimetria e temperaturas esquemáticos</p>
        </div>
      </div>
    </section>
  )
}

function StoryStatic() {
  return (
    <section className="sec night">
      <div className="wrap">
        <p className="eyebrow">A prova em 36 horas</p>
        <ol className="numlist">
          {BEATS.map((b) => (
            <li key={b.kicker}>
              <div>
                <h3 className="cond">{b.kicker}</h3>
                <p className="muted">{b.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-l">
          <ElevationProfile height={180} />
        </div>
      </div>
    </section>
  )
}
