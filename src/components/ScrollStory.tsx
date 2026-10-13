import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ROUTE_KM, elevationAt } from '../data/route'
import { ElevationProfile } from './Graphics'
import { usePrefersReducedMotion, useStickyProgress } from '../lib/scroll'
import { RACES, currentPrice } from '../data/event'
import { primaryAction } from '../data/site'

// "36 horas num scroll": o relógio da prova anda com o scroll, de sexta às 22:00 a domingo de manhã.
// Narrativa de um atleta a meio da tabela; percurso, altimetria e temperaturas são esquemáticos.

const STORY_H = 34 // sexta 22:00 → domingo 08:00
const FINISH_P = 0.95 // o atleta da história chega à meta perto das 06:20 de domingo (32 h 18 min)

// Cada momento começa à hora que o relógio mostra: p = (hora desde sexta 0:00 − 22) / 34.
const at = (dayHour: number) => (dayHour - 22) / STORY_H
const BEATS = [
  { at: 0, kicker: 'Partida', text: 'Pavilhão de A-do-Pinto, sexta às dez da noite. Frontal ligado e 36 horas de limite.' },
  { at: at(25), kicker: 'Primeira noite', text: 'Primeira noite no montado. Navega-se com o track no relógio GPS e a luz do frontal.' },
  { at: at(30), kicker: 'Amanhecer', text: 'Nasce o dia com mais de 50 km feitos. Nas bases de vida há comida, água e o saco que cada atleta lá deixou.' },
  { at: at(35), kicker: 'Calor', text: 'Sábado no montado, com pouca sombra. A água tem de chegar até ao abastecimento seguinte.' },
  { at: at(45), kicker: 'Segunda noite', text: 'Mais de 120 km nas pernas e o escuro outra vez.' },
  { at: FINISH_P, kicker: 'Meta', text: 'A-do-Pinto outra vez, domingo de manhã. A meta fecha às 10:00, 36 horas depois da partida.' },
]

// Cor do céu por hora do dia (0–24). Noite preta e madrugada a brasa escura com texto branco;
// dia claro com texto escuro. A passagem é um salto (duas paragens à mesma hora, com transição curta no CSS):
// o céu nunca fica num cinzento médio onde nem texto branco nem escuro chegam a 4,5:1.
// Às 08:00 de domingo (fim da história) o céu é o branco da secção seguinte.
const SKY: [number, number[]][] = [
  [0, [0, 0, 0]], [5, [17, 17, 17]], [6.2, [42, 18, 10]], [6.9, [74, 28, 16]],
  [6.9, [207, 204, 198]], [8, [255, 255, 255]], [15, [255, 255, 255]], [18.6, [222, 219, 213]], [19.8, [204, 200, 193]],
  [19.8, [74, 28, 16]], [20.6, [42, 18, 10]], [21.3, [17, 17, 17]], [24, [0, 0, 0]],
]

// luminância relativa WCAG
const lin = (v: number) => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function skyAt(hour: number) {
  const i = SKY.findIndex(([t]) => t > hour)
  const [t1, a] = SKY[Math.max(0, i - 1)]
  const [t2, b] = SKY[i < 0 ? SKY.length - 1 : i]
  const k = t2 === t1 ? 0 : (hour - t1) / (t2 - t1)
  const rgb = a.map((v, j) => Math.round(v + (b[j] - v) * k))
  const L = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
  return { bg: `rgb(${rgb.join(',')})`, dark: L < 0.18 }
}

// modelo simples de julho no Baixo Alentejo: mínima ~19 °C às 6 h, máxima ~41 °C às 16 h
function tempAt(hour: number) {
  const x = ((hour - 6 + 24) % 24) / 24
  const rising = x < 10 / 24
  const k = rising ? (1 - Math.cos((x / (10 / 24)) * Math.PI)) / 2 : (1 + Math.cos(((x - 10 / 24) / (14 / 24)) * Math.PI)) / 2
  return Math.round(19 + 22 * k)
}

// atleta a meio da tabela: começa mais depressa, abranda, e chega à meta em FINISH_P
const kmAt = (p: number) => ROUTE_KM * (1 - Math.pow(1 - Math.min(1, p / FINISH_P), 1.28))

function clock(p: number) {
  const mins = Math.round(22 * 60 + p * STORY_H * 60)
  const day = ['Sexta', 'Sábado', 'Domingo'][Math.min(2, Math.floor(mins / 1440))]
  const m = mins % 1440
  return { day, hm: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, hour: m / 60 }
}

// Números tabulares (não saltam com o scroll), mas com a vírgula e os dois pontos proporcionais.
function Tn({ v }: { v: string }) {
  return <>{v.split(/([,:.])/).map((part, i) => (/^[,:.]$/.test(part) ? <span key={i} className="np">{part}</span> : part))}</>
}

export function ScrollStory() {
  const ref = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()
  const p = useStickyProgress(ref, !reduced)
  const cta = primaryAction(currentPrice(RACES[0])?.eur)

  if (reduced) return <StoryStatic />

  const { day, hm, hour } = clock(p)
  const km = kmAt(p)
  const sky = skyAt(hour)
  const beat = BEATS.reduce((acc, b, i) => (p >= b.at ? i : acc), 0)
  const isDay = hour >= 6.2 && hour <= 20.6
  // arco do sol (6.2h→20.6h) e da lua (20.6h→6.2h)
  const arcK = isDay ? (hour - 6.2) / 14.4 : ((hour - 20.6 + 24) % 24) / 9.6
  const arcSin = Math.sin(arcK * Math.PI)
  const end = p >= FINISH_P

  return (
    <section
      ref={ref}
      className={`story ${sky.dark ? 'is-dark' : 'is-light'}`}
      aria-labelledby="story-t"
      style={{ ['--sky' as string]: sky.bg }}
    >
      <h2 className="sr-only" id="story-t">
        A prova em 36 horas
      </h2>
      <div className="story-pin">
        <div className="story-bar" style={{ transform: `scaleX(${p})` }} />
        <div className="story-sky" aria-hidden>
          <div className={`story-orb ${isDay ? 'sun' : 'moon'}`} style={{ ['--k' as string]: arcK, ['--sin' as string]: arcSin }} />
        </div>
        <div className="wrap story-grid">
          <div className="story-read">
            <p className="story-kicker">{BEATS[beat].kicker}</p>
            <div className="story-clock" aria-live="off">
              <span className="story-day">{day}</span>
              <b><Tn v={hm} /></b>
            </div>
            <dl className="story-data">
              <div><dt>km</dt><dd><Tn v={km.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} /></dd></div>
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
            <div className={`story-cta${end ? ' on' : ''}`}>
              <Link className="btn ember" to={cta.to} tabIndex={end ? 0 : -1}>
                {cta.label}
              </Link>
            </div>
          </div>
        </div>
        <div className="wrap story-profile">
          <ElevationProfile height={150} progressKm={km} marker />
          <p className="story-note">Atleta a meio da tabela · percurso, altimetria e temperaturas esquemáticos</p>
        </div>
      </div>
    </section>
  )
}

function StoryStatic() {
  return (
    <section className="sec night">
      <div className="wrap">
        <h2 className="display story-static-t">A prova em 36 horas</h2>
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
          <p className="story-note">Percurso, altimetria e temperaturas esquemáticos</p>
        </div>
      </div>
    </section>
  )
}
