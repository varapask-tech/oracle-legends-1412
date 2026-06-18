import type { GameState } from "../shared/types";

export interface Mission {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: MissionReward;
  completed: boolean;
  claimed: boolean;
}

export interface MissionReward {
  gold?: number;
  crystals?: number;
  exp?: number;
}

export interface WeeklyBonus {
  missionsCompleted: number;
  milestones: Array<{ required: number; reward: MissionReward; claimed: boolean }>;
}

export interface DailyState {
  missions: Mission[];
  lastResetDate: string;
  weeklyBonus: WeeklyBonus;
  weekStartDate: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekStartStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function createDailyMissions(): Mission[] {
  return [
    { id: "battle-3", title: "นักสู้ประจำวัน", description: "ผ่านด่าน 3 ครั้ง", target: 3, progress: 0, reward: { gold: 200 }, completed: false, claimed: false },
    { id: "battle-10", title: "นักรบไม่หยุดพัก", description: "ผ่านด่าน 10 ครั้ง", target: 10, progress: 0, reward: { crystals: 10 }, completed: false, claimed: false },
    { id: "summon-1", title: "เรียกพลัง", description: "Summon 1 ครั้ง", target: 1, progress: 0, reward: { gold: 150 }, completed: false, claimed: false },
    { id: "levelup-1", title: "พัฒนาตัวเอง", description: "Level Up hero 1 ครั้ง", target: 1, progress: 0, reward: { gold: 100 }, completed: false, claimed: false },
    { id: "equip-1", title: "เตรียมพร้อม", description: "ใส่ equipment 1 ชิ้น", target: 1, progress: 0, reward: { gold: 100 }, completed: false, claimed: false },
    { id: "shop-1", title: "นักช้อป", description: "ซื้อของจาก shop 1 ครั้ง", target: 1, progress: 0, reward: { gold: 100 }, completed: false, claimed: false },
    { id: "gold-1000", title: "สะสมทอง", description: "ได้ gold รวม 1,000", target: 1000, progress: 0, reward: { crystals: 5 }, completed: false, claimed: false },
    { id: "exp-500", title: "สะสมประสบการณ์", description: "ได้ EXP รวม 500", target: 500, progress: 0, reward: { gold: 200 }, completed: false, claimed: false },
    { id: "login", title: "มาเยี่ยมหน่อย", description: "เปิดเกมวันนี้", target: 1, progress: 1, reward: { crystals: 5, gold: 100 }, completed: true, claimed: false },
  ];
}

function createWeeklyBonus(): WeeklyBonus {
  return {
    missionsCompleted: 0,
    milestones: [
      { required: 10, reward: { gold: 500 }, claimed: false },
      { required: 25, reward: { crystals: 20 }, claimed: false },
      { required: 45, reward: { crystals: 50, gold: 1000 }, claimed: false },
      { required: 63, reward: { crystals: 100, gold: 2000 }, claimed: false },
    ],
  };
}

const STORAGE_KEY = "oracle-legends-daily";

export class DailyMissionManager {
  private state: DailyState;

  constructor() {
    this.state = this.load();
    this.checkReset();
  }

  get missions(): readonly Mission[] { return this.state.missions; }
  get weekly(): Readonly<WeeklyBonus> { return this.state.weeklyBonus; }

  get completedCount(): number {
    return this.state.missions.filter((m) => m.completed).length;
  }

  get claimedCount(): number {
    return this.state.missions.filter((m) => m.claimed).length;
  }

  get allClaimed(): boolean {
    return this.state.missions.every((m) => m.claimed);
  }

  trackProgress(missionId: string, amount = 1) {
    const m = this.state.missions.find((x) => x.id === missionId);
    if (!m || m.completed) return;

    m.progress = Math.min(m.target, m.progress + amount);
    if (m.progress >= m.target) m.completed = true;
    this.save();
  }

  claimReward(missionId: string): MissionReward | null {
    const m = this.state.missions.find((x) => x.id === missionId);
    if (!m || !m.completed || m.claimed) return null;

    m.claimed = true;
    this.state.weeklyBonus.missionsCompleted++;
    this.save();
    return m.reward;
  }

  claimWeeklyMilestone(index: number): MissionReward | null {
    const ms = this.state.weeklyBonus.milestones[index];
    if (!ms || ms.claimed) return null;
    if (this.state.weeklyBonus.missionsCompleted < ms.required) return null;

    ms.claimed = true;
    this.save();
    return ms.reward;
  }

  private checkReset() {
    const today = todayStr();
    if (this.state.lastResetDate !== today) {
      this.state.missions = createDailyMissions();
      this.state.lastResetDate = today;
    }

    const week = weekStartStr();
    if (this.state.weekStartDate !== week) {
      this.state.weeklyBonus = createWeeklyBonus();
      this.state.weekStartDate = week;
    }

    this.save();
  }

  private load(): DailyState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      missions: createDailyMissions(),
      lastResetDate: todayStr(),
      weeklyBonus: createWeeklyBonus(),
      weekStartDate: weekStartStr(),
    };
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
}
