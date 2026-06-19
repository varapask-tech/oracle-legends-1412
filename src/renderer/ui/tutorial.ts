const STEPS = [
  {
    title: "ยินดีต้อนรับสู่ Oracle Legends!",
    text: "จักรวาล 1412 รอคุณอยู่ — มาเริ่มผจญภัยกันเถอะ",
    highlight: null,
    action: null,
  },
  {
    title: "⚔️ ลองรบดูสักครั้ง",
    text: "กด Battle เพื่อเข้าสู่สนามรบ — heroes จะสู้อัตโนมัติ ชนะได้ Gold + EXP + Crystal",
    highlight: "Battle",
    action: "battle",
  },
  {
    title: "🎰 Summon เรียกฮีโร่ใหม่",
    text: "ใช้ 💎 Crystal เพื่อ summon hero ใหม่ — ยิ่ง rarity สูง ยิ่งแรง!",
    highlight: "Summon",
    action: "summon",
  },
  {
    title: "🦸 Level Up ฮีโร่",
    text: "กด Heroes แล้วเลือก Level Up — ใช้ 💰 Gold เพิ่ม stats ให้แรงขึ้น",
    highlight: "Heroes",
    action: "heroes",
  },
  {
    title: "🏪 ซื้อ Equipment",
    text: "ไปที่ Shop ซื้ออาวุธ เกราะ เครื่องประดับ — ใส่ hero ให้แข็งแกร่ง",
    highlight: "Shop",
    action: "shop",
  },
  {
    title: "📋 ภารกิจประจำวัน",
    text: "ทำ Quests ทุกวัน ได้ Gold + Crystal โบนัส — ไม่ต้องรีบ ทำได้เรื่อยๆ",
    highlight: "Quests",
    action: "daily",
  },
  {
    title: "🎮 พร้อมผจญภัย!",
    text: "ตี → ได้ของ → อัพฮีโร่ → ตีด่านยากขึ้น → ได้ของดีขึ้น — สนุกนะครับป๊ะป๋า! 💪",
    highlight: null,
    action: null,
  },
];

const STORAGE_KEY = "oracle-legends-tutorial";

export class Tutorial {
  private overlay: HTMLDivElement;
  private step = 0;
  private onNavigate: ((screen: string) => void) | null = null;
  private completed = false;

  constructor(onNavigate?: (screen: string) => void) {
    this.onNavigate = onNavigate ?? null;
    this.overlay = document.createElement("div");
    this.completed = localStorage.getItem(STORAGE_KEY) === "done";
  }

  get isCompleted() { return this.completed; }

  shouldShow(): boolean {
    return !this.completed;
  }

  start(container: HTMLElement) {
    if (this.completed) return;
    this.step = 0;
    this.render(container);
  }

  skip() {
    this.completed = true;
    localStorage.setItem(STORAGE_KEY, "done");
    this.overlay.remove();
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.completed = false;
    this.step = 0;
  }

  private render(container: HTMLElement) {
    this.overlay.remove();

    const s = STEPS[this.step];
    if (!s) { this.skip(); return; }

    this.overlay = document.createElement("div");
    this.overlay.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      background:rgba(5,2,15,0.85); z-index:10000;
      display:flex; align-items:center; justify-content:center;
      font-family:'Segoe UI',sans-serif;
    `;

    const card = document.createElement("div");
    card.style.cssText = `
      background:linear-gradient(135deg, #1a0a3a 0%, #2a1a4a 100%);
      border:2px solid #ffd700; border-radius:16px; padding:32px 40px;
      max-width:420px; text-align:center;
      box-shadow:0 0 40px rgba(255,215,0,0.15);
      animation: tutorial-pop 0.3s ease-out;
    `;

    const stepIndicator = document.createElement("div");
    stepIndicator.style.cssText = "margin-bottom:12px;";
    stepIndicator.innerHTML = STEPS.map((_, i) =>
      `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; margin:0 3px; background:${i === this.step ? "#ffd700" : "#3a2a5a"};"></span>`
    ).join("");
    card.appendChild(stepIndicator);

    const title = document.createElement("h2");
    title.style.cssText = "color:#ffd700; font-size:20px; margin:0 0 12px;";
    title.textContent = s.title;
    card.appendChild(title);

    const text = document.createElement("p");
    text.style.cssText = "color:#d0c0f0; font-size:14px; line-height:1.6; margin:0 0 24px;";
    text.textContent = s.text;
    card.appendChild(text);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex; gap:12px; justify-content:center;";

    if (this.step > 0) {
      const prevBtn = this.makeBtn("← ก่อนหน้า", "#666", () => {
        this.step--;
        this.render(container);
      });
      btnRow.appendChild(prevBtn);
    }

    if (s.action && this.onNavigate) {
      const tryBtn = this.makeBtn("ลองเลย!", "#44aaff", () => {
        this.overlay.remove();
        this.step++;
        localStorage.setItem(STORAGE_KEY + "-step", String(this.step));
        this.onNavigate!(s.action!);
      });
      btnRow.appendChild(tryBtn);
    }

    const isLast = this.step === STEPS.length - 1;
    const nextBtn = this.makeBtn(
      isLast ? "เริ่มเล่น! 🎮" : "ต่อไป →",
      "#ffd700",
      () => {
        if (isLast) {
          this.skip();
        } else {
          this.step++;
          this.render(container);
        }
      },
    );
    btnRow.appendChild(nextBtn);

    card.appendChild(btnRow);

    const skipBtn = document.createElement("button");
    skipBtn.textContent = "ข้ามทั้งหมด";
    skipBtn.style.cssText = `
      margin-top:16px; background:none; border:none; color:#666;
      font-size:12px; cursor:pointer; text-decoration:underline;
    `;
    skipBtn.onclick = () => this.skip();
    card.appendChild(skipBtn);

    this.overlay.appendChild(card);
    container.appendChild(this.overlay);

    if (!document.getElementById("tutorial-styles")) {
      const style = document.createElement("style");
      style.id = "tutorial-styles";
      style.textContent = `
        @keyframes tutorial-pop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  private makeBtn(text: string, color: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    const isGold = color === "#ffd700";
    btn.style.cssText = `
      padding:8px 24px; font-size:13px; font-weight:bold; cursor:pointer; border-radius:8px;
      background:${isGold ? "linear-gradient(135deg,#ffd700,#ff8c00)" : "rgba(40,30,60,0.8)"};
      border:1px solid ${color}; color:${isGold ? "#1a0a00" : color};
      transition:transform 0.15s;
    `;
    btn.textContent = text;
    btn.addEventListener("click", onClick);
    btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.05)"; });
    btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    return btn;
  }
}
