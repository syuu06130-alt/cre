/* =============================================
   NERO — LAMBORGHINI STREET RACER
   script.js  —  Three.js r128
   ============================================= */

'use strict';

// ================================================================
// §0  GLOBALS & CONSTANTS
// ================================================================

const ROAD_W = 24;
const ROAD_H = 800;
const WALL_H = 2.2;
const CAR_W  = 1.8;
const CAR_L  = 4.4;
const CAR_H  = 0.55;

const ENEMY_COLORS = [0xcc2200, 0x0044cc, 0xcc9900, 0x228844, 0x884488];

let bestScore = parseInt(localStorage.getItem('nero_best') || '0');
document.getElementById('hud-best').textContent  = bestScore;
document.getElementById('go-best').textContent   = bestScore;

// ================================================================
// §1  RENDERER & SCENE
// ================================================================

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x0a0a12);
document.body.insertBefore(renderer.domElement, document.getElementById('loading-screen'));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a12, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ================================================================
// §2  LIGHTING
// ================================================================

scene.add(new THREE.AmbientLight(0x1a1a2e, 3.0));

const sun = new THREE.DirectionalLight(0xfff0d0, 2.5);
sun.position.set(30, 80, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { near: 1, far: 400, left: -80, right: 80, top: 80, bottom: -80 });
scene.add(sun);

scene.add(new THREE.HemisphereLight(0x222244, 0x111111, 1.0));

// City neon glow
const neon1 = new THREE.PointLight(0xff2200, 4, 50);
neon1.position.set(-ROAD_W * 2, 8, 0);
scene.add(neon1);
const neon2 = new THREE.PointLight(0x0044ff, 4, 50);
neon2.position.set(ROAD_W * 2, 8, 0);
scene.add(neon2);

// ================================================================
// §3  ROAD ENVIRONMENT
// ================================================================

const roadTiles = [];
const TILE_LEN  = 60;
const TILE_COUNT = 14;

function buildRoadEnvironment() {
  // Asphalt tile material
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1e });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const kerbRedMat  = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
  const kerbWhtMat  = new THREE.MeshLambertMaterial({ color: 0xdddddd });

  // Sidewalk material
  const walkMat = new THREE.MeshLambertMaterial({ color: 0x2a2a30 });

  for (let i = 0; i < TILE_COUNT; i++) {
    const tileGroup = new THREE.Group();

    // Road surface
    const rd = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, TILE_LEN), roadMat);
    rd.rotation.x = -Math.PI / 2;
    rd.receiveShadow = true;
    tileGroup.add(rd);

    // Sidewalks
    [-1, 1].forEach(side => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(8, 0.18, TILE_LEN), walkMat);
      sw.position.set(side * (ROAD_W / 2 + 4), 0.09, 0);
      tileGroup.add(sw);
    });

    // Centre dashes
    for (let d = -TILE_LEN / 2 + 4; d < TILE_LEN / 2; d += 8) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 4), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.01, d);
      tileGroup.add(dash);
      // lane 1/3
      [-ROAD_W / 3, ROAD_W / 3].forEach(lx => {
        const laneD = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 3.5), lineMat);
        laneD.rotation.x = -Math.PI / 2;
        laneD.position.set(lx, 0.01, d);
        tileGroup.add(laneD);
      });
    }

    // Kerb strips
    for (let k = -TILE_LEN / 2; k < TILE_LEN / 2; k += 3) {
      [-1, 1].forEach(side => {
        const mat = (Math.floor(k / 3) % 2 === 0) ? kerbRedMat : kerbWhtMat;
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 2.9), mat);
        kerb.position.set(side * (ROAD_W / 2 + 0.25), 0.11, k + 1.45);
        tileGroup.add(kerb);
      });
    }

    // Buildings (decorative)
    addBuildings(tileGroup);

    tileGroup.position.z = i * TILE_LEN - TILE_LEN * (TILE_COUNT / 2);
    scene.add(tileGroup);
    roadTiles.push(tileGroup);
  }
}

function addBuildings(group) {
  const buildMatDark = new THREE.MeshLambertMaterial({ color: 0x111118 });
  const buildMatMid  = new THREE.MeshLambertMaterial({ color: 0x1c1c26 });
  const winMat = new THREE.MeshBasicMaterial({ color: 0x334466 });
  const winLitMat = new THREE.MeshBasicMaterial({ color: 0xffcc44 });

  [-1, 1].forEach(side => {
    const count = 2 + Math.floor(Math.random() * 3);
    let zOff = -TILE_LEN / 2 + 4;
    for (let b = 0; b < count; b++) {
      const bw = 6 + Math.random() * 8;
      const bh = 12 + Math.random() * 40;
      const bmat = Math.random() > 0.5 ? buildMatDark : buildMatMid;
      const build = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 8 + Math.random() * 12), bmat);
      build.position.set(side * (ROAD_W / 2 + 9 + bw / 2), bh / 2, zOff + bw / 2);
      build.castShadow = true;
      group.add(build);

      // windows
      const winRows = Math.floor(bh / 3);
      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < 3; c++) {
          if (Math.random() > 0.25) {
            const wm = Math.random() > 0.6 ? winLitMat : winMat;
            const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), wm);
            win.position.set(
              build.position.x + side * (bw / 2 + 0.01) * -1,
              r * 3 + 2,
              build.position.z - bw / 3 + c * bw / 3
            );
            win.rotation.y = side * -Math.PI / 2;
            group.add(win);
          }
        }
      }

      zOff += bw + 2 + Math.random() * 6;
    }
  });

  // Street lamps
  const lampMat  = new THREE.MeshLambertMaterial({ color: 0x888899 });
  const lampLit  = new THREE.MeshBasicMaterial({ color: 0xffee88 });
  [-1, 1].forEach(side => {
    for (let z = -TILE_LEN / 2 + 10; z < TILE_LEN / 2; z += 16) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 7, 6), lampMat);
      pole.position.set(side * (ROAD_W / 2 + 1.5), 3.5, z);
      group.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 4), lampLit);
      head.position.set(side * (ROAD_W / 2 + 1.5), 7.2, z);
      group.add(head);
    }
  });
}

// ================================================================
// §4  LAMBORGHINI BLACK CAR MODEL
// ================================================================

const playerCar = new THREE.Group();
const playerCarBody = new THREE.Group();
playerCar.add(playerCarBody);
scene.add(playerCar);

const wheelNodes = [];

function buildLamborghini() {
  // — Materials —
  const paintBlack = new THREE.MeshPhongMaterial({
    color: 0x050507, shininess: 180, specular: 0x4444aa
  });
  const paintGold = new THREE.MeshPhongMaterial({
    color: 0xd4a017, shininess: 200, specular: 0xffcc44
  });
  const carbon = new THREE.MeshPhongMaterial({ color: 0x111114, shininess: 20 });
  const glass  = new THREE.MeshPhongMaterial({
    color: 0x223344, transparent: true, opacity: 0.4, shininess: 200
  });
  const chrome = new THREE.MeshPhongMaterial({ color: 0xdddddd, shininess: 300 });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const rubber = new THREE.MeshPhongMaterial({ color: 0x0d0d0d, shininess: 5 });
  const rimMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 220 });
  const rimAccent = new THREE.MeshPhongMaterial({ color: 0xd4a017, shininess: 200 });

  function add(geo, mat, px, py, pz, rx, ry, rz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow = true;
    playerCarBody.add(m);
    return m;
  }

  // === BODY ===
  // Main lower body — wide & low
  add(new THREE.BoxGeometry(CAR_W * 0.98, CAR_H, CAR_L * 0.88), paintBlack, 0, 0.38, 0);

  // Flat aggressive hood (angled slope)
  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(-0.88, 0); hoodShape.lineTo(0.88, 0);
  hoodShape.lineTo(0.72, 0.18); hoodShape.lineTo(-0.72, 0.18); hoodShape.closePath();
  const hoodGeo = new THREE.ExtrudeGeometry(hoodShape, { depth: 1.5, bevelEnabled: false });
  const hoodM = new THREE.Mesh(hoodGeo, paintBlack);
  hoodM.rotation.x = Math.PI / 2;
  hoodM.position.set(-0.88, 0.60, -CAR_L * 0.44);
  hoodM.castShadow = true;
  playerCarBody.add(hoodM);

  // Cabin
  add(new THREE.BoxGeometry(CAR_W * 0.80, 0.54, 1.5), paintBlack, 0, 0.92, 0.1);

  // Roof (narrow Lambo roofline)
  add(new THREE.BoxGeometry(CAR_W * 0.70, 0.10, 1.35), paintBlack, 0, 1.24, 0.12);

  // Rear haunches (wide rear fenders)
  [-1, 1].forEach(s => {
    add(new THREE.BoxGeometry(0.24, 0.52, 1.6), paintBlack, s * (CAR_W * 0.5 + 0.08), 0.52, 0.3);
  });

  // Front splitter (carbon)
  add(new THREE.BoxGeometry(CAR_W * 1.05, 0.06, 0.22), carbon, 0, 0.10, -CAR_L * 0.44 - 0.11);

  // Side skirts
  [-1, 1].forEach(s => {
    add(new THREE.BoxGeometry(0.06, 0.18, CAR_L * 0.80), carbon, s * CAR_W * 0.52, 0.18, 0);
    // Gold accent stripe
    add(new THREE.BoxGeometry(0.03, 0.04, CAR_L * 0.70), paintGold, s * CAR_W * 0.55, 0.30, 0);
  });

  // Rear diffuser
  add(new THREE.BoxGeometry(CAR_W * 0.90, 0.22, 0.18), carbon, 0, 0.18, CAR_L * 0.44);

  // Rear wing
  add(new THREE.BoxGeometry(CAR_W * 1.1, 0.07, 0.26), carbon, 0, 1.08, CAR_L * 0.42);
  [-0.6, 0.6].forEach(x => {
    add(new THREE.BoxGeometry(0.06, 0.36, 0.08), chrome, x * CAR_W * 0.5, 0.90, CAR_L * 0.42);
  });

  // Windshield
  const ws = new THREE.Mesh(new THREE.BoxGeometry(CAR_W * 0.74, 0.48, 0.07), glass);
  ws.position.set(0, 0.92, -0.80); ws.rotation.x = 0.32;
  playerCarBody.add(ws);

  // Rear window
  const rw = new THREE.Mesh(new THREE.BoxGeometry(CAR_W * 0.62, 0.36, 0.07), glass);
  rw.position.set(0, 0.94, 1.0); rw.rotation.x = -0.26;
  playerCarBody.add(rw);

  // Side windows
  [-1, 1].forEach(s => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 1.15), glass);
    sw.position.set(s * CAR_W * 0.42, 0.96, 0.1);
    playerCarBody.add(sw);
  });

  // Headlights (angular LED style)
  [-1, 1].forEach(s => {
    add(new THREE.BoxGeometry(0.36, 0.08, 0.06), headlightMat, s * 0.62, 0.52, -CAR_L * 0.445);
    add(new THREE.BoxGeometry(0.22, 0.03, 0.06), headlightMat, s * 0.54, 0.44, -CAR_L * 0.445);
  });

  // Tail lights
  [-1, 1].forEach(s => {
    add(new THREE.BoxGeometry(0.40, 0.07, 0.06), taillightMat, s * 0.60, 0.52, CAR_L * 0.44);
    // Gold inner ring
    add(new THREE.BoxGeometry(0.18, 0.05, 0.06), paintGold, s * 0.60, 0.48, CAR_L * 0.441);
  });

  // Exhaust
  [-0.32, 0.32].forEach(x => {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.10, 8), chrome);
    ex.rotation.x = Math.PI / 2; ex.position.set(x, 0.22, CAR_L * 0.445);
    playerCarBody.add(ex);
  });

  // Front bumper / air intakes
  add(new THREE.BoxGeometry(0.52, 0.22, 0.08), carbon, 0, 0.30, -CAR_L * 0.445);
  [-0.5, 0.5].forEach(x => {
    add(new THREE.BoxGeometry(0.30, 0.16, 0.08), carbon, x, 0.22, -CAR_L * 0.445);
  });

  // === WHEELS ===
  const wDefs = [
    { x: -CAR_W * 0.52, z: -CAR_L * 0.33, front: true  },
    { x:  CAR_W * 0.52, z: -CAR_L * 0.33, front: true  },
    { x: -CAR_W * 0.52, z:  CAR_L * 0.31, front: false },
    { x:  CAR_W * 0.52, z:  CAR_L * 0.31, front: false },
  ];

  wDefs.forEach(wd => {
    const pivot = new THREE.Group();
    pivot.position.set(wd.x, 0.28, wd.z);
    playerCarBody.add(pivot);

    const spin = new THREE.Group();
    pivot.add(spin);

    // Tire
    const tireGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 20);
    const tire = new THREE.Mesh(tireGeo, rubber);
    tire.rotation.z = Math.PI / 2;
    spin.add(tire);

    // Rim disc
    const rimD = new THREE.CylinderGeometry(0.20, 0.20, 0.23, 12);
    const rimM = new THREE.Mesh(rimD, rimMat);
    rimM.rotation.z = Math.PI / 2;
    spin.add(rimM);

    // Lamborghini Y-spokes (5)
    for (let s = 0; s < 5; s++) {
      const spk = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.175, 0.22), rimMat);
      spk.rotation.z = Math.PI / 2;
      spk.rotation.x = (s / 5) * Math.PI * 2;
      spin.add(spk);
    }

    // Gold brake caliper
    const cali = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.24), rimAccent);
    cali.rotation.z = Math.PI / 2;
    spin.add(cali);

    // Hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.24, 8), chrome);
    hub.rotation.z = Math.PI / 2;
    spin.add(hub);

    wheelNodes.push({ pivot, spin, front: wd.front });
  });
}

// ================================================================
// §5  PLAYER FOOTMODEL (on foot)
// ================================================================

const playerFoot = new THREE.Group();
playerFoot.visible = false;
scene.add(playerFoot);

function buildPlayer() {
  const skinMat  = new THREE.MeshLambertMaterial({ color: 0xd4926a });
  const suitMat  = new THREE.MeshLambertMaterial({ color: 0x111118 });
  const gearMat  = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const visMat   = new THREE.MeshBasicMaterial({ color: 0xd4a017, transparent: true, opacity: 0.6 });

  function pAdd(geo, mat, px, py, pz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    playerFoot.add(m);
    return m;
  }

  // Helmet
  pAdd(new THREE.SphereGeometry(0.22, 10, 8), gearMat, 0, 1.78, 0);
  pAdd(new THREE.PlaneGeometry(0.30, 0.12), visMat, 0, 1.74, 0.21);

  // Torso (racing suit)
  pAdd(new THREE.BoxGeometry(0.44, 0.54, 0.22), suitMat, 0, 1.22, 0);

  // Gold stripe on suit
  pAdd(new THREE.BoxGeometry(0.06, 0.44, 0.24), new THREE.MeshBasicMaterial({ color: 0xd4a017 }), 0, 1.22, 0);

  // Arms
  [-1, 1].forEach(s => {
    pAdd(new THREE.BoxGeometry(0.14, 0.50, 0.14), suitMat, s * 0.31, 1.18, 0);
    pAdd(new THREE.SphereGeometry(0.08, 6, 5), skinMat, s * 0.31, 0.90, 0);
  });

  // Legs
  [-1, 1].forEach(s => {
    pAdd(new THREE.BoxGeometry(0.16, 0.52, 0.16), suitMat, s * 0.12, 0.68, 0);
    pAdd(new THREE.BoxGeometry(0.15, 0.42, 0.15), suitMat, s * 0.12, 0.20, 0);
    pAdd(new THREE.BoxGeometry(0.16, 0.10, 0.28), gearMat, s * 0.12, 0.04, 0.06);
  });
}

// ================================================================
// §6  ENEMY CARS
// ================================================================

const enemies = [];
const MAX_ENEMIES = 8;

function buildEnemyCar(colorHex) {
  const grp = new THREE.Group();
  const bodyGrp = new THREE.Group();
  grp.add(bodyGrp);

  const paintMat = new THREE.MeshPhongMaterial({ color: colorHex, shininess: 100 });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const glassMat = new THREE.MeshPhongMaterial({ color: 0x224466, transparent: true, opacity: 0.45 });

  function b(w, h, d, mat, px, py, pz) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz); m.castShadow = true;
    bodyGrp.add(m); return m;
  }

  b(1.70, 0.42, 3.80, paintMat, 0, 0.36, 0);
  b(1.56, 0.52, 1.70, paintMat, 0, 0.84, 0.1);
  b(1.38, 0.09, 1.50, paintMat, 0, 1.12, 0.1);
  b(0.05, 0.18, 3.60, darkMat, -0.88, 0.26, 0);
  b(0.05, 0.18, 3.60, darkMat,  0.88, 0.26, 0);

  // Glass
  const wsFront = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.42, 0.06), glassMat);
  wsFront.position.set(0, 0.86, -0.88); wsFront.rotation.x = 0.24;
  bodyGrp.add(wsFront);

  // Wheels
  const wubb = new THREE.MeshPhongMaterial({ color: 0x0d0d0d, shininess: 4 });
  const wrim = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 150 });
  [[-0.92,-1.25],[ 0.92,-1.25],[-0.92, 1.25],[ 0.92, 1.25]].forEach(([x, z]) => {
    const spin = new THREE.Group();
    spin.position.set(x, 0.28, z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.20, 16), wubb);
    tire.rotation.z = Math.PI / 2;
    spin.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.21, 8), wrim);
    rim.rotation.z = Math.PI / 2;
    spin.add(rim);
    bodyGrp.add(spin);
    grp._wheels = grp._wheels || [];
    grp._wheels.push(spin);
  });

  return grp;
}

function spawnEnemy() {
  if (enemies.length >= MAX_ENEMIES) return;
  const lane   = (Math.floor(Math.random() * 3) - 1) * (ROAD_W / 3.5);
  const colorH = ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)];
  const grp    = buildEnemyCar(colorH);
  grp.position.set(lane, 0, phys.position.z - 120 - Math.random() * 80);
  grp._speed   = 8 + Math.random() * 14;
  grp._lane    = lane;
  grp._lane_t  = Math.random() * 100;
  scene.add(grp);
  enemies.push(grp);
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e._lane_t += dt;
    // slow lane change
    const targetX = e._lane + Math.sin(e._lane_t * 0.4) * 2.5;
    e.position.x += (targetX - e.position.x) * 0.02;
    e.position.z += e._speed * dt;
    // spin wheels
    if (e._wheels) e._wheels.forEach(w => { w.rotation.x += (e._speed / 0.27) * dt; });

    // recycle when far behind
    if (e.position.z > phys.position.z + 80) {
      scene.remove(e);
      enemies.splice(i, 1);
    }
  }
  // spawn if needed
  if (gameState.playing && enemies.length < MAX_ENEMIES && Math.random() < 0.02) spawnEnemy();
}

// ================================================================
// §7  PHYSICS STATE
// ================================================================

const phys = {
  position:  new THREE.Vector3(0, 0, 0),
  yaw:       0,
  speed:     0,
  steer:     0,
  spinAngle: 0,
  suspY:     0,
  suspVY:    0,
  onGround:  true,
};

const C = {
  ACCEL:      20,
  BRAKE:      32,
  FRICTION:   5,
  HANDBRAKE:  44,
  MAX_FWD:    36,   // ~130 km/h
  MAX_REV:    10,
  WHEELBASE:  2.6,
  MAX_STEER:  0.48,
  STEER_IN:   2.8,
  STEER_OUT:  4.2,
  SPEED_UNDER:0.045,
  WHEEL_R:    0.28,
  SPRING:     60,
  DAMP:       10,
  CAM_LAG:    6,
  CAM_DIST:   9,
  CAM_H:      4.2,
  WALK_SPEED: 4,
  WALK_STEER: 2.2,
};

// ================================================================
// §8  GAME STATE
// ================================================================

const gameState = {
  playing:   false,
  inCar:     true,
  score:     0,
  health:    100,
  elapsed:   0,
  paused:    false,
};

// ================================================================
// §9  INPUT
// ================================================================

const K = {};
let prevE = false;

window.addEventListener('keydown', e => { K[e.code] = true;  e.preventDefault(); });
window.addEventListener('keyup',   e => { K[e.code] = false; });

// Mobile touch controls
let touchData = { fwd: false, rev: false, left: false, right: false, hb: false };
function buildTouchControls() {
  const ui = document.createElement('div');
  ui.style.cssText = `position:fixed;bottom:0;left:0;right:0;height:180px;z-index:500;pointer-events:none;display:flex;justify-content:space-between;align-items:flex-end;padding:16px;`;
  ui.innerHTML = `
    <div style="pointer-events:auto;display:grid;grid-template-columns:60px 60px 60px;grid-template-rows:60px 60px;gap:6px;">
      <div></div>
      <button id="t-fwd" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:20px;border-radius:8px;touch-action:none;">▲</button>
      <div></div>
      <button id="t-left" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:20px;border-radius:8px;touch-action:none;">◄</button>
      <button id="t-rev" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:20px;border-radius:8px;touch-action:none;">▼</button>
      <button id="t-right" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:20px;border-radius:8px;touch-action:none;">►</button>
    </div>
    <button id="t-hb" style="pointer-events:auto;background:rgba(212,160,23,0.25);border:1px solid rgba(212,160,23,0.5);color:#d4a017;font-family:monospace;font-size:10px;padding:12px 20px;border-radius:8px;letter-spacing:2px;touch-action:none;">HB</button>
  `;
  document.body.appendChild(ui);
  function bind(id, key) {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { touchData[key] = true; e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend',   e => { touchData[key] = false; e.preventDefault(); }, { passive: false });
  }
  bind('t-fwd',   'fwd'); bind('t-rev', 'rev');
  bind('t-left',  'left'); bind('t-right', 'right');
  bind('t-hb',    'hb');
}

function getInput() {
  return {
    fwd:   K.ArrowUp    || K.KeyW || touchData.fwd,
    rev:   K.ArrowDown  || K.KeyS || touchData.rev,
    left:  K.ArrowLeft  || K.KeyA || touchData.left,
    right: K.ArrowRight || K.KeyD || touchData.right,
    hb:    K.Space                 || touchData.hb,
    e:     K.KeyE,
  };
}

// ================================================================
// §10  ROAD TILE RECYCLING
// ================================================================

function updateRoad() {
  const pz = phys.position.z;
  roadTiles.forEach(tile => {
    const totalLen = TILE_COUNT * TILE_LEN;
    if (tile.position.z < pz - TILE_LEN * 2) {
      tile.position.z += totalLen;
    }
    if (tile.position.z > pz + TILE_LEN * (TILE_COUNT - 2)) {
      tile.position.z -= totalLen;
    }
  });
  // Move neon lights with player
  neon1.position.z = pz;
  neon2.position.z = pz;
}

// ================================================================
// §11  PHYSICS UPDATE
// ================================================================

function stepCarPhysics(dt, inp) {
  // Steering
  const tgtSteer = inp.left ? -C.MAX_STEER : inp.right ? C.MAX_STEER : 0;
  const sRate    = (inp.left || inp.right) ? C.STEER_IN : C.STEER_OUT;
  phys.steer    += (tgtSteer - phys.steer) * Math.min(sRate * dt, 1);

  // Acceleration
  let accel = 0;
  if (inp.fwd) accel = phys.speed >= 0 ? C.ACCEL : C.BRAKE;
  else if (inp.rev) accel = phys.speed > 0 ? -C.BRAKE : -C.ACCEL * 0.55;

  // Handbrake
  if (inp.hb) {
    const hb = C.HANDBRAKE * dt;
    phys.speed = phys.speed > 0 ? Math.max(0, phys.speed - hb) : Math.min(0, phys.speed + hb);
  }

  phys.speed += accel * dt;

  // Friction
  if (!inp.fwd && !inp.rev && !inp.hb) {
    const f = C.FRICTION * dt;
    phys.speed = Math.abs(phys.speed) < f ? 0 : phys.speed - Math.sign(phys.speed) * f;
  }

  phys.speed = THREE.MathUtils.clamp(phys.speed, -C.MAX_REV, C.MAX_FWD);

  // Bicycle steering
  const effSteer = phys.steer / (1 + Math.abs(phys.speed) * C.SPEED_UNDER);
  const yawRate  = (phys.speed / C.WHEELBASE) * Math.tan(effSteer);
  phys.yaw      += yawRate * dt;

  // Position
  phys.position.x += Math.sin(phys.yaw) * phys.speed * dt;
  phys.position.z += Math.cos(phys.yaw) * phys.speed * dt;

  // Road boundary
  const maxX = ROAD_W / 2 - 1.2;
  if (Math.abs(phys.position.x) > maxX) {
    phys.position.x = Math.sign(phys.position.x) * maxX;
    phys.speed *= 0.5;
  }

  // Suspension
  const springF  = (0 - phys.suspY) * C.SPRING;
  const dampF    = phys.suspVY * C.DAMP;
  phys.suspVY   += (springF - dampF) * dt;
  phys.suspY    += phys.suspVY * dt;

  // Wheel spin
  phys.spinAngle += (phys.speed / C.WHEEL_R) * dt;
}

// Walk physics
const walkState = { x: 0, z: 0, yaw: 0 };

function stepWalkPhysics(dt, inp) {
  if (inp.left)  walkState.yaw += C.WALK_STEER * dt;
  if (inp.right) walkState.yaw -= C.WALK_STEER * dt;
  if (inp.fwd) {
    walkState.x += Math.sin(walkState.yaw) * C.WALK_SPEED * dt;
    walkState.z += Math.cos(walkState.yaw) * C.WALK_SPEED * dt;
  }
  if (inp.rev) {
    walkState.x -= Math.sin(walkState.yaw) * C.WALK_SPEED * dt * 0.6;
    walkState.z -= Math.cos(walkState.yaw) * C.WALK_SPEED * dt * 0.6;
  }
  // Keep on road edge
  walkState.x = THREE.MathUtils.clamp(walkState.x, -(ROAD_W / 2 + 7), ROAD_W / 2 + 7);
}

// ================================================================
// §12  COLLISION DETECTION
// ================================================================

const _tempBox1 = new THREE.Box3();
const _tempBox2 = new THREE.Box3();
const playerBoxSize = new THREE.Vector3(CAR_W, CAR_H, CAR_L);

function checkCollisions() {
  _tempBox1.setFromCenterAndSize(
    new THREE.Vector3(phys.position.x, phys.suspY + CAR_H / 2, phys.position.z),
    playerBoxSize
  );

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    _tempBox2.setFromCenterAndSize(
      new THREE.Vector3(e.position.x, CAR_H / 2, e.position.z),
      new THREE.Vector3(1.8, 0.9, 4.0)
    );
    if (_tempBox1.intersectsBox(_tempBox2)) {
      const dmg = Math.abs(phys.speed - e._speed) * 1.5;
      applyDamage(dmg);
      phys.speed *= -0.3;
      showDamageFlash();
      // Push enemy
      e.position.z += 3;
    }
  }
}

function applyDamage(dmg) {
  gameState.health = Math.max(0, gameState.health - dmg);
  const fill = document.getElementById('hud-dmg-fill');
  fill.style.width = gameState.health + '%';
  if (gameState.health > 60) fill.style.background = '#2ecc71';
  else if (gameState.health > 30) fill.style.background = '#f39c12';
  else fill.style.background = '#e74c3c';

  if (gameState.health <= 0) triggerGameOver();
}

function showDamageFlash() {
  const el = document.getElementById('damage-flash');
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 120);
}

// ================================================================
// §13  VISUAL SYNC
// ================================================================

function syncCarMesh() {
  playerCar.position.set(phys.position.x, phys.suspY, phys.position.z);
  playerCar.rotation.y = phys.yaw;

  const pitch = THREE.MathUtils.clamp(phys.suspVY * 0.02, -0.07, 0.07);
  playerCarBody.rotation.x = THREE.MathUtils.lerp(playerCarBody.rotation.x, pitch, 0.1);

  wheelNodes.forEach(w => {
    if (w.front) w.pivot.rotation.y = phys.steer;
    w.spin.rotation.x = phys.spinAngle;
  });
}

// ================================================================
// §14  CAMERA
// ================================================================

const camPos  = new THREE.Vector3(0, 6, 12);
const camLook = new THREE.Vector3();
const camPosWalk = new THREE.Vector3();

function stepCamera(dt) {
  const lag = Math.min(C.CAM_LAG * dt, 1);

  if (gameState.inCar) {
    const spd  = Math.abs(phys.speed);
    const dist = C.CAM_DIST + spd * 0.14;
    const hgt  = C.CAM_H + spd * 0.05;

    const tPos = new THREE.Vector3(
      phys.position.x - Math.sin(phys.yaw) * dist,
      phys.suspY + hgt,
      phys.position.z - Math.cos(phys.yaw) * dist
    );
    camPos.lerp(tPos, lag);

    const ahead = 3 + spd * 0.07;
    const tLook = new THREE.Vector3(
      phys.position.x + Math.sin(phys.yaw) * ahead,
      phys.suspY + 1.0,
      phys.position.z + Math.cos(phys.yaw) * ahead
    );
    camLook.lerp(tLook, lag * 1.5);
  } else {
    // Walk camera (over-shoulder)
    const tPos = new THREE.Vector3(
      walkState.x - Math.sin(walkState.yaw) * 4,
      3.5,
      walkState.z - Math.cos(walkState.yaw) * 4
    );
    camPosWalk.lerp(tPos, lag);
    camPos.copy(camPosWalk);
    camLook.set(walkState.x, 1.5, walkState.z);
  }

  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

// ================================================================
// §15  HUD UPDATE
// ================================================================

let _lastScoreTick = 0;

function updateHUD(dt) {
  if (!gameState.playing) return;

  const kmh = Math.abs(phys.speed) * 3.6;

  // Score — based on speed & time
  if (gameState.inCar) {
    gameState.elapsed += dt;
    _lastScoreTick    += dt;
    if (_lastScoreTick > 0.1) {
      const pts = Math.floor(kmh * 0.04 + 0.5);
      gameState.score += pts;
      _lastScoreTick = 0;
    }
  }

  document.getElementById('hud-score').textContent = gameState.score;

  // Time
  const min = Math.floor(gameState.elapsed / 60);
  const sec = Math.floor(gameState.elapsed % 60).toString().padStart(2, '0');
  document.getElementById('hud-time').textContent = `${min}:${sec}`;

  // Speedometer canvas
  drawSpeedo(kmh);

  // Gear
  const gearEl = document.getElementById('speedo-gear');
  if (phys.speed < -0.5) { gearEl.textContent = 'R'; gearEl.style.color = '#ff7700'; }
  else if (kmh < 1)      { gearEl.textContent = 'N'; gearEl.style.color = '#cccc00'; }
  else {
    const g = kmh < 20 ? 1 : kmh < 40 ? 2 : kmh < 65 ? 3 : kmh < 90 ? 4 : kmh < 115 ? 5 : 6;
    gearEl.textContent = g; gearEl.style.color = '#d4a017';
  }

  // Status
  const st = document.getElementById('hud-status');
  const inp = getInput();
  if (inp.hb && Math.abs(phys.speed) > 1) st.textContent = 'HANDBRAKE';
  else if (phys.speed < -0.5)             st.textContent = 'REVERSE';
  else if (Math.abs(phys.speed) < 0.5)    st.textContent = 'STOPPED';
  else                                    st.textContent = 'DRIVE';

  // Enter/exit hints
  if (!gameState.inCar) {
    const dist = Math.hypot(
      walkState.x - phys.position.x,
      walkState.z - phys.position.z
    );
    document.getElementById('enter-hint').classList.toggle('hidden', dist > 6);
    document.getElementById('exit-hint').classList.add('hidden');
  } else {
    document.getElementById('exit-hint').classList.remove('hidden');
    document.getElementById('enter-hint').classList.add('hidden');
  }

  // Minimap
  drawMinimap();
}

// Speedometer canvas draw
const speedoCtx = document.getElementById('speedo-canvas').getContext('2d');
function drawSpeedo(kmh) {
  const w = 140, h = 140, cx = 70, cy = 70, r = 58;
  speedoCtx.clearRect(0, 0, w, h);

  // Background ring
  speedoCtx.beginPath();
  speedoCtx.arc(cx, cy, r, 0, Math.PI * 2);
  speedoCtx.strokeStyle = 'rgba(255,255,255,0.06)';
  speedoCtx.lineWidth = 10;
  speedoCtx.stroke();

  // Speed arc
  const startA = Math.PI * 0.75;
  const endA   = startA + (Math.PI * 1.5) * Math.min(kmh / 140, 1);
  const col    = kmh > 100 ? '#e74c3c' : kmh > 70 ? '#f39c12' : '#d4a017';
  speedoCtx.beginPath();
  speedoCtx.arc(cx, cy, r, startA, endA);
  speedoCtx.strokeStyle = col;
  speedoCtx.lineWidth = 8;
  speedoCtx.lineCap = 'round';
  speedoCtx.stroke();

  // Tick marks
  for (let v = 0; v <= 140; v += 20) {
    const a = startA + (Math.PI * 1.5) * (v / 140);
    const ix = cx + (r - 14) * Math.cos(a);
    const iy = cy + (r - 14) * Math.sin(a);
    const ox = cx + r * Math.cos(a);
    const oy = cy + r * Math.sin(a);
    speedoCtx.beginPath();
    speedoCtx.moveTo(ix, iy);
    speedoCtx.lineTo(ox, oy);
    speedoCtx.strokeStyle = 'rgba(255,255,255,0.3)';
    speedoCtx.lineWidth = 1.5;
    speedoCtx.stroke();
  }

  // Needle
  const needleA = startA + (Math.PI * 1.5) * Math.min(kmh / 140, 1);
  speedoCtx.beginPath();
  speedoCtx.moveTo(cx, cy);
  speedoCtx.lineTo(cx + (r - 18) * Math.cos(needleA), cy + (r - 18) * Math.sin(needleA));
  speedoCtx.strokeStyle = '#ffffff';
  speedoCtx.lineWidth = 1.5;
  speedoCtx.stroke();

  // KMH value
  document.getElementById('speedo-num').textContent = Math.round(kmh);
}

// Minimap
const minimapCtx = document.getElementById('minimap-canvas').getContext('2d');
function drawMinimap() {
  const W = 120, H = 120;
  minimapCtx.clearRect(0, 0, W, H);

  // Road outline
  minimapCtx.fillStyle = 'rgba(60,60,70,0.8)';
  minimapCtx.fillRect(0, 0, W, H);
  minimapCtx.fillStyle = 'rgba(40,40,50,1)';
  const roadPx = (ROAD_W / 200) * W * 3;
  minimapCtx.fillRect(W / 2 - roadPx / 2, 0, roadPx, H);

  // Scale: 1px = ~2m, centered on player
  const scale  = 0.8;
  const mapCX  = W / 2;
  const mapCZ  = H / 2;

  // Player dot
  minimapCtx.fillStyle = '#d4a017';
  minimapCtx.beginPath();
  minimapCtx.arc(mapCX, mapCZ, 4, 0, Math.PI * 2);
  minimapCtx.fill();

  // Heading arrow
  minimapCtx.save();
  minimapCtx.translate(mapCX, mapCZ);
  minimapCtx.rotate(-phys.yaw);
  minimapCtx.fillStyle = '#fff';
  minimapCtx.fillRect(-1, -10, 2, 8);
  minimapCtx.restore();

  // Enemies
  enemies.forEach(e => {
    const dx = (e.position.x - phys.position.x) * scale;
    const dz = (e.position.z - phys.position.z) * scale;
    const ex = mapCX + dx;
    const ey = mapCZ + dz;
    if (ex > 0 && ex < W && ey > 0 && ey < H) {
      minimapCtx.fillStyle = '#e74c3c';
      minimapCtx.fillRect(ex - 2, ey - 3, 4, 6);
    }
  });
}

// ================================================================
// §16  ENTER / EXIT CAR
// ================================================================

function enterCar() {
  gameState.inCar = true;
  playerCar.visible = true;
  playerFoot.visible = false;
  // Reset physics position to car
  phys.position.x = walkState.x;
  phys.position.z = walkState.z;
}

function exitCar() {
  gameState.inCar = false;
  phys.speed = 0;
  walkState.x   = phys.position.x + Math.sin(phys.yaw) * -2.5;
  walkState.z   = phys.position.z + Math.cos(phys.yaw) * -2.5;
  walkState.yaw = phys.yaw;
  playerFoot.visible = true;
  playerCar.visible  = true;
}

// ================================================================
// §17  GAME FLOW
// ================================================================

function startGame() {
  gameState.playing = true;
  gameState.inCar   = true;
  gameState.score   = 0;
  gameState.health  = 100;
  gameState.elapsed = 0;

  phys.position.set(0, 0, 0);
  phys.yaw   = 0;
  phys.speed = 0;
  phys.steer = 0;

  walkState.x = 0; walkState.z = 0; walkState.yaw = 0;

  document.getElementById('hud-dmg-fill').style.width = '100%';
  document.getElementById('hud-dmg-fill').style.background = '#2ecc71';

  playerCar.visible  = true;
  playerFoot.visible = false;

  // Clear enemies
  enemies.forEach(e => scene.remove(e));
  enemies.length = 0;
  for (let i = 0; i < 5; i++) spawnEnemy();

  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
}

function triggerGameOver() {
  gameState.playing = false;
  if (gameState.score > bestScore) {
    bestScore = gameState.score;
    localStorage.setItem('nero_best', bestScore);
  }
  document.getElementById('go-score').textContent = gameState.score;
  document.getElementById('go-best').textContent  = bestScore;
  document.getElementById('hud-best').textContent = bestScore;
  document.getElementById('gameover-screen').classList.remove('hidden');
  document.getElementById('hud').classList.add('hidden');
}

// ================================================================
// §18  MAIN LOOP
// ================================================================

let lastT = 0;
let prevEState = false;

function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min((ts - lastT) / 1000, 0.05);
  lastT = ts;
  if (dt <= 0) return;

  if (gameState.playing) {
    const inp = getInput();

    // Enter / exit car
    const ePressed = inp.e;
    if (ePressed && !prevEState) {
      if (gameState.inCar) exitCar();
      else {
        const dist = Math.hypot(walkState.x - phys.position.x, walkState.z - phys.position.z);
        if (dist < 6) enterCar();
      }
    }
    prevEState = ePressed;

    if (gameState.inCar) {
      stepCarPhysics(dt, inp);
      syncCarMesh();
      checkCollisions();
    } else {
      stepWalkPhysics(dt, inp);
      playerFoot.position.set(walkState.x, 0, walkState.z);
      playerFoot.rotation.y = walkState.yaw + Math.PI;
    }

    updateEnemies(dt);
    updateRoad();
    updateHUD(dt);
    stepCamera(dt);
  }

  renderer.render(scene, camera);
}

// ================================================================
// §19  INIT
// ================================================================

function init() {
  const bar = document.getElementById('loading-bar');
  const pct = document.getElementById('loading-pct');

  const steps = [
    ['Building road...', buildRoadEnvironment],
    ['Building Lamborghini...', buildLamborghini],
    ['Building player...', buildPlayer],
    ['Spawning traffic...', () => { for (let i = 0; i < 6; i++) spawnEnemy(); }],
    ['Building touch UI...', buildTouchControls],
  ];

  let i = 0;
  function doStep() {
    if (i >= steps.length) {
      bar.style.width = '100%';
      pct.textContent = '100%';
      setTimeout(() => {
        const ls = document.getElementById('loading-screen');
        ls.style.opacity = '0';
        setTimeout(() => {
          ls.remove();
          document.getElementById('title-screen').classList.remove('hidden');
        }, 600);
      }, 200);
      return;
    }
    const p = Math.round((i / steps.length) * 100);
    bar.style.width = p + '%';
    pct.textContent = p + '%';
    steps[i][1]();
    i++;
    setTimeout(doStep, 80);
  }
  doStep();

  camPos.set(0, C.CAM_H + 3, C.CAM_DIST + 3);
  camera.position.copy(camPos);
  camera.lookAt(0, 0, 0);

  // Buttons
  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-retry').addEventListener('click', startGame);

  requestAnimationFrame(ts => { lastT = ts; loop(ts); });
}

init();
