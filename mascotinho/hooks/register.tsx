import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Activity, Buddy, Mood } from '../types'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const STORE_KEY = 'buddy'

const initialBuddy: Buddy = { skin: 0, xp: 0, coins: 0, isHidden: false }
const buddy = atom({ plugin: 'mascotinho', key: 'buddy' } as const, initialBuddy, {
  shape: 'buddy-1',
})
const activity = atom(
  { plugin: 'mascotinho', key: 'activity' } as const,
  { mood: 'idle', detail: '' } as Activity,
  { shape: 'activity-1' },
)

// ---------------------------------------------------------------------------
// Pixel art: a 20 x 16 grid, one character per pixel, '.' transparent
// ---------------------------------------------------------------------------

const W = 20
const H = 16

const PALETTE: Record<string, string> = {
  O: '#D97757', // Claude orange
  o: '#A9533A', // legs / shade
  K: '#1E1E1E', // eyes
  W: '#FFFFFF',
  w: '#D9D9D9',
  Y: '#F2C230', // yellow
  y: '#B8900F',
  R: '#D63B3B', // red
  B: '#E8822A', // basketball
  b: '#5A2A0A', // ball seam
  J: '#2F5FD0', // blue
  G: '#2E9E4F', // green
  N: '#2B2F55', // navy
  n: '#5A66B8',
  P: '#7A4FD1', // purple
  p: '#4F2F9A',
  S: '#FFE066', // star
  E: '#7A7A7A', // grey (gear)
  C: '#7FC8F8', // sweat drop
  L: '#FFE35A', // light bulb
  l: '#FFF7C2',
}

type Layer = { rows: string[]; x?: number; y?: number }

function grid(rows: string[], x = 0, y = 0): Layer {
  return { rows, x, y }
}

const BODY = grid([
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....OOOOOOOOOOOO....',
  '....OOOOOOOOOOOO....',
  '..OOOOOOOOOOOOOOOO..',
  '..OOOOOOOOOOOOOOOO..',
  '....OOOOOOOOOOOO....',
  '....OOOOOOOOOOOO....',
  '....OOOOOOOOOOOO....',
  '....o.o......o.o....',
  '....o.o......o.o....',
  '....................',
])

type Eyes = 'open' | 'up' | 'focus' | 'happy' | 'dead'

const EYES: Record<Eyes, [number, number][]> = {
  open: [[7, 7], [7, 8], [12, 7], [12, 8]],
  up: [[8, 7], [13, 7]],
  focus: [[6, 8], [7, 8], [11, 8], [12, 8]],
  happy: [[7, 7], [6, 8], [8, 8], [12, 7], [11, 8], [13, 8]],
  dead: [[6, 7], [8, 7], [7, 8], [6, 9], [8, 9], [11, 7], [13, 7], [12, 8], [11, 9], [13, 9]],
}

type Prop = { layer: Layer; motion: 'dribble' | 'kick' | 'none' }

type Skin = { name: string; hat?: Layer; outfit?: Layer; prop?: Prop; patch?: Layer }

const SKINS: Skin[] = [
  { name: 'Clawd Clássico' },
  {
    name: 'Clawd Basqueteiro',
    hat: grid(['RRRRRRRRRRRR'], 4, 6),
    outfit: grid(['JJJJJJJJJJJJ', 'JJJJJWWJJJJJ', 'JJJJJWWJJJJJ'], 4, 10),
    prop: { layer: grid(['.BB.', 'BbBB', 'BBbB', '.BB.'], 16, 11), motion: 'dribble' },
  },
  {
    name: 'Clawd Boleiro',
    outfit: grid(['YYYYGGGGYYYY', 'YYYYYYYYYYYY', 'YYYYYYYYYYYY', 'J.J......J.J'], 4, 10),
    prop: { layer: grid(['WKW', 'KWK', 'WKW'], 16, 12), motion: 'kick' },
  },
  {
    name: 'Clawd Peão de Obra',
    hat: grid([
      '....YYYYYY....',
      '...YYYYYYYY...',
      '..YYYYyYYYYY..',
      'yyyyyyyyyyyyyy',
    ], 3, 3),
  },
  {
    name: 'Clawd DJ',
    hat: grid([
      '...NNNNNNNN...',
      '..N........N..',
      '.N..........N.',
      'nN..........Nn',
      'nN..........Nn',
    ], 3, 3),
  },
  {
    name: 'Clawd Mago',
    hat: grid([
      '......P.......',
      '.....PPP......',
      '.....PPP......',
      '....PPSPP.....',
      '...PPPPPPP....',
      '..PPPPPPPPP...',
      'ppppppppppppp.',
    ], 3, 0),
  },
  {
    name: 'Clawd Pirata',
    hat: grid(['RWRRRWRRRWRRRR', '............RR'], 4, 6),
    patch: grid(['KKK', 'KKK'], 6, 7),
  },
  {
    name: 'Clawd Chef',
    hat: grid([
      '..WW.WW.WW..',
      '.WWWWWWWWWW.',
      '.WWWWWWWWWW.',
      '..WWWWWWWW..',
      '..wwwwwwww..',
    ], 4, 1),
  },
]

const BADGE: Record<Mood, Layer | null> = {
  idle: null,
  thinking: grid(['.LL.', 'LllL', 'LllL', '.LL.', '.ww.'], 16, 0),
  working: grid(['..E..', '.EEE.', 'EEwEE', '.EEE.', '..E..'], 15, 0),
  error: grid(['R', 'R', 'R', '.', 'R'], 17, 0),
  done: grid(['...YY', '...Yy', 'YY...', 'Yy.YY', '...Yy'], 15, 0),
}

const MOOD_EYES: Record<Mood, Eyes> = {
  idle: 'open',
  thinking: 'up',
  working: 'focus',
  error: 'dead',
  done: 'happy',
}

// ---------------------------------------------------------------------------
// Drawing the sprite as SVG (desktop, mobile, VS Code)
// ---------------------------------------------------------------------------

function rects(layer: Layer): string {
  let out = ''
  layer.rows.forEach((row, dy) => {
    let start = -1
    for (let dx = 0; dx <= row.length; dx++) {
      const ch = dx < row.length ? row.charAt(dx) : '.'
      const runChar = start >= 0 ? row.charAt(start) : ''
      if (start >= 0 && ch !== runChar) {
        const fill = PALETTE[runChar]
        if (fill) {
          out += `<rect x="${(layer.x ?? 0) + start}" y="${(layer.y ?? 0) + dy}" width="${dx - start}" height="1" fill="${fill}"/>`
        }
        start = -1
      }
      if (start < 0 && ch !== '.') start = dx
    }
  })
  return out
}

function eyeRects(points: [number, number][]): string {
  return points
    .map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${PALETTE.K}"/>`)
    .join('')
}

function bodyMotion(mood: Mood): string {
  switch (mood) {
    case 'idle':
      return '<animateTransform attributeName="transform" type="translate" values="0 0;0 -0.5;0 0" dur="2.4s" repeatCount="indefinite"/>'
    case 'thinking':
      return '<animateTransform attributeName="transform" type="translate" values="-0.4 0;0.4 0;-0.4 0" dur="2s" repeatCount="indefinite"/>'
    case 'working':
      return '<animateTransform attributeName="transform" type="translate" values="0 0;0 -0.6;0 0" dur="0.4s" repeatCount="indefinite"/>'
    case 'done':
      return '<animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0;0 0" keyTimes="0;0.15;0.3;1" dur="1.4s" repeatCount="indefinite"/>'
    case 'error':
      return '<animateTransform attributeName="transform" type="translate" values="-0.3 0.6;0.3 0.6;-0.3 0.6" dur="0.25s" repeatCount="3"/>'
  }
}

function propMotion(motion: Prop['motion'], mood: Mood): string {
  const fast = mood === 'working'
  if (motion === 'dribble') {
    return `<animateTransform attributeName="transform" type="translate" values="0 -4;0 0;0 -4" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.5 0 1 1;0 0 0.5 1" dur="${fast ? 0.45 : 0.9}s" repeatCount="indefinite"/>`
  }
  if (motion === 'kick') {
    return `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;2 -1.5;3 0;0 0" keyTimes="0;0.4;0.6;0.8;1" dur="${fast ? 0.8 : 1.6}s" repeatCount="indefinite"/>`
  }
  return ''
}

function badgeMotion(mood: Mood): string {
  switch (mood) {
    case 'thinking':
      return '<animate attributeName="opacity" values="1;0.45;1" dur="1.2s" repeatCount="indefinite"/>'
    case 'working':
      return '<animateTransform attributeName="transform" type="rotate" from="0 17.5 2.5" to="360 17.5 2.5" dur="1.2s" repeatCount="indefinite"/>'
    case 'done':
      return '<animateTransform attributeName="transform" type="translate" values="0 1;0 -0.5;0 1" dur="1s" repeatCount="indefinite"/>'
    case 'error':
      return '<animate attributeName="opacity" values="1;0.2;1" dur="0.6s" repeatCount="indefinite"/>'
    default:
      return ''
  }
}

function spriteSvg(skin: Skin, mood: Mood): string {
  const eyes = MOOD_EYES[mood]
  const blink =
    eyes === 'open'
      ? `<g opacity="0"><rect x="7" y="7" width="1" height="2" fill="${PALETTE.O}"/><rect x="12" y="7" width="1" height="2" fill="${PALETTE.O}"/><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.92;0.96;1" dur="4s" repeatCount="indefinite"/></g>`
      : ''
  const sweat = mood === 'working' ? `<rect x="3" y="6" width="1" height="2" fill="${PALETTE.C}"/>` : ''
  const badge = BADGE[mood]
  const prop = skin.prop
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 5}" height="${H * 5}" shape-rendering="crispEdges">` +
    `<ellipse cx="10" cy="15.4" rx="6" ry="0.6" fill="#000" opacity="0.18"/>` +
    `<g>${bodyMotion(mood)}` +
    rects(BODY) +
    (skin.outfit ? rects(skin.outfit) : '') +
    eyeRects(EYES[eyes]) +
    blink +
    (skin.patch ? rects(skin.patch) : '') +
    (skin.hat ? rects(skin.hat) : '') +
    sweat +
    `</g>` +
    (prop ? `<g>${propMotion(prop.motion, mood)}${rects(prop.layer)}</g>` : '') +
    (badge ? `<g>${badgeMotion(mood)}${rects(badge)}</g>` : '') +
    `</svg>`
  )
}

// ---------------------------------------------------------------------------
// Drawing the sprite as terminal cells: two pixels per cell with half blocks
// ---------------------------------------------------------------------------

function paint(canvas: (string | null)[][], layer: Layer, dy = 0) {
  layer.rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row.charAt(rx)
      const x = (layer.x ?? 0) + rx
      const y = (layer.y ?? 0) + ry + dy
      const color = PALETTE[ch]
      const line = canvas[y]
      if (ch !== '.' && color && line && x >= 0 && x < W) {
        line[x] = color
      }
    }
  })
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function toBase64(bytes: number[]): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    const n = (a << 16) | (b << 8) | c
    out += B64.charAt((n >> 18) & 63) + B64.charAt((n >> 12) & 63)
    out += i + 1 < bytes.length ? B64.charAt((n >> 6) & 63) : '='
    out += i + 2 < bytes.length ? B64.charAt(n & 63) : '='
  }
  return out
}

function hex(color: string | null): number {
  return color ? parseInt(color.slice(1), 16) : 0x01000000
}

function spriteCells(skin: Skin, mood: Mood): string {
  const canvas: (string | null)[][] = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => null as string | null),
  )
  const sink = mood === 'error' ? 1 : 0
  paint(canvas, BODY, sink)
  if (skin.outfit) paint(canvas, skin.outfit, sink)
  for (const [x, y] of EYES[MOOD_EYES[mood]]) {
    const line = canvas[y + sink]
    if (line) line[x] = PALETTE.K ?? null
  }
  if (skin.patch) paint(canvas, skin.patch, sink)
  if (skin.hat) paint(canvas, skin.hat, sink)
  if (skin.prop) paint(canvas, skin.prop.layer)
  const badge = BADGE[mood]
  if (badge) paint(canvas, badge)

  const words: number[] = []
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x++) {
      const top = canvas[y]?.[x] ?? null
      const bottom = canvas[y + 1]?.[x] ?? null
      if (!top && !bottom) words.push(0x20, 0x01000000, 0x01000000)
      else if (!top) words.push(0x2584, hex(bottom), 0x01000000)
      else words.push(0x2580, hex(top), hex(bottom))
    }
  }
  const bytes: number[] = []
  for (const word of words) {
    bytes.push(word & 255, (word >>> 8) & 255, (word >>> 16) & 255, (word >>> 24) & 255)
  }
  return toBase64(bytes)
}

// ---------------------------------------------------------------------------
// Levels and coins
// ---------------------------------------------------------------------------

const TITLES = ['Filhote', 'Aprendiz', 'Ajudante', 'Parceiro', 'Craque', 'Lenda']

function levelOf(xp: number) {
  let level = 1
  let need = 50_000
  let into = xp
  while (into >= need) {
    into -= need
    level += 1
    need = 50_000 * level
  }
  return { level, into, need, title: TITLES[Math.min(level, TITLES.length) - 1] }
}

function short(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

function moodLine(a: Activity): string {
  switch (a.mood) {
    case 'idle':
      return 'de boa, esperando você'
    case 'thinking':
      return 'pensando…'
    case 'working':
      return `trabalhando: ${a.detail}`
    case 'error':
      return a.detail ? `ops… deu erro (${a.detail})` : 'ops… deu erro'
    case 'done':
      return `pronto! ${a.detail}`
  }
}

function skinIndex(n: number): number {
  return ((n % SKINS.length) + SKINS.length) % SKINS.length
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

async function save($: EngineInterface, fn: (b: Buddy) => Buddy) {
  await update($, buddy, fn)
  await $.store.set(STORE_KEY, await read($, buddy))
}

async function setMood($: EngineInterface, mood: Mood, detail = '') {
  await update($, activity, () => ({ mood, detail }))
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const stored = (await $.store.get(STORE_KEY)) as Partial<Buddy> | undefined
    if (stored && typeof stored === 'object') {
      await update($, buddy, () => ({ ...initialBuddy, ...stored }))
    }
    await setMood($, 'idle')
    await $.command.register({
      name: 'buddy',
      description: 'Mascotinho: /buddy (mostra/esconde), /buddy lista, /buddy <nome ou número>',
      argumentHint: '[lista | nome | número]',
    })

    return next(e)
  })

  on('command.run', { command: 'buddy' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const list = SKINS.map((s, i) => `${i + 1}. ${s.name}`).join('\n')
    if (arg === '') {
      const now = await read($, buddy)
      await save($, b => ({ ...b, isHidden: !b.isHidden }))
      return { text: now.isHidden ? 'Mascotinho de volta! 🦀' : 'Mascotinho escondido. /buddy traz ele de volta.' }
    }
    if (arg === 'lista' || arg === 'list') {
      return { text: `Mascotes:\n${list}` }
    }
    const byNumber = Number(arg)
    const index = Number.isInteger(byNumber)
      ? byNumber - 1
      : SKINS.findIndex(s => s.name.toLowerCase().includes(arg))
    if (index < 0 || index >= SKINS.length) {
      return { text: `Não achei "${arg}". Mascotes:\n${list}` }
    }
    await save($, b => ({ ...b, skin: index, isHidden: false }))
    return { text: `Agora quem te acompanha é o ${SKINS[index]?.name}!` }
  })

  on('prompt.submit', async ($, e, next) => {
    await setMood($, 'thinking')
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    await setMood($, 'working', e.tool)
    const ran = await next(e)
    if ('deny' in ran && ran.deny !== undefined) {
      await setMood($, 'error', e.tool)
    } else if (ran.isError) {
      await setMood($, 'error', e.tool)
    } else {
      await setMood($, 'thinking')
    }
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    const tokens = u ? u.input_tokens + u.output_tokens + u.cache_creation_input_tokens : 0
    const coins = tokens > 0 ? Math.max(1, Math.floor(tokens / 1000)) : 0
    if (tokens > 0) {
      const before = levelOf((await read($, buddy)).xp).level
      await save($, b => ({ ...b, xp: b.xp + tokens, coins: b.coins + coins }))
      const after = levelOf((await read($, buddy)).xp)
      if (after.level > before) {
        $.ui.toast(`🎉 Seu mascotinho subiu pro nível ${after.level}: ${after.title}!`)
      }
    }
    if (!e.agentId) {
      if (e.reason === 'error' || e.reason === 'refusal') await setMood($, 'error')
      else if (e.reason === 'aborted') await setMood($, 'idle')
      else await setMood($, 'done', coins > 0 ? `+${coins} 🪙` : '')
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const b = await read($, buddy)
    if (b.isHidden || e.props.hasSurvey) return next(e)
    const a = await read($, activity)
    const skin = SKINS[skinIndex(b.skin)] ?? SKINS[0]!
    const lv = levelOf(b.xp)
    const pick = (step: number) => () => save($, x => ({ ...x, skin: skinIndex(x.skin + step) }))
    const alt = `${skin.name}: ${moodLine(a)}`

    const info = (Box: any, Text: any, Button: any, Progress: any) => (
      <Box flexDirection="column" flexGrow={1}>
        <Box gap={1}>
          <Button key="prev" plain label="‹" onPress={pick(-1)} />
          <Text weight="bold">{skin.name}</Text>
          <Button key="next" plain label="›" onPress={pick(1)} />
          <Text dimColor>
            Nv {lv.level} · {lv.title} · 🪙 {b.coins}
          </Text>
        </Box>
        <Text color={a.mood === 'error' ? 'error' : undefined}>{moodLine(a)}</Text>
        <Progress
          label="Tokens pra subir de nível"
          value={lv.into}
          max={lv.need}
          valueText={`${short(lv.into)}/${short(lv.need)} tokens`}
          color="#D97757"
        />
      </Box>
    )

    if (e.surface === 'terminal') {
      const { Box, Text, Button, Progress, Raster } = $.ui.resolve(e)
      return (
        <Box gap={2} alignItems="center">
          <Raster key="sprite" columns={W} rows={H / 2} cells={spriteCells(skin, a.mood)} />
          {info(Box, Text, Button, Progress)}
        </Box>
      )
    }
    const { Box, Text, Button, Progress, Svg } = $.ui.resolve(e)
    return (
      <Box gap={2} alignItems="center">
        <Svg source={spriteSvg(skin, a.mood)} alt={alt} width={W * 4} height={H * 4} />
        {info(Box, Text, Button, Progress)}
      </Box>
    )
  })
}
