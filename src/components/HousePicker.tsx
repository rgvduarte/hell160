import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EVENT_NIGHTS, type Listing } from '../data/listings'
import { eur, takenNights } from '../lib/domain'
import type { Booking } from '../lib/store'

// Escolha de casa dentro da inscrição, ao estilo Airbnb: noites e pessoas primeiro,
// depois cartões com preço total, disponibilidade e a frase do anfitrião.

export type StayPick = { nights: string[]; guests: number }

const WALL: Record<Listing['tone'], string> = { cal: 'hp-wall-cal', ocre: 'hp-wall-ocre', terra: 'hp-wall-terra', noite: 'hp-wall-noite' }

const distance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString('pt-PT')} km`)

// Parede da casa (sem fotografias ainda): cor de cal/barra e a frase do anfitrião.
export function HouseWall({ l, className = '' }: { l: Listing; className?: string }) {
  return (
    <div className={`hp-wall ${WALL[l.tone]} ${className}`}>
      <span className="hp-km">{distance(l.kmToStart)} da partida</span>
      <span className="hp-quote">«{l.note}»</span>
    </div>
  )
}

// Conteúdo do cartão de casa, partilhado pela inscrição e por Dormir na aldeia.
export function HouseCardContent({
  l,
  nights = 0,
  status,
  bad = false,
  check = false,
}: {
  l: Listing
  nights?: number
  status?: string
  bad?: boolean
  check?: boolean
}) {
  return (
    <>
      <span className={`hp-wall ${WALL[l.tone]}`}>
        <span className="hp-km">{distance(l.kmToStart)} da partida</span>
        <span className="hp-quote">«{l.note}»</span>
        {check && <span className="hp-check" aria-hidden="true" />}
      </span>
      <span className="hp-body">
        <span className="hp-meta">{l.village} · {l.sleeps} pessoas · {l.bedrooms} {l.bedrooms === 1 ? 'quarto' : 'quartos'}</span>
        <strong className="hp-title">{l.title}</strong>
        <span className="hp-host">Anfitrião: {l.host}</span>
        <span className="hp-price">
          <b>{eur(l.eurNight)}</b> noite
          {nights > 0 && <span className="hp-total"> · {eur(l.eurNight * nights)} por {nights} {nights === 1 ? 'noite' : 'noites'}</span>}
        </span>
        {status && <span className={`hp-avail${bad ? ' bad' : ''}`}>{status}</span>}
      </span>
    </>
  )
}

export function stayProblem(l: Listing | undefined, pick: StayPick, bookings: Booking[]): string | null {
  if (!l) return null
  if (pick.nights.length === 0) return 'Escolhe pelo menos uma noite.'
  if (pick.guests > l.sleeps) return `${l.title} recebe até ${l.sleeps} pessoas.`
  const taken = takenNights(l.id, bookings)
  const clash = EVENT_NIGHTS.filter((n) => pick.nights.includes(n.iso) && taken.has(n.iso)).map((n) => n.label.toLowerCase())
  if (clash.length) return `${l.title} já está reservada na noite de ${clash.join(' e ')}.`
  return null
}

export function HousePicker({
  listings,
  bookings,
  selectedId,
  pick,
  onSelect,
  onPick,
}: {
  listings: Listing[]
  bookings: Booking[]
  selectedId?: string
  pick: StayPick
  onSelect: (id: string | undefined) => void
  onPick: (p: StayPick) => void
}) {
  const [village, setVillage] = useState('')
  const [sort, setSort] = useState<'perto' | 'preco'>('perto')
  const [onlyFree, setOnlyFree] = useState(true)

  const villages = useMemo(() => [...new Set(listings.map((l) => l.village))].sort((a, b) => a.localeCompare(b, 'pt')), [listings])

  const cards = listings
    .filter((l) => !village || l.village === village)
    .map((l) => ({ l, problem: stayProblem(l, pick, bookings) }))
    .filter((c) => !onlyFree || !c.problem || c.l.id === selectedId)
    .sort((a, b) => (sort === 'perto' ? a.l.kmToStart - b.l.kmToStart : a.l.eurNight - b.l.eurNight))

  const toggleNight = (iso: string) =>
    onPick({ ...pick, nights: pick.nights.includes(iso) ? pick.nights.filter((n) => n !== iso) : [...pick.nights, iso].sort() })

  const n = pick.nights.length

  return (
    <div className="hp">
      <div className="hp-controls">
        <fieldset className="hp-nights">
          <legend>Noites</legend>
          <div className="chips">
            {EVENT_NIGHTS.map((night) => (
              <button
                type="button"
                key={night.iso}
                className="chip"
                aria-pressed={pick.nights.includes(night.iso)}
                onClick={() => toggleNight(night.iso)}
                title={night.note}
              >
                {night.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="hp-guests" role="group" aria-label="Pessoas">
          <span className="hp-label">Pessoas</span>
          <div className="hp-stepper">
            <button type="button" aria-label="Menos uma pessoa" disabled={pick.guests <= 1} onClick={() => onPick({ ...pick, guests: pick.guests - 1 })}>−</button>
            <output aria-live="polite">{pick.guests}</output>
            <button type="button" aria-label="Mais uma pessoa" disabled={pick.guests >= 8} onClick={() => onPick({ ...pick, guests: pick.guests + 1 })}>+</button>
          </div>
        </div>
      </div>

      <div className="hp-filters">
        <label className="hp-select">
          <span className="sr-only">Aldeia</span>
          <select value={village} onChange={(e) => setVillage(e.target.value)}>
            <option value="">Todas as aldeias</option>
            {villages.map((v) => <option key={v}>{v}</option>)}
          </select>
        </label>
        <div className="chips" role="group" aria-label="Ordenar">
          <button type="button" className="chip" aria-pressed={sort === 'perto'} onClick={() => setSort('perto')}>Mais perto</button>
          <button type="button" className="chip" aria-pressed={sort === 'preco'} onClick={() => setSort('preco')}>Mais barato</button>
          <button type="button" className="chip" aria-pressed={onlyFree} onClick={() => setOnlyFree(!onlyFree)}>Só disponíveis</button>
        </div>
      </div>

      <div className="hp-grid" role="radiogroup" aria-label="Alojamento">
        <button
          type="button"
          role="radio"
          aria-checked={!selectedId}
          className={`hp-card hp-none${!selectedId ? ' on' : ''}`}
          onClick={() => onSelect(undefined)}
        >
          <span className="hp-check" aria-hidden="true" />
          <strong>Já tenho onde ficar</strong>
          <span className="muted">Podes reservar casa mais tarde em Dormir na aldeia.</span>
        </button>

        {cards.map(({ l, problem }) => {
          const on = l.id === selectedId
          return (
            <button
              type="button"
              role="radio"
              aria-checked={on}
              key={l.id}
              className={`hp-card${on ? ' on' : ''}${problem ? ' off' : ''}`}
              disabled={!!problem && !on}
              onClick={() => onSelect(on ? undefined : l.id)}
            >
              <HouseCardContent l={l} nights={n} check status={problem ?? (n ? 'Livre nas noites escolhidas' : 'Escolhe as noites')} bad={!!problem} />
            </button>
          )
        })}
      </div>

      {cards.length === 0 && (
        <p className="notice">Nenhuma casa livre com estas noites e filtros. Tira o filtro "Só disponíveis" ou muda as noites.</p>
      )}
      <p className="hp-more">
        <Link to="/alojamento" target="_blank" rel="noopener">Ver todas as casas com mais detalhe ↗</Link>
      </p>
    </div>
  )
}
