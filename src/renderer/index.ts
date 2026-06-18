import { Game } from "./game";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const titleScreen = document.getElementById("title-screen")!;
const startBtn = document.getElementById("start-btn")!;

const game = new Game(canvas);
game.start();

startBtn.addEventListener("click", () => {
  titleScreen.style.display = "none";
  game.showTeamSelect();
});

window.addEventListener("resize", () => {
  // BattleScene handles its own resize internally
});
