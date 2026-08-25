import { atom } from 'nanostores'

import { readJson, writeJson } from '@/lib/storage'

export interface WallpaperSettings {
  mode: 'builtin' | 'custom'
  customPath: string | null
  opacity: number
  dim: number
  blur: number
  fit: 'cover' | 'contain'
  position: 'top' | 'center' | 'bottom'
}

export const DEFAULT_WALLPAPER_SETTINGS: WallpaperSettings = {
  mode: 'builtin',
  customPath: null,
  opacity: 28,
  dim: 18,
  blur: 0,
  fit: 'cover',
  position: 'center'
}

const KEY = 'hermes.desktop.wallpaper.v1'

function loadSettings(): WallpaperSettings {
  const saved = readJson<Partial<WallpaperSettings>>(KEY)

  return { ...DEFAULT_WALLPAPER_SETTINGS, ...saved }
}

export const $wallpaperSettings = atom<WallpaperSettings>(loadSettings())

$wallpaperSettings.subscribe(settings => writeJson(KEY, settings))

export function setWallpaperMode(mode: 'builtin' | 'custom') {
  $wallpaperSettings.set({ ...$wallpaperSettings.get(), mode })
}

export function setWallpaperCustomPath(path: string | null) {
  $wallpaperSettings.set({ ...$wallpaperSettings.get(), customPath: path, mode: path ? 'custom' : 'builtin' })
}

export function setWallpaperOpacity(opacity: number) {
  $wallpaperSettings.set({ ...$wallpaperSettings.get(), opacity })
}

export function setWallpaperDim(dim: number) {
  $wallpaperSettings.set({ ...$wallpaperSettings.get(), dim })
}

export function setWallpaperBlur(blur: number) {
  $wallpaperSettings.set({ ...$wallpaperSettings.get(), blur })
}

export function setWallpaperFit(fit: 'cover' | 'contain') {
  $wallpaperSettings.set({ ...$wallpaperSettings.get(), fit })
}

export function setWallpaperPosition(position: 'top' | 'center' | 'bottom') {
  $wallpaperSettings.set({ ...$wallpaperSettings.get(), position })
}

export const $wallpaperDataUrl = atom<string | null>(null)

let lastLoadedPath: string | null = null

$wallpaperSettings.subscribe(async settings => {
  if (settings.mode === 'custom' && settings.customPath) {
    if (settings.customPath !== lastLoadedPath) {
      lastLoadedPath = settings.customPath

      try {
        const dataUrl = await window.hermesDesktop?.readFileDataUrl?.(settings.customPath)

        if (dataUrl && lastLoadedPath === settings.customPath) {
          $wallpaperDataUrl.set(dataUrl)
        }
      } catch (err) {
        console.error('Failed to load wallpaper:', err)

        if (lastLoadedPath === settings.customPath) {
          $wallpaperDataUrl.set(null)
          // Fallback if the file is deleted or inaccessible
          setWallpaperCustomPath(null)
        }
      }
    }
  } else {
    lastLoadedPath = null
    $wallpaperDataUrl.set(null)
  }
})
