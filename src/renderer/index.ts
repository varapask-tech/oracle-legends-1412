import { Game } from "./game";

const overlay = document.getElementById("ui-overlay")!;
const titleScreen = document.getElementById("title-screen")!;
const startBtn = document.getElementById("start-btn")!;

const gameContainer = document.createElement("div");
gameContainer.id = "game-container";
gameContainer.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; display:none; z-index:20;";
document.body.appendChild(gameContainer);

const game = new Game(gameContainer);

startBtn.addEventListener("click", () => {
  titleScreen.style.display = "none";
  overlay.style.display = "none";
  gameContainer.style.display = "block";
  game.start();
});

const style = document.createElement("style");
style.textContent = `
  @keyframes summon-pop {
    0% { transform: scale(0) rotate(-10deg); opacity: 0; }
    60% { transform: scale(1.1) rotate(2deg); opacity: 1; }
    100% { transform: scale(1) rotate(0); opacity: 1; }
  }
  @keyframes unit-idle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  @keyframes dmg-float {
    0% { opacity: 1; transform: translateX(-50%) translateY(0); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-30px); }
  }
  @keyframes dmg-fly {
    0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(0.5); }
    20% { opacity: 1; transform: translateX(-50%) translateY(-20px) scale(1.2); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-60px) scale(0.8); }
  }
`;
document.head.appendChild(style);
