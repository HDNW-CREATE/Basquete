export type Mood = 'idle' | 'thinking' | 'working' | 'error' | 'done'
export type Buddy = { skin: number; xp: number; coins: number; isHidden: boolean }
export type Activity = { mood: Mood; detail: string }

declare module 'claude-code' {
  interface PluginState {
    'mascotinho': { buddy: Shaped<Buddy>; activity: Shaped<Activity> }
  }
}
