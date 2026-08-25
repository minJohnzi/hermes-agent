import { useStore } from '@nanostores/react'

import { $backdrop } from '@/store/backdrop'
import { $wallpaperDataUrl, $wallpaperSettings } from '@/store/wallpaper'

const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

export function Backdrop() {
  const on = useStore($backdrop)
  const settings = useStore($wallpaperSettings)
  const dataUrl = useStore($wallpaperDataUrl)

  if (!on) {
    return null
  }

  const isCustom = settings.mode === 'custom' && !!dataUrl
  const src = isCustom ? dataUrl : assetPath('ds-assets/filler-bg0.jpg')

  if (!isCustom) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 z-2 opacity-[0.025] mix-blend-difference">
        <img
          alt=""
          className="h-[160dvh] w-auto min-w-dvw object-cover object-left-top [filter:invert(var(--backdrop-invert-mul,1))]"
          fetchPriority="low"
          src={src}
        />
      </div>
    )
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-2 overflow-hidden"
      style={{ opacity: settings.opacity / 100 }}
    >
      <img
        alt=""
        className="h-full w-full"
        fetchPriority="low"
        src={src}
        style={{
          objectFit: settings.fit,
          objectPosition: settings.position,
          filter: settings.blur > 0 ? `blur(${settings.blur}px)` : undefined,
          transform: settings.blur > 0 ? 'scale(1.05)' : undefined
        }}
      />
      {settings.dim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: settings.dim / 100 }} />}
    </div>
  )
}
