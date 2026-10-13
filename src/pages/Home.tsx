import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { EVENT, IMPACT, RACES, currentPrice } from '../data/event'
import { LISTINGS } from '../data/listings'
import { Contours, Countdown } from '../components/Graphics'
import { ScrollStory } from '../components/ScrollStory'
import { WAYPOINTS } from '../data/route'
import { usePrefersReducedMotion, useScrollVars } from '../lib/scroll'
import { HousePlate } from '../components/HousePlate'
import { RaceTable } from './Races'

export function Home() {
  const main = RACES[0]
  const price = currentPrice(main)
  const reduced = usePrefersReducedMotion()
  const heroRef = useRef<HTMLElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  useScrollVars(heroRef, !reduced)
  useScrollVars(stripRef, !reduced)
  const stops = WAYPOINTS.filter((w, i, a) => !w.name.startsWith('Abastecimento') && a.findIndex((x) => x.name === w.name) === i)
  return (
    <>
      <section className="hero" ref={heroRef}>
        <Contours seed={3} />
        <div className="wrap">
          <div className="meta mono">
            <span>Edição {EVENT.edition}</span>
            <span>2 — 4 julho</span>
            <span>{EVENT.place}</span>
            <span className="ember">Inscrições abertas</span>
          </div>
          <div style={{ position: 'relative' }}>
            <div className="sun" aria-hidden />
            <h1 className="display">
              Hell
              <span className="row2">160</span>
              <small>Shadows and Dust</small>
            </h1>
          </div>
          <div className="foot">
            <div>
              <p className="lede" style={{ marginBottom: 28 }}>
                164 km em autonomia total pela margem esquerda do Guadiana. Parte-se às dez da noite. Volta-se quando se volta.
              </p>
              <div className="row">
                <Link className="btn" to="/inscricao">
                  Inscrever{price ? ` · ${price.eur} €` : ''}
                </Link>
                <Link className="btn ghost" to="/alojamento">
                  Dormir na aldeia
                </Link>
              </div>
            </div>
            <div>
              <p className="mono muted" style={{ margin: '0 0 10px' }}>Partida HELL160 · sex 2 jul · 22:00</p>
              <Countdown to={EVENT.startISO} />
            </div>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="stats">
          <div><b>164</b><span>km</span></div>
          <div><b>2648</b><span>m D+</span></div>
          <div><b>36</b><span>horas limite</span></div>
          <div><b>13</b><span>abastecimentos</span></div>
          <div><b>3</b><span>bases de vida</span></div>
          <div><b className="ember">45°</b><span>julho, à tarde</span></div>
        </div>
      </section>

      <section className="sec night cause-home">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <h2 className="display">Corremos pelas aldeias</h2>
          <div className="stack">
            <p className="lede">
              O HELL160 é organizado para levar desfibrilhadores e socorro às aldeias da margem esquerda do Guadiana, longe dos
              hospitais. Dois aparelhos já estão conseguidos. O objetivo é haver um em cada aldeia do percurso.
            </p>
            <div className="row">
              <Link className="btn ember" to="/causa">Conhecer a causa</Link>
              <Link className="btn ghost" to="/apoiar">Apoiar</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap split">
          <h2 className="display">Pó de dia, sombra de noite</h2>
          <div className="prose stack">
            <p className="lede" style={{ maxWidth: '40ch' }}>
              Não há montanhas no HELL160. Há distância, calor e noite, numa planície que mostra sempre quanto falta.
            </p>
            <p>
              Circular pela GR15 e GR15.2 a partir do pavilhão de A-do-Pinto: estradões, montado, a descida ao Pulo do Lobo e as
              aldeias que ficam acordadas para ver passar quem ainda corre. Em autonomia total, com navegação por GPS e material
              obrigatório verificado à partida e em prova.
            </p>
          </div>
        </div>
      </section>

      <ScrollStory />

      <section className="sec tight rule">
        <div className="wrap">
          <div className="row between" style={{ marginBottom: 32, alignItems: 'end' }}>
            <h2 className="display">Provas 2027</h2>
            <Link className="btn ghost" to="/provas">Todas as provas</Link>
          </div>
          <RaceTable />
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="split">
            <h2 className="display">Dorme na aldeia</h2>
            <div className="stack">
              <p className="lede">
                Aqui não há hotéis: há casas de família. No fim de semana da prova, gente das aldeias abre a porta a atletas e famílias.
              </p>
              <p>
                Casas a {IMPACT.nightly} por noite, reservadas aqui. O valor fica com quem recebe.
              </p>
              <div className="row">
                <Link className="btn" to="/alojamento">Ver casas</Link>
                <Link className="btn ghost" to="/alojamento/anfitriao">Tenho uma casa</Link>
              </div>
            </div>
          </div>
          <div className="listings mt-l">
            {LISTINGS.slice(0, 3).map((l) => (
              <Link key={l.id} to={`/alojamento/${l.id}`} className="listing">
                <div className="plate"><HousePlate listing={l} /></div>
                <div className="row between mono">
                  <span>{l.village}</span>
                  <span>{l.eurNight} € / noite</span>
                </div>
                <h3>{l.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="villages" ref={stripRef} aria-label="Aldeias e pontos do percurso">
        <div className="track">
          {stops.map((w) => (
            <span key={w.km} className={w.kind === 'life' ? 'base' : undefined}>
              {w.name}
              <i>km {w.km.toFixed(0)}</i>
            </span>
          ))}
        </div>
      </div>

      <section className="sec dust">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <h2 className="display">Apoiar a prova</h2>
          <div className="stack">
            <p className="lede">
              Empresas e instituições podem patrocinar um desfibrilhador, os abastecimentos ou o alojamento nas aldeias.
            </p>
            <Link className="btn" to="/apoiar">Como apoiar</Link>
          </div>
        </div>
      </section>
    </>
  )
}
