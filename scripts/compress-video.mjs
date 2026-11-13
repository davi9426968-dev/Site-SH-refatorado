import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'
import { videoScaleFilter, videoBitrateCap } from './lib/images.mjs'

const run = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(root, '_legado', 'video da city', 'Download.mp4')
const OUT_DIR = path.join(root, 'public', 'video')
const OUT = path.join(OUT_DIR, 'santo-hipolito.mp4')
const POSTER = path.join(OUT_DIR, 'santo-hipolito-poster.webp')
const crfArg = process.argv.indexOf('--crf')
const CRF = crfArg > 0 ? Number(process.argv[crfArg + 1]) : 26

// `ffmpeg -i` sem saída termina com erro; as informações estão no stderr.
async function probe(file) {
  let text
  try {
    await run(ffmpegPath, ['-hide_banner', '-i', file])
  } catch (e) {
    text = e.stderr ?? ''
  }
  const dur = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text ?? '')
  const vid = /Stream #\S+.*Video:.*?(\d{2,5})x(\d{2,5})/.exec(text ?? '')
  if (!dur || !vid) throw new Error(`Não foi possível ler os metadados de ${file}`)
  const rot = /rotation of (-?\d+(?:\.\d+)?) degrees/.exec(text)
  const swap = rot && Math.abs(Math.round(Number(rot[1]))) % 180 === 90
  const [w, h] = [Number(vid[1]), Number(vid[2])]
  return {
    width: swap ? h : w,
    height: swap ? w : h,
    duration: Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]),
    hasAudio: /Stream #\S+.*Audio:/.test(text),
  }
}

try {
  const src = await probe(SRC)
  const cap = videoBitrateCap(src.duration, src.hasAudio)
  const args = [
    '-hide_banner', '-y', '-i', SRC,
    '-vf', videoScaleFilter(src.width, src.height),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-maxrate', `${cap}k`, '-bufsize', `${cap * 2}k`, '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    ...(src.hasAudio ? ['-c:a', 'aac', '-b:a', '96k'] : ['-an']),
    OUT,
  ]
  await fs.mkdir(OUT_DIR, { recursive: true })
  await run(ffmpegPath, args, { maxBuffer: 64 * 1024 * 1024 })

  // Pôster: frame da ORIGEM em resolução nativa (nunca do 720p), reduzido para 1600 sem ampliar.
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sh-poster-'))
  try {
    const frame = path.join(tmp, 'frame.png')
    const at = Math.min(2, src.duration / 2)
    await run(ffmpegPath, ['-hide_banner', '-y', '-ss', String(at), '-i', SRC, '-frames:v', '1', frame])
    await sharp(frame).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(POSTER)
  } finally {
    await fs.rm(tmp, { recursive: true, force: true })
  }

  const out = await probe(OUT)
  const sizeMB = Number(((await fs.stat(OUT)).size / 1024 / 1024).toFixed(2))
  const info = { width: out.width, height: out.height, duration: Number(out.duration.toFixed(2)), hasAudio: out.hasAudio, sizeMB }
  await fs.writeFile(path.join(OUT_DIR, 'video.json'), JSON.stringify(info, null, 2) + '\n')
  console.log(`CRF ${CRF}:`, info)
} catch (e) {
  console.error(`Falha na compressão do vídeo: ${e.message}`)
  process.exit(1)
}
