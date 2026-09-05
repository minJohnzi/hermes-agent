import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { clearWallpaperFiles, importWallpaperFile, WALLPAPER_MAX_BYTES } from './wallpaper-files'

const roots: string[] = []

async function root(): Promise<string> {
  const value = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hermes-wallpaper-'))
  roots.push(value)

  return value
}

afterEach(async () =>
  Promise.all(roots.splice(0).map(value => fs.promises.rm(value, { force: true, recursive: true })))
)

describe('wallpaper files', () => {
  it('imports a signature-validated image and removes the previous managed asset', async () => {
    const dir = await root()
    const source = path.join(dir, 'photo.bin')
    const target = path.join(dir, 'wallpaper')
    await fs.promises.writeFile(source, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]))
    await fs.promises.mkdir(target)
    await fs.promises.writeFile(path.join(target, 'custom_backdrop_old.png'), 'old')

    const imported = await importWallpaperFile(source, target)

    expect(path.extname(imported.path)).toBe('.png')
    expect(await fs.promises.readdir(target)).toEqual([path.basename(imported.path)])
  })

  it('rejects unsupported content without replacing the current asset', async () => {
    const dir = await root()
    const source = path.join(dir, 'fake.png')
    const target = path.join(dir, 'wallpaper')
    await fs.promises.writeFile(source, 'not an image')
    await fs.promises.mkdir(target)
    await fs.promises.writeFile(path.join(target, 'custom_backdrop_current.png'), 'current')

    await expect(importWallpaperFile(source, target)).rejects.toThrow('valid JPG, PNG, or WebP')
    expect(await fs.promises.readdir(target)).toEqual(['custom_backdrop_current.png'])
  })

  it('rejects oversized files before copying them', async () => {
    const dir = await root()
    const source = path.join(dir, 'large.png')
    await fs.promises.writeFile(source, Buffer.alloc(WALLPAPER_MAX_BYTES + 1))

    await expect(importWallpaperFile(source, path.join(dir, 'wallpaper'))).rejects.toThrow('16 MiB')
  })

  it('clears only managed wallpaper assets', async () => {
    const dir = await root()
    await fs.promises.writeFile(path.join(dir, 'custom_backdrop_a.png'), 'a')
    await fs.promises.writeFile(path.join(dir, 'keep.txt'), 'keep')

    await clearWallpaperFiles(dir)

    expect(await fs.promises.readdir(dir)).toEqual(['keep.txt'])
  })
})
