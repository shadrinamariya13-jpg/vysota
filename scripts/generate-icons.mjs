import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { resolve } from 'path'

const outDir = resolve('public/icons')
mkdirSync(outDir, { recursive: true })

function appIconSvg({ rounded = true } = {}) {
  const radius = rounded ? 96 : 0
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="${radius}" fill="#C8A35E"/>
    <g transform="translate(112 132)" fill="none" stroke="#FAF4ED" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
      <path d="M24 96h208v80a64 64 0 0 1-64 64H88a64 64 0 0 1-64-64V96z"/>
      <path d="M232 112h24a40 40 0 0 1 0 80h-24"/>
      <path d="M72 40c0 16-16 24-16 40M128 40c0 16-16 24-16 40M184 40c0 16-16 24-16 40" stroke-opacity="0.9"/>
    </g>
  </svg>`)
}

function maskableSvg() {
  // safe zone — внутренний круг ~80% от размера, фон занимает весь
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#C8A35E"/>
    <g transform="translate(152 172)" fill="none" stroke="#FAF4ED" stroke-width="18" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 80h168v66a52 52 0 0 1-52 52H72a52 52 0 0 1-52-52V80z"/>
      <path d="M188 94h20a32 32 0 0 1 0 64h-20"/>
      <path d="M60 32c0 14-14 22-14 36M104 32c0 14-14 22-14 36M148 32c0 14-14 22-14 36" stroke-opacity="0.9"/>
    </g>
  </svg>`)
}

const targets = [
  { size: 192, file: 'icon-192.png', svg: appIconSvg() },
  { size: 512, file: 'icon-512.png', svg: appIconSvg() },
  { size: 512, file: 'icon-maskable-512.png', svg: maskableSvg() },
]

for (const { size, file, svg } of targets) {
  await sharp(svg).resize(size, size).png().toFile(resolve(outDir, file))
  console.log(`✓ ${file} (${size}x${size})`)
}

// apple-touch-icon (для iPhone)
await sharp(appIconSvg()).resize(180, 180).png().toFile(resolve('public/apple-touch-icon.png'))
console.log('✓ apple-touch-icon.png (180x180)')
