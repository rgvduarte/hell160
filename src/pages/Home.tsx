import { Link } from 'react-router-dom'
import { EVENT, RACES, currentPrice, type Race } from '../data/event'
import { MEDIA, PRESS, RACE_SLOT, TESTIMONIALS, mediaUrl } from '../data/media'
import { ROUTE_PUBLISHED, SITE, primaryAction, registrationLabel } from '../data/site'
import { mapRoute } from '../data/routes'
import { LISTINGS } from '../data/listings'
import { allListings } from '../lib/domain'
import { useCollection } from '../lib/store'
import { useDaysTo } from '../components/Graphics'
import { HeroLettering } from '../components/Logo'
import { Media, VideoFacade } from '../components/Media'
import { Rail } from '../components/Rail'
import { ScrollStory } from '../components/ScrollStory'
import { TrailMap } from '../components/TrailMap'
import { Practical } from '../components/Practical'
import { Newsletter } from '../components/Newsletter'
import { IconArrowRight, IconArrowUpRight, IconClimb, IconClock, IconMoon, IconPin, IconRoute } from '../components/Icons'
import '../styles/home.css'

const MAIN = RACES[0]

export function Home() {
  return (
    <>
      <Hero />
      <Cause />
      <RacesRow />
      <ScrollStory />
      <Practical />
      <Houses />
      <Territory />
      {MEDIA['video-edicao'].video && <EditionVideo />}
      {TESTIMONIALS.length > 0 && <Testimonials />}
      <Closing />
      <Newsletter />
      {PRESS.length > 0 && <Press />}
    </>
  )
}

/* ---------- 1. abertura ---------- */

function Hero() {
  const price = currentPrice(MAIN)
  const cta = primaryAction(price?.eur)
  const days = useDaysTo(EVENT.startISO)
  return (
    <section className="hero" data-hero aria-labelledby="hero-t">
      <Media slot="hero" className="hero-media" tone="night" eager />
      <div className="wrap hero-inner">
        <h1 className="hero-title" id="hero-t">
          <HeroLettering />
          <span className="hero-tagline">Shadows and Dust</span>
        </h1>
        <div className="hero-side">
          <p className="hero-when">
            <span className="hero-when-l">
              <span>Sexta, 2 de julho de 2027</span>
              {EVENT.tbc && <span> (data provisória)</span>}
            </span>
            <span className="hero-when-l">
              <span>22:00</span> · <span>A-do-Pinto, Serpa</span>
            </span>
          </p>
          <div className="hero-actions">
            <Link className="btn ember" to={cta.to}>
              {cta.label}
            </Link>
            <a className="btn ghost" href="#provas">
              Ver as provas
            </a>
          </div>
          {days > 0 && (
            <p className="hero-count">
              Faltam <b>{days}</b> dias para a partida{EVENT.tbc ? ' prevista' : ''}.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

/* ---------- 2. a causa ---------- */

function Cause() {
  return (
    <section className="sec band-panel cause" aria-labelledby="causa-t">
      <div className="wrap cause-grid">
        <figure className="cause-frame">
          <Media slot="causa" className="cause-media" sizes="(min-width: 1024px) 50vw, 100vw" />
          <figcaption className="cause-over">
            <span className="cause-num">2</span>
            <span className="cause-cap">desfibrilhadores já conseguidos para as aldeias.</span>
          </figcaption>
        </figure>
        <div className="cause-text">
          <h2 className="display" id="causa-t">
            Corremos pelas aldeias
          </h2>
          <p className="lede">
            Na margem esquerda do Guadiana, o hospital fica longe. Quando alguém tem uma paragem cardíaca, a ajuda que conta é a de quem está
            perto.
          </p>
          <p>
            O HELL160 é organizado para levar desfibrilhadores a estas aldeias e formar quem lá vive para os usar. Os aparelhos ficam nas aldeias
            depois de os atletas partirem. Queremos alargar a rede às aldeias do percurso.
          </p>
          <div className="pill-row">
            <Link className="btn" to="/causa">
              A causa
            </Link>
            <Link className="btn ghost" to="/apoiar">
              Apoiar
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 3. as provas ---------- */

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Datas de início e fim em hora local da prova (relógio de parede, sem fusos).
function raceWindow(r: Race): { from: Date; to: Date } | null {
  let from: Date | null = null
  if (r.id === MAIN.id) {
    const [d, t] = EVENT.startISO.split('T')
    const [y, mo, da] = d.split('-').map(Number)
    const [h, mi] = t.split(':').map(Number)
    from = new Date(Date.UTC(y, mo - 1, da, h, mi))
  } else {
    const m = r.start.match(/(\d{1,2}) (\p{L}{3})\p{L}* (\d{4}) · (\d{2}):(\d{2})/u)
    if (m && MONTHS.includes(m[2])) from = new Date(Date.UTC(+m[3], MONTHS.indexOf(m[2]), +m[1], +m[4], +m[5]))
  }
  if (!from) return null
  return { from, to: new Date(from.getTime() + r.limitH * 36e5) }
}

const dm = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`

function RaceDates({ race }: { race: Race }) {
  const w = raceWindow(race)
  if (!w) {
    const label = race.start.split('·')[0].trim()
    return (
      <p className="rc-dates">
        <span className="rc-d">
          <b>{label}</b>
          <span className="rc-tba">Data a anunciar</span>
        </span>
      </p>
    )
  }
  return (
    <p className="rc-dates">
      <span className="rc-d">
        <b>{dm(w.from)}</b>
        <i>{w.from.getUTCFullYear()}</i>
      </span>
      <IconArrowRight size={20} className="rc-arrow" />
      <span className="sr-only">a</span>
      <span className="rc-d">
        <b>{dm(w.to)}</b>
        <i>{w.to.getUTCFullYear()}</i>
      </span>
    </p>
  )
}

const statusTone = () => SITE.registration.status

function RaceCard({ race }: { race: Race }) {
  const price = currentPrice(race)
  const provisional = race.id !== MAIN.id
  const main = race.id === MAIN.id
  return (
    <article className={`rc${main ? ' rc--main' : ''}`}>
      <Media slot={RACE_SLOT[race.id]} className="rc-media" sizes="(min-width: 1024px) 380px, 80vw" />
      <div className="rc-body">
        <RaceDates race={race} />
        {main && EVENT.tbc && <p className="rc-note rc-note--date">Data a confirmar</p>}
        <h3 className="rc-name">
          <Link to={`/provas/${race.id}`} className="rc-link">
            {race.name}
          </Link>
        </h3>
        <p className={`rc-status is-${statusTone()}`}>{registrationLabel()}</p>
        <ul className="rc-facts">
          <li>
            <IconRoute size={20} /> {race.distanceKm.toLocaleString('pt-PT')} km
          </li>
          <li>
            <IconClimb size={20} /> {race.gainM.toLocaleString('pt-PT')} m D+
          </li>
          <li>
            <IconClock size={20} /> {race.limitH} h de limite
          </li>
        </ul>
        <p className="rc-price">{price ? <>desde {price.eur} €</> : 'Preço a anunciar'}</p>
        {provisional && <p className="rc-note">Valores provisórios</p>}
      </div>
    </article>
  )
}

function RacesRow() {
  return (
    <section className="sec races-home" id="provas" aria-labelledby="provas-t">
      <div className="wrap">
        <header className="sec-head sec-head--center">
          <h2 className="display" id="provas-t">
            As provas
          </h2>
          <p className="lede">
            HELL160 e HELL100, a solo ou em equipa, no primeiro fim de semana de julho. A HELL100 Bike passa para fevereiro, longe do calor.
          </p>
        </header>
      </div>
      <Rail label="Provas 2027" className="rail--races">
        {RACES.map((r) => (
          <RaceCard key={r.id} race={r} />
        ))}
      </Rail>
      <div className="wrap">
        <Link className="btn ghost wide" to="/provas">
          Comparar as provas
        </Link>
      </div>
    </section>
  )
}

/* ---------- 6. dormir na aldeia ---------- */

// Só casas reais (anfitriões aprovados). Enquanto não houver, os factos do alojamento comunitário, sem casas de exemplo.
function Houses() {
  const hosts = useCollection('hosts')
  const real = allListings(hosts)
    .filter((l) => !LISTINGS.some((x) => x.id === l.id))
    .slice(0, 8)
  return (
    <section className="sec houses" aria-labelledby="casas-t">
      <div className="wrap">
        <div className="stay-panel">
          <div className="stay-text">
            <h2 className="display" id="casas-t">
              Dormir na aldeia
            </h2>
            <p className="lede">Aqui não há hotéis. No fim de semana da prova, famílias das aldeias recebem atletas e quem os acompanha.</p>
          </div>
          <dl className="stay-facts">
            <div>
              <dt>Por noite</dt>
              <dd>50 a 80 €</dd>
            </div>
            <div>
              <dt>Quem recebe</dt>
              <dd>Famílias das aldeias, em casa</dd>
            </div>
            <div>
              <dt>O valor da noite</dt>
              <dd>Fica com a família que recebe</dd>
            </div>
          </dl>
          <div className="pill-row stay-actions">
            <Link className="btn" to="/alojamento">
              Ver as casas
            </Link>
            <Link className="btn ghost" to="/alojamento/anfitriao">
              Tenho uma casa
            </Link>
          </div>
        </div>
      </div>
      {real.length > 0 && (
        <Rail label="Casas nas aldeias" className="rail--houses">
          {real.map((l) => {
            const note = hosts.find((h) => h.id.toLowerCase() === l.id)?.note?.trim()
            return (
              <article key={l.id} className="hc">
                <p className="hc-place">
                  <IconPin size={18} /> {l.village} · {l.kmToStart.toLocaleString('pt-PT')} km da partida
                </p>
                <h3 className="hc-name">
                  <Link to={`/alojamento/${l.id}`} className="hc-link">
                    {l.title}
                  </Link>
                </h3>
                {note && (
                  <blockquote className="hc-note">
                    <p>«{note}»</p>
                    <footer>{l.host}</footer>
                  </blockquote>
                )}
                <dl className="hc-facts">
                  <div>
                    <dt>Dormem</dt>
                    <dd>{l.sleeps} pessoas</dd>
                  </div>
                  <div>
                    <dt>Por noite</dt>
                    <dd>{l.eurNight} €</dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </Rail>
      )}
    </section>
  )
}

/* ---------- 7. território ---------- */

// Com fotografia: fotografia de ponta a ponta e cartão por cima (como os destinos do MDS).
// Com o traçado oficial publicado: o mapa. Sem nenhum dos dois: só a informação, sem um ecrã vazio.
function Territory() {
  const photo = Boolean(MEDIA.territorio.src)
  const route = ROUTE_PUBLISHED.hell160
  const mode = photo ? 'photo' : route ? 'map' : 'plain'
  return (
    <section className={`terr terr--${mode}`} aria-labelledby="terr-t">
      {mode === 'photo' && (
        <div className="terr-media">
          <Media slot="territorio" tone="night" />
        </div>
      )}
      {mode === 'map' && (
        <div className="terr-map">
          <TrailMap routes={[mapRoute('hell160')!]} height="var(--terr-map-h)" label="Mapa do percurso do HELL160 na margem esquerda do Guadiana" />
        </div>
      )}
      <div className="wrap terr-wrap">
        <div className="terr-card">
          <h2 className="terr-title" id="terr-t">
            Margem esquerda do Guadiana
          </h2>
          <div className="terr-body">
            <ul className="terr-facts">
              <li>
                <IconRoute size={20} />{' '}
                <span>
                  GR15 e GR15.2, circular a partir de <span className="nw">A-do-Pinto</span>
                </span>
              </li>
              <li>
                <IconPin size={20} /> <span>Pulo do Lobo, a garganta do Guadiana</span>
              </li>
              <li>
                <IconMoon size={20} /> <span>Partida às 22:00, até duas noites em prova</span>
              </li>
            </ul>
            <p>Estradões de terra, montado de azinho e sobro e aldeias caiadas pelo caminho.</p>
            {!route && <p className="terr-note">O traçado oficial ainda não foi publicado.</p>}
            <Link className="btn light" to="/territorio">
              Ver o território
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 8. vídeo, testemunhos, fecho, imprensa (só com conteúdo real) ---------- */

function EditionVideo() {
  return (
    <section className="sec video-band" aria-labelledby="video-t">
      <div className="wrap">
        <h2 className="display" id="video-t">
          A prova em vídeo
        </h2>
        <VideoFacade slot="video-edicao" title={MEDIA['video-edicao'].alt} className="video-frame" />
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section className="sec band-panel" aria-labelledby="test-t">
      <div className="wrap">
        <h2 className="display" id="test-t">
          Quem lá esteve
        </h2>
      </div>
      <Rail label="Testemunhos" className="rail--tests">
        {TESTIMONIALS.map((t) => (
          <figure key={t.name} className="tc">
            {t.src && <img src={mediaUrl(t.src)} alt={t.alt ?? ''} loading="lazy" decoding="async" />}
            <blockquote>«{t.quote}»</blockquote>
            <figcaption>
              {t.name} · {t.role}
            </figcaption>
          </figure>
        ))}
      </Rail>
    </section>
  )
}

function Closing() {
  return (
    <section className="closing" aria-labelledby="fecho-t">
      <Media slot="fecho" className="closing-media" tone="night" />
      <div className="wrap closing-inner">
        <h2 className="closing-title" id="fecho-t">
          A partida é às 22:00, no pavilhão de <span className="nw">A-do-Pinto</span>.
        </h2>
        <Link className="btn light" to="/provas">
          Ver todas as provas
        </Link>
      </div>
    </section>
  )
}

function Press() {
  return (
    <section className="sec band-panel press" aria-labelledby="press-t">
      <div className="wrap">
        <h2 className="news-title" id="press-t">
          O HELL160 na imprensa
        </h2>
        <ul className="press-list">
          {PRESS.map((p) => (
            <li key={p.href}>
              <a href={p.href} target="_blank" rel="noreferrer">
                <b>{p.outlet}</b> {p.title} <IconArrowUpRight size={18} />
              </a>
              {p.date && <span className="muted">{p.date}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
