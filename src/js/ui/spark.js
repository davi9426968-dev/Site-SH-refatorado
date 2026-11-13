import { gsap } from '../core/gsap.js'
import { reducedMotion } from '../core/motion.js'

const COLOR = '#E3A72F'
const RAYS = 8
const DURATION = 0.4

export function init() {
  if (reducedMotion()) return
  const canvas = document.createElement('canvas')
  canvas.className = 'spark-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  const ctx = canvas.getContext?.('2d')
  if (!ctx) return
  document.body.append(canvas)

  let dpr = 1
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
  }
  resize()
  window.addEventListener('resize', resize)

  const bursts = new Set()
  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.strokeStyle = COLOR
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    for (const b of bursts) {
      ctx.globalAlpha = 1 - b.p
      for (let i = 0; i < RAYS; i++) {
        const a = (Math.PI * 2 * i) / RAYS + b.offset
        const len = 14 + (i % 3) * 4 // 14, 18 e 22 px
        const from = b.p * 28 // o raio vai de 0 a 28 px
        const to = from + len * (1 - b.p)
        ctx.beginPath()
        ctx.moveTo(b.x + Math.cos(a) * from, b.y + Math.sin(a) * from)
        ctx.lineTo(b.x + Math.cos(a) * to, b.y + Math.sin(a) * to)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
  }

  document.addEventListener('pointerdown', e => {
    const burst = { x: e.clientX, y: e.clientY, p: 0, offset: Math.random() * 0.8 }
    bursts.add(burst)
    gsap.to(burst, {
      p: 1,
      duration: DURATION,
      ease: 'power2.out',
      onUpdate: draw,
      onComplete() { bursts.delete(burst); draw() },
    })
  })
}
