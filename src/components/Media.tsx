import { useRef, useState } from 'react'
import { MEDIA, isYouTube, mediaUrl, type MediaSlot } from '../data/media'
import { usePrefersReducedMotion } from '../lib/scroll'
import { IconPlay, IconSound } from './Icons'

// Fotografia de um slot do manifesto (src/data/media.ts).
// Com ficheiro: <picture> + <img> em object-fit cover. Sem ficheiro (ou se falhar): superfície escura, sem imagem falsa.
// `.media.has-src` deixa as secções escurecer a base da fotografia só quando há fotografia.

export function Media({
  slot,
  className = '',
  eager = false,
  sizes = '100vw',
  tone = 'graphite',
}: {
  slot: MediaSlot
  className?: string
  eager?: boolean
  sizes?: string
  tone?: 'graphite' | 'night'
}) {
  const m = MEDIA[slot]
  const [failed, setFailed] = useState(false)
  const ambient = m.video && !isYouTube(m.video) ? mediaUrl(m.video) : null

  if (ambient && !failed) return <AmbientVideo src={ambient} poster={m.src ? mediaUrl(m.src) : undefined} label={m.alt} className={className} onError={() => setFailed(true)} />

  if (!m.src || failed) return <div className={`media media--empty media--${tone} ${className}`} aria-hidden="true" data-slot={slot} />

  return (
    <div className={`media has-src ${className}`} data-slot={slot}>
      <picture>
        {m.mobile && <source media="(max-width: 760px)" srcSet={mediaUrl(m.mobile)} />}
        <img
          src={mediaUrl(m.src)}
          alt={m.alt}
          sizes={sizes}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          decoding="async"
          style={m.position ? { objectPosition: m.position } : undefined}
          onError={() => setFailed(true)}
        />
      </picture>
      {m.credit && <span className="media-credit">Fotografia: {m.credit}</span>}
    </div>
  )
}

// Vídeo ambiente (mp4 local): sem som, em ciclo, parado com movimento reduzido. Botão de som como no MDS.
function AmbientVideo({ src, poster, label, className, onError }: { src: string; poster?: string; label: string; className: string; onError: () => void }) {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  return (
    <div className={`media has-src ${className}`}>
      <video ref={ref} src={src} poster={poster} muted={muted} loop playsInline autoPlay={!reduced} controls={reduced} aria-label={label} onError={onError} />
      <button
        type="button"
        className="round media-sound"
        aria-label={muted ? 'Ligar o som' : 'Desligar o som'}
        aria-pressed={!muted}
        onClick={() => {
          setMuted(!muted)
          if (ref.current?.paused) void ref.current.play().catch(() => undefined)
        }}
      >
        <IconSound muted={muted} />
      </button>
    </div>
  )
}

// Vídeo com "fachada": só carrega o leitor quando se carrega no botão.
export function VideoFacade({ slot, title, className = '' }: { slot: MediaSlot; title: string; className?: string }) {
  const m = MEDIA[slot]
  const [play, setPlay] = useState(false)
  if (!m.video) return null
  const yt = isYouTube(m.video)
  const poster = m.src ? mediaUrl(m.src) : yt ? `https://i.ytimg.com/vi/${m.video}/hqdefault.jpg` : undefined

  if (play)
    return (
      <div className={`vfacade is-playing ${className}`}>
        {yt ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${m.video}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <video src={mediaUrl(m.video)} controls autoPlay playsInline aria-label={title} />
        )}
      </div>
    )

  return (
    <button type="button" className={`vfacade ${className}`} onClick={() => setPlay(true)}>
      {poster ? <img src={poster} alt="" loading="lazy" decoding="async" /> : null}
      <span className="vfacade-play">
        <span className="round"><IconPlay /></span>
        <span>Ver o vídeo</span>
      </span>
      <span className="sr-only">{title}</span>
    </button>
  )
}
