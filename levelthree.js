// ============================================================
// LEVEL 3 — DRAGON BOSS FIGHT
// Single arena. Boss picks the player as a target, pauses
// (telegraph), then charges in a straight line.
//   - Charge hits player  -> player loses 1 heart
//   - Charge misses, hits a wall -> boss takes 100 damage, stuns
// Repeats until boss hp <= 0 (win) or player runs out of hearts
// (stage restarts).

// PHASE 2 (boss hp <= 500): player is locked into bird form and
// throws rocks picked up from pedestals at the boss (100 dmg/rock,
// auto-aimed). The charge/telegraph/stun cycle keeps running
// throughout — the player has to dodge charges while collecting
// and throwing rocks.
// ============================================================

const BOSS3_STATE = {
  DORMANT: "dormant",
  AIMING: "aiming",
  CHARGING: "charging",
  STUNNED: "stunned",
  CHASING: "chasing", // ADDED — FLY-phase continuous pursuit
};

// ADDED — reuse chargeSpeed's neighbor; tune independently if it feels too fast/slow
const LEVEL3_BOSS_CONFIG = {
  maxHealth: 1000,
  wallDamage: 30,
  chargeSpeed: 6,
  chaseSpeed: 6.5,   // FLY-phase pursuit speed — increased from 4
  telegraphFrames: 90,
  stunFrames: 70,
  tileSpan: 2.5,
  triggerFraction: 0.35,
};

const PLAYER_HIT_INVINCIBLE_FRAMES = 90;
const LEVEL3_BOSS_HIT_FLASH_FRAMES = PLAYER_HIT_INVINCIBLE_FRAMES; // same duration and blink cadence as the player's invincibility flash

// ------------------------------------------------------------
// PHASE 2 — rock-throwing config
// ------------------------------------------------------------
const LEVEL3_PHASE = {
  SWIM: "swim", // phase 1 — fish, boss unarmed by the player
  FLY: "fly", // phase 2 — bird, rock-throwing unlocked
};

const ROCK_CONFIG = {
  damage: 25,
  throwSpeed: 10,
  hitRadius: 90, // how close a thrown rock must get to the boss to count as a hit — was 24, tiny next to the ~333x224 dragon sprite, so rocks visually overlapping it often didn't register
  respawnFrames: 180, // ~3s after a pedestal's rock is thrown, a new one appears
};

let level3Boss = null; // built in initLevel3BossFight()
let level3Barrier = null; // { x, y, w, h } collision rect at the tunnel mouth
let level3BarrierActive = false;

let level3Phase = LEVEL3_PHASE.SWIM;
let rockPedestals = []; // static pedestal positions, set once
let thrownRocks = []; // active in-flight projectiles

let level3BossPath = [];
let level3BossPathIndex = 0;
let level3BossPathRecalcTimer = 0;
// Stuck-detection/nudge state — see updateDragon() in sketch.js for why.
let level3BossStillFrames = 0;
let level3BossPrevX = 0;
let level3BossPrevY = 0;
let level3BossNudging = false;
let level3BossNudgeTargetY = 0;
let level3BossChargeStartX = 0; // position when a SWIM-phase charge begins — see the deadlock-breaking nudge in updateLevel3BossFight()
let level3BossChargeStartY = 0;
let level3BossDefeated = false;
let level3BossAnimFrame = 0; // own animation clock — see drawLevel3BossFightWorld() for why
let level3BossAnimTimer = 0;
let level3ChargeSoundIndex = 0; // cycles dragonScreech/dragonGrowl2 each charge

let level3ShowRockTutorial = false; // true right when entering the bird arena, until dismissed

// ------------------------------------------------------------
// EPILOGUE — plays out in the "end" area once the boss is
// defeated. Not a fight: dialogue, then a Y/N choice branching
// into a chase-death bad end or a portal-opening good end.
// ------------------------------------------------------------
const LEVEL3_EPILOGUE_STATE = {
  NONE: "none",
  IDLE: "idle",         // dragon waiting, player free to approach
  DIALOGUE: "dialogue", // lines advancing on Enter
  CHOICE: "choice",     // waiting for Y (offer rune) / N (attack)
  CHASING: "chasing",   // bad end — dragon hunts the player
  DEAD: "dead",         // bad end reached
  MIMIC: "mimic",       // good end — dragon copies player movement
};

let level3EpilogueState = LEVEL3_EPILOGUE_STATE.NONE;
let level3EndDragon = null;       // {x, y, w, h, facing}
let level3DialogueLines = [];
let level3DialogueIndex = 0;
let level3EpilogueLineTimer = 0;  // transient dragon remark right after the Y/N choice
let level3EpilogueLineText = "";  // which remark to show — set alongside the timer above



const LEVEL3_EPILOGUE_CONFIG = {
  approachDistance: 5 * TILE_SIZE, // CHANGED — 5 tiles instead of 2.5
  chaseSpeed: 6,          // CHANGED from 8 — was closing the gap almost instantly
  catchDistance: TILE_SIZE * 0.9,
  chaseWindupFrames: 75,  // ADDED — ~1.25s pause before the dragon actually moves
};

let level3ChaseWindupTimer = 0; // ADDED
// near your other epilogue / mimic constants
const LEVEL3_MIMIC_HYST = TILE_SIZE * 0.15; // ~7.5px tolerance to avoid jitter toggles

// Good-end follow behaviour: the dragon holds still as long as the
// player is within followRange of its hitbox edge (in either
// direction) and walks toward the player once they've wandered
// further than that, always facing them.
const LEVEL3_MIMIC_CONFIG = {
  followRange: 5 * TILE_SIZE,           // distance from the dragon's hitbox edge before it starts following
  followSpeed: HUMAN_SPEED * 1.15,      // a touch faster than the player so it can actually close the gap
};

let level3EndDragonIsMoving = false; // drives idle (bottom half) vs flying (top half) sprite rows
let level3MimicTargetY = 0; // ratchets upward only, as the player climbs to solid ground higher than its last value — see MIMIC vertical follow
let level3EndDragonChasing = false;  // hysteresis "intent to chase" flag, decoupled from animation

// Persistent (not re-declared per-frame) animation state for the
// epilogue dragon — separate from the shared boss-fight dragonAnimFrame
// so the two don't fight over animation speed.
let level3EndDragonAnimFrame = 0;
let level3EndDragonAnimTimer = 0;

// Reads the "dragon spawn" layer directly from the given area's JSON and
// returns its world-space centroid, or null if the layer isn't found.
function getLevel3BossSpawnPoint(arena) {
  if (!arena || !arena.json || !arena.json.layers) return null;

  const layer = arena.json.layers.find((l) => l.name === "dragon spawn");
  if (!layer || !layer.tiles.length) return null;

  let sx = 0, sy = 0;
  for (const t of layer.tiles) {
    sx += t.x * TILE_SIZE + TILE_SIZE / 2 + arena.bounds.x;
    sy += t.y * TILE_SIZE + TILE_SIZE / 2 + arena.bounds.y;
  }
  return {
    x: sx / layer.tiles.length,
    y: sy / layer.tiles.length,
  };
}

// ------------------------------------------------------------
// initLevel3BossFight() — called once from loadLevel(LEVEL_THREE)
// ------------------------------------------------------------

function initLevel3BossFight() {
  level3EpilogueState = LEVEL3_EPILOGUE_STATE.NONE;  // ADDED
level3EndDragon = null;                              // ADDED
level3EpilogueLineTimer = 0;                          // ADDED
level3EndDragonIsMoving = false;
level3EndDragonChasing = false;  // hysteresis "intent to chase" flag, decoupled from animation
level3EndDragonAnimFrame = 0;
level3EndDragonAnimTimer = 0;
level3BossAnimFrame = 0;
level3BossAnimTimer = 0;


  deactivateLevel3Barrier();

  const arena = findArea(levelAreas, "fish");
  const bossSpawn = getLevel3BossSpawnPoint(arena);
  const arenaX = bossSpawn ? bossSpawn.x : (arena ? arena.bounds.x + arena.bounds.w / 2 : WORLD_W / 2);
  const arenaY = bossSpawn ? bossSpawn.y : (arena ? arena.bounds.y + arena.bounds.h / 2 : WORLD_H / 2);
  const triggerX = arena
    ? arena.bounds.x + arena.bounds.w * LEVEL3_BOSS_CONFIG.triggerFraction
    : arenaX;

    
  level3Boss = {
    x: arenaX,
    y: arenaY,
    vx: 0,
    vy: 0,
    w: LEVEL3_BOSS_CONFIG.tileSpan * TILE_SIZE,
    h: LEVEL3_BOSS_CONFIG.tileSpan * TILE_SIZE,
    hp: LEVEL3_BOSS_CONFIG.maxHealth,
    maxHp: LEVEL3_BOSS_CONFIG.maxHealth,
    state: BOSS3_STATE.DORMANT,
    timer: LEVEL3_BOSS_CONFIG.telegraphFrames,
    facing: "left",
    targetX: arenaX,
    targetY: arenaY,
    triggerX,
    hitFlashTimer: 0, // ticks down after a hit — see drawLevel3BossFightWorld()'s blink
  };

  // Gate at the tunnel mouth — solid once the boss wakes, so the player
  // can't retreat out of the fight and the boss can't wander into the tunnel.
  const barrierThickness = TILE_SIZE * 0.5;
const barrierOffsetX = 2 * TILE_SIZE; // shifted half a tile further right from 1.5
level3Barrier = {
  x: triggerX - barrierThickness / 2 + barrierOffsetX,   // CHANGED
  y: arena ? arena.bounds.y : 0,
  w: barrierThickness,
  h: arena ? arena.bounds.h : WORLD_H,
};
  level3BarrierActive = false;

  // Phase 2 setup — pedestal positions relative to the arena bounds.
  // Tune these to taste against your actual tile map.
  level3Phase = LEVEL3_PHASE.SWIM;
  thrownRocks = [];

  player.carryingRock = false;
  player.health = player.maxHealth;
  player.invincible = false;
  player.invincibleTimer = 0;
  level3BossDefeated = false;

  level3CamZoomTarget = 0.8;

  level3FishSpawnBounds = getFishSpawnBounds();
}


function getFishSpawnBounds() {
  const arena = findArea(levelAreas, "fish");
  if (!arena || !arena.json || !arena.json.layers) return null;

  const layer = arena.json.layers.find((l) => l.name === "fish spawn");
  if (!layer || !layer.tiles.length) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of layer.tiles) {
    minX = Math.min(minX, t.x);
    minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + 1);
    maxY = Math.max(maxY, t.y + 1);
  }

  return {
    x: minX * TILE_SIZE + arena.bounds.x,
    y: minY * TILE_SIZE + arena.bounds.y,
    w: (maxX - minX) * TILE_SIZE,
    h: (maxY - minY) * TILE_SIZE,
  };
}

let level3FishSpawnBounds = null;

function playerInFishSpawn() {
  if (!level3FishSpawnBounds) return false;
  const b = level3FishSpawnBounds;
  return (
    player.x >= b.x && player.x < b.x + b.w &&
    player.y >= b.y && player.y < b.y + b.h
  );
}

// ------------------------------------------------------------
// Barrier helpers — guard against double-inserting into solidTiles
// ------------------------------------------------------------
function activateLevel3Barrier() {
  if (level3BarrierActive || !level3Barrier) return;
  solidTiles.push(level3Barrier);
  level3BarrierActive = true;
  if (chaseMusic && !chaseMusic.isPlaying()) chaseMusic.loop();
}

function deactivateLevel3Barrier() {
  if (!level3BarrierActive || !level3Barrier) return;
  const idx = solidTiles.indexOf(level3Barrier);
  if (idx !== -1) solidTiles.splice(idx, 1);
  level3BarrierActive = false;
}

function updateLevel3BarrierGate() {
  if (!level3Barrier || level3BarrierActive) return;

  const barrierRightEdge = level3Barrier.x + level3Barrier.w;
  if (player.x >= barrierRightEdge) {
    activateLevel3Barrier();
  }
}

// ------------------------------------------------------------
// Arena bounds helper — the fish area's world-space rect.
// ------------------------------------------------------------
function getLevel3ArenaBounds() {
  const key = level3Phase === LEVEL3_PHASE.FLY ? "bird" : "fish";
  const arena = findArea(levelAreas, key);
  return {
    left: arena ? arena.bounds.x : 0,
    right: arena ? arena.bounds.x + arena.bounds.w : WORLD_W,
    top: arena ? arena.bounds.y : 0,
    bottom: arena ? arena.bounds.y + arena.bounds.h : WORLD_H,
  };
}

// True if the boss's hitbox is touching the arena edge or any solid tile.
function level3BossHitsWall() {
  const halfW = level3Boss.w / 2;
  const halfH = level3Boss.h / 2;
  const b = getLevel3ArenaBounds();

  if (
    level3Boss.x - halfW <= b.left ||
    level3Boss.x + halfW >= b.right ||
    level3Boss.y - halfH <= b.top ||
    level3Boss.y + halfH >= b.bottom
  ) {
    return true;
  }

  for (const t of solidTiles) {
    if (HAZARD_LAYERS.includes(t.layerName)) continue; // spikes hurt on contact, but shouldn't block the charge itself
    const overlapsX =
      level3Boss.x + halfW > t.x && level3Boss.x - halfW < t.x + t.w;
    const overlapsY =
      level3Boss.y + halfH > t.y && level3Boss.y - halfH < t.y + t.h;
    if (overlapsX && overlapsY) return true;
  }

  return false;
}

function checkLevel3BossPlayerCollision() {
  if (!level3Boss || player.invincible) return;

  const halfW = level3Boss.w / 2;
  const halfH = level3Boss.h / 2;
  const closestX = constrain(
    player.x,
    level3Boss.x - halfW,
    level3Boss.x + halfW,
  );
  const closestY = constrain(
    player.y,
    level3Boss.y - halfH,
    level3Boss.y + halfH,
  );

  if (dist(player.x, player.y, closestX, closestY) < player.r) {
    playerTakeDragonHit();
  }
}

// ------------------------------------------------------------
// damageLevel3Boss() — single entry point for all boss damage, so
// the phase-2 threshold check only lives in one place. Used by both
// the wall-hit charge damage and thrown-rock hits.
// ------------------------------------------------------------
let level3DamageSoundIndex = 0; // alternates dragonHiss/dragonHurt/dragonHiss2 on every hit, fish or bird area alike

function damageLevel3Boss(amount) {
  level3Boss.hp = Math.max(0, level3Boss.hp - amount);

  if (level3Boss.hp <= 0) {
    stopAllGameSounds();
    level3BossDefeated = true;
    level3Boss = null;
    return;
  }

  // Only for hits the boss survives — a killing blow goes straight to
  // stopAllGameSounds() above instead, so there's no point starting (and
  // immediately cutting off) another sound on top of that.
  level3Boss.hitFlashTimer = LEVEL3_BOSS_HIT_FLASH_FRAMES;
  const damageSounds = [dragonHiss, dragonHurt, dragonHiss2];
  const damageSound = damageSounds[level3DamageSoundIndex % damageSounds.length];
  if (damageSound) damageSound.play();
  level3DamageSoundIndex++;

  if (level3Phase === LEVEL3_PHASE.SWIM && level3Boss.hp <= 800) {
    startLevel3Transition("The dragon raises its talons and transforms the terrain\naround you, bending the world to its will.\n\"quote,\" it spits.", enterLevel3FlyPhase);
    return;
  }

   if (level3Boss.hp <= 600) {
    stopAllGameSounds();
    level3BossDefeated = true;
    level3Boss = null;
    startLevel3Transition("The dragon transforms the world again, sweeping you to another environment, \"Adapt or die or smt.\"", moveToLevel3EndArea);
    return;
  }

}

// ------------------------------------------------------------
// LEVEL 3 STAGE TRANSITION — fades the screen to white, holds on a
// quoted line from the dragon, performs the actual area swap while
// fully white (hidden), then fades back out revealing the new area.
// ------------------------------------------------------------
const LEVEL3_TRANSITION_FADE_FRAMES = 45; // ~0.75s each way at 60fps
const LEVEL3_TRANSITION_HOLD_FRAMES = 150; // ~2.5s held at full white
let level3TransitionActive = false;
let level3TransitionTimer = 0;
let level3TransitionText = "";
let level3TransitionDidSwap = false;
let level3TransitionOnSwap = null;

function startLevel3Transition(text, onSwap) {
  level3TransitionActive = true;
  level3TransitionTimer = 0;
  level3TransitionText = text;
  level3TransitionDidSwap = false;
  level3TransitionOnSwap = onSwap;
  // White-flash transitions keep the original dragonGrowl — dragonGrowl2
  // replaced it everywhere else (charging, N-choice attack).
  if (dragonGrowl) dragonGrowl.play();
}

function updateLevel3Transition() {
  if (!level3TransitionActive) return;
  level3TransitionTimer++;

  // Swap area at the midpoint of the hold, while the screen is fully white.
  const swapAt = LEVEL3_TRANSITION_FADE_FRAMES + LEVEL3_TRANSITION_HOLD_FRAMES / 2;
  if (!level3TransitionDidSwap && level3TransitionTimer >= swapAt) {
    if (level3TransitionOnSwap) level3TransitionOnSwap();
    level3TransitionDidSwap = true;
  }

  const totalFrames = LEVEL3_TRANSITION_FADE_FRAMES * 2 + LEVEL3_TRANSITION_HOLD_FRAMES;
  if (level3TransitionTimer >= totalFrames) {
    level3TransitionActive = false;
  }
}

function drawLevel3Transition() {
  if (!level3TransitionActive) return;

  const fadeInEnd = LEVEL3_TRANSITION_FADE_FRAMES;
  const fadeOutStart = LEVEL3_TRANSITION_FADE_FRAMES + LEVEL3_TRANSITION_HOLD_FRAMES;
  const totalFrames = fadeOutStart + LEVEL3_TRANSITION_FADE_FRAMES;

  let alpha;
  if (level3TransitionTimer < fadeInEnd) {
    alpha = map(level3TransitionTimer, 0, fadeInEnd, 0, 255);
  } else if (level3TransitionTimer < fadeOutStart) {
    alpha = 255;
  } else {
    alpha = map(level3TransitionTimer, fadeOutStart, totalFrames, 255, 0);
  }

  push();
  noStroke();
  fill(255, alpha);
  rect(0, 0, width, height);

  if (alpha > 40) {
    fill(0, alpha);
    textFont("monospace");
    textAlign(CENTER, CENTER);
    textSize(18);
    text(`"${level3TransitionText}"`, width / 2, height / 2);
  }
  pop();
}

function hasLineOfSightLevel3(x0, y0, x1, y1) {
  const halfW = level3Boss.w / 2;
  const halfH = level3Boss.h / 2;
  const b = getLevel3ArenaBounds();
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const steps = Math.ceil(d / (TILE_SIZE * 0.5));

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;

    if (px - halfW <= b.left || px + halfW >= b.right || py - halfH <= b.top || py + halfH >= b.bottom)
      return false;

    for (const tile of solidTiles) {
      const overlapsX = px + halfW > tile.x && px - halfW < tile.x + tile.w;
      const overlapsY = py + halfH > tile.y && py - halfH < tile.y + tile.h;
      if (overlapsX && overlapsY) return false;
    }
  }
  return true;
}

function resolveLevel3BossSolidCollisions() {
  const halfW = level3Boss.w / 2;
  const halfH = level3Boss.h / 2;
  const b = getLevel3ArenaBounds();

  level3Boss.x = constrain(level3Boss.x, b.left + halfW, b.right - halfW);
  level3Boss.y = constrain(level3Boss.y, b.top + halfH, b.bottom - halfH);

  for (const t of solidTiles) {
    resolveBoxRect(level3Boss, halfW, halfH, t); // reuses the helper already in sketch.js
  }
}

function enterLevel3FlyPhase() {
  level3Phase = LEVEL3_PHASE.FLY;
  player.form = FORM_BIRD;
  player.vy = 0; // don't carry fish sink-velocity into bird gravity
  moveToLevel3BirdArena();
}

// Finds a named layer's tiles within an area's raw JSON data (e.g. a
// "player spawn" or "stone" marker layer), converting each tile from the
// JSON's local grid coords to world pixel coords (tile-centered).
function findAreaLayerWorldTiles(area, layerName) {
  const layer = area.json.layers.find((l) => l.name === layerName);
  if (!layer) return [];
  return layer.tiles.map((t) => ({
    x: area.bounds.x + t.x * TILE_SIZE + TILE_SIZE / 2,
    y: area.bounds.y + t.y * TILE_SIZE + TILE_SIZE / 2,
  }));
}

function moveToLevel3BirdArena() {
  const bird = findArea(levelAreas, "bird");
  if (!bird) return;

  deactivateLevel3Barrier();

  const spawnTiles = findAreaLayerWorldTiles(bird, "bird spawn");
  const spawn = spawnTiles[0] || {
    x: bird.bounds.x + bird.bounds.w / 2,
    y: bird.bounds.y + bird.bounds.h / 2,
  };

  player.x = spawn.x;
  player.y = spawn.y;
  player.vx = 0;
  player.vy = 0;
  player.form = FORM_BIRD;

  level3Boss.x = spawn.x + 16 * TILE_SIZE; // 16 tiles right of the player
  level3Boss.y = spawn.y;
  level3Boss.vx = 0;
  level3Boss.vy = 0;
  level3Boss.state = BOSS3_STATE.CHASING; // CHANGED from AIMING
  level3Boss.timer = 0;                    // CHANGED — telegraph timer no longer used here
  level3BossPath = [];                     // ADDED
  level3BossPathIndex = 0;                 // ADDED
  level3BossPathRecalcTimer = DRAGON_PATH_RECALC_INTERVAL; // ADDED — force a fresh path next frame
  level3BossStillFrames = 0;
  level3BossNudging = false;
  level3BossPrevX = level3Boss.x;
  level3BossPrevY = level3Boss.y;

  thrownRocks = [];
  const stoneTiles = findAreaLayerWorldTiles(bird, "stone");
  rockPedestals = stoneTiles.map((t) => ({ x: t.x, y: t.y, hasRock: true, respawnTimer: 0 }));

   level3ShowRockTutorial = true; // freezes the fight until the player dismisses this

  snapCameraToPlayer();
}

// ------------------------------------------------------------
// MAIN UPDATE — called every frame from drawLevelScreen()
// ------------------------------------------------------------
function updateLevel3BossFight() {
  if (!level3Boss || currentScreen !== LEVEL_THREE || gameState !== STATE_PLAY)
    return;

  if (level3Boss.hitFlashTimer > 0) level3Boss.hitFlashTimer--;
  level3CamZoomTarget = playerInFishSpawn() ? 0.8 : 0.65; // ADDED to zoom out for the boss arena, but not while the player is still in the fish spawn

  updateLevel3BarrierGate();

  if (playerInFishSpawn()) {
    level3Boss.state = BOSS3_STATE.DORMANT;
    return; // sleeping, no collision/telegraph/charge logic runs
  }
 // ADDED — bird arena: continuous pursuit instead of charge/telegraph/stun
  if (level3Phase === LEVEL3_PHASE.FLY) {
    if (level3ShowRockTutorial) return; // freeze boss/collision/rocks while the popup is up

    level3Boss.state = BOSS3_STATE.CHASING;
    updateLevel3BossChase();
    checkLevel3BossPlayerCollision();
    updateLevel3Rocks();
    return;
  }

  if (level3Boss.state === BOSS3_STATE.DORMANT) {
    level3Boss.state = BOSS3_STATE.AIMING;
    level3Boss.timer = LEVEL3_BOSS_CONFIG.telegraphFrames;
    return;
  }

  if (level3Boss.state === BOSS3_STATE.AIMING) {
    level3Boss.targetX = player.x;
    // Clamp how low the target can sit, but ONLY when the player is
    // actually resting on real ground close by — the boss's hitbox is
    // ~2.5 tiles tall, so aiming dead-center at a grounded player (whose
    // own hitbox is tiny) would put the target partway INSIDE the floor,
    // which made the boss register a wall-hit (and re-stun) almost the
    // instant it left AIMING, never actually traveling anywhere. Using
    // "nearest solid tile in either direction" here (instead of strictly
    // downward, within a real distance) was picking up unrelated rock/
    // ceiling formations elsewhere in the column, which is why the
    // telegraph line/reticle sometimes skewed toward the wrong spot.
    const halfH = level3Boss.h / 2;
    const floorBelow = findFloorBelow(player.x, player.y);
    const nearFloor = floorBelow !== null && floorBelow - player.y < TILE_SIZE * 1.5;
    level3Boss.targetY = nearFloor ? Math.min(player.y, floorBelow - halfH - 4) : player.y;
    //dragon facing the fish when aiming
    level3Boss.facing = (player.x < level3Boss.x) ? "left" : "right";

    level3Boss.timer--;
    if (level3Boss.timer <= 0) {
      const dx = level3Boss.targetX - level3Boss.x;
      const dy = level3Boss.targetY - level3Boss.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;

      //adding the anger state of dragon — alternate between the roar sounds each charge
      const chargeSounds = [dragonScreech, dragonGrowl2];
      const chargeSound = chargeSounds[level3ChargeSoundIndex % chargeSounds.length];
      if (chargeSound) chargeSound.play();
      level3ChargeSoundIndex++;

      level3Boss.vx = (dx / d) * LEVEL3_BOSS_CONFIG.chargeSpeed;
      level3Boss.vy = (dy / d) * LEVEL3_BOSS_CONFIG.chargeSpeed;
      level3Boss.facing = dx < 0 ? "left" : "right";
      level3Boss.state = BOSS3_STATE.CHARGING;
      level3BossChargeStartX = level3Boss.x;
      level3BossChargeStartY = level3Boss.y;
    }
  } else if (level3Boss.state === BOSS3_STATE.CHARGING) {
    const prevX = level3Boss.x;
    const prevY = level3Boss.y;

    level3Boss.x += level3Boss.vx;
    level3Boss.y += level3Boss.vy;

    if (level3BossHitsWall()) {
  level3Boss.x = prevX;
  level3Boss.y = prevY;
  level3Boss.vx = 0;
  level3Boss.vy = 0;
  level3Boss.state = BOSS3_STATE.STUNNED;
  level3Boss.timer = LEVEL3_BOSS_CONFIG.stunFrames;

  // If this charge barely moved at all before "hitting a wall", the boss
  // is either already overlapping solid ground the instant it started
  // (e.g. a grounded player puts the aim target right at floor height),
  // or it's bounced off a ceiling/overhang directly between it and the
  // player in a tight tunnel. Either way, reverting to prevX/prevY doesn't
  // help — that's the same stuck spot, and every future charge attempt
  // would repeat this immediately, forever, with zero net progress. Ease
  // it upward to break out, same as the FLY-phase chase does for a
  // snagged corner, searching progressively further up since a single
  // tile isn't always enough to clear a tall obstruction.
  const chargeTraveled = dist(level3Boss.x, level3Boss.y, level3BossChargeStartX, level3BossChargeStartY);
  if (chargeTraveled < TILE_SIZE) {
    let clearTiles = null;
    for (let tiles = 1; tiles <= 6; tiles++) {
      if (!level3BossBoxOverlapsSolid(level3Boss.x, level3Boss.y - tiles * TILE_SIZE)) {
        clearTiles = tiles;
        break;
      }
    }
    if (clearTiles !== null) {
      level3BossNudging = true;
      level3BossNudgeTargetY = level3Boss.y - clearTiles * TILE_SIZE;
    }
  }

  // Wall-slam damage only applies in the fish arena (phase 1 / SWIM).
  if (level3Phase === LEVEL3_PHASE.SWIM) {
    damageLevel3Boss(LEVEL3_BOSS_CONFIG.wallDamage);
    if (level3Boss.hp <= 0) return;
  }
}
  } else if (level3Boss.state === BOSS3_STATE.STUNNED) {
    if (level3BossNudging) {
      const diff = level3BossNudgeTargetY - level3Boss.y;
      if (Math.abs(diff) < LEVEL3_BOSS_CONFIG.chargeSpeed) {
        level3Boss.y = level3BossNudgeTargetY;
        level3BossNudging = false;
      } else {
        level3Boss.y += Math.sign(diff) * LEVEL3_BOSS_CONFIG.chargeSpeed;
      }
    }
    level3Boss.timer--;
    if (level3Boss.timer <= 0) {
      level3Boss.state = BOSS3_STATE.AIMING;
      level3Boss.timer = LEVEL3_BOSS_CONFIG.telegraphFrames;
    }
  }


  checkLevel3BossPlayerCollision();
  updateLevel3Rocks();
}

//this function is the pop-up that tells players what to do witht eh rocks in place
function drawLevel3RockTutorial() {
  if (!level3ShowRockTutorial) return;

  push();
  noStroke();
  fill(0, 0, 0, 170);
  rect(0, 0, width, height);

  textFont("monospace");
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(22);
  // Line 1
text("Grab rocks and press [E]", width / 2, height / 2 - 20);
// Line 2
text("to throw at the dragon (auto-aimed).", width / 2, height / 2 + 10);

  fill(200);
  textSize(13);
  text("Press [Enter] to continue", width / 2, height / 2 + 40);
  pop();
}

// ------------------------------------------------------------
// PHASE 2 — rock pickup / throw / in-flight update
// ------------------------------------------------------------
function updateLevel3Rocks() {
  if (level3Phase !== LEVEL3_PHASE.FLY) return;

  // Pedestal pickup — walk into a pedestal that currently has a rock
  for (const p of rockPedestals) {
    if (p.hasRock && !player.carryingRock) {
      if (dist(player.x, player.y, p.x, p.y) < 28) {
        p.hasRock = false;
        p.respawnTimer = ROCK_CONFIG.respawnFrames;
        player.carryingRock = true;
      }
    } else if (!p.hasRock) {
      p.respawnTimer--;
      if (p.respawnTimer <= 0) p.hasRock = true;
    }
  }

  // In-flight rocks — auto-aimed straight at the boss's position at throw time
  for (let i = thrownRocks.length - 1; i >= 0; i--) {
    const r = thrownRocks[i];
    r.x += r.vx;
    r.y += r.vy;
    r.life--;

    if (dist(r.x, r.y, level3Boss.x, level3Boss.y) < ROCK_CONFIG.hitRadius) {
      damageLevel3Boss(ROCK_CONFIG.damage);
      thrownRocks.splice(i, 1);
      continue;
    }
    if (r.life <= 0) thrownRocks.splice(i, 1);
  }
}

// Call this from keyPressed() on the throw-button binding
function throwLevel3Rock() {
  if (level3Phase !== LEVEL3_PHASE.FLY || !player.carryingRock) return;
  if (!level3Boss) return;

  const dx = level3Boss.x - player.x;
  const dy = level3Boss.y - player.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;

  thrownRocks.push({
    x: player.x,
    y: player.y,
    vx: (dx / d) * ROCK_CONFIG.throwSpeed,
    vy: (dy / d) * ROCK_CONFIG.throwSpeed,
    life: 90,
  });
  player.carryingRock = false;
}

// ------------------------------------------------------------
// PLAYER HIT / RESTART
// ------------------------------------------------------------
function playerTakeDragonHit() {
  if (player.invincible) return;

  player.health--;
  player.invincible = true;
  player.invincibleTimer = PLAYER_HIT_INVINCIBLE_FRAMES;
  if (diesound) diesound.play();

  if (player.health <= 0) restartLevel3Stage();
}

function restartLevel3Stage() {
  if (chaseMusic && chaseMusic.isPlaying()) chaseMusic.stop(); // don't let it linger through a reset

  if (level3Phase === LEVEL3_PHASE.FLY) {
    // Dying in the bird phase should retry just that phase — respawn at
    // its own spawn point with a fresh boss, not the whole fight reset
    // back to the fish phase.
    enterLevel3FlyPhase();
    if (level3Boss) level3Boss.hp = 800;
    player.health = player.maxHealth; // was missing — health stayed depleted across this retry
    if (chaseMusic && !chaseMusic.isPlaying()) chaseMusic.loop();
    return;
  }

  initLevel3BossFight(); // full reset: boss HP, phase, barrier, pedestals, rocks

  // Override player position — always the last fish-area checkpoint reached,
  // not the level's original start.
  const spawn = lastCheckpoint || playerStart;
  player.x = spawn.x;
  player.y = spawn.y;
  player.form = FORM_FISH;
  player.vx = 0;
  player.vy = 0;
  snapCameraToPlayer();
}

// ------------------------------------------------------------
// DRAWING — world-space (called pre-pop, inside camera transform)
// ------------------------------------------------------------
function drawLevel3BossFightWorld() {
  if (!level3Boss) return;

  // Tunnel gate — draw first so it sits behind the boss/telegraph
  if (level3BarrierActive && level3Barrier) {
    push();
    noStroke();
    fill(120, 40, 40, 200);
    rectMode(CORNER);
    rect(level3Barrier.x, level3Barrier.y, level3Barrier.w, level3Barrier.h);
    pop();
  }

  // Rock pedestals + carried/thrown rocks — drawn before the dragon so its
  // sprite renders on top of them, not the other way around.
  if (level3Phase === LEVEL3_PHASE.FLY) {
    push();
    imageMode(CENTER);
    for (const p of rockPedestals) {
      if (p.hasRock) {
        if (stoneImg) image(stoneImg, p.x, p.y, 80, 80);
        else { rectMode(CENTER); noStroke(); fill(150, 150, 150); ellipse(p.x, p.y, 45, 45); }
      }
    }
    for (const r of thrownRocks) {
      if (stoneImg) image(stoneImg, r.x, r.y, 80, 80);
      else { noStroke(); fill(150, 150, 150); ellipse(r.x, r.y, 45, 45); }
    }
    pop();

    // Carried-rock indicator above the player
    if (player.carryingRock) {
      push();
      imageMode(CENTER);
      if (stoneImg) image(stoneImg, player.x, player.y + 40, 80, 80);
      else { noStroke(); fill(150, 150, 150); ellipse(player.x, player.y - 30, 14, 14); }
      pop();
    }
  }

  push();
  imageMode(CENTER);

  // DRAGON AIMS AT FISH 
  // so the player has a fair read on where to dodge.
  if (level3Boss.state === BOSS3_STATE.AIMING && frameCount % 20 < 10) {
  stroke(255, 60, 60, 160);
  strokeWeight(3);

  // Telegraph line always points at the player's true center (matching the
  // reticle below), even though the actual charge target (level3Boss.targetY)
  // may be clamped slightly above a grounded player to avoid embedding in
  // the floor — otherwise the line visibly missed the reticle's middle.
  line(level3Boss.x, level3Boss.y, player.x, player.y);

  noFill();

  //ellipse(level3Boss.x, level3Boss.y, level3Boss.w * 1.4, level3Boss.h * 1.4);

  // NEW — crosshair-style aim reticle around the fish
  const rOuter = TILE_SIZE * 2.2;
  const rInner = TILE_SIZE * 0.6;

  // outer circle
  ellipse(player.x, player.y, rOuter, rOuter);
  // inner circle
  ellipse(player.x, player.y, rInner, rInner);

  // four tick marks
  const tick = TILE_SIZE * 0.4;
  line(player.x - tick, player.y, player.x - tick * 0.5, player.y);
  line(player.x + tick, player.y, player.x + tick * 0.5, player.y);
  line(player.x, player.y - tick, player.x, player.y - tick * 0.5);
  line(player.x, player.y + tick, player.x, player.y + tick * 0.5);

  // small center cross
  line(player.x - 4, player.y, player.x + 4, player.y);
  line(player.x, player.y - 4, player.x, player.y + 4);
}


  // This boss reads the shared dragonAnimFrame/dragonAnimTimer, but those
  // only ever advance inside drawDragon() (sketch.js), which returns
  // immediately since the level-2-only `dragon` global is null in level 3
  // — so the boss's sprite was frozen on frame 0 the whole fight. Give it
  // its own clock instead, same pattern as level3EndDragon's animation.
  level3BossAnimTimer++;
  if (level3BossAnimTimer >= DRAGON_SPRITE.animSpeed) {
    level3BossAnimTimer = 0;
    level3BossAnimFrame = (level3BossAnimFrame + 1) % DRAGON_SPRITE.numFrames;
  }

  const row =
    level3Boss.facing === "left"
      ? DRAGON_SPRITE.rows.flyingLeft
      : DRAGON_SPRITE.rows.flyingRight;

  const sx = level3BossAnimFrame * DRAGON_SPRITE.frameWidth;
  const sy = row * DRAGON_SPRITE.frameHeight;
  const dw = DRAGON_SPRITE.frameWidth * DRAGON_SPRITE.scale;
  const dh = DRAGON_SPRITE.frameHeight * DRAGON_SPRITE.scale;

  // Blink off every other 6-frame block while hitFlashTimer is running —
  // same cadence as the player's own invincibility flash in drawPlayer().
  const bossFlashedOut =
    level3Boss.hitFlashTimer > 0 && floor(level3Boss.hitFlashTimer / 6) % 2 === 0;

  // Angry sprite while telegraphing/mid-charge — same sheet layout as the
  // normal dragonSheet, just an angrier expression.
  const isAboutToCharge =
    level3Boss.state === BOSS3_STATE.AIMING || level3Boss.state === BOSS3_STATE.CHARGING;
  const bossSheet = isAboutToCharge && angryDragonSheet ? angryDragonSheet : dragonSheet;

  if (bossSheet && !bossFlashedOut) {
    image(
      bossSheet,
      level3Boss.x,
      level3Boss.y,
      dw,
      dh,
      sx,
      sy,
      DRAGON_SPRITE.frameWidth,
      DRAGON_SPRITE.frameHeight,
    );
  }

  pop();
}

// ------------------------------------------------------------
// DRAWING — screen-space HUD (called post-pop, plain screen coords)
// ------------------------------------------------------------
function drawLevel3HUD() {
  if (!level3Boss) return;

  if (!playerInFishSpawn()) {
  // Boss health bar
  const barW = 300;
  const barH = 18;
  const bx = width / 2 - barW / 2;
  const by = 16;

  push();
  noStroke();
  fill(0, 0, 0, 150);
  rect(bx - 4, by - 4, barW + 8, barH + 8, 6);
  fill(60, 60, 60);
  rect(bx, by, barW, barH, 4);

  const hpRatio = constrain(level3Boss.hp / level3Boss.maxHp, 0, 1);
  fill(220, 50, 50);
  rect(bx, by, barW * hpRatio, barH, 4);

  fill(255);
  textAlign(CENTER, CENTER);
  textFont("monospace");
  textSize(12);
  text(
    `BOSS  ${max(level3Boss.hp, 0)} / ${level3Boss.maxHp}`,
    bx + barW / 2,
    by + barH / 2,
  );
  pop();

  // Player HP bar — bottom center, shorter than the boss bar (which is
  // 300 wide) but same style/opacity so it's equally visible. Replaces the
  // old heart icons; player.maxHealth is 10, so each hit (health--) is
  // exactly 10 of this bar's 100.
  const hpBarW = 200;
  const hpBarH = 16;
  const hpBx = width / 2 - hpBarW / 2;
  const hpBy = height - 70;
  const hpValue = max(player.health, 0) * 10;

  push();
  noStroke();
  fill(0, 0, 0, 150);
  rect(hpBx - 4, hpBy - 4, hpBarW + 8, hpBarH + 8, 6);
  fill(60, 60, 60);
  rect(hpBx, hpBy, hpBarW, hpBarH, 4);

  fill(50, 200, 50);
  rect(hpBx, hpBy, hpBarW * constrain(hpValue / 100, 0, 1), hpBarH, 4);

  fill(255);
  textAlign(CENTER, CENTER);
  textFont("monospace");
  textSize(11);
  text(`Your HP  ${hpValue} / 100`, hpBx + hpBarW / 2, hpBy + hpBarH / 2);
  pop();
}

  // Carried-rock indicator (phase 2) — bottom of screen, same size/position
  // as the portal fade message (drawFadeMessage() in sketch.js) so it's
  // more noticeable than a small corner HUD label.
  if (level3Phase === LEVEL3_PHASE.FLY && player.carryingRock) {
    push();
    fill(20, 120, 10);
    textAlign(CENTER, CENTER);
    textFont("monospace");
    textSize(16);
    text("Homing rock ready — [E] to throw", width / 2, height / 2);
    pop();
  }

  drawLevel3RockTutorial();
}

// True if the boss's collision box, centered at (x,y), would overlap any
// currently-solid tile — a pure check, doesn't move anything. See
// dragonBoxOverlapsSolid() in sketch.js (same idea, level 2's dragon).
function level3BossBoxOverlapsSolid(x, y) {
  const halfW = level3Boss.w / 2;
  const halfH = level3Boss.h / 2;
  for (const t of solidTiles) {
    if (HAZARD_LAYERS.includes(t.layerName)) continue; // spikes hurt on contact, but shouldn't block movement
    const overlapX = Math.min(x + halfW, t.x + t.w) - Math.max(x - halfW, t.x);
    const overlapY = Math.min(y + halfH, t.y + t.h) - Math.max(y - halfH, t.y);
    if (overlapX > 0 && overlapY > 0) return true;
  }
  return false;
}

// ADDED — mirrors updateDragon()/recalcDragonPath() from level 2
function updateLevel3BossChase() {
  // Currently easing up out of a stuck spot (see below) — glide toward the
  // target tile instead of snapping, and skip normal path-following until
  // it arrives so the two movements don't fight each other.
  if (level3BossNudging) {
    const diff = level3BossNudgeTargetY - level3Boss.y;
    if (Math.abs(diff) < LEVEL3_BOSS_CONFIG.chaseSpeed) {
      level3Boss.y = level3BossNudgeTargetY;
      level3BossNudging = false;
    } else {
      level3Boss.y += Math.sign(diff) * LEVEL3_BOSS_CONFIG.chaseSpeed;
    }
    resolveLevel3BossSolidCollisions();
    level3BossPrevX = level3Boss.x;
    level3BossPrevY = level3Boss.y;
    return;
  }

  level3BossPathRecalcTimer++;
  if (
    level3BossPathRecalcTimer >= DRAGON_PATH_RECALC_INTERVAL ||
    level3BossPathIndex >= level3BossPath.length
  ) {
    level3BossPathRecalcTimer = 0;
    const path = recalcEntityPath(level3Boss, LEVEL3_BOSS_CONFIG.tileSpan, player.x, player.y);
    if (path) {
      level3BossPath = path;
      level3BossPathIndex = 0;
    }
  }

  let target = { x: player.x, y: player.y }; // fallback if no path yet
  if (level3BossPath.length > 0 && level3BossPathIndex < level3BossPath.length) {
    const isFinalNode = level3BossPathIndex === level3BossPath.length - 1;
    const node = level3BossPath[level3BossPathIndex];
    // Last leg homes in on the player's real position instead of the tile
    // center — see updateDragon() in sketch.js for why.
    target = isFinalNode
      ? { x: player.x, y: player.y }
      : { x: node.tx * TILE_SIZE + TILE_SIZE / 2, y: node.ty * TILE_SIZE + TILE_SIZE / 2 };
    const waypointRadius = Math.max(DRAGON_PATH_WAYPOINT_RADIUS, (level3Boss.w / 2) * 0.6);
    if (!isFinalNode && dist(level3Boss.x, level3Boss.y, target.x, target.y) < waypointRadius) {
      level3BossPathIndex++;
    }
  }

  const dx = target.x - level3Boss.x;
  const dy = target.y - level3Boss.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;

  level3Boss.x += (dx / d) * LEVEL3_BOSS_CONFIG.chaseSpeed;
  level3Boss.y += (dy / d) * LEVEL3_BOSS_CONFIG.chaseSpeed;
  level3Boss.facing = dx < 0 ? "left" : "right";

  resolveLevel3BossSolidCollisions();

  // If the boss hasn't actually moved for a while (snagged on a corner/
  // ledge), ease it up one tile to break out rather than sitting frozen —
  // but only if there's actually open space to move into.
  const moved = dist(level3Boss.x, level3Boss.y, level3BossPrevX, level3BossPrevY);
  if (moved < 0.5) {
    level3BossStillFrames++;
    if (level3BossStillFrames > 30) {
      if (!level3BossBoxOverlapsSolid(level3Boss.x, level3Boss.y - TILE_SIZE)) {
        level3BossNudging = true;
        level3BossNudgeTargetY = level3Boss.y - TILE_SIZE;
      }
      level3BossStillFrames = 0;
    }
  } else {
    level3BossStillFrames = 0;
  }
  level3BossPrevX = level3Boss.x;
  level3BossPrevY = level3Boss.y;
}

function moveToLevel3EndArea() {
  const end = findArea(levelAreas, "end");
  if (!end) return;

  deactivateLevel3Barrier();
  initLevel3Epilogue();
}

function initLevel3Epilogue() {
  const end = findArea(levelAreas, "end");
  if (!end) return;

  const halfSpan = (DRAGON_CONFIG.tileSpan * TILE_SIZE) / 2;

  // Player and dragon spawn at their named marker tiles — averaged in case
  // a marker spans more than one tile (e.g. "dragon spawn" is 2 tiles wide).
  const averageTiles = (tiles) =>
    tiles.length
      ? { x: tiles.reduce((s, t) => s + t.x, 0) / tiles.length, y: tiles.reduce((s, t) => s + t.y, 0) / tiles.length }
      : null;
  const humanSpawn = averageTiles(findAreaLayerWorldTiles(end, "human spawn")) || {
    x: end.bounds.x + 12 * TILE_SIZE,
    y: end.bounds.y + 26 * TILE_SIZE - player.r,
  };
  const dragonSpawn = averageTiles(findAreaLayerWorldTiles(end, "dragon spawn")) || {
    x: end.bounds.x + 32 * TILE_SIZE,
    y: end.bounds.y + 26 * TILE_SIZE - halfSpan,
  };

  player.x = humanSpawn.x;
  player.y = humanSpawn.y;
  player.vx = 0;
  player.vy = 0;
  player.form = FORM_HUMAN;
  // handleInput() (the only place that normally recomputes this) is locked
  // out during the white-flash transition, so if the player was mid-stride
  // when it started, isMoving stayed stuck true and the walking animation
  // kept playing after they landed here, frozen in place.
  player.isMoving = false;

  snapCameraToPlayer();
  level3CamZoomTarget = 0.8; // back to normal — no more boss-fight zoom

  // Dragon: near the right bark wall, facing back toward the player.
  level3EndDragon = {
    x: dragonSpawn.x,
    y: dragonSpawn.y,
    w: DRAGON_CONFIG.tileSpan * TILE_SIZE,
    h: DRAGON_CONFIG.tileSpan * TILE_SIZE,
    facing: "left",
  };

  level3EpilogueState = LEVEL3_EPILOGUE_STATE.IDLE;
  level3DialogueIndex = 0;
  level3DialogueLines = [
    { speaker: "Dragon", text: "You can't defeat me. I control this world." },
    { speaker: "You", text: "You've done nothing but make my journey harder." },
    { speaker: "Dragon", text: "But you've been getting better at navigating it." },
    { speaker: "You", text: "Whatever — just tell me how to open this portal!" },
    { speaker: "Dragon", text: "I need something from you first." },
  ];

  portalUnlocked = false; // stays shut until the rune is offered
}

// Plays the portal-opening sound exactly once, the first time the
// portal actually unlocks. Safe to call from multiple places.
function playPortalOpeningSoundOnce() {
  if (portalUnlocked && !portalOpeningPlayed) {
    if (portalOpeningSound) portalOpeningSound.play();
    if (portalChime) portalChime.play();
    showFadeMessage("A portal has opened somewhere...");
    portalOpeningPlayed = true;
  }
}

// DEBUG — sets up the epilogue (creating level3EndDragon etc. via
// initLevel3Epilogue()) and immediately applies the same branch the real
// Y/N keypress handler (sketch.js, LEVEL3_EPILOGUE_STATE.CHOICE) would.
// Solid tile's top edge directly above x/nearY, closest to nearY — used to
// re-ground the player after a debug teleport moves them sideways across
// terrain of a different height. Picking the tile nearest nearY (rather than
// the column's global topmost tile) avoids snapping to an unrelated tile
// far away, like a cave ceiling higher up the same column.
// Nearest solid tile's top edge strictly BELOW y in the given column, or
// null if there isn't one — unlike findGroundYAt() (which picks whichever
// tile is nearest in either direction, useful for re-grounding after a
// teleport), this only looks downward so it can't mistake a ceiling/rock
// formation above the player for "the floor."
function findFloorBelow(x, y) {
  let best = null;
  for (const t of solidTiles) {
    if (x >= t.x && x < t.x + t.w && t.y >= y) {
      if (best === null || t.y < best) best = t.y;
    }
  }
  return best;
}

function findGroundYAt(x, nearY) {
  let best = null;
  let bestDist = Infinity;
  for (const t of solidTiles) {
    if (x >= t.x && x < t.x + t.w) {
      const d = Math.abs(t.y - nearY);
      if (d < bestDist) { bestDist = d; best = t.y; }
    }
  }
  return best;
}

function debugTriggerLevel3EpilogueChoice(win) {
  initLevel3Epilogue();

  // Debug win/lose should drop the player where they'd actually be
  // talking to the dragon (within dialogue range), not all the way back
  // at "human spawn" — same side of the dragon they'd approach from.
  // "human spawn" and "dragon spawn" can sit at different ground heights,
  // so re-ground the player at the new x rather than keeping human spawn's y.
  if (level3EndDragon) {
    const halfW = level3EndDragon.w / 2;
    const talkEdgeDist = LEVEL3_MIMIC_CONFIG.followRange - TILE_SIZE;
    const side = player.x < level3EndDragon.x ? -1 : 1;
    player.x = level3EndDragon.x + side * (halfW + talkEdgeDist);

    const groundY = findGroundYAt(player.x, level3EndDragon.y);
    if (groundY !== null) player.y = groundY - player.r;
  }

  if (win) {
    level3EpilogueState = LEVEL3_EPILOGUE_STATE.MIMIC;
    if (level3EndDragon) {
      const halfW = level3EndDragon.w / 2;
      const gap = player.x - level3EndDragon.x;
      const edgeDist = Math.abs(gap) - halfW;
      level3EndDragonIsMoving = edgeDist > LEVEL3_MIMIC_CONFIG.followRange;
      level3EndDragon.facing = gap < 0 ? "left" : "right";
      level3MimicTargetY = level3EndDragon.y;
    }
    level3EpilogueLineText = "This will work. Let us depart together.";
    level3EpilogueLineTimer = 150;
    portalUnlocked = true;
  } else {
    level3ChaseWindupTimer = 0;
    level3EpilogueState = LEVEL3_EPILOGUE_STATE.CHASING;
    if (humanBGsound && humanBGsound.isPlaying()) humanBGsound.stop();
    if (chaseMusic && !chaseMusic.isPlaying()) chaseMusic.loop();
    if (dragonGrowl2) dragonGrowl2.play();
    level3EpilogueLineText = "So this is what you have chosen.";
    level3EpilogueLineTimer = 150;
  }
}


function updateLevel3Epilogue() {
  // Called unconditionally every frame — without this, leftover epilogue
  // state (e.g. still "chasing"/"mimic" from a finished run) kept updating
  // level3EndDragon's AI using level-3 coordinates after debug-jumping to
  // a different level entirely.
  if (currentScreen !== LEVEL_THREE) return;
  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.NONE || !level3EndDragon) return;

  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.IDLE) {
    level3EndDragon.facing = player.x < level3EndDragon.x ? "left" : "right";
    level3EndDragonIsMoving = false;
    // Same threshold/measurement the MIMIC state uses to decide when the
    // dragon starts following (edge-to-edge along x, not raw center
    // distance) — so dialogue triggers at exactly the same "how close is
    // close enough" point as the later follow behavior.
    const halfW = level3EndDragon.w / 2;
    const edgeDist = Math.abs(player.x - level3EndDragon.x) - halfW;
    if (edgeDist < LEVEL3_MIMIC_CONFIG.followRange) {
      level3EpilogueState = LEVEL3_EPILOGUE_STATE.DIALOGUE;
      level3DialogueIndex = 0;
    }
    return;
  }

  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.DIALOGUE) {
    level3EndDragon.facing = player.x < level3EndDragon.x ? "left" : "right";
    level3EndDragonIsMoving = false;
    return; // advance handled in keyPressed()
  }

  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.CHASING) {
  if (level3ChaseWindupTimer < LEVEL3_EPILOGUE_CONFIG.chaseWindupFrames) {   // ADDED block
    level3ChaseWindupTimer++;
    level3EndDragon.facing = player.x < level3EndDragon.x ? "left" : "right";
    level3EndDragonIsMoving = false;
    return;
  }

  const dx = player.x - level3EndDragon.x;
    const dy = player.y - level3EndDragon.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;

    level3EndDragon.x += (dx / d) * LEVEL3_EPILOGUE_CONFIG.chaseSpeed;
    level3EndDragon.y += (dy / d) * LEVEL3_EPILOGUE_CONFIG.chaseSpeed;
    level3EndDragon.facing = dx < 0 ? "left" : "right";
    level3EndDragonIsMoving = true;

    if (d < LEVEL3_EPILOGUE_CONFIG.catchDistance) {
      level3EpilogueState = LEVEL3_EPILOGUE_STATE.DEAD;
      if (diesound) diesound.play();
      stopAllGameSounds();
      gameState = STATE_OVER;
    }
    return;
  }

  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.MIMIC) {
  const halfW = level3EndDragon.w / 2;
  const gap = player.x - level3EndDragon.x;
  const edgeDist = Math.abs(gap) - halfW;

  level3EndDragon.facing = gap < 0 ? "left" : "right";

  const startThreshold = LEVEL3_MIMIC_CONFIG.followRange + LEVEL3_MIMIC_HYST;
  const stopThreshold  = LEVEL3_MIMIC_CONFIG.followRange - LEVEL3_MIMIC_HYST;

  // Hysteresis only decides whether the dragon INTENDS to chase right now —
  // it no longer controls the animation directly, so it can't strand it.
  if (edgeDist > startThreshold) {
    level3EndDragonChasing = true;
  } else if (edgeDist < stopThreshold) {
    level3EndDragonChasing = false;
  }
  // else: keep previous chasing intent — fine now, since movement below is clamped

  let moved = false;
  if (level3EndDragonChasing) {
    const dir = Math.sign(gap);
    // never step past the stop line — removes the dead zone entirely
    const step = Math.min(LEVEL3_MIMIC_CONFIG.followSpeed, Math.max(0, edgeDist - stopThreshold));
    if (step > 0.01) {
      level3EndDragon.x += dir * step;
      moved = true;
    } else {
      level3EndDragonChasing = false;
    }
  }

  // Vertical: tracks the player's ground level (2 tiles above it), both
  // rising and lowering — only updates once they've actually landed on
  // solid ground, not while they're mid-air on a jump arc, which would
  // otherwise bounce the dragon up and back down every hop instead of
  // just following real elevation changes (e.g. a staircase, in either
  // direction).
  if (player.isGrounded) {
    level3MimicTargetY = player.y - 2 * TILE_SIZE;
  }
  const dy = level3MimicTargetY - level3EndDragon.y;
  const yStep = Math.min(LEVEL3_MIMIC_CONFIG.followSpeed, Math.abs(dy));
  if (yStep > 0.01) {
    level3EndDragon.y += Math.sign(dy) * yStep;
    moved = true;
  }

  level3EndDragonIsMoving = moved; // reflects actual movement, never "stuck"
}
}

function drawLevel3EndDragon() {
  // Called unconditionally every frame regardless of screen — without this,
  // leftover epilogue state from a finished level 3 run (e.g. still "mimic"
  // after debug-jumping away) kept rendering the dragon at its level-3
  // world coordinates on top of whatever level you jumped to instead.
  if (currentScreen !== LEVEL_THREE) return;
  if (!level3EndDragon || level3EpilogueState === LEVEL3_EPILOGUE_STATE.NONE) return;
  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.DEAD) return;

  push();
  imageMode(CENTER);

  // Advance this dragon's own animation clock
  level3EndDragonAnimTimer++;
  if (level3EndDragonAnimTimer >= DRAGON_SPRITE.animSpeed) {
    level3EndDragonAnimTimer = 0;
    level3EndDragonAnimFrame = (level3EndDragonAnimFrame + 1) % DRAGON_SPRITE.numFrames;
  }

  const isMoving = !!level3EndDragonIsMoving;
  const row = level3EndDragon.facing === "left"
    ? (isMoving ? DRAGON_SPRITE.rows.flyingLeft : DRAGON_SPRITE.rows.idleLeft)
    : (isMoving ? DRAGON_SPRITE.rows.flyingRight : DRAGON_SPRITE.rows.idleRight);

  const sx = level3EndDragonAnimFrame * DRAGON_SPRITE.frameWidth;
  const sy = row * DRAGON_SPRITE.frameHeight;
  const dw = DRAGON_SPRITE.frameWidth * DRAGON_SPRITE.scale;
  const dh = DRAGON_SPRITE.frameHeight * DRAGON_SPRITE.scale;

  // After choosing N, the dragon turns on the player — same angry sprite
  // used for the boss-fight charge telegraph.
  const endDragonSheet =
    level3EpilogueState === LEVEL3_EPILOGUE_STATE.CHASING && angryDragonSheet
      ? angryDragonSheet
      : dragonSheet;

  if (endDragonSheet) {
    image(endDragonSheet, level3EndDragon.x, level3EndDragon.y, dw, dh,
          sx, sy, DRAGON_SPRITE.frameWidth, DRAGON_SPRITE.frameHeight);
  }

  pop();
}

function drawLevel3DialogueUI() {
  const showing =
    level3EpilogueState === LEVEL3_EPILOGUE_STATE.DIALOGUE ||
    level3EpilogueState === LEVEL3_EPILOGUE_STATE.CHOICE ||
    level3EpilogueLineTimer > 0;
  if (!showing) return;

  // Anchored to the TOP of the screen instead of the bottom, since the
  // player/dragon sprites are down at the bottom and the box used to
  // cover them.
  const boxH = height * 0.32;
  push();
  noStroke();
  fill(0, 0, 0, 200);
  rect(0, 0, width, boxH);

  textFont("monospace");
  textAlign(LEFT, TOP);

  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.DIALOGUE) {
    const line = level3DialogueLines[level3DialogueIndex];
    fill(230, 200, 80);
    textSize(14);
    text(line.speaker, 24, 16);
    fill(255);
    textSize(16);
    text(line.text, 24, 40, width - 48);
    fill(200);
    textSize(11);
    textAlign(RIGHT, BOTTOM);
    text("[Enter] Continue", width - 20, boxH - 12);
  } else if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.CHOICE) {
    fill(230, 200, 80);
    textSize(14);
    text("Dragon", 24, 16);
    fill(255);
    textSize(16);
    text("I need something from you first.", 24, 40, width - 48);
    textSize(14);
    text('[Y] Offer a rune        [N] Attack the dragon', 24, 80);
  } else if (level3EpilogueLineTimer > 0) {
    fill(230, 200, 80);
    textSize(14);
    text("Dragon", 24, 16);
    fill(255);
    textSize(16);
    text(level3EpilogueLineText, 24, 40);
    level3EpilogueLineTimer--;
    // Portal is already mechanically unlocked (set the moment Y was chosen)
    // — this is just the sound/message cue, timed to land right after the
    // line finishes rather than talking over it. Gated on portalUnlocked so
    // the N-choice's own remark (portal stays locked) doesn't also fire it.
    if (level3EpilogueLineTimer === 0 && portalUnlocked && !portalOpeningPlayed) {
      if (portalOpeningSound) portalOpeningSound.play();
      if (portalChime) portalChime.play();

      showFadeMessage("A portal has opened...");
      portalOpeningPlayed = true;
    }
  }
  pop();
}

function drawLevel3BadEndScreen() {
  push();
  noStroke();
  fill(0, 0, 0, 220);
  rect(0, 0, width, height);
  fill(200, 40, 40);
  textFont("monospace");
  textAlign(CENTER, CENTER);
  textSize(28);
  text("YOU DIED", width / 2, height / 2 - 20);
  fill(255);
  textSize(14);
  text("The dragon was right. You cannot win in brute combat.", width / 2, height / 2 + 20);
  fill(200);
  textSize(13);
  text("Press Enter to retry", width / 2, height / 2 + 50);
  pop();
}