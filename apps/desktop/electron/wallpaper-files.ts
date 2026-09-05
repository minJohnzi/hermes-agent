import fs from 'node:fs'
import path from 'node:path'

export const WALLPAPER_MAX_BYTES = 16 * 1024 * 1024

const EXTENSION_BY_SIGNATURE = [
  { ext: '.png', matches: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  { ext: '.jpg', matches: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: '.webp',
    matches: (b: Buffer) =>
      b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP'
  }
] as const

async function detectedExtension(filePath: string): Promise<string | null> {
  const handle = await fs.promises.open(filePath, 'r')

  try {
    const buffer = Buffer.alloc(12)
    await handle.read(buffer, 0, buffer.length, 0)

    return EXTENSION_BY_SIGNATURE.find(candidate => candidate.matches(buffer))?.ext ?? null
  } finally {
    await handle.close()
  }
}

export async function clearWallpaperFiles(wallpaperDir: string, keepPath?: string): Promise<void> {
  let entries: string[]

  try {
    entries = await fs.promises.readdir(wallpaperDir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return
    }
    throw error
  }

  await Promise.all(
    entries
      .filter(name => name.startsWith('custom_backdrop_'))
      .map(name => path.join(wallpaperDir, name))
      .filter(candidate => candidate !== keepPath)
      .map(candidate =>
        fs.promises.unlink(candidate).catch(error => {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error
          }
        })
      )
  )
}

export async function importWallpaperFile(sourcePath: string, wallpaperDir: string): Promise<{ path: string }> {
  const stat = await fs.promises.stat(sourcePath)

  if (!stat.isFile()) {
    throw new Error('Wallpaper source must be a file')
  }

  if (stat.size > WALLPAPER_MAX_BYTES) {
    throw new Error('Wallpaper image exceeds the 16 MiB limit')
  }

  const ext = await detectedExtension(sourcePath)

  if (!ext) {
    throw new Error('Wallpaper must be a valid JPG, PNG, or WebP image')
  }

  await fs.promises.mkdir(wallpaperDir, { recursive: true })
  const stem = `custom_backdrop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const temporaryPath = path.join(wallpaperDir, `${stem}.tmp`)
  const destinationPath = path.join(wallpaperDir, `${stem}${ext}`)

  try {
    await fs.promises.copyFile(sourcePath, temporaryPath, fs.constants.COPYFILE_EXCL)
    await fs.promises.rename(temporaryPath, destinationPath)
  } catch (error) {
    await fs.promises.unlink(temporaryPath).catch(() => undefined)
    throw error
  }

  await clearWallpaperFiles(wallpaperDir, destinationPath)

  return { path: destinationPath }
}
