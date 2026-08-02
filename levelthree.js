// ============================================================
// LEVEL 3 — DRAGON BOSS FIGHT
// Single arena. Boss picks the player as a target, pauses
// (telegraph), then charges in a straight line.
//   - Charge hits player  -> player loses 1 heart
//   - Charge misses, hits a wall -> boss takes 100 damage, stuns
// Repeats until boss hp <= 0 (win) or player runs out of hearts
// (stage restarts).
//
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
};

const LEVEL3_BOSS_CONFIG = {
  maxHealth: 1000,
  wallDamage: 100,
  chargeSpeed: 6,
  telegraphFrames: 90,
  stunFrames: 70,
  tileSpan: 2.5,
  triggerFraction: 0.35
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

// ------------------------------------------------------------
// initLevel3BossFight() — called once from loadLevel(LEVEL_THREE)
// ------------------------------------------------------------
function initLevel3BossFight() {
  const arena = findArea(levelAreas, "fish");
  const arenaX = arena ? arena.bounds.x + arena.bounds.w / 2 : WORLD_W / 2;
  const arenaY = arena ? arena.bounds.y + arena.bounds.h / 2 : WORLD_H / 2;
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
  level3Barrier = {
    x: triggerX - barrierThickness / 2,
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

  level3CamZoomTarget = 0.6; // wider baseline for the boss arena
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
    gameState = STATE_WIN;
    return;
  }

  if (level3Phase === LEVEL3_PHASE.SWIM && level3Boss.hp <= 500) {
    enterLevel3FlyPhase();
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
  player.y = cy - 2 * TILE_SIZE;
  player.vx = 0;
  player.vy = 0;
  player.form = FORM_BIRD;

  level3Boss.x = cx;
  level3Boss.y = cy;
  level3Boss.vx = 0;
  level3Boss.vy = 0;
  level3Boss.state = BOSS3_STATE.AIMING;
  level3Boss.timer = LEVEL3_BOSS_CONFIG.telegraphFrames;

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

  if (playerInFishSpawn()) {
    level3Boss.state = BOSS3_STATE.DORMANT;
    deactivateLevel3Barrier();
    return; // sleeping, no collision/telegraph/charge logic runs
  }

  if (level3Boss.state === BOSS3_STATE.DORMANT) {
  level3Boss.state = BOSS3_STATE.AIMING;
  level3Boss.timer = LEVEL3_BOSS_CONFIG.telegraphFrames;
  activateLevel3Barrier();
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
  // Reset the player's position FIRST — the boss-state/barrier decision
  // below reads player.x, so it must see the post-respawn position, not
  // wherever the player died.
  player.x = playerStart.x;
  player.y = playerStart.y;
  player.vx = 0;
  player.vy = 0;
  camX = constrain(player.x - width / 2, 0, WORLD_W - width);
  camY = constrain(player.y - height / 2, 0, WORLD_H - height);

  player.health = player.maxHealth;
  player.invincible = false;
  player.invincibleTimer = 0;

  if (level3Boss) {
    level3Boss.vx = 0;
    level3Boss.vy = 0;
    level3Boss.state =
      player.x >= level3Boss.triggerX
        ? BOSS3_STATE.AIMING
        : BOSS3_STATE.DORMANT;
    level3Boss.timer = LEVEL3_BOSS_CONFIG.telegraphFrames;

    if (level3Boss.state === BOSS3_STATE.DORMANT) {
      deactivateLevel3Barrier();
    } else {
      activateLevel3Barrier();
    }
  }

  // Note: level3Phase is intentionally NOT reset here — once the boss
  // drops to phase 2, the fight stays aerial even after a player death.
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