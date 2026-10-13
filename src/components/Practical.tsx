import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { MANDATORY_GEAR, RACES, raceById } from '../data/event'

// Informação prática: painéis interativos calculados a partir de RACES (nada inventado).

const nf1 = (n: number) => n.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const km = (n: number) => n.toLocaleString('pt-PT')

function hm(hours: number) {
  const total = Math.round(hours * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h} h ${String(m).padStart(2, '0')} min`
}

function pace(kmh: number) {
  const s = Math.round(3600 / kmh)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const MAIN = RACES[0]
const MIN_AVG = MAIN.distanceKm / MAIN.limitH

// Médias de exemplo, paragens incluídas. São exemplos, não estatísticas da prova.
const MODES = {
  caminhar: {
    label: 'Caminhar',
    kmh: 5,
    text: `O limite de ${MAIN.limitH} horas dá uma média mínima de ${nf1(MIN_AVG)} km/h nos ${km(MAIN.distanceKm)} km, contando as paragens. É ritmo de caminhada, desde que as paragens sejam curtas.`,
  },
  correr: {
    label: 'Correr',
    kmh: 7,
    text: `A correr ganhas margem para as bases de vida e para as horas de mais calor. A média mínima para chegar dentro do limite continua a ser ${nf1(MIN_AVG)} km/h.`,
  },
} as const

export function Practical() {
  return (
    <section className="sec practical" aria-labelledby="pratica-t">
      <div className="wrap">
        <header className="sec-head">
          <h2 className="display" id="pratica-t">
            Informação prática
          </h2>
          <div className="sec-head-text">
            <p className="lede">
              Cada um faz a prova ao seu ritmo, dentro do limite. Os números do HELL160 vêm do regulamento de 2026; os do HELL100 ainda são provisórios.
            </p>
          </div>
        </header>
        <div className="practical-grid">
          <RunOrWalk />
          <PaceCalculator />
          <Essentials />
        </div>
      </div>
    </section>
  )
}

function RunOrWalk() {
  const [mode, setMode] = useState<keyof typeof MODES>('caminhar')
  const id = useId()
  const m = MODES[mode]
  const hours = MAIN.distanceKm / m.kmh
  const margin = MAIN.limitH - hours
  return (
    <article className="panel pr-run" aria-labelledby={`${id}-t`}>
      <h3 className="panel-title" id={`${id}-t`}>
        Correr ou caminhar
      </h3>
      <fieldset className="toggle">
        <legend className="sr-only">Ritmo</legend>
        {(Object.keys(MODES) as (keyof typeof MODES)[]).map((k) => (
          <label key={k}>
            <input type="radio" name={`${id}-mode`} value={k} checked={mode === k} onChange={() => setMode(k)} />
            <span>{MODES[k].label}</span>
          </label>
        ))}
      </fieldset>
      <div className="pr-result" aria-live="polite">
        <p className="pr-when">
          A {m.kmh} km/h de média, os {km(MAIN.distanceKm)} km do HELL160 fazem-se em
        </p>
        <p className="pr-big">{hm(hours)}</p>
        <div className="pr-bar" role="img" aria-label={`${hm(hours)} de ${MAIN.limitH} horas de limite, ${hm(margin)} de margem`}>
          <span className="pr-fill" style={{ width: `${(hours / MAIN.limitH) * 100}%` }} />
          <span className="pr-limit" />
        </div>
        <div className="pr-scale" aria-hidden="true">
          <span>0 h</span>
          <span>{hm(margin)} de margem</span>
          <span>{MAIN.limitH} h</span>
        </div>
        <p className="pr-text">{m.text}</p>
      </div>
      <p className="panel-note">Médias de exemplo, com as paragens incluídas.</p>
    </article>
  )
}

const CALC_RACES = ['hell160', 'hell100'] as const

function PaceCalculator() {
  const id = useId()
  const [raceId, setRaceId] = useState<(typeof CALC_RACES)[number]>('hell160')
  const race = raceById(raceId)!
  const minH = Math.ceil(race.distanceKm / 10)
  const [hoursByRace, setHours] = useState<Record<string, number>>({ hell160: 32, hell100: 20 })
  const hours = Math.min(race.limitH, Math.max(minH, hoursByRace[raceId]))
  const speed = race.distanceKm / hours
  const minSpeed = race.distanceKm / race.limitH
  return (
    <article className="panel pr-calc" aria-labelledby={`${id}-t`}>
      <h3 className="panel-title" id={`${id}-t`}>
        Calcula o teu ritmo
      </h3>
      <fieldset className="toggle">
        <legend className="sr-only">Prova</legend>
        {CALC_RACES.map((r) => (
          <label key={r}>
            <input type="radio" name={`${id}-race`} value={r} checked={raceId === r} onChange={() => setRaceId(r)} />
            <span>{raceById(r)!.name}</span>
          </label>
        ))}
      </fieldset>
      <Gauge value={speed} min={minSpeed} max={12} />
      <dl className="pr-read">
        <div>
          <dt>Média</dt>
          <dd>
            <b>{nf1(speed)}</b> km/h
          </dd>
        </div>
        <div>
          <dt>Ritmo</dt>
          <dd>
            <b>{pace(speed)}</b> min/km
          </dd>
        </div>
      </dl>
      <div className="pr-slider">
        <label htmlFor={`${id}-h`}>
          Tempo objetivo <b>{hm(hours)}</b>
        </label>
        <input
          id={`${id}-h`}
          type="range"
          min={minH}
          max={race.limitH}
          step={0.25}
          value={hours}
          aria-valuetext={`${hm(hours)}, média de ${nf1(speed)} km/h`}
          onChange={(e) => setHours({ ...hoursByRace, [raceId]: Number(e.target.value) })}
        />
        <div className="pr-scale" aria-hidden="true">
          <span>{minH} h</span>
          <span>limite {race.limitH} h</span>
        </div>
      </div>
      <p className="panel-note">
        {race.distanceKm.toLocaleString('pt-PT')} km com {race.limitH} h de limite: média mínima de {nf1(minSpeed)} km/h.
        {race.id !== 'hell160' && ' Valores provisórios.'}
      </p>
    </article>
  )
}

// Conta-quilómetros em meia-lua, como no MDS: marca da média mínima a brasa, agulha na média escolhida.
function Gauge({ value, min, max }: { value: number; min: number; max: number }) {
  const cx = 150
  const cy = 150
  const r = 118
  const pt = (v: number, rad = r) => {
    const a = Math.PI - (Math.min(max, Math.max(0, v)) / max) * Math.PI
    return [cx + rad * Math.cos(a), cy - rad * Math.sin(a)] as const
  }
  const arc = (from: number, to: number) => {
    const [x1, y1] = pt(from)
    const [x2, y2] = pt(to)
    return `M${x1.toFixed(1)},${y1.toFixed(1)}A${r},${r} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)}`
  }
  const [mx1, my1] = pt(min, r - 16)
  const [mx2, my2] = pt(min, r + 16)
  const [lx, ly] = pt(min, r + 30)
  const [nx, ny] = pt(value, r - 30)
  return (
    <svg className="gauge" viewBox="0 0 300 172" role="img" aria-label={`Média de ${nf1(value)} km/h; mínimo para o limite ${nf1(min)} km/h`}>
      <path d={arc(0, max)} className="gauge-track" />
      <path d={arc(0, value)} className="gauge-done" />
      <line x1={mx1} y1={my1} x2={mx2} y2={my2} className="gauge-min" />
      <text x={lx} y={ly} className="gauge-min-t" textAnchor="end">
        mín. {nf1(min)}
      </text>
      <line x1={cx} y1={cy} x2={nx} y2={ny} className="gauge-needle" />
      <circle cx={cx} cy={cy} r={7} className="gauge-hub" />
      <text x={cx - r} y={cy + 20} textAnchor="middle" className="gauge-t">
        0
      </text>
      <text x={cx + r} y={cy + 20} textAnchor="middle" className="gauge-t">
        {max} km/h
      </text>
    </svg>
  )
}

function Essentials() {
  const items = [
    {
      t: 'A partir dos 18 anos',
      d: 'Idade mínima para participar. Na inscrição pedimos certificado médico.',
      a: 'Condições de inscrição',
    },
    {
      t: 'Autonomia total entre abastecimentos',
      d: `${MAIN.aid} abastecimentos no HELL160, ${MAIN.lifeBases} deles bases de vida. Entre um e outro levas a água e a comida de que precisas.`,
      a: 'Ver os abastecimentos',
    },
    {
      t: 'Material obrigatório verificado à partida',
      d: `São ${MANDATORY_GEAR.length} itens, entre eles frontal, manta térmica, apito, telemóvel com a app HELL160 e GPS com o track. Há também controlos em prova.`,
      a: 'Ver a lista de material',
    },
  ]
  return (
    <article className="panel pr-list" aria-label="Regras essenciais do HELL160">
      <ul>
        {items.map((i) => (
          <li key={i.t}>
            <h3>{i.t}</h3>
            <p>{i.d}</p>
            <Link to="/provas/hell160">{i.a}</Link>
          </li>
        ))}
      </ul>
    </article>
  )
}
