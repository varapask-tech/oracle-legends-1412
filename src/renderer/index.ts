import * as THREE from "three";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const titleScreen = document.getElementById("title-screen")!;
const startBtn = document.getElementById("start-btn")!;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x0a0a2e);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 8, 12);
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffd700, 1.2);
sunLight.position.set(5, 10, 5);
scene.add(sunLight);

createBattleGround();
const heroes = createPlaceholderHeroes();
const enemies = createPlaceholderEnemies();

let gameStarted = false;

startBtn.addEventListener("click", () => {
  titleScreen.style.display = "none";
  gameStarted = true;
});

function createBattleGround() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 14),
    new THREE.MeshStandardMaterial({ color: 0x2a4a2a })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  scene.add(ground);

  const grid = new THREE.GridHelper(20, 20, 0x3a5a3a, 0x1a3a1a);
  grid.position.y = -0.49;
  scene.add(grid);
}

function createHero(
  color: number,
  x: number,
  z: number,
  height: number
): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, height, 4, 8),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.y = height / 2 + 0.3;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffcc99 })
  );
  head.position.y = height + 0.6;
  group.add(head);

  group.position.set(x, 0, z);
  scene.add(group);
  return group;
}

function createPlaceholderHeroes(): THREE.Group[] {
  return [
    createHero(0x4488ff, -3, 2, 0.8),
    createHero(0xff4444, -4, 0, 0.9),
    createHero(0x44ff44, -3, -2, 0.7),
    createHero(0xffaa00, -5, 1, 1.0),
    createHero(0xaa44ff, -5, -1, 0.75),
  ];
}

function createPlaceholderEnemies(): THREE.Group[] {
  return [
    createHero(0x880000, 3, 2, 0.8),
    createHero(0x884400, 4, 0, 1.1),
    createHero(0x880044, 3, -2, 0.85),
  ];
}

let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.016;

  if (gameStarted) {
    heroes.forEach((h, i) => {
      h.position.y = Math.sin(time * 2 + i) * 0.1;
      h.rotation.y = Math.sin(time + i * 0.5) * 0.2;
    });

    enemies.forEach((e, i) => {
      e.position.y = Math.sin(time * 2.5 + i) * 0.1;
      e.rotation.y = Math.sin(time * 0.8 + i) * 0.15;
    });
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
