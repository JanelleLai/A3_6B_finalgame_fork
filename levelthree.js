// ============================================================
// LEVEL 3 — DRAGON BOSS FIGHT
// Three stages: fish (charge + spikes) -> bird (stones) -> end
// (human, give runes or attack). Stage state lives entirely here;
// sketch.js only calls the init/update/draw/mousePressed hooks.
// ============================================================

const LEVEL3_STAGE = {
  FISH: "fish",
  BIRD: "bird",
  END: "end",
};

let level3Stage = LEVEL3_STAGE.FISH;
let level3PortalPos = null;
let level3PortalOpen = false;

// ---- fish stage: charge attack ----
const DRAGON_CHARGE = {
  telegraphFrames: 45, // dodge window before the charge fires
  chargeSpeed: 9,
  chargeMaxFrames: 90,
  recoverFrames: 60,
};
const DRAGON_WALL_HITS_TO_BIRD = 5;
let dragonChargeState = "idle"; // idle -> telegraph -> charging -> recovering
let dragonChargeTimer = 0;
let dragonChargeDir = { x: 0, y: 0 };
let dragonWallHits = 0;

// ---- bird stage: stones ----
let level3Stones = [];
let level3Projectiles = [];
const STONES_REQUIRED = 4;
let level3StonesHit = 0;

// ---- end stage: dialogue + portal ----
const END_APPROACH_DIST = 5 * TILE_SIZE;
let level3EndChoiceShown = false;
let level3EndChoiceMade = null; // null | "runes" | "attack"
let level3EndAttackActive = false;
let level3EndStones = [];
let level3WinTimer = 0;

// ---- transitions ----
let level3Transition = { active: false, timer: 0, duration: 45, nextStage: null };

const PLAYER_HIT_INVINCIBLE_FRAMES = 90;

// ------------------------------------------------------------
// initLevel3BossFight() — called once from loadLevel(LEVEL_THREE)
// ------------------------------------------------------------
function initLevel3BossFight() {
  level3Stage = LEVEL3_STAGE.FISH;
  level3StonesHit = 0;
  level3Stones = [];
  level3Projectiles = [];
  level3EndChoiceShown = false;
  level3EndChoiceMade = null;
  level3EndAttackActive = false;
  level3EndStones = [];
  level3PortalOpen = false;
  level3WinTimer = 0;
  level3Transition = { active: false, timer: 0, duration: 45, nextStage: null };

  dragonChargeState = "idle";
  dragonChargeTimer = DRAGON_CHARGE.recoverFrames;
  dragonWallHits = 0;

  if (dragon) {
    dragon.state = DRAGON_STATE.FIGHTING;
    dragon.maxHealth = 1000;
    dragon.health = dragon.maxHealth; // 1000
  } else {
    console.warn('initLevel3BossFight: dragon is null — does 3fisharea.json have a "dragon spawn" layer?');
  }

  player.health = player.maxHealth; // 5 hits before a stage restart
  player.invincible = false;
  player.invincibleTimer = 0;

  positionForStage(LEVEL3_STAGE.FISH);
}

// ------------------------------------------------------------
// positionForStage() — centers player/dragon in the given arena.
// End stage is special: dragon left, portal right, player center.
// ------------------------------------------------------------
function positionForStage(stage) {
  const area = findArea(levelAreas, stage);
  if (!area) return;

  const cx = area.bounds.x + area.bounds.w / 2;
  const cy = area.bounds.y + area.bounds.h / 2;

  if (stage === LEVEL3_STAGE.END) {
    // player should be centered for the end stage
    player.x = cx;
    player.y = cy;
    player.form = FORM_HUMAN;

    // only set dragon if it exists
    if (dragon) {
      dragon.x = cx - 4 * TILE_SIZE;
      dragon.y = cy;
    }

    level3PortalPos = { x: cx + 5 * TILE_SIZE, y: cy };

  } else if (stage === LEVEL3_STAGE.FISH) {
    // fish arena start
    player.x = TILE_SIZE * 10;
    player.y = cy;
    player.form = FORM_FISH;

    if (dragon) {
      dragon.x = TILE_SIZE * 45;
      dragon.y = cy - 2 * TILE_SIZE;
    }

  } else if (stage === LEVEL3_STAGE.BIRD) {
    // position for bird stage (example — adjust as desired)
    player.x = TILE_SIZE * 8;
    player.y = cy;
    player.form = FORM_BIRD;

    if (dragon) {
      dragon.x = cx + 4 * TILE_SIZE;
      dragon.y = cy - TILE_SIZE;
    }
  }

  // stop motion and update camera
  player.vx = 0;
  player.vy = 0;
  camX = constrain(player.x - width / 2, 0, WORLD_W - width);
  camY = constrain(player.y - height / 2, 0, WORLD_H - height);
}
// ------------------------------------------------------------
// MAIN UPDATE DISPATCH — called every frame from drawLevelScreen()
// ------------------------------------------------------------
function updateLevel3BossFight() {
  if (!dragon) return;

  if (level3Transition.active) {
    updateLevel3Transition();
    return;
  }

  if (level3Stage === LEVEL3_STAGE.FISH) updateFishStage();
  else if (level3Stage === LEVEL3_STAGE.BIRD) updateBirdStage();
  else if (level3Stage === LEVEL3_STAGE.END) updateEndStage();
}

// ------------------------------------------------------------
// TRANSITIONS
// ------------------------------------------------------------
function startLevel3Transition(nextStage) {
  level3Transition.active = true;
  level3Transition.timer = 0;
  level3Transition.nextStage = nextStage;
  player.vx = 0;
  player.vy = 0;
}

function updateLevel3Transition() {
  level3Transition.timer++;
  if (level3Transition.timer >= level3Transition.duration) {
    level3Transition.active = false;
    level3Stage = level3Transition.nextStage;

    if (level3Stage === LEVEL3_STAGE.BIRD) setupBirdStoneTiles();
    if (level3Stage === LEVEL3_STAGE.END) {
      level3EndChoiceShown = false;
      level3EndChoiceMade = null;
    }

    positionForStage(level3Stage);
  }
}

// ------------------------------------------------------------
// FISH STAGE — dodge the charge, lead the dragon into spikes
// ------------------------------------------------------------
function updateFishStage() {
  handleDragonCharge();
  checkDragonHazardCollision();
  checkPlayerDragonContact();
}

function handleDragonCharge() {
  dragonChargeTimer--;

  if (dragonChargeState === "idle" || dragonChargeState === "recovering") {
    if (dragonChargeTimer <= 0) {
      dragonChargeState = "telegraph";
      dragonChargeTimer = DRAGON_CHARGE.telegraphFrames;
      const dx = player.x - dragon.x;
      const dy = player.y - dragon.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      dragonChargeDir = { x: dx / d, y: dy / d };
      dragon.facing = dx < 0 ? "left" : "right";
    }
    return;
  }

  if (dragonChargeState === "telegraph") {
    if (dragonChargeTimer <= 0) {
      dragonChargeState = "charging";
      dragonChargeTimer = DRAGON_CHARGE.chargeMaxFrames;
    }
    return;
  }

  if (dragonChargeState === "charging") {
    dragon.x += dragonChargeDir.x * DRAGON_CHARGE.chargeSpeed;
    dragon.y += dragonChargeDir.y * DRAGON_CHARGE.chargeSpeed;

    const hitWall = resolveDragonSolidCollisionsReturnHit();
    if (hitWall || dragonChargeTimer <= 0) {
      if (hitWall) {
        dragonWallHits++;
        if (dragonWallHits >= DRAGON_WALL_HITS_TO_BIRD || dragon.health <= 500) {
          startLevel3Transition(LEVEL3_STAGE.BIRD);
        }
      }
      dragonChargeState = "recovering";
      dragonChargeTimer = DRAGON_CHARGE.recoverFrames;
    }
  }
}

// Same as resolveDragonSolidCollisions() but reports whether it hit
// something, so a wall-slam ends the charge early like a spike would.
function resolveDragonSolidCollisionsReturnHit() {
  if (!dragon) return false;
  const halfW = dragon.w / 2;
  const halfH = dragon.h / 2;
  let hit = false;

  for (const t of solidTiles) {
    const requiredKeys = GATE_LAYERS[t.layerName];
    if (requiredKeys !== undefined && keyCollected >= requiredKeys) continue;

    const before = { x: dragon.x, y: dragon.y };
    resolveBoxRect(dragon, halfW, halfH, t);
    if (dragon.x !== before.x || dragon.y !== before.y) hit = true;
  }
  return hit;
}

function checkDragonHazardCollision() {
  if (dragonChargeState !== "charging") return;

  const halfW = dragon.w / 2;
  const halfH = dragon.h / 2;

  for (const t of hazardTiles) {
    const overlapsX = dragon.x + halfW > t.x && dragon.x - halfW < t.x + t.w;
    const overlapsY = dragon.y + halfH > t.y && dragon.y - halfH < t.y + t.h;
    if (overlapsX && overlapsY) {
      damageDragon(20);
      dragonChargeState = "recovering";
      dragonChargeTimer = DRAGON_CHARGE.recoverFrames;

      if (dragon.health <= 500) startLevel3Transition(LEVEL3_STAGE.BIRD);
      return; // one spike hit is enough to end the stage if low enough
    }
  }
}

function checkPlayerDragonContact() {
  if (player.invincible) return;
  const halfW = dragon.w / 2;
  const halfH = dragon.h / 2;
  const closestX = constrain(player.x, dragon.x - halfW, dragon.x + halfW);
  const closestY = constrain(player.y, dragon.y - halfH, dragon.y + halfH);

  if (dist(player.x, player.y, closestX, closestY) < player.r) {
    playerTakeDragonHit();
  }
}

function damageDragon(amount) {
  if (!dragon) return;
  dragon.health = Math.max(0, dragon.health - amount);
}

// ------------------------------------------------------------
// PLAYER HIT / STAGE RESTART
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
  player.health = player.maxHealth;
  player.invincible = false;
  player.invincibleTimer = 0;

  if (level3Stage === LEVEL3_STAGE.FISH) {
    dragon.health = 1000;
    dragonWallHits = 0;
  } else if (level3Stage === LEVEL3_STAGE.BIRD) {
    dragon.health = 500;
    level3StonesHit = 0;
    setupBirdStoneTiles();
    level3Projectiles = [];
  } else if (level3Stage === LEVEL3_STAGE.END) {
    // the "attack" path always fails by design — send the player back
    // to the choice instead of a hard reset
    dragon.health = 80;
    level3EndAttackActive = false;
    level3EndChoiceMade = null;
    level3EndChoiceShown = true;
    level3EndStones = [];
    level3Projectiles = [];
  }

  dragonChargeState = "idle";
  dragonChargeTimer = DRAGON_CHARGE.recoverFrames;
  positionForStage(level3Stage);
}

// ------------------------------------------------------------
// BIRD STAGE — touch stones, they fly at the dragon
// ------------------------------------------------------------
function setupBirdStoneTiles() {
  level3Stones = [];
  const bird = findArea(levelAreas, "bird");
  if (!bird || !bird.json || !bird.json.layers) return;

  const stoneLayer = bird.json.layers.find((l) => l.name === "stone");
  if (!stoneLayer) {
    console.warn('setupBirdStoneTiles: no "stone" layer found in birdArea3');
    return;
  }

  for (const t of stoneLayer.tiles) {
    level3Stones.push({
      x: t.x * TILE_SIZE + bird.bounds.x,
      y: t.y * TILE_SIZE + bird.bounds.y,
      w: TILE_SIZE,
      h: TILE_SIZE,
      collected: false,
    });
  }
}

function updateBirdStage() {
  for (const s of level3Stones) {
    if (s.collected) continue;
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    if (dist(player.x, player.y, cx, cy) < player.r + TILE_SIZE * 0.35) {
      s.collected = true;
      level3Projectiles.push({ x: cx, y: cy, speed: 10 });
      if (runesound) runesound.play();
    }
  }

  for (let i = level3Projectiles.length - 1; i >= 0; i--) {
    const p = level3Projectiles[i];
    const dx = dragon.x - p.x;
    const dy = dragon.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;

    if (d < TILE_SIZE * 0.6) {
      level3Projectiles.splice(i, 1);
      damageDragon(100);
      level3StonesHit++;
      if (level3StonesHit >= STONES_REQUIRED) startLevel3Transition(LEVEL3_STAGE.END);
      continue;
    }

    p.x += (dx / d) * p.speed;
    p.y += (dy / d) * p.speed;
  }
}

// ------------------------------------------------------------
// END STAGE — human, dragon left, portal right, then the choice
// ------------------------------------------------------------
function updateEndStage() {
  if (level3EndAttackActive) {
    updateEndAttackSequence();
    return;
  }

  if (level3WinTimer > 0) {
    level3WinTimer--;
    if (level3WinTimer <= 0) {
      stopAllGameSounds();
      gameState = STATE_WIN;
    }
    return;
  }

  if (!level3EndChoiceShown) {
    const d = dist(player.x, player.y, dragon.x, dragon.y);
    if (d < END_APPROACH_DIST) {
      level3EndChoiceShown = true;
      player.vx = 0;
      player.vy = 0;
    }
  }
}

function chooseGiveRunes() {
  level3EndChoiceMade = "runes";
  level3PortalOpen = true;
  if (runesound) runesound.play();
  level3WinTimer = 60; // let the portal-open beat land before the win screen
}

function chooseAttackDragon() {
  level3EndChoiceMade = "attack";
  level3EndAttackActive = true;

  level3EndStones = [
    { x: player.x - 2 * TILE_SIZE, y: player.y + TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE, collected: false },
    { x: player.x + 2 * TILE_SIZE, y: player.y + TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE, collected: false },
    { x: player.x, y: player.y - 2 * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE, collected: false },
  ];

  dragonChargeState = "idle";
  dragonChargeTimer = 40; // dragon reacts fast once attacked
}

function updateEndAttackSequence() {
  for (const s of level3EndStones) {
    if (s.collected) continue;
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    if (dist(player.x, player.y, cx, cy) < player.r + TILE_SIZE * 0.35) {
      s.collected = true;
      level3Projectiles.push({ x: cx, y: cy, speed: 10 });
    }
  }

  for (let i = level3Projectiles.length - 1; i >= 0; i--) {
    const p = level3Projectiles[i];
    const dx = dragon.x - p.x;
    const dy = dragon.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < TILE_SIZE * 0.6) {
      level3Projectiles.splice(i, 1);
      damageDragon(5); // deliberately too little — this path can't win
      continue;
    }
    p.x += (dx / d) * p.speed;
    p.y += (dy / d) * p.speed;
  }

  handleDragonCharge();
  checkPlayerDragonContact();
}

// ------------------------------------------------------------
// mousePressed dispatch
// ------------------------------------------------------------
function handleLevel3MousePressed() {
  if (level3Stage !== LEVEL3_STAGE.END) return;
  if (!level3EndChoiceShown || level3EndChoiceMade) return;

  if (isMouseOver(width / 2 - 110, height - 70, 180, 50)) {
    chooseGiveRunes();
  } else if (isMouseOver(width / 2 + 110, height - 70, 180, 50)) {
    chooseAttackDragon();
  }
}

// ------------------------------------------------------------
// DRAWING — world-space (called pre-pop, inside camera transform)
// ------------------------------------------------------------
function drawLevel3BossFightWorld() {
  if (level3Stage === LEVEL3_STAGE.FISH) drawDragonChargeTelegraph();
  else if (level3Stage === LEVEL3_STAGE.BIRD) drawBirdStoneStage();
  else if (level3Stage === LEVEL3_STAGE.END) drawEndStagePortalAndStones();
}

function drawDragonChargeTelegraph() {
  if (dragonChargeState !== "telegraph") return;
  push();
  stroke(255, 60, 60, 150);
  strokeWeight(3);
  line(dragon.x, dragon.y, player.x, player.y);
  noFill();
  ellipse(dragon.x, dragon.y, dragon.w * 1.4, dragon.h * 1.4);
  pop();
}

function drawBirdStoneStage() {
  push();
  rectMode(CENTER);
  noStroke();
  fill(150, 150, 150);
  for (const s of level3Stones) {
    if (s.collected) continue;
    rect(s.x + s.w / 2, s.y + s.h / 2, TILE_SIZE * 0.6, TILE_SIZE * 0.6);
  }
  fill(180, 180, 180);
  for (const p of level3Projectiles) ellipse(p.x, p.y, TILE_SIZE * 0.4, TILE_SIZE * 0.4);
  pop();
}

function drawEndStagePortalAndStones() {
  if (level3PortalPos) {
    const img = level3PortalOpen ? portalOpenImg : portalClosedImg;
    if (img) {
      push();
      imageMode(CENTER);
      image(img, level3PortalPos.x, level3PortalPos.y, TILE_SIZE * 2, TILE_SIZE * 2);
      pop();
    }
  }

  push();
  rectMode(CENTER);
  noStroke();
  fill(150, 150, 150);
  for (const s of level3EndStones) {
    if (s.collected) continue;
    rect(s.x + s.w / 2, s.y + s.h / 2, TILE_SIZE * 0.6, TILE_SIZE * 0.6);
  }
  fill(180, 180, 180);
  for (const p of level3Projectiles) ellipse(p.x, p.y, TILE_SIZE * 0.4, TILE_SIZE * 0.4);
  pop();
}

// ------------------------------------------------------------
// DRAWING — screen-space HUD (called post-pop, plain screen coords)
// ------------------------------------------------------------
function drawLevel3HUD() {
  drawPlayerHealthHUD();
  drawDragonHealthHUD();
  drawEndChoiceUI();
  drawLevel3TransitionFlash();
}

function drawPlayerHealthHUD() {
  const x = 14, y = 14, boxW = 140, boxH = 34;
  push();
  noStroke();
  fill(0, 0, 0, 140);
  rect(x, y, boxW, boxH, 8);

  fill(255);
  textSize(12);
  textFont("monospace");
  textAlign(LEFT, CENTER);
  text("HEALTH", x + 10, y + boxH / 2);

  const heartSize = 14;
  const startX = x + 68;
  for (let i = 0; i < player.maxHealth; i++) {
    fill(i < player.health ? color(220, 50, 50) : color(70, 70, 70));
    ellipse(startX + i * (heartSize + 2), y + boxH / 2, heartSize, heartSize);
  }
  pop();
}

function drawDragonHealthHUD() {
  if (!dragon) return;
  const barW = 240, barH = 16;
  const x = width / 2 - barW / 2, y = 16;

  push();
  noStroke();
  fill(0, 0, 0, 140);
  rect(x - 6, y - 6, barW + 12, barH + 24, 8);

  fill(255);
  textSize(11);
  textFont("monospace");
  textAlign(CENTER, TOP);
  text("DRAGON", x + barW / 2, y);

  fill(60, 60, 60);
  rect(x, y + 14, barW, barH, 4);
  fill(200, 60, 60);
  rect(x, y + 14, map(dragon.health, 0, dragon.maxHealth, 0, barW), barH, 4);
  pop();
}

function drawEndChoiceUI() {
  if (level3Stage !== LEVEL3_STAGE.END) return;
  if (!level3EndChoiceShown || level3EndChoiceMade || level3EndAttackActive) return;

  push();
  noStroke();
  fill(0, 0, 0, 160);
  rect(width / 2 - 260, height - 130, 520, 90, 10);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(14);
  textFont("monospace");
  text("The dragon waits.", width / 2, height - 110);
  pop();

  drawButton(width / 2 - 110, height - 70, 180, 50, "Give runes");
  drawButton(width / 2 + 110, height - 70, 180, 50, "Attack dragon");
}

function drawLevel3TransitionFlash() {
  if (!level3Transition.active) return;
  const progress = level3Transition.timer / level3Transition.duration;
  const alpha = progress < 0.5 ? map(progress, 0, 0.5, 0, 255) : map(progress, 0.5, 1, 255, 0);
  push();
  noStroke();
  fill(255, 255, 255, alpha);
  rect(0, 0, width, height);
  pop();
}