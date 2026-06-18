export const ZEN = {
  speeds: [
    { label: "1x ปกติ", multiplier: 1 },
    { label: "2x เร็วขึ้น", multiplier: 2 },
    { label: "4x ข้ามๆ", multiplier: 4 },
  ],

  defaultSpeed: 1,

  calm: {
    dimOpacity: 0.6,
    particlesEnabled: false,
    shakeEnabled: false,
    damageNumbersEnabled: true,
    reducedEffects: true,
  },

  autoRepeat: true,
  autoProceedNextStage: true,
  showBattleLog: false,

  ambience: {
    tracks: [
      { id: "forest-calm", name: "ป่าสงบ", bpm: 70, mood: "peaceful" },
      { id: "ocean-waves", name: "คลื่นทะเล", bpm: 60, mood: "relaxing" },
      { id: "mountain-wind", name: "ลมบนเขา", bpm: 80, mood: "epic-calm" },
      { id: "temple-bells", name: "ระฆังวิหาร", bpm: 50, mood: "meditative" },
      { id: "battle-light", name: "สมรภูมิเบา", bpm: 110, mood: "adventure" },
    ],
    defaultTrack: "forest-calm",
    volumeDefault: 0.4,
    fadeInMs: 2000,
    fadeOutMs: 1500,
  },

  notifications: {
    idleRewardReady: true,
    bossUnlocked: true,
    heroLevelUp: false,
    summonAvailable: false,
  },
} as const;

export type SpeedOption = (typeof ZEN.speeds)[number];
export type AmbienceTrack = (typeof ZEN.ambience.tracks)[number];
