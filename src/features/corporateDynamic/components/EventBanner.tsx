import { useEffect, useState } from 'react'

/**
 * The tournament page's banner: the event image standing alone (organisers upload artwork with
 * their own lettering, so no overlay), or — with no image, or one that fails to load — the same
 * short plain band. The customer's logo sits on the banner's start-bottom corner on a light plate,
 * so a dark or transparent logo stays legible on any photo. A logo that fails to load is dropped.
 */
export function EventBanner({
  imageUrl, logoUrl, alt, logoAlt, tinted = false,
}: {
  imageUrl: string
  logoUrl: string
  alt: string
  logoAlt: string
  /** The event has its own accent: tint the no-image band with it (the "hero tint"). */
  tinted?: boolean
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  // A different URL (config refetched after the manager edited it) deserves a fresh try.
  useEffect(() => setImageFailed(false), [imageUrl])
  useEffect(() => setLogoFailed(false), [logoUrl])

  const showImage = Boolean(imageUrl) && !imageFailed
  const showLogo = Boolean(logoUrl) && !logoFailed

  return (
    <section
      data-testid="event-banner"
      aria-hidden={showImage ? undefined : true}
      className={showImage
        ? 'relative h-[220px] sm:h-[300px] md:h-[360px]'
        : `relative h-[88px] md:h-[120px] bg-gradient-to-b ${tinted ? 'from-rally-accent/25' : 'from-rally-surface-2'} to-rally-bg`}
    >
      {showImage && (
        <img src={imageUrl} alt={alt} onError={() => setImageFailed(true)} className="w-full h-full object-cover" />
      )}
      {showLogo && (
        <div className="absolute bottom-3 start-4 md:start-6 rounded-xl bg-white/95 shadow-md p-2">
          <img
            src={logoUrl} alt={logoAlt} onError={() => setLogoFailed(true)}
            data-testid="event-logo"
            className="h-10 md:h-14 w-auto max-w-[40vw] object-contain"
          />
        </div>
      )}
    </section>
  )
}
