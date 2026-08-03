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
  wallDamage: 50,
  chargeSpeed: 6,
  chaseSpeed: 4,   // ADDED — FLY-phase pursuit speed
  telegraphFrames: 90,
  stunFrames: 70,
  tileSpan: 2.5,
  triggerFraction: 0.35,
};

const PLAYER_HIT_INVINCIBLE_FRAMES = 90;

// ------------------------------------------------------------
// PHASE 2 — rock-throwing config
// ------------------------------------------------------------
const LEVEL3_PHASE = {
  SWIM: "swim", // phase 1 — fish, boss unarmed by the player
  FLY: "fly", // phase 2 — bird, rock-throwing unlocked
};

const ROCK_CONFIG = {
  damage: 100,
  throwSpeed: 10,
  hitRadius: 24, // how close a thrown rock must get to the boss to count as a hit
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
let level3BossDefeated = false;

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
let level3EpilogueLineTimer = 0;  // transient "This will work." line after choosing Y
let level3MimicLastPlayerX = 0;
let level3MimicLastPlayerY = 0;

const LEVEL3_EPILOGUE_CONFIG = {
  approachDistance: 2.5 * TILE_SIZE, // how close the player must walk to start dialogue
  chaseSpeed: 8,                     // faster than HUMAN_SPEED (7) — the box is inescapable
  catchDistance: TILE_SIZE * 0.9,
};

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
  };

  // Gate at the tunnel mouth — solid once the boss wakes, so the player
  // can't retreat out of the fight and the boss can't wander into the tunnel.
  const barrierThickness = TILE_SIZE * 0.5;
const barrierOffsetX = 1.5 * TILE_SIZE; // ADDED — shift barrier away from the entrance
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
function damageLevel3Boss(amount) {
  level3Boss.hp = Math.max(0, level3Boss.hp - amount);

  if (level3Boss.hp <= 0) {
    stopAllGameSounds();
    level3BossDefeated = true;
    level3Boss = null;
    return;
  }

  if (level3Phase === LEVEL3_PHASE.SWIM && level3Boss.hp <= 800) {
    enterLevel3FlyPhase();
  }

   if (level3Boss.hp <= 600) {
    stopAllGameSounds();
    level3BossDefeated = true;
    level3Boss = null;
    moveToLevel3EndArea();   // ADDED
    return;
  }

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

function moveToLevel3BirdArena() {
  const bird = findArea(levelAreas, "bird");
  if (!bird) return;

  deactivateLevel3Barrier();

  const cx = bird.bounds.x + bird.bounds.w / 2;
  const cy = bird.bounds.y + bird.bounds.h / 2;

  player.x = cx;
player.y = cy;                    // CHANGED — player now spawns at ground level
  player.vx = 0;
  player.vy = 0;
  player.form = FORM_BIRD;

  level3Boss.x = cx;
level3Boss.y = cy - 2 * TILE_SIZE; // CHANGED — boss now spawns above,
  level3Boss.vx = 0;
  level3Boss.vy = 0;
  level3Boss.state = BOSS3_STATE.CHASING; // CHANGED from AIMING
  level3Boss.timer = 0;                    // CHANGED — telegraph timer no longer used here
  level3BossPath = [];                     // ADDED
  level3BossPathIndex = 0;                 // ADDED
  level3BossPathRecalcTimer = DRAGON_PATH_RECALC_INTERVAL; // ADDED — force a fresh path next frame

  thrownRocks = [];
  rockPedestals = [
    { x: bird.bounds.x + bird.bounds.w * 0.25, y: bird.bounds.y + bird.bounds.h * 0.2, hasRock: true, respawnTimer: 0 },
    { x: bird.bounds.x + bird.bounds.w * 0.55, y: bird.bounds.y + bird.bounds.h * 0.35, hasRock: true, respawnTimer: 0 },
    { x: bird.bounds.x + bird.bounds.w * 0.85, y: bird.bounds.y + bird.bounds.h * 0.2, hasRock: true, respawnTimer: 0 },
    { x: bird.bounds.x + bird.bounds.w * 0.4, y: bird.bounds.y + bird.bounds.h * 0.75, hasRock: true, respawnTimer: 0 },
  ];

  camX = constrain(player.x - width / 2, 0, WORLD_W - width);
  camY = constrain(player.y - height / 2, 0, WORLD_H - height);
}
// ------------------------------------------------------------
// MAIN UPDATE — called every frame from drawLevelScreen()
// ------------------------------------------------------------
function updateLevel3BossFight() {
  if (!level3Boss || currentScreen !== LEVEL_THREE || gameState !== STATE_PLAY)
    return;
  level3CamZoomTarget = playerInFishSpawn() ? 0.8 : 0.6; // ADDED to zoom out for the boss arena, but not while the player is still in the fish spawn

  updateLevel3BarrierGate();

  if (playerInFishSpawn()) {
    level3Boss.state = BOSS3_STATE.DORMANT;
    return; // sleeping, no collision/telegraph/charge logic runs
  }

  // ADDED — bird arena: continuous pursuit instead of charge/telegraph/stun
  if (level3Phase === LEVEL3_PHASE.FLY) {
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
    level3Boss.targetY = player.y;

    level3Boss.timer--;
    if (level3Boss.timer <= 0) {
      const dx = level3Boss.targetX - level3Boss.x;
      const dy = level3Boss.targetY - level3Boss.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;

      level3Boss.vx = (dx / d) * LEVEL3_BOSS_CONFIG.chargeSpeed;
      level3Boss.vy = (dy / d) * LEVEL3_BOSS_CONFIG.chargeSpeed;
      level3Boss.facing = dx < 0 ? "left" : "right";
      level3Boss.state = BOSS3_STATE.CHARGING;
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
  dragonGrowl.play();

  // Wall-slam damage only applies in the fish arena (phase 1 / SWIM).
  if (level3Phase === LEVEL3_PHASE.SWIM) {
    damageLevel3Boss(LEVEL3_BOSS_CONFIG.wallDamage);
    if (level3Boss.hp <= 0) return;
  }
}
  } else if (level3Boss.state === BOSS3_STATE.STUNNED) {
    level3Boss.timer--;
    if (level3Boss.timer <= 0) {
      level3Boss.state = BOSS3_STATE.AIMING;
      level3Boss.timer = LEVEL3_BOSS_CONFIG.telegraphFrames;
    }
  }


  checkLevel3BossPlayerCollision();
  updateLevel3Rocks();
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
  initLevel3BossFight(); // full reset: boss HP, phase, barrier, pedestals, rocks

  // Override player position — always the last fish-area checkpoint reached,
  // not the level's original start.
  const spawn = lastCheckpoint || playerStart;
  player.x = spawn.x;
  player.y = spawn.y;
  player.form = FORM_FISH;
  player.vx = 0;
  player.vy = 0;
  camX = constrain(player.x - width / 2, 0, WORLD_W - width);
  camY = constrain(player.y - height / 2, 0, WORLD_H - height);
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

  push();
  imageMode(CENTER);

  // Telegraph — a flashing line toward the locked-in charge target,
  // so the player has a fair read on where to dodge.
  if (level3Boss.state === BOSS3_STATE.AIMING && frameCount % 20 < 10) {
    stroke(255, 60, 60, 160);
    strokeWeight(3);
    line(level3Boss.x, level3Boss.y, level3Boss.targetX, level3Boss.targetY);
    noFill();
    ellipse(level3Boss.x, level3Boss.y, level3Boss.w * 1.4, level3Boss.h * 1.4);
  }

  dragonAnimTimer++;
  if (dragonAnimTimer >= DRAGON_SPRITE.animSpeed) {
    dragonAnimTimer = 0;
    dragonAnimFrame = (dragonAnimFrame + 1) % DRAGON_SPRITE.numFrames;
  }

  const row =
    level3Boss.facing === "left"
      ? DRAGON_SPRITE.rows.flyingLeft
      : DRAGON_SPRITE.rows.flyingRight;

  const sx = dragonAnimFrame * DRAGON_SPRITE.frameWidth;
  const sy = row * DRAGON_SPRITE.frameHeight;
  const dw = DRAGON_SPRITE.frameWidth * DRAGON_SPRITE.scale;
  const dh = DRAGON_SPRITE.frameHeight * DRAGON_SPRITE.scale;

  if (dragonSheet) {
    image(
      dragonSheet,
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

  // Rock pedestals + carried/thrown rocks
  if (level3Phase === LEVEL3_PHASE.FLY) {
    push();
    rectMode(CENTER);
    for (const p of rockPedestals) {
      fill(120, 90, 60);
      noStroke();
      rect(p.x, p.y + 10, 36, 16, 4); // pedestal base
      if (p.hasRock) {
        fill(150, 150, 150);
        ellipse(p.x, p.y - 6, 22, 20);
      }
    }
    for (const r of thrownRocks) {
      fill(150, 150, 150);
      noStroke();
      ellipse(r.x, r.y, 14, 14);
    }
    pop();

    // Carried-rock indicator above the player
    if (player.carryingRock) {
      push();
      fill(150, 150, 150);
      noStroke();
      ellipse(player.x, player.y - 30, 14, 14);
      pop();
    }
  }
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
}

  // Player hearts
  const heartSize = 22;
  const heartPad = 4;
  const startX = 16;
  const startY = 16;

  push();
  noStroke();
  for (let i = 0; i < player.maxHealth; i++) {
    const hx = startX + i * (heartSize + heartPad);
    fill(i < player.health ? color(220, 50, 50) : color(70, 70, 70));
    ellipse(hx + heartSize / 2, startY + heartSize / 2, heartSize, heartSize);
  }
  pop();

  // Carried-rock indicator (phase 2)
  if (level3Phase === LEVEL3_PHASE.FLY && player.carryingRock) {
    push();
    fill(255);
    textAlign(LEFT, TOP);
    textFont("monospace");
    textSize(12);
    text("Rock ready — [SPACE] to throw", startX, startY + heartSize + 12);
    pop();
  }
}

// ADDED — mirrors updateDragon()/recalcDragonPath() from level 2
function updateLevel3BossChase() {
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
    const node = level3BossPath[level3BossPathIndex];
    target = {
      x: node.tx * TILE_SIZE + TILE_SIZE / 2,
      y: node.ty * TILE_SIZE + TILE_SIZE / 2,
    };
    if (dist(level3Boss.x, level3Boss.y, target.x, target.y) < DRAGON_PATH_WAYPOINT_RADIUS) {
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

  const groundY = end.bounds.y + 26 * TILE_SIZE; // top of the grass row (confirmed from the JSON)
  const halfSpan = (DRAGON_CONFIG.tileSpan * TILE_SIZE) / 2;

  // Player: on solid ground, between the dragon and the door.
  player.x = end.bounds.x + 12 * TILE_SIZE;
  player.y = end.bounds.y + 24 * TILE_SIZE; // a couple tiles above the floor — gravity settles it
  player.vx = 0;
  player.vy = 0;
  player.form = FORM_HUMAN;

  camX = constrain(player.x - width / 2, 0, WORLD_W - width);
  camY = constrain(player.y - height / 2, 0, WORLD_H - height);
  level3CamZoomTarget = 0.8; // back to normal — no more boss-fight zoom

  // Dragon: to the player's left, standing on the same ground.
  level3EndDragon = {
    x: end.bounds.x + 8 * TILE_SIZE,
    y: groundY - halfSpan,
    w: DRAGON_CONFIG.tileSpan * TILE_SIZE,
    h: DRAGON_CONFIG.tileSpan * TILE_SIZE,
    facing: "right",
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

function updateLevel3Epilogue() {
  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.NONE || !level3EndDragon) return;

  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.IDLE) {
    level3EndDragon.facing = player.x < level3EndDragon.x ? "left" : "right";
    if (dist(player.x, player.y, level3EndDragon.x, level3EndDragon.y) < LEVEL3_EPILOGUE_CONFIG.approachDistance) {
      level3EpilogueState = LEVEL3_EPILOGUE_STATE.DIALOGUE;
      level3DialogueIndex = 0;
    }
    return;
  }

  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.DIALOGUE) {
    level3EndDragon.facing = player.x < level3EndDragon.x ? "left" : "right";
    return; // advance handled in keyPressed()
  }

  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.CHASING) {
    const dx = player.x - level3EndDragon.x;
    const dy = player.y - level3EndDragon.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;

    level3EndDragon.x += (dx / d) * LEVEL3_EPILOGUE_CONFIG.chaseSpeed;
    level3EndDragon.y += (dy / d) * LEVEL3_EPILOGUE_CONFIG.chaseSpeed;
    level3EndDragon.facing = dx < 0 ? "left" : "right";

    if (d < LEVEL3_EPILOGUE_CONFIG.catchDistance) {
      level3EpilogueState = LEVEL3_EPILOGUE_STATE.DEAD;
      if (diesound) diesound.play();
      stopAllGameSounds();
      gameState = STATE_OVER;
    }
    return;
  }

  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.MIMIC) {
    const dx = player.x - level3MimicLastPlayerX;
    const dy = player.y - level3MimicLastPlayerY;
    level3EndDragon.x += dx;
    level3EndDragon.y += dy;
    if (dx !== 0) level3EndDragon.facing = dx < 0 ? "left" : "right";

    level3MimicLastPlayerX = player.x;
    level3MimicLastPlayerY = player.y;
    return;
  }
}

function drawLevel3EndDragon() {
  if (!level3EndDragon || level3EpilogueState === LEVEL3_EPILOGUE_STATE.NONE) return;
  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.DEAD) return;

  push();
  imageMode(CENTER);

  dragonAnimTimer++;
  if (dragonAnimTimer >= DRAGON_SPRITE.animSpeed) {
    dragonAnimTimer = 0;
    dragonAnimFrame = (dragonAnimFrame + 1) % DRAGON_SPRITE.numFrames;
  }

  const isChasing = level3EpilogueState === LEVEL3_EPILOGUE_STATE.CHASING;
  const row = level3EndDragon.facing === "left"
    ? (isChasing ? DRAGON_SPRITE.rows.flyingLeft : DRAGON_SPRITE.rows.idleLeft)
    : (isChasing ? DRAGON_SPRITE.rows.flyingRight : DRAGON_SPRITE.rows.idleRight);

  const sx = dragonAnimFrame * DRAGON_SPRITE.frameWidth;
  const sy = row * DRAGON_SPRITE.frameHeight;
  const dw = DRAGON_SPRITE.frameWidth * DRAGON_SPRITE.scale;
  const dh = DRAGON_SPRITE.frameHeight * DRAGON_SPRITE.scale;

  if (dragonSheet) {
    image(dragonSheet, level3EndDragon.x, level3EndDragon.y, dw, dh,
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

  const boxH = height * 0.32;
  push();
  noStroke();
  fill(0, 0, 0, 200);
  rect(0, height - boxH, width, boxH);

  textFont("monospace");
  textAlign(LEFT, TOP);

  if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.DIALOGUE) {
    const line = level3DialogueLines[level3DialogueIndex];
    fill(230, 200, 80);
    textSize(14);
    text(line.speaker, 24, height - boxH + 16);
    fill(255);
    textSize(16);
    text(line.text, 24, height - boxH + 40, width - 48);
    fill(200);
    textSize(11);
    textAlign(RIGHT, BOTTOM);
    text("[Enter] Continue", width - 20, height - 12);
  } else if (level3EpilogueState === LEVEL3_EPILOGUE_STATE.CHOICE) {
    fill(230, 200, 80);
    textSize(14);
    text("Dragon", 24, height - boxH + 16);
    fill(255);
    textSize(16);
    text("I need something from you first.", 24, height - boxH + 40, width - 48);
    textSize(14);
    text('[Y] Offer a rune        [N] "Just disappear!"', 24, height - boxH + 80);
  } else if (level3EpilogueLineTimer > 0) {
    fill(230, 200, 80);
    textSize(14);
    text("Dragon", 24, height - boxH + 16);
    fill(255);
    textSize(16);
    text("This will work.", 24, height - boxH + 40);
    level3EpilogueLineTimer--;
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
  text("YOU WERE CAUGHT", width / 2, height / 2 - 20);
  fill(255);
  textSize(14);
  text("The dragon was right — there was no escaping the box.", width / 2, height / 2 + 20);
  pop();
}