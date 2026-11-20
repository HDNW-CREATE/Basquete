import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'mascotinho',
  component: 'AbovePrompt',
  requestId: 'band',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 8, bodyColumns: 80 },
} as const

test('the buddy draws on every surface and reacts to a turn', async ($, on) => {
  mock.store(on)
  on('command.register', () => ({ value: { command: 'buddy' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /Clawd Clássico/ }))?.text).toBe('Clawd Clássico')
    expect(await ui.find({ type: 'Text', text: /esperando você/ })).toBeDefined()
    await ui.unmount()
  }

  // The next arrow switches to the basketball player.
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'next' })
  expect(await ui.find({ type: 'Text', text: /Basqueteiro/ })).toBeDefined()
  await ui.unmount()
})
