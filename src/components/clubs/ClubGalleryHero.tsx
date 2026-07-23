import { useState } from 'react'
import { MapPin } from 'lucide-react'

interface Props {
  images: string[]
  name: string
  city: string
  addressLine1: string
  thumbUrl?: string | null
}

export function ClubGalleryHero({ images, name, city, addressLine1, thumbUrl }: Props) {
  const [active, setActive] = useState(0)
  const hasImages = images.length > 0

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.clientWidth > 0) setActive(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <section className="relative h-[320px] md:h-[460px] bg-rally-surface-2">
      {hasImages ? (
        <div
          onScroll={onScroll}
          style={{ scrollbarWidth: 'none' }}
          className="flex h-full w-full overflow-x-auto snap-x snap-mandatory"
        >
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${name} ${i + 1}`}
              className="h-full w-full flex-none snap-center object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-rally-surface-2 to-rally-surface" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      {hasImages && images.length > 1 && (
        <div className="absolute bottom-24 md:bottom-28 inset-x-0 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? 'w-5 bg-rally-accent' : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      <div className="absolute bottom-5 md:bottom-8 start-4 end-4 md:start-10 md:end-10 flex items-center gap-4 text-white">
        <div className="h-16 w-16 md:h-20 md:w-20 rounded-full border-2 border-rally-accent bg-rally-surface overflow-hidden shrink-0">
          {thumbUrl && <img src={thumbUrl} alt={name} className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-3xl md:text-5xl font-black leading-tight truncate">
            {name}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-white/85 text-sm md:text-base">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {city}
              {addressLine1 ? ` · ${addressLine1}` : ''}
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
