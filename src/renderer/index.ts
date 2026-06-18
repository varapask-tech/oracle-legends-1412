import { Game } from "./game";

const overlay = document.getElementById("ui-overlay")!;
const titleScreen = document.getElementById("title-screen")!;
const startBtn = document.getElementById("start-btn")!;

const gameContainer = document.createElement("div");
gameContainer.id = "game-container";
gameContainer.style.cssText = "width:100%; height:100%; display:none;";
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
`;
document.head.appendChild(style);
