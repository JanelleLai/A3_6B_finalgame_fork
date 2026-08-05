// ============================================================
// SCREEN STATE
// Add one constant per screen. The string value just needs
// to be unique — it's never shown to the player.
// ============================================================
const TITLE_SCREEN = "title.js";
const LEVEL_ONE = "levelone.js";
const LEVEL_TWO = "leveltwo.js";
const LEVEL_THREE = "levelthree.js";

// SCREEN_C, SCREEN_D... add more here as you grow
let currentScreen = TITLE_SCREEN;

// goToScreen() is the ONLY function allowed to change currentScreen.
// Keeping that in one place makes the app easy to reason about.
function goToScreen(screen) {
  currentScreen = screen;
if (screen === LEVEL_ONE || screen === LEVEL_TWO || screen === LEVEL_THREE)
    loadLevel(screen);}

// ============================================================
// BUTTON HELPERS
// Reused by every screen. isMouseOver() must use the exact
// same x/y/w/h you passed to drawButton() for hit-testing
// to line up with what's drawn.
// ============================================================
function drawButton(x, y, w, h, label) {
  push();
  rectMode(CENTER);
  fill(isMouseOver(x, y, w, h) ? color(80, 80, 100) : color(40, 40, 60));
  stroke(150);
  rect(x, y, w, h, 8);
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  text(label, x, y);
  pop();
}

function isMouseOver(x, y, w, h) {
  return (
    mouseX > x - w / 2 &&
    mouseX < x + w / 2 &&
    mouseY > y - h / 2 &&
    mouseY < y + h / 2
  );
}

// ============================================================
// CLICK HANDLING
// Same dispatch pattern as draw(): check currentScreen, then
// test the SAME coordinates used in the matching draw function.
// ============================================================
function mousePressed() {
  if (isDebugModeActive()) return;

  if (currentScreen === TITLE_SCREEN) {
    if (isMouseOver(width / 2, height / 2, 200, 50)) {
      goToScreen(LEVEL_ONE);
    }
  }
}

// ------------------------------------------------------------
// CAMERA
// camX and camY are the world coordinates at the top-left
// of the canvas. translate(-camX, -camY) shifts everything
// so the player appears centred on screen.
// ------------------------------------------------------------
let camX = 0;
let camY = 0;
const CAM_SMOOTHING = 0.5;
let camZoom = 0.8;

// ------------------------------------------------------------
// PLAYER CONFIGURATION
// ------------------------------------------------------------
const PLAYER_SPEED = 17; // bird
let moveSpeed = PLAYER_SPEED;
const INVINCIBLE_FRAMES = 90; // ADDED — was referenced but never defined

// title screen

let titleFrame1;
let titleFrame2;
let currentFrame = 0;
let frameTimer = 0;
const frameInterval = 0.6;

// ------------------------------------------------------------
// FISH SPRITE CONFIGURATION
// ------------------------------------------------------------
const FISH_SPRITE = {
  frameWidth: 0, // Calculated dynamically in setup() to avoid grid bleed
  frameHeight: 0, // Calculated dynamically in setup()
  numFrames: 2, // Each row contains 2 frames for the swim animation
  animSpeed: 12, // Controls tail wag speed (lower = faster)
  scale: 0.2, // Scale factor to map image size nicely to player.r (22px)

  // Row mapping: row 0 is left, row 1 is right
  rows: {
    down: 2,
    up: 3,
    right: 0,
    left: 1,
  },
};

// ------------------------------------------------------------
// HUMAN SPRITE CONFIGURATION (start area cat character)
// ------------------------------------------------------------
const HUMAN_SPRITE = {
  frameWidth: 0, // set in setup()
  frameHeight: 0, // set in setup()
  numFrames: 4,
  animSpeed: 10,
  scale: 0.2,
  rows: {
    right: 0,
    left: 1,
  },
};

let humanSheet;

const BIRD_SPRITE = {
  frameWidth: 500,
  frameHeight: 500,
  animSpeed: 10,
  scale: 0.15, // Adjusted to match your game's world scale (~same size as fish)

  rows: {
    flying: 0,
    running: 1,
  },
  maxFrames: {
    flying: 4,
    running: 7,
  },
};

// ------------------------------------------------------------
// DRAGON SPRITE CONFIGURATION 
// ------------------------------------------------------------

const DRAGON_SPRITE = {
  frameWidth: 8896 / 8,   // flying/idle sheet
  frameHeight: 2988 / 4,
  numFrames: 8,
  animSpeed: 6,
  scale: 0.3,
  rows: {
    flyingLeft: 0,
    flyingRight: 1,
    idleLeft: 2,
    idleRight: 3,
  },
};

const DRAGON_SLEEPING_SPRITE = {
  frameWidth: 0,
  frameHeight: 0,
  numFrames: 6,
  animSpeed: 15,
  scale: 0.3,
};

let dragonSheet;
let dragonSleepingSheet;
let angryDragonSheet;
let dragonAnimFrame = 0;
let dragonAnimTimer = 0;
let dragonPingPongDir = 1;
let dragonSleepFrame = 0;
let dragonSleepTimer = 0;

// ------------------------------------------------------------
// BAT SPRITE CONFIGURATION
// ------------------------------------------------------------
const BAT_SPRITE = {
  frameWidth: 0,   // set in setup() from batFlySheet
  frameHeight: 0,  // set in setup()
  numFrames: 5,    // batsSheet.png has 5 flying frames laid out horizontally
  animSpeed: 6,    // lower = faster wing flap
  scale: 0.12,     // tune to taste — start here and adjust against TILE_SIZE
  idleScale: 1,
};

let batFlySheet;
let batIdleImg;
let batAnimFrame = 0;
let batAnimTimer = 0;

// ------------------------------------------------------------
// RUNE SPRITE CONFIGURATION
// ------------------------------------------------------------

const RUNE_SPRITE = {
  frameWidth: 620,
  frameHeight: 600,
  numFrames: 10,
  animSpeed: 7,
  scale: 0.13, // tune this to fit TILE_SIZE
};

let runeFrame = 0;
let runeTimer = 0;
let runeSheet;
let runeIconImg;

const WIND_SPRITE = {
  frameWidth: 0, // set in setup()
  frameHeight: 0, // set in setup()
  numFrames: 14, // confirm by counting puffs in wind.png
  animSpeed: 6,
  scale: 1.0,
};

let windFrame = 0;
let windTimer = 0;

const GRAVITY = 0.6; // 4.0  bird gravity? Calibrated downward pull
const GRAVITY_AFTER_CHECKPOINT = GRAVITY * 1; // 60% of normal gravity after first checkpoint
const FLAP_FORCE = -8; // -24 // Gives the exact velocity curve to hit 3 blocks high
const TERMINAL_VELOCITY = 20;
const HUMAN_GRAVITY = 0.9; // should be 0.9
const HUMAN_SPEED = 7;

const FISH_SWIM_HORIZONTAL = 0.6; // left/right force
const FISH_SWIM_UP = 0.4; // upward force — lower = harder to swim up
const FISH_SWIM_DOWN = 0.9; // downward force — faster to sink than rise

const FISH_STAMINA_MAX = 100;
const FISH_STAMINA_REGEN = 0.7; // stamina recovered per frame when not flapping
const FISH_STAMINA_COST = 10; // stamina used per flap tap
const FISH_FLAP_FORCE = 2; // upward burst per flap
const FISH_FLAP_DECAY = 0.3; // how quickly flap burst fades (higher = shorter burst)
const FISH_SINK_FORCE = 0.15; // passive downward pull
const FISH_WATER_DRAG = 0.88;

// BIRD NOISE LEVEL (Level 2)
// ------------------------------------------------------------
const NOISE_LEVEL_MAX = 100;
const NOISE_INCREASE_RATE = 2; // per frame while moving
const NOISE_DECAY_RATE = 1;    // per frame while idle

const TILE_SIZE = 50;
const CHECKPOINT_TRIGGER_MARGIN = 2 * TILE_SIZE; // how far around the flag counts as "reached"

const FORM_HUMAN = "human";
const FORM_BIRD = "bird";
const FORM_FISH = "fish";
const FORM_ORDER = [FORM_HUMAN, FORM_BIRD, FORM_FISH]; // defines forward-only progression

let player = {
  x: 40 * TILE_SIZE,
  y: 17 * TILE_SIZE, // 17 for start
  vy: 1,
  vx: 0,
  r: 15,
  form: FORM_HUMAN,
  windTimer: 0, // ADDED — tracks frames spent inside a wind zone

  //fish stuff
  stamina: 100, // ← add this
  flapVelocity: 0, // ← add this
  flapQueued: false, // ← add this too
// bird noise stuff
  noiseLevel: 0, // 0 = silent, NOISE_LEVEL_MAX = bats trigger (future)

  // Animation state variables
  currentFrame: 0,
  frameTimer: 0,
  facing: "left", // Current look direction ("left" or "right")
  isMoving: false, // Tracks whether player is currently moving to trigger animation

  shootTimer: 0,
  health: 10,
  maxHealth: 10, // only level 3's dragon-hit/HP-bar system reads this — levels 1/2 use instant hazard-death instead
  invincible: false,
  invincibleTimer: 0,
  bounceVX: 0,
  bounceVY: 0,
  isGrounded: false,
  jumpCooldown: 0,

    carryingRock: false, // ADDED — level 3 phase-2 rock-throw state
};

//bats stuff
const BAT_LAYER = "bat"; // matches your existing "bat" JSON layer
const BAT_STATE = {
  SLEEPING: "sleeping",
  AWAKE: "awake",
};
const BAT_SPEED_MULTIPLIER = 0.65; // bats speed 65% of bird sped
let bats = []; // [{x,y,spawnX,spawnY,state,speed}] — current level's bats
let batSpawnTiles = []; // raw "bat" layer tiles for the current level
let batsWoken = false; // once true, stays true — bats never go back to sleep
let secondRuneKey = null;
const NOISE_SHAKE_THRESHOLD = 0.6;
const NOISE_SHAKE_AMOUNT = 7;  



// dragon stuff
const DRAGON_SPAWN_LAYER = "dragon spawn"; // matches your JSON layer name exactly
const DRAGON_STATE = {
  SLEEPING: "sleeping",
  CHASING: "chasing",
  FIGHTING: "fighting",  
};

const DRAGON_CONFIG = {
  tileSpan: 2,
  chaseSpeed: 4.3,
  seaweedSlowFactor: 1.5,
  behindOffsetX: 17 * TILE_SIZE,
  maxHealth: 100,

  hitboxOffsetX: 60, // shifts hitbox toward the front (head) — tune this
  hitboxOffsetY: -10, // optional: nudge up/down, negative = up
};

let dragon = null; // null on any level without a dragon; built in setupDragonForLevel()
let dragonSpawnTiles = []; // raw "dragon spawn" layer tiles for the current level
let dragonSpawnPoint = null; // {x,y} centroid of dragonSpawnTiles — the sleeping position
let dragonTriggerRuneKey = null; // getWorldTileKey() of the specific rune that wakes it
let dragonTriggerRunePos = null; // {x,y} world center of that rune — kept for the debug overlay below
let batTriggerRuneKey = null; // getWorldTileKey() of the specific rune that wakes the bats — identity-based, same pattern as dragonTriggerRuneKey
let chaseMusic;

// Starts chaseMusic if it isn't already looping, AND resets its volume back
// to normal — checkSafeZone() fades it to 0 without stopping it (so
// isPlaying() stays true forever after), which otherwise left it silently
// "playing" at 0 volume for good: the isPlaying() guard everywhere else
// skipped re-looping it, and even where it did loop, the volume was still 0.
function startChaseMusic() {
  if (!chaseMusic) return;
  if (!chaseMusic.isPlaying()) chaseMusic.loop();
  chaseMusic.setVolume(0.25);
}
let epilogueMusic; // replaces humanBGsound during level 3's epilogue (IDLE/DIALOGUE/CHOICE/MIMIC) 
let titleMusic; // Halcyon theme for the title screen
let dragonGrowl;
let dragonGrowl2;
let dragonScreech;
let dragonHurt;
let dragonHiss;
let dragonHiss2;

let chaseCamZoomTarget = 0.8; // camZoom eases toward this every frame (0.8 idle, 0.7 chasing)
let level3CamZoomTarget = 0.8; 

// The two fish-area checkpoints that bracket the encounter.
// Indices into your existing `checkpoints` array.
let fishCheckpointBeforeDragon = -1;
let fishCheckpointAfterDragon = -1;


const WIND_FORCE = -1.5; // stronger upward push = more negative
const WIND_MAX_UP = -9; // caps upward speed
const WIND_DELAY_FRAMES = 25; // how long you free-fall before wind kicks in
const WIND_RAMP_FRAMES = 20; // how long it takes wind to reach full strength
let windZones = [];

// ------------------------------------------------------------
// GATE_LAYERS
// Maps each barrier layer name to how many runes are required
// to open it. Add one entry per gate — as many as you have.
// ------------------------------------------------------------
const GATE_LAYERS = {
  barrier1: 1,
  barrier2: 2,
  barrier3: 3,
  barrier4: 4,
};

// ------------------------------------------------------------
// WHIRLPOOL SPRITE CONFIGURATION
// ------------------------------------------------------------
const WHIRLPOOL_SPRITE = {
  numFrames: 6, // 4 frames horizontal
  animSpeed: 7, // Lower number = faster rotation speed
  scale: 1.0, // Scale adjustment if needed to fit TILE_SIZE
};

let whirlpoolImg; // Holds the portal(db).png texture asset
let whirlpoolFrame = 0;
let whirlpoolTimer = 0;

let startArea;
let startbg;
let startbg2;
let birdArea;
let fishArea;
let endArea;
let keyTilesList = [];
let tiles = [];

let birdArea2;
let fishArea2;

let fishArea3;
let birdArea3;
let endArea3;

let waterTiles = [];
let grassImg;
let groundImg;
let grass2Img;
let ground2Img;
let barkImg;
let seaweedImg;
let seaweed2Img;
let sandImg;
let sand2Img;
let sandrockImg;
let rockImg;
let rock2Img;
let bgRockImg;
let spike1Img;
let spike2Img;
let spike3Img;
let spike4Img;
let spikeImg2;
let spike1Img3;
let spike2Img3;
let waterSurfaceImg;
let waterSurface2Img;
let portalClosedImg;
let portalOpenImg;
let windImg;
let portalImg;
let bridgeImg;
let flagDownImg;
let flagUpImg;
let barrierImg;
let level1MessageImg;
let level2MessageImg;
let theEndImg; // level 3's final win screen — fades in instead of showing instantly

let fishareaBG;
let fishareaOverlay;
let cavebg;
let cavebg2;
let endbg;


let fishareaBG2;
let fishareaOverlay2;

let fishareaBG3;
let birdareaBG3;
let endareaBG3;
let stoneImg; // level 3 bird-arena pedestal/thrown-rock sprite

// Level 3 epilogue dialogue art — one image per line of level3DialogueLines,
// plus the Y/N-choice prompt and the post-choice remark (win/lose).
let dialogueImgs = []; // dialogue1..3, indexed 0-2 to match level3DialogueIndex
let dialogueWithOptionsImg;
let dialogueWinImg;
let dialogueLoseImg;
let dialogueImgs2 = []; // rematch conversation art (2dialogue1..8.png), indexed 0-7

let fishSheet; //fish sprite sheet
let birdSheet; //bird sprite sheet


//sound effects
let diesound;
let runesound;
let portalOpeningSound;
let portalChime;
let walkingsound;
let flappingsound;
let fishareasound;
let fishBGsound;
let humanBGsound;
let birdBGsound;
let batsound;
let birdflapsound;

// ------------------------------------------------------------
// ADDED — TILE PHYSICS
// Tiles are grouped by *behaviour* rather than by raw id, since
// the same id number means different things on different layers.
// Add/rename layer names here to match your map.json exactly.
// ------------------------------------------------------------
const SOLID_LAYERS = [
  "rock",
  "grass",
  "ground",
  "sand",
  "algae",
  "bark",
  "bridge",
  "barrier",
  "barrier1",
  "barrier2",
  "barrier3",
  "barrier4",
]; // blocks movement CHANGE SEAWEED PROPERTES
const HAZARD_LAYERS = ["spikes"]; // kills on contact
const CHECKPOINT_LAYER = "checkpoint"; // respawn points
const KEY_LAYER = "key"; // matches the JSON layer name
const WHIRLPOOL_LAYER = "whirlpool";
// "water" and "bg green" (and anything else) are treated as pure
// background — they're drawn but never checked for collision.

let solidTiles = []; // [{x,y,w,h}] world-space rects — rock + seaweed
let hazardTiles = []; // [{x,y,w,h}] world-space rects — spikes
let checkpoints = []; // [{x,y,w,h,spawnX,spawnY}] grouped checkpoint zones, sorted left→right
let activeCheckpointIndex = -1; // index into `checkpoints` of the furthest one reached
let lastCheckpoint = null; // {x,y} world coords the player respawns at
let playerStart = { x: 0, y: 0 }; // fallback spawn if no checkpoint reached yet
let keyMap = new Map(); // world "x,y" -> collected boolean
let keyTotal = 0;
let keyCollected = 0;
let portalUnlocked = false;
let portalOpeningPlayed = false;
let whirlpoolTiles = []; // [{x,y,w,h}]
let portalTiles = []; // [{x,y,w,h}] portal/door tiles
let seaweedTiles = []; // [{x,y,w,h}] world-space rects — slows the fish, doesn't block it
const SEAWEED_LAYER = "seaweed";
let safeZoneTiles = []; // [{x,y,w,h}] world-space rects — level 2's "safe zone" layer; reaching one fades out chaseMusic
const SAFE_ZONE_LAYER = "safe zone";
let safeZoneReached = false; // one-shot per level, reset in loadLevel()
const SEAWEED_SLOW_FACTOR = 2.5; // divides moveSpeed — tune to taste for "150% slower"
const REQUIRED_PORTAL_KEYS = 5; // fallback default, used if a level doesn't define requiredKeys
let requiredPortalKeys = REQUIRED_PORTAL_KEYS; // set per-level in loadLevel()
const PORTAL_LAYER = "door";

// ------------------------------------------------------------
// FADE MESSAGE — a one-line bottom-of-screen notification that fades in,
// holds, then fades out. Used for "A portal has opened [...]"
// when a level's portal unlocks, but generic enough to reuse elsewhere.
// ------------------------------------------------------------
const FADE_MESSAGE_DURATION_FRAMES = 240; // 4s at 60fps, total time visible
const FADE_MESSAGE_FADE_FRAMES = 30; // time spent fading in, and fading out
let fadeMessageText = null;
let fadeMessageStartFrame = 0;

function showFadeMessage(msg) {
  fadeMessageText = msg;
  fadeMessageStartFrame = frameCount;
}

function drawFadeMessage() {
  if (!fadeMessageText) return;
  const elapsed = frameCount - fadeMessageStartFrame;
  if (elapsed >= FADE_MESSAGE_DURATION_FRAMES) {
    fadeMessageText = null;
    return;
  }

  let alpha;
  if (elapsed < FADE_MESSAGE_FADE_FRAMES) {
    alpha = map(elapsed, 0, FADE_MESSAGE_FADE_FRAMES, 0, 255);
  } else if (elapsed > FADE_MESSAGE_DURATION_FRAMES - FADE_MESSAGE_FADE_FRAMES) {
    alpha = map(elapsed, FADE_MESSAGE_DURATION_FRAMES - FADE_MESSAGE_FADE_FRAMES, FADE_MESSAGE_DURATION_FRAMES, 255, 0);
  } else {
    alpha = 255;
  }

  push();
  fill(255, alpha);
  noStroke();
  textFont("monospace");
  textAlign(CENTER, CENTER);
  textSize(16);
  text(fadeMessageText, width / 2, height / 2 - 30);
  pop();
}

// ------------------------------------------------------------
// GAME STATE
// ------------------------------------------------------------
let score = 0;

const STATE_PLAY = "play";
const STATE_WIN = "win";
const STATE_OVER = "over";
let gameState = STATE_PLAY;

const LEVELS = {
  [LEVEL_ONE]: {
    areas: [
      { key: "start", json: "startArea", bg: "startbg", bgSize: [3550, null] },
      { key: "bird", json: "birdArea", bg: "cavebg", overlay: "fishareaOverlay" },
      {
        key: "fish",
        json: "fishArea",
        bg: "fishareaBG",
        overlay: "fishareaOverlay",
        bgSize: [2150, 800],
        anchorRightOf: "bird",
        shiftTiles: -37,
        anchorBelow: "bird",
      },
      {
        key: "end",
        json: "endArea",
        bg: "endbg",
        anchorRightOf: "bird",
        anchorBottom: true,
      }, // ADDED anchorRightOf, no shiftTiles
    ],
    playerStart: { x: 4 * TILE_SIZE, y: 17 * TILE_SIZE },
    buildWindZones: buildLevel1WindZones,
  },
[LEVEL_TWO]: {
    areas: [
      { key: "start", json: "startArea2", bg: "startarea2Img" },
      { key: "bird", json: "birdArea2", bg: "cavebg2" },
      {
        key: "fish",
        json: "fishArea2",
        bg: "fishareaBG2",
        anchorRightOf: "bird",
        shiftTiles: -32,
        anchorBelow: "bird",
      },
    ],
    playerStart: { x: 4 * TILE_SIZE, y: 10 * TILE_SIZE },
    buildWindZones: buildLevel2WindZones,
    // Matches the map's actual rune count (0 in startArea2 + 1 in
    // birdArea2 + 2 in fisharea2 = 3 "key" tiles total). This was set to
    // 4 — one more than could ever exist — so keyCollected could never
    // reach it and the portal could never open, no matter what.
    requiredKeys: 3,
  },
  [LEVEL_THREE]: {
    areas: [
      {
        key: "fish",
        json: "fishArea3",
        bg: "fishareaBG3",
        // 3fishareabg.png is sized to match the fish area map itself, so
        // no bgSize override — draw at the default full-area size, lined
        // up top-left with the map like any other area background.
      },
      {
        key: "bird",
        json: "birdArea3",
        bg: "birdareaBG3",
      },
      {
        key: "end",
        json: "endArea3",
        bg: "endareaBG3",
      },
    ],
    playerStart: { x: 4 * TILE_SIZE, y: 12 * TILE_SIZE },
  },
};

// ------------------------------------------------------------
// RESPAWN DELAY
// Freezes gameplay updates for a short window after death, so
// the player doesn't instantly snap back to the checkpoint.
// ------------------------------------------------------------
const RESPAWN_DELAY_FRAMES = 10; // ~1 second at 60fps
let isRespawning = false;
let respawnTimer = 0;
let pendingRespawnFn = null;

function beginRespawnDelay(respawnFn) {
  if (isRespawning) return; // already dying — ignore extra triggers
  isRespawning = true;
  respawnTimer = RESPAWN_DELAY_FRAMES;
  pendingRespawnFn = respawnFn;

  player.vx = 0;
  player.vy = 0;
  player.flapVelocity = 0;
}

function updateRespawnDelay() {
  if (!isRespawning) return;
  respawnTimer--;
  if (respawnTimer <= 0) {
    isRespawning = false;
    const fn = pendingRespawnFn;
    pendingRespawnFn = null;
    if (fn) fn();
  }
}

// ============================================================
// DEBUG MODE
// Press M to toggle. Press 1/2/3 to open that level's submenu:
// area letters teleport into that area with runes/gates set to
// roughly match how far into the level you'd really be, W
// triggers an instant win, L triggers an instant loss, and
// Backspace returns to the level list.
// ============================================================
let debugModeActive = false;
let debugMenuLevel = null; // null = top-level list; otherwise LEVEL_ONE/TWO/THREE

const DEBUG_KEY_MAP = {
  "1": { screen: LEVEL_ONE,    label: "Level 1" },
  "2": { screen: LEVEL_TWO,    label: "Level 2" },
 "3": { screen: LEVEL_THREE, label: "Level 3" },  //
};

// Single-letter key per area name, shared across all levels' submenus.
const DEBUG_AREA_KEYS = { start: "S", bird: "B", fish: "F", end: "E" };

function isDebugModeActive() {
  return debugModeActive;
}

function debugAreaFormFor(areaKey) {
  if (areaKey === "bird") return FORM_BIRD;
  if (areaKey === "fish") return FORM_FISH;
  return FORM_HUMAN;
}

// Counts runes positioned to the left of targetX — a simple stand-in for
// "how many runes would a real playthrough have collected by the time it
// reaches here." A full reachability simulation (flood-fill honoring
// GATE_LAYERS) was tried and discarded: these barriers are partial-height
// obstacles that rely on the level's actual floor/ceiling geometry plus
// jump/flight limits to function as gates, so a walkability flood fill
// (which ignores gravity and jump arcs) routes around them freely and
// wildly over-collects. Plain left-to-right rune position isn't perfect
// either — a rune can sit at a smaller x than a checkpoint while actually
// belonging to a different vertical lane (e.g. a bird-height pickup near
// a fish-depth checkpoint) reachable only after passing a gate that rune
// itself sits right next to — but it matches every case checked except
// that one, and is far simpler than getting full physics-aware pathing
// right for a debug convenience feature.
function debugComputeKeysForTarget(targetX) {
  return keyTilesList.filter((rune) => rune.x < targetX).length;
}
function debugJumpToArea(levelId, areaKey) {
  goToScreen(levelId);

  if (levelId === LEVEL_THREE) {
    // Level 3's "areas" are boss-fight phases, not just checkpoints —
    // just repositioning the player left the fish-phase boss (fresh from
    // initLevel3BossFight() inside goToScreen/loadLevel) still active in
    // the wrong arena, attacking the player from off-map until it
    // eventually died on its own. Replay the real phase-transition
    // functions instead, so the boss/epilogue state ends up exactly like
    // reaching that phase for real (fish boss already retired) — not just
    // the player's position.
    // Also set lastCheckpoint to the fish arena's checkpoint (whatever a
    // real playthrough would have touched last before the fight) — jumping
    // straight in otherwise leaves it null (reset by loadLevel above), so
    // dying respawns all the way back at the level's original start
    // instead of a sensible spot before the boss fight.
    const fishArea = findArea(levelAreas, "fish");
    const fishCp = fishArea && checkpoints.find(
      (cp) => cp.x >= fishArea.bounds.x && cp.x < fishArea.bounds.x + fishArea.bounds.w &&
        cp.y >= fishArea.bounds.y && cp.y < fishArea.bounds.y + fishArea.bounds.h,
    );
    if (fishCp) lastCheckpoint = { x: fishCp.spawnX, y: fishCp.spawnY };

    if (areaKey === "bird") {
      enterLevel3FlyPhase(); // sets level3Phase, repositions player+boss, sets up rockPedestals
      // Match the real SWIM->FLY trigger's HP exactly (damageLevel3Boss()
      // calls this once hp drops to 800) — otherwise the boss still has
      // its full maxHealth, wrong for a fight that's supposedly already
      // past the swim phase.
      if (level3Boss) level3Boss.hp = 800;
      // Real gameplay starts this when crossing the fish-arena barrier
      // (activateLevel3Barrier()) — jumping straight into the bird phase
      // skips that trigger, so it needs starting explicitly here too.
      startChaseMusic();
    } else if (areaKey === "end") {
      stopAllGameSounds();
      level3BossDefeated = true;
      level3Boss = null;
      moveToLevel3EndArea();
    }
    // "fish" needs no special handling — the fresh SWIM-phase fight from
    // loadLevel() above is already the correct state for it.
    return;
  }

  const area = findArea(levelAreas, areaKey);
  if (area) {
    // Land on the area's first checkpoint (checkpoints are pre-sorted
    // left-to-right) rather than an arbitrary point in the area.
    const areaCheckpoints = checkpoints.filter(
      (cp) =>
        cp.x >= area.bounds.x &&
        cp.x < area.bounds.x + area.bounds.w &&
        cp.y >= area.bounds.y &&
        cp.y < area.bounds.y + area.bounds.h,
    );
    if (areaCheckpoints.length > 0) {
      player.x = areaCheckpoints[0].spawnX;
      player.y = areaCheckpoints[0].spawnY;
    } else if (areaKey === "start") {
      // The starting area has no checkpoint of its own — the level's
      // own spawn point IS the "first checkpoint" there.
      player.x = LEVELS[levelId].playerStart.x;
      player.y = LEVELS[levelId].playerStart.y;
    } else {
      player.x = area.bounds.x + area.bounds.w / 2;
      player.y = area.bounds.y + 50;
    }
  }

  // Known exception to the positional heuristic below: level 1's fish
  // checkpoint sits just past a rune that's actually in a different
  // (bird-height) lane, gated behind a barrier not yet open at that point —
  // see debugComputeKeysForTarget()'s comment. Hardcoded since a proper fix
  // needs real jump-physics-aware pathing.
  keyCollected = levelId === LEVEL_ONE && areaKey === "fish"
    ? 3
    : debugComputeKeysForTarget(player.x);
  portalUnlocked = portalIsUnlocked();

  player.form = debugAreaFormFor(areaKey);
  player.vx = 0;
  player.vy = 0;
  snapCameraToPlayer();
}

// DEBUG — win: level 3 replicates pressing Y at the epilogue choice;
// levels 1/2 unlock the portal and place the player standing inside it
// (now lit/open) so checkPortalEntrance() naturally fires STATE_WIN next
// frame, same as actually walking into it. Only reloads the level if you
// weren't already on it — reloading would reset lastCheckpoint/progress,
// which "win"/"lose" from mid-level shouldn't do.
function debugWinLevel(levelId) {
  if (currentScreen !== levelId) goToScreen(levelId);
  // A prior debug win/lose (or a real one) can leave gameState on WIN/OVER
  // or isRespawning stuck true — both gate off the update loop entirely
  // (see drawLevelScreen()), so nothing would happen without resetting them.
  gameState = STATE_PLAY;
  isRespawning = false;

  if (levelId === LEVEL_THREE) {
    // Same issue debugJumpToArea's "end" branch already handles — without
    // retiring it, the fresh fish-phase boss (from loadLevel above) keeps
    // attacking the player from the fish arena while they're now in the
    // end area.
    stopAllGameSounds();
    level3BossDefeated = true;
    level3Boss = null;
    level3EndScreenFadeFrames = 0;
    level3EndScreenFadeActive = false;
    debugTriggerLevel3EpilogueChoice(true);
    return;
  }

  keyCollected = requiredPortalKeys;
  unlockPortal();
  if (portalTiles.length > 0) {
    const t = portalTiles[0];
    player.x = t.x + t.w / 2;
    player.y = t.y + t.h / 2;
    player.vx = 0;
    player.vy = 0;
  }
  snapCameraToPlayer();
}

// DEBUG — lose: dies and respawns at the last checkpoint, same as any
// hazard death. Only reloads the level if you weren't already on it, so
// respawning uses whatever checkpoint you'd actually reached rather than
// resetting to the level's start. Level 3 no longer has a "lose" concept —
// the old chase/bad-end was replaced by the rematch mechanic — so this
// isn't offered there anymore (see handleDebugKeyPress()/drawDebugOverlay()).
function debugLoseLevel(levelId) {
  if (currentScreen !== levelId) goToScreen(levelId);
  gameState = STATE_PLAY;
  isRespawning = false;
  respawnFromHazard();
}

// Returns true if it handled the keypress (so keyPressed() should stop).
function handleDebugKeyPress(key, keyCode) {
  if (key === "m" || key === "M") {
    debugModeActive = !debugModeActive;
    debugMenuLevel = null;
    return true;
  }

  if (!debugModeActive) return false;

  if (debugMenuLevel === null) {
    const entry = DEBUG_KEY_MAP[key];
    if (entry) {
      debugMenuLevel = entry.screen;
      return true;
    }
    return false;
  }

  if (key === "Backspace" || key === "Escape") {
    debugMenuLevel = null;
    return true;
  }

  const upperKey = key.toUpperCase();
  const areas = LEVELS[debugMenuLevel].areas;
  const areaMatch = areas.find((a) => DEBUG_AREA_KEYS[a.key] === upperKey);
  if (areaMatch) {
    debugJumpToArea(debugMenuLevel, areaMatch.key);
    debugModeActive = false;
    debugMenuLevel = null;
    return true;
  }

  if (upperKey === "W") {
    debugWinLevel(debugMenuLevel);
    debugModeActive = false;
    debugMenuLevel = null;
    return true;
  }
  if (upperKey === "L" && debugMenuLevel !== LEVEL_THREE) {
    debugLoseLevel(debugMenuLevel);
    debugModeActive = false;
    debugMenuLevel = null;
    return true;
  }

  return false;
}

function drawDebugOverlay() {
  if (!debugModeActive) return;

  push();
  noStroke();
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);

  fill(255);
  textFont("monospace");
  textAlign(CENTER, CENTER);
  textSize(20);
  text("DEBUG MODE", width / 2, height / 2 - 100);

  textSize(14);
  let y = height / 2 - 60;

  if (debugMenuLevel === null) {
    for (const key in DEBUG_KEY_MAP) {
      text(`[${key}] ${DEBUG_KEY_MAP[key].label}`, width / 2, y);
      y += 24;
    }
  } else {
    const areas = LEVELS[debugMenuLevel].areas;
    for (const a of areas) {
      text(`[${DEBUG_AREA_KEYS[a.key]}] Jump to "${a.key}" area`, width / 2, y);
      y += 24;
    }
    const isLevel3 = debugMenuLevel === LEVEL_THREE;
    text(isLevel3 ? "[W] Win (befriend the dragon)" : "[W] Win (reach the portal)", width / 2, y);
    y += 24;
    if (!isLevel3) {
      text("[L] Lose (die, respawn at last checkpoint)", width / 2, y);
      y += 24;
    }
    text("[Backspace] Back to level list", width / 2, y);
    y += 24;
  }

  text("[M] Close debug menu", width / 2, y + 10);
  pop();
}

// ============================================================
// preload()
// ============================================================
function preload() {
  startArea = loadJSON("data/startarea.json");
  startbg = loadImage("assets/images/startbg.png");
  birdArea = loadJSON("data/birdarea.json");
  fishArea = loadJSON("data/fisharea.json");
  endArea = loadJSON("data/endarea.json");

  startArea2 = loadJSON("data/2startarea.json");
  fishArea2 = loadJSON("data/2fisharea.json");
  birdArea2 = loadJSON("data/2birdarea.json");

  fishArea3 = loadJSON("data/3fisharea.json");
  birdArea3 = loadJSON("data/3birdarea.json");
  endArea3 = loadJSON("data/3endarea.json");

  fishSheet = loadImage("assets/images/fish.png");
  batFlySheet = loadImage("assets/images/batsSheet.png");
  batIdleImg = loadImage("assets/images/batIdle.png");

  titleFrame1 = loadImage("assets/images/Title frame1.png");
  titleFrame2 = loadImage("assets/images/Title frame2.png");

  controls = loadImage("assets/images/controls.png");

  grassImg = loadImage("assets/images/grass.png");
  groundImg = loadImage("assets/images/ground.png");
  grass2Img = loadImage("assets/images/grass2.png");
  ground2Img = loadImage("assets/images/ground2.png");
  barkImg = loadImage("assets/images/bark.png");

  seaweedImg = loadImage("assets/images/seaweed.png");
  seaweed2Img = loadImage("assets/images/2seaweed.png");
  sandImg = loadImage("assets/images/sand.png");
  sand2Img = loadImage("assets/images/2sand.png");
  sandrockImg = loadImage("assets/images/sandrock.png");

  rockImg = loadImage("assets/images/rock.png");
  rock2Img = loadImage("assets/images/Rock2.png");
  bgRockImg = loadImage("assets/images/bgrock.jpg");
  spike1Img = loadImage("assets/images/spike1.png");
  spike2Img = loadImage("assets/images/spike2.png");
  spike3Img = loadImage("assets/images/spike3.png");
  spike4Img = loadImage("assets/images/spike4.png");
  spikeImg2 = loadImage("assets/images/2Spike.png");
  spike1Img3 = loadImage("assets/images/3spike1.png");
  spike2Img3 = loadImage("assets/images/3spike2.png");
  barrierImg = loadImage("assets/images/barrier.png");

  waterSurfaceImg = loadImage("assets/images/watersurface.png");
  waterSurface2Img = loadImage("assets/images/2watersurface.png");
  fishareaBG = loadImage("assets/images/fishareaBG.png");
  fishareaOverlay = loadImage("assets/images/fishareaoverlay.png");
  fishareaBG2 = loadImage("assets/images/2fisharea.png");
  fishareaBG3 = loadImage("assets/images/3fishareabg.png");
  birdareaBG3 = loadImage("assets/images/3birdareabg.png");
  stoneImg = loadImage("assets/images/stone.png");
  dialogueImgs = [
    loadImage("assets/images/dialogue1.png"),
    loadImage("assets/images/dialogue2.png"),
    loadImage("assets/images/dialogue3.png"),
  ];
  dialogueWithOptionsImg = loadImage("assets/images/dialoguewithoptions.png");
  dialogueWinImg = loadImage("assets/images/dialogueWIN.png");
  dialogueLoseImg = loadImage("assets/images/dialogueLOSE.png");
  dialogueImgs2 = [
    loadImage("assets/images/2dialogue1.png"),
    loadImage("assets/images/2dialogue2.png"),
    loadImage("assets/images/2dialogue3.png"),
    loadImage("assets/images/2dialogue4.png"),
    loadImage("assets/images/2dialogue5.png"),
    loadImage("assets/images/2dialogue6.png"),
    loadImage("assets/images/2dialogue7.png"),
    loadImage("assets/images/2dialogue8.png"),
  ];
  endareaBG3 = loadImage("assets/images/3endarea.png");

  cavebg = loadImage("assets/images/cavebg.png"); //bird area background level 1
  cavebg2 = loadImage("assets/images/2birdarea.png"); //bird area background level 2 
  birdSheet = loadImage("assets/images/bird.png");
  humanSheet = loadImage("assets/images/human.png");
  whirlpoolImg = loadImage("assets/images/whirlpool.png");
  runeSheet = loadImage("assets/images/runes.png");
  runeIconImg = loadImage("assets/images/rune.png");
  portalClosedImg = loadImage("assets/images/portalclosed.png");
  portalOpenImg = loadImage("assets/images/portalopen.png");
  windImg = loadImage("assets/images/wind.png");
  portalImg = loadImage("assets/images/portalclosed.png");
  bridgeImg = loadImage("assets/images/Bridge2.png");
  dragonSheet = loadImage("assets/images/dragonSheet.png");
  dragonSleepingSheet = loadImage("assets/images/dragonSleeping.png");
  angryDragonSheet = loadImage("assets/images/AngryDragonSprite.png"); // same layout as dragonSheet — drop-in swap for the charge telegraph / N-choice attack

  endbg = loadImage("assets/images/endareabg.png");
  flagDownImg = loadImage("assets/images/flagdown.png");
  flagUpImg = loadImage("assets/images/flagup.png");
  level1MessageImg = loadImage("assets/images/Level1Message.png");
  level2MessageImg = loadImage("assets/images/Level2Message.png");
  theEndImg = loadImage("assets/images/TheEnd.png");

  startarea2Img = loadImage("assets/images/2startarea.png");

  diesound = loadSound("assets/sounds/die.mp3");
  runesound = loadSound("assets/sounds/rune.mp3");
  portalOpeningSound = loadSound("assets/sounds/portalopening.mp3");
  if (portalOpeningSound) {
    portalOpeningSound.setVolume(0.2);
  }
  portalChime = loadSound("assets/sounds/portalchime.mp3");
  
  walkingsound = loadSound("assets/sounds/walking.mp3");
  flappingsound = loadSound("assets/sounds/flappingbird.mp3"); //level1
  birdflapsound = loadSound("assets/sounds/birdflap.mp3"); //level2
  fishareasound = loadSound("assets/sounds/fisharea.mp3");
  if (fishareasound) {
    fishareasound.setVolume(0.55); // updateFishAreaSound() fades to this same target every frame
  }
  fishBGsound = loadSound("assets/sounds/fishbg.mp3");
  if (fishBGsound) {
    fishBGsound.setVolume(0.22); // updateFishAreaSound() fades to this same target every frame
  }
  humanBGsound = loadSound("assets/sounds/HumanBG.mp3");
  birdBGsound = loadSound("assets/sounds/birdBG.mp3");
  if (birdBGsound) {
    birdBGsound.setVolume(0.15);
  }
  chaseMusic = loadSound("assets/sounds/chaseMusic.mp3");
  if (chaseMusic) {
    chaseMusic.setVolume(0.25);
  }
  epilogueMusic = loadSound("assets/sounds/epilogue.mp3");
  // Title theme for the main menu/title screen
  titleMusic = loadSound("assets/sounds/HalcyonTheme.mp3");
  if (titleMusic) {
    titleMusic.setVolume(0.4);
  }
  dragonGrowl = loadSound("assets/sounds/dragongrowl.mp3");
  dragonGrowl2 = loadSound("assets/sounds/dragongrowl2.mp3");
  dragonScreech = loadSound("assets/sounds/dragonScreech.mp3");
  dragonHurt = loadSound("assets/sounds/dragonHurt.mp3");
  dragonHiss = loadSound("assets/sounds/dragonHiss.mp3");
  dragonHiss2 = loadSound("assets/sounds/dragonHiss2.mp3");
  batsound = loadSound("assets/sounds/bats.mp3");


    rawAssets = {
    startArea,
    birdArea,
    fishArea,
    endArea,
    startArea2,
    birdArea2,
    fishArea2,
    startbg,
    startarea2Img,
    fishareaBG,
    endbg,
    cavebg,
    cavebg2,
    fishareaBG2,
    fishareaOverlay,
    //fishareaOverlay2,

    fishArea3,
  birdArea3,
  endArea3,
  fishareaBG3,
  birdareaBG3,
  endareaBG3,
  };
}

// ============================================================
// setup()
// ============================================================
function setup() {
  createCanvas(800, 450);
  noStroke();
  imageMode(CORNER);

  FISH_SPRITE.frameWidth = fishSheet.width / 2;
  FISH_SPRITE.frameHeight = fishSheet.height / 4;
  HUMAN_SPRITE.frameWidth = humanSheet.width / HUMAN_SPRITE.numFrames;
  HUMAN_SPRITE.frameHeight = humanSheet.height / 2;
  WIND_SPRITE.frameWidth = windImg.width / WIND_SPRITE.numFrames;
  WIND_SPRITE.frameHeight = windImg.height;
DRAGON_SLEEPING_SPRITE.frameWidth =
    dragonSleepingSheet.width / DRAGON_SLEEPING_SPRITE.numFrames;
      DRAGON_SLEEPING_SPRITE.frameHeight = dragonSleepingSheet.height;
  BAT_SPRITE.frameWidth = batFlySheet.width / BAT_SPRITE.numFrames;
  BAT_SPRITE.frameHeight = batFlySheet.height;

  if (birdBGsound) birdBGsound.setVolume(0.15);

  // Everything else — WORLD_W/H, buildTileCollision(), windZones.push()×3,
  // playerStart, camX/camY — is now handled inside loadLevel().
  loadLevel(LEVEL_ONE);
}

let rawAssets = {}; // preload() fills this: rawAssets.birdArea2 = loadJSON(...)
let levelAreas = []; // current level's computed areas, replaces startArea/birdArea/etc as globals

function computeAreaLayout(levelDef) {
  const areas = [];
  let cursorTiles = 0;

  for (const def of levelDef.areas) {
    const json = rawAssets[def.json];
    let xTiles;

    if (def.anchorRightOf) {
      // ADDED — position relative to another area's right edge, not the running cursor
      const target = areas.find((a) => a.key === def.anchorRightOf);
      if (target) {
        xTiles =
          target.bounds.x / TILE_SIZE +
          target.json.mapWidth +
          (def.shiftTiles || 0);
      } else {
        console.warn(
          `anchorRightOf "${def.anchorRightOf}" not found — is it defined before "${def.key}"?`,
        );
        xTiles = cursorTiles + (def.shiftTiles || 0);
      }
    } else {
      xTiles = cursorTiles + (def.shiftTiles || 0);
    }

    let yTiles = 0;
    if (def.anchorBelow) {
      const target = areas.find((a) => a.key === def.anchorBelow);
      if (target) {
        yTiles = target.bounds.y / TILE_SIZE + target.json.mapHeight;
      } else {
        console.warn(
          `anchorBelow "${def.anchorBelow}" not found — is it defined before "${def.key}"?`,
        );
      }
    } else if (def.anchorBottom) {
      const bird = areas.find((a) => a.key === "bird");
      yTiles = bird ? bird.json.mapHeight - json.mapHeight : 0;
    }

    areas.push({
      key: def.key,
      json,
      bg: def.bg ? rawAssets[def.bg] : null,
      bgSize: def.bgSize,
      overlay: def.overlay ? rawAssets[def.overlay] : null,
      bounds: {
        x: xTiles * TILE_SIZE,
        y: yTiles * TILE_SIZE,
        w: json.mapWidth * TILE_SIZE,
        h: json.mapHeight * TILE_SIZE,
      },
    });

    cursorTiles += json.mapWidth; // still tracked for areas that use plain sequential placement
  }
  return areas;
}

function loadLevel(levelId) {
  // Clear any lingering end-screen fade state so dragons/animations resume
  if (typeof level3EndScreenFadeFrames !== 'undefined') {
    level3EndScreenFadeFrames = 0;
  }
  if (typeof level3EndScreenFadeActive !== 'undefined') {
    level3EndScreenFadeActive = false;
  }
  const def = LEVELS[levelId];
  stopAllGameSounds();

  solidTiles = [];
  hazardTiles = [];
  checkpoints = [];
  keyTilesList = [];
  keyMap = new Map();
  keyTotal = 0;
  keyCollected = 0;
  portalUnlocked = false;
  portalOpeningPlayed = false;
  requiredPortalKeys = def.requiredKeys ?? REQUIRED_PORTAL_KEYS;
  whirlpoolTiles = [];
  portalTiles = [];
  waterTiles = [];
  seaweedTiles = [];
  safeZoneTiles = [];
  safeZoneReached = false;
  windZones = [];
  activeCheckpointIndex = -1;
  lastCheckpoint = null;
  worldState = {}; // see below

  dragonSpawnTiles = [];
  camZoom = 0.8;
  batSpawnTiles = [];
  chaseCamZoomTarget = 0.8; // camera zooms out during chase phase

  levelAreas = computeAreaLayout(def);
  WORLD_W = Math.max(...levelAreas.map((a) => a.bounds.x + a.bounds.w));
  WORLD_H = Math.max(...levelAreas.map((a) => a.bounds.y + a.bounds.h));

  const checkpointTiles = [],
    keyTiles = [];
  for (const area of levelAreas) {
    processJsonLayers(
      area.json,
      checkpointTiles,
      keyTiles,
      area.bounds.x,
      area.bounds.y,
    );
  }
  checkpoints = groupCheckpointTiles(checkpointTiles);
  keyTilesList = keyTiles;
  keyTotal = keyTiles.length;
  for (const k of keyTilesList) keyMap.set(getWorldTileKey(k.x, k.y), false);
  
  setupDragonForLevel(levelId);
  setupBatsForLevel(levelId);

  if (levelId === LEVEL_THREE && typeof initLevel3BossFight === "function") {
  level3SecondEncounter = false; // fresh entry into level 3 — not a mid-game rematch
  initLevel3BossFight();
  }

  windZones = def.buildWindZones ? def.buildWindZones(levelAreas) : [];

  player.x = def.playerStart.x;
  player.y = def.playerStart.y;
  player.vx = 0;
  player.vy = 0;
  player.form = FORM_HUMAN;
   player.noiseLevel = 0;
  playerStart = { ...def.playerStart };

  snapCameraToPlayer();
  gameState = STATE_PLAY;
}


function findArea(levelAreas, key) {
  return levelAreas.find((a) => a.key === key);
}

// ------------------------------------------------------------
// Camera-clamp helpers — the camera should never show past an edge
// of the level that isn't backed by another area, but shouldn't stop
// at the seam BETWEEN two areas that sit right next to each other
// (e.g. bird -> fish in levels 1/2) unless that level wants strict
// per-area clamping (level 3, whose areas are separate arenas even
// though they happen to sit side-by-side in world space).
// ------------------------------------------------------------
function getAreaAt(px, py) {
  for (const area of levelAreas) {
    if (
      px >= area.bounds.x && px < area.bounds.x + area.bounds.w &&
      py >= area.bounds.y && py < area.bounds.y + area.bounds.h
    ) {
      return area;
    }
  }
  return null;
}

const AREA_EDGE_EPS = 2; // px tolerance for treating two bounds as "touching"

// Returns, per side of `area`, the perpendicular-axis SEGMENT(S) (not just
// a whole-edge yes/no) where another area actually borders it. Two areas
// can share an edge only partway along its length (e.g. level 1's "fish"
// area sits below just the right portion of "bird", not the whole width)
// — treating the whole edge as open whenever ANY overlap exists let the
// camera scroll past the level's true boundary anywhere else along that
// same edge.
function getAreaOpenRanges(area) {
  const ranges = { left: [], right: [], top: [], bottom: [] };
  for (const other of levelAreas) {
    if (other === area) continue;

    const vStart = Math.max(area.bounds.y, other.bounds.y);
    const vEnd = Math.min(area.bounds.y + area.bounds.h, other.bounds.y + other.bounds.h);
    if (vEnd - vStart > AREA_EDGE_EPS) {
      if (Math.abs(other.bounds.x - (area.bounds.x + area.bounds.w)) < AREA_EDGE_EPS) ranges.right.push([vStart, vEnd]);
      if (Math.abs((other.bounds.x + other.bounds.w) - area.bounds.x) < AREA_EDGE_EPS) ranges.left.push([vStart, vEnd]);
    }

    const hStart = Math.max(area.bounds.x, other.bounds.x);
    const hEnd = Math.min(area.bounds.x + area.bounds.w, other.bounds.x + other.bounds.w);
    if (hEnd - hStart > AREA_EDGE_EPS) {
      if (Math.abs(other.bounds.y - (area.bounds.y + area.bounds.h)) < AREA_EDGE_EPS) ranges.bottom.push([hStart, hEnd]);
      if (Math.abs((other.bounds.y + other.bounds.h) - area.bounds.y) < AREA_EDGE_EPS) ranges.top.push([hStart, hEnd]);
    }
  }
  return ranges;
}

function isInOpenRange(ranges, pos) {
  return ranges.some(([s, e]) => pos >= s - AREA_EDGE_EPS && pos <= e + AREA_EDGE_EPS);
}

// Levels whose areas are distinct arenas rather than a continuous
// walkable stretch — always clamp strictly to the current area here,
// even where two areas happen to touch in world space.
const STRICT_AREA_CAMERA_LEVELS = [LEVEL_THREE];

function getCamClampBounds(px, py) {
  const area = getAreaAt(px, py);
  if (!area) return { x0: 0, y0: 0, x1: WORLD_W, y1: WORLD_H };

  if (STRICT_AREA_CAMERA_LEVELS.includes(currentScreen)) {
    return {
      x0: area.bounds.x,
      y0: area.bounds.y,
      x1: area.bounds.x + area.bounds.w,
      y1: area.bounds.y + area.bounds.h,
    };
  }

  // Otherwise (levels 1 & 2): only skip clamping on the specific segment of
  // an edge that borders another area (checked against the player's actual
  // position along that edge), so the camera scrolls freely across a seam
  // like bird -> fish there, while still clamping the REST of that same
  // edge where nothing borders it.
  const ranges = getAreaOpenRanges(area);
  return {
    x0: isInOpenRange(ranges.left, py) ? 0 : area.bounds.x,
    y0: isInOpenRange(ranges.top, px) ? 0 : area.bounds.y,
    x1: isInOpenRange(ranges.right, py) ? WORLD_W : area.bounds.x + area.bounds.w,
    y1: isInOpenRange(ranges.bottom, px) ? WORLD_H : area.bounds.y + area.bounds.h,
  };
}

// Snaps the camera directly onto the player (no lerp), clamped per
// getCamClampBounds(). Used after teleports/respawns/resets. Accounts for
// camZoom the same way updateCamera() does — see the comment there for why
// the visible window is centered at (cam + width/2), not at cam itself.
function snapCameraToPlayer() {
  const visibleW = width / camZoom;
  const visibleH = height / camZoom;
  const halfW = visibleW / 2;
  const halfH = visibleH / 2;
  const b = getCamClampBounds(player.x, player.y);
  const minX = b.x0 - width / 2 + halfW;
  const maxX = b.x1 - width / 2 - halfW;
  const minY = b.y0 - height / 2 + halfH;
  const maxY = b.y1 - height / 2 - halfH;
  camX = constrain(player.x - width / 2, Math.min(minX, maxX), Math.max(minX, maxX));
  camY = constrain(player.y - height / 2, Math.min(minY, maxY), Math.max(minY, maxY));
}

function buildLevel1WindZones(levelAreas) {
  const start = findArea(levelAreas, "start");
  const bird = findArea(levelAreas, "bird");
  const fish = findArea(levelAreas, "fish");
  const end = findArea(levelAreas, "end");
  const zones = [];

  // Zone 1: human -> bird (ceiling)
  zones.push({
    x: start.bounds.x + start.bounds.w - 2 * TILE_SIZE,
    y: 0,
    w: 13 * TILE_SIZE,
    h: bird.bounds.h,
    fromForm: FORM_HUMAN,
    transformTo: FORM_BIRD,
    hasCeiling: true,
  });

  // Zone 2: fish -> human (launch zone)
  const zone2ShiftUp = 5 * TILE_SIZE;
  zones.push({
    x: fish.bounds.x + fish.bounds.w - 16 * TILE_SIZE,
    y: fish.bounds.y - zone2ShiftUp,
    w: 6 * TILE_SIZE,
    h: fish.bounds.h + end.bounds.h,
    fromForm: FORM_FISH,
    transformTo: FORM_HUMAN,
    hasCeiling: false,
  });

  // Zone 3: end area — force fish -> human
  zones.push({
    x: end.bounds.x,
    y: bird.bounds.h - end.bounds.h / 5,
    w: 5 * TILE_SIZE,
    h: (end.bounds.h / 5 / TILE_SIZE) * TILE_SIZE,
    fromForm: FORM_FISH,
    transformTo: FORM_HUMAN,
    hasCeiling: false,
  });

  return zones;
}

function buildLevel2WindZones(levelAreas) {
  const start = findArea(levelAreas, "start");
  const bird = findArea(levelAreas, "bird");
  const zones = [];

  // Zone: human -> bird, placed at the start/bird boundary
  zones.push({
    x: start.bounds.x + start.bounds.w - 5 * TILE_SIZE,
    y: 1 * TILE_SIZE,
    w: 6 * TILE_SIZE,
    h: start.bounds.h + 6 * TILE_SIZE,
    fromForm: FORM_HUMAN,
    transformTo: FORM_BIRD,
    hasCeiling: true,
    delayFrames: 5, // shorter delay just for this zone — was using the global 25
  });

  return zones;
}

function getDragonHitboxCenter() {
  if (!dragon) return { x: 0, y: 0 };
  const facingSign = dragon.facing === "left" ? -1 : 1;
  return {
    x: dragon.x + facingSign * DRAGON_CONFIG.hitboxOffsetX,
    y: dragon.y + DRAGON_CONFIG.hitboxOffsetY,
  };
}

function shouldDrawArea(area) {
  const bounds = area.bounds;
  if (!bounds) return false;

  const visibleW = width / camZoom;
  const visibleH = height / camZoom;
  const margin = 2 * TILE_SIZE;

  const viewLeft = camX - margin;
  const viewRight = camX + visibleW + margin;
  const viewTop = camY - margin;
  const viewBottom = camY + visibleH + margin;

  return (
    viewRight > bounds.x - TILE_SIZE &&
    viewLeft < bounds.x + bounds.w + TILE_SIZE &&
    viewBottom > bounds.y - 10 * TILE_SIZE &&
    viewTop < bounds.y + bounds.h + 5 * TILE_SIZE
  );
}

function drawInstructions() {
  if (currentScreen !== LEVEL_ONE) return;

  const start = findArea(levelAreas, "start");
  const inStart = start && player.x < start.bounds.x + start.bounds.w;
  if (!inStart || !controls) return;

  const imgW = 240;
  const imgH = (controls.height / controls.width) * imgW;
  const x = 14;
  const y = height - imgH - 14;

  push();
  imageMode(CORNER);
  image(controls, x, y, imgW, imgH);
  pop();
}

function draw() {
  background(20);
  if (currentScreen === TITLE_SCREEN) drawTitleScreen();
  else if (currentScreen === LEVEL_ONE || currentScreen === LEVEL_TWO || currentScreen === LEVEL_THREE)
    drawLevelScreen();

  drawDebugOverlay();
}

function drawLevelScreen() {
  console.log(player.x / 50, player.y / 50);

  updateCamera();
  updateCamZoom();
  updateInvincibility();

  push();
  let screenOffsetX = Math.round((width / 2) * (1 - camZoom) - camX * camZoom);
  let screenOffsetY = Math.round((height / 2) * (1 - camZoom) - camY * camZoom);
  translate(screenOffsetX, screenOffsetY);
  scale(camZoom);

  for (const area of levelAreas) {
    if (shouldDrawArea(area)) drawTiles(area);
  }

   if (gameState === STATE_PLAY) {
    if (!isDebugModeActive()) {
      updateRespawnDelay();

      if (!isRespawning) {
        updateMoveSpeed();
        // Lock movement input during the level 3 stage-transition fade —
        // otherwise a held key keeps moving the player while hidden behind
        // the white screen, landing them somewhere unintended once it clears.
        if (!(currentScreen === LEVEL_THREE && level3TransitionActive)) {
          handleInput();
        }
        updateHumanBGSound();
        updateBirdBGSound();
        updateNoiseLevel();
        updateWalkingSound();
        updateFlappingSound();
        updateFishAreaSound();

        checkWindZones();
        checkWaterTransform();
        enforceLocationForm();

        whirlpoolTimer++;
        if (whirlpoolTimer >= WHIRLPOOL_SPRITE.animSpeed) {
          whirlpoolTimer = 0;
          whirlpoolFrame = (whirlpoolFrame + 1) % WHIRLPOOL_SPRITE.numFrames;
        }
        windTimer++;
        if (windTimer >= WIND_SPRITE.animSpeed) {
          windTimer = 0;
          windFrame = (windFrame + 1) % WIND_SPRITE.numFrames;
        }
        runeTimer++;
        if (runeTimer >= RUNE_SPRITE.animSpeed) {
          runeTimer = 0;
          runeFrame = (runeFrame + 1) % RUNE_SPRITE.numFrames;
        }

        resolveSolidCollisions();
        checkWhirlpools();
        checkKeys();
        checkPortalEntrance();
        checkHazardCollisions();
        checkCheckpoints();
        checkSafeZone();
        
        if (currentScreen === LEVEL_THREE) {
  updateLevel3BossFight();
    updateLevel3Epilogue();
    updateLevel3Transition();

} else {
  checkDragonCollision();
  updateDragon();
}
updateBats();
checkBatCollision();
      }
    }
  }

  drawWindZones();
  animateCharacter();
  drawPlayer();
  drawDragon();
  
  drawBats();
drawLevel3EndDragon();

  if (currentScreen === LEVEL_THREE && typeof drawLevel3BossFightWorld === "function") {
    drawLevel3BossFightWorld();
  }

  const fish = findArea(levelAreas, "fish");
  if (fish && fish.overlay) {
    // Right edge of the overlay should land exactly on the left edge of the
    // ~10-tile-long sand/rock wall on the right side of the fish area
    // (local tile x=42 in data/fisharea.json), not stretch across the
    // whole area.
    const overlayW = 42 * TILE_SIZE;
    image(fish.overlay, fish.bounds.x, fish.bounds.y, overlayW, 800);
  }

  drawDragonDebugHitbox();

  pop();
  drawKeyHUD();
  drawNoiseHUD();
  drawFadeMessage();
  if (currentScreen === LEVEL_THREE && typeof drawLevel3HUD === "function") {
    drawLevel3HUD();
  }
  if (currentScreen === LEVEL_THREE && typeof drawLevel3DialogueUI === "function") {
  drawLevel3DialogueUI();   // ADDED — screen-space, after pop()
}
  if (currentScreen === LEVEL_THREE && typeof drawLevel3Transition === "function") {
    drawLevel3Transition(); // drawn last so it covers the HUD/dialogue too
  }
  drawInstructions();
  if (
    gameState === STATE_WIN &&
    (currentScreen === LEVEL_ONE || currentScreen === LEVEL_TWO || currentScreen === LEVEL_THREE)
  ) {
    // stopAllGameSounds();
    drawEndScreen();
  }
  if (gameState === STATE_OVER && currentScreen === LEVEL_THREE) {   // ADDED
  drawLevel3BadEndScreen();
}
}



let DEBUG_SHOW_DRAGON_HITBOX = false; // flip to true, or toggle at runtime (see keyPressed note)

function drawDragonDebugHitbox() {
  if (!dragon || !DEBUG_SHOW_DRAGON_HITBOX) return;

  const hitbox = getDragonHitboxCenter();

  push();
  rectMode(CENTER);

  noFill();
  stroke(0, 255, 0);
  strokeWeight(2);
  rect(hitbox.x, hitbox.y, dragon.w, dragon.h);

  stroke(0, 255, 0);
  strokeWeight(4);
  point(hitbox.x, hitbox.y);

  pop();
}

function drawNoiseHUD() {
  if (currentScreen !== LEVEL_TWO || player.form !== FORM_BIRD) return;

  const bird = findArea(levelAreas, "bird");
  if (!bird || player.x < bird.bounds.x) return; // don't show until actually inside the bird area

  const barW = 40;
  const barH = 220;
  const baseX = 100;
  const baseY = height / 2 - barH / 2;

  const t = constrain(player.noiseLevel / NOISE_LEVEL_MAX, 0, 1);

  // Vigorous shake once noise is deep in the red zone — a visible warning
  let shakeX = 0;
  let shakeY = 0;
  if (t >= NOISE_SHAKE_THRESHOLD) {
    shakeX = random(-NOISE_SHAKE_AMOUNT, NOISE_SHAKE_AMOUNT);
    shakeY = random(-NOISE_SHAKE_AMOUNT, NOISE_SHAKE_AMOUNT);
  }

  const x = baseX + shakeX;
  const y = baseY + shakeY;

  push();
  noStroke();
  // Dark scarlet red, matching the bats — what this meter warns about
  fill(139, 0, 0, 140);
  rect(x - 10, y - 30, barW + 20, barH + 40, 8);

  fill(255);
  textSize(11);
  textFont("monospace");
  textAlign(CENTER, TOP);
  text("NOISE", x + barW / 2, y - 20);

  // Track (empty background of the bar) — dark red, matching the panel
  fill(70, 15, 15);
  rect(x, y, barW, barH, 4);

  // Fill height, growing from the bottom up as noise increases
  const fillH = barH * t;

  // Colour ramps green -> yellow -> red as noise climbs
  let fillColor;
  if (t < 0.5) {
    fillColor = lerpColor(color(60, 220, 80), color(230, 220, 40), t / 0.5);
  } else {
    fillColor = lerpColor(color(230, 220, 40), color(220, 40, 40), (t - 0.5) / 0.5);
  }

  fill(fillColor);
  rect(x, y + (barH - fillH), barW, fillH, 4);
  pop();
}
 
let level3EndScreenFadeFrames = 0; // reset in checkPortalEntrance() when level 3's WIN state begins
const LEVEL3_END_FADE_DURATION = 90; // ~1.5s at 60fps
let level3EndScreenFadeActive = false;

function drawEndScreen() {
  if (currentScreen === LEVEL_THREE) {
    if (!theEndImg) return;
    // If this is the first frame of the end fade, start the title theme
    const justStarting = level3EndScreenFadeFrames === 0;
    if (justStarting) {
      level3EndScreenFadeActive = true;
      const fadeSec = LEVEL3_END_FADE_DURATION / 60; // frames -> seconds (@60fps)
      if (typeof titleMusic !== 'undefined' && titleMusic) {
        try {
          titleMusic.setVolume(0);
          titleMusic.loop();
          titleMusic.fade(0.5, fadeSec);
        } catch (e) {
          // ignore if fade/loop not available
        }
      }
    }
    level3EndScreenFadeFrames = min(level3EndScreenFadeFrames + 1, LEVEL3_END_FADE_DURATION);
    if (level3EndScreenFadeFrames >= LEVEL3_END_FADE_DURATION) {
      level3EndScreenFadeActive = false;
    }
    const alpha = map(level3EndScreenFadeFrames, 0, LEVEL3_END_FADE_DURATION, 0, 255);
    push();
    imageMode(CENTER);
    const overlayW = min(width * 0.75, 600);
    const overlayH = (theEndImg.height / theEndImg.width) * overlayW;
    tint(255, alpha);
    image(theEndImg, width / 2, height / 2, overlayW, overlayH);
    pop();
    return;
  }

  const msgImg = currentScreen === LEVEL_TWO ? level2MessageImg : level1MessageImg;
  if (!msgImg) return;
  push();
  imageMode(CENTER);
  const overlayW = min(width * 0.75, 600);
  const overlayH = (msgImg.height / msgImg.width) * overlayW;
  image(msgImg, width / 2, height / 2 + 20, overlayW, overlayH);
  pop();
}

function drawKeyHUD() {
  if (currentScreen === LEVEL_THREE) return;

  const padding = 14;
  const boxW = 110;
  const boxH = 34;
  const x = width - boxW - padding;
  const y = padding;

  push();
  noStroke();
  fill(0, 0, 0, 140);
  rect(x, y, boxW, boxH, 8);

  fill(230, 200, 80); // key gold
  //rect(x + 12, y + boxH / 2 - 7, 12, 14, 2); // simple key-shaped icon block
  image(runeIconImg, x + 5, y + boxH / 2 - 18, 35, 35); // overlay rock texture for visual flair

  fill(255);
  textSize(16);
  textFont("monospace");
  textAlign(LEFT, CENTER);
  text(`${keyCollected} / ${keyTotal}`, x + 42, y + boxH / 2 + 1);
  pop();
}

// ------------------------------------------------------------
// tryTransform()
// Each wind zone declares its own fromForm/transformTo. No
// forward-only restriction anymore, since the pipeline is a loop:
// human -> bird -> fish -> human.
// ------------------------------------------------------------
function tryTransform(zone) {
  if (player.form === zone.fromForm) {
    // Special case: don't let fish become human while still submerged —
    // wait until the wind has actually launched them out of the water.
    if (zone.fromForm === FORM_FISH && zone.transformTo === FORM_HUMAN) {
      if (playerInWater()) return;
    }

    player.form = zone.transformTo;
    console.log("Transformed into:", player.form);
  }
}

function checkWindZones() {
  let inAnyZone = false;

  for (const z of windZones) {
    const inside =
      player.x + player.r > z.x &&
      player.x - player.r < z.x + z.w &&
      player.y + player.r > z.y &&
      player.y - player.r < z.y + z.h;

    if (inside) {
      inAnyZone = true;
      player.windTimer++;
      tryTransform(z);

           if (
  (currentScreen === LEVEL_ONE || currentScreen === LEVEL_TWO) &&
  player.windTimer > (z.delayFrames ?? WIND_DELAY_FRAMES)
) {
        const rampProgress = min(
          (player.windTimer - (z.delayFrames ?? WIND_DELAY_FRAMES)) / WIND_RAMP_FRAMES,
          1,
        );
        const currentForce = WIND_FORCE * rampProgress;
        const currentMaxUp = WIND_MAX_UP * rampProgress;

        if (z.hasCeiling) {
          // Zone 1 style: hover below an actual ceiling.
          const ceilingBuffer = 7 * TILE_SIZE;
          const targetY = z.y + ceilingBuffer;

          if (player.y > targetY) {
            player.vy += currentForce;
            player.vy = max(player.vy, currentMaxUp);
          } else {
            player.vy = max(player.vy, 0.5);
          }
        } else {
          // Launch zone: just keep pushing up, no hover point.
          player.vy += currentForce;
          player.vy = max(player.vy, currentMaxUp);
        }
      }

      player.isMoving = true;
    }
  }

  if (!inAnyZone) {
    player.windTimer = 0;
  }
}

function drawWindZones() {
  if (!windImg) return;

  const sx = windFrame * WIND_SPRITE.frameWidth;
  const sy = 0;
  const aspect = WIND_SPRITE.frameHeight / WIND_SPRITE.frameWidth;

  for (const z of windZones) {
    const dw = z.w;
    const dh = dw * aspect;

    push();
    imageMode(CENTER);
    image(
      windImg,
      z.x + z.w / 2,
      z.y + z.h / 2,
      dw,
      dh,
      sx,
      sy,
      WIND_SPRITE.frameWidth,
      WIND_SPRITE.frameHeight,
    );
    pop();
  }
}

// ------------------------------------------------------------
// checkWaterTransform()
// Bird -> fish is triggered by touching water directly.
// ------------------------------------------------------------
function checkWaterTransform() {
  // Level 3 phase 2: player is locked in bird form for the rest of the
  // fight — skip the normal water-triggered bird->fish transform, since
  // the arena is full of water tiles.
  if (
    currentScreen === LEVEL_THREE &&
    typeof level3Phase !== "undefined" &&
    level3Phase === LEVEL3_PHASE.FLY
  ) {
    return;
  }


  if (player.form === FORM_BIRD && playerInWater()) {
    player.form = FORM_FISH;
    console.log("Transformed into:", player.form);
  }
}

const AMBIENT_FADE_SECONDS = 0.3; // crossfade duration for area/form ambience swaps

// Generic crossfade for a looping ambience track: fades up to
// targetVolume while active, fades down to (but doesn't stop at) 0
// otherwise — left looping silently so fading back in later doesn't need
// to re-seek/restart the track.
function updateAmbientLoop(sound, shouldPlay, targetVolume) {
  if (!sound) return;
  if (shouldPlay) {
    if (!sound.isPlaying()) {
      sound.setVolume(0);
      sound.loop();
    }
    sound.fade(targetVolume, AMBIENT_FADE_SECONDS);
  } else if (sound.isPlaying()) {
    sound.fade(0, AMBIENT_FADE_SECONDS);
  }
}

function updateHumanBGSound() {
  // Level 3's epilogue keeps the player in human form throughout — it gets
  // its own dedicated music instead of the generic human ambience. The bad
  // end (chasing/dead) stays on chaseMusic instead of either one, so it
  // doesn't fight back in every frame right after the N-choice stops it.
  const inLevel3Epilogue =
    currentScreen === LEVEL_THREE && level3EpilogueState !== LEVEL3_EPILOGUE_STATE.NONE;
  const inLevel3EpilogueBadEnd =
    inLevel3Epilogue &&
    (level3EpilogueState === LEVEL3_EPILOGUE_STATE.CHASING ||
      level3EpilogueState === LEVEL3_EPILOGUE_STATE.DEAD);

  updateAmbientLoop(epilogueMusic, inLevel3Epilogue && !inLevel3EpilogueBadEnd, 1);

  if (!humanBGsound) return;
  const shouldPlayHuman = player.form === FORM_HUMAN && !inLevel3Epilogue;
  updateAmbientLoop(humanBGsound, shouldPlayHuman, 1);
}

function updateBirdBGSound() {
  if (!birdBGsound) return;

  // Level 3's bird form is the boss-fight phase — chaseMusic plays there
  // instead, so this generic ambience shouldn't compete with it.
  const shouldPlay = player.form === FORM_BIRD && currentScreen !== LEVEL_THREE;
  updateAmbientLoop(birdBGsound, shouldPlay, 0.15);
}

function updateWalkingSound() {
  if (!walkingsound) return;

  const shouldPlay = player.form === FORM_HUMAN && player.isMoving;

  if (shouldPlay) {
    if (!walkingsound.isPlaying()) {
      walkingsound.loop();
    }
  } else {
    if (walkingsound.isPlaying()) {
      walkingsound.stop();
    }
  }
}

// ------------------------------------------------------------
// updateFishAreaSound()
// Loops fisharea.mp3 whenever the player is submerged in water,
// regardless of form. Stops the instant they surface/leave water.
// ------------------------------------------------------------
function updateFishAreaSound() {
  if (!fishareasound || !fishBGsound) return; // use whatever variable name you declared

  const shouldPlay = playerInWater();
  updateAmbientLoop(fishareasound, shouldPlay, 0.55);
  updateAmbientLoop(fishBGsound, shouldPlay, 0.22);
}

// ------------------------------------------------------------
// updateFlappingSound()
// Loops flappingbird.mp3 while the player is in bird form AND
// physically within the bird area's x-range. Stops the
// instant they leave bird form or leave the bird area bounds.
// ------------------------------------------------------------
function updateFlappingSound() {
  const bird = findArea(levelAreas, "bird");
  if (!bird) return;

  const inBirdArea =
    player.x >= bird.bounds.x && player.x < bird.bounds.x + bird.bounds.w;
  const isFlapping = keyIsDown(87) || keyIsDown(UP_ARROW) || keyIsDown(32);
  const shouldPlay =
    player.form === FORM_BIRD && inBirdArea && (player.isMoving || isFlapping);

  const activeSound = currentScreen === LEVEL_TWO ? birdflapsound : flappingsound;
  const otherSound = currentScreen === LEVEL_TWO ? flappingsound : birdflapsound;

  if (otherSound && otherSound.isPlaying()) {
    otherSound.stop();
  }

  if (shouldPlay) {
    if (activeSound && !activeSound.isPlaying()) {
      activeSound.loop();
      activeSound.setVolume(2.5);
    }
  } else if (activeSound && activeSound.isPlaying()) {
    activeSound.stop();
  }
}

function stopAllGameSounds() {
  const sounds = [
    walkingsound,
    flappingsound,
    birdflapsound,
    fishareasound,
    fishBGsound,
    humanBGsound,
    birdBGsound,
    runesound,
    diesound,
    chaseMusic,
    titleMusic,
    epilogueMusic,
    dragonGrowl,
    dragonGrowl2,
    dragonScreech,
    dragonHurt,
    dragonHiss,
    dragonHiss2,
    batsound,
  ];
  for (const s of sounds) {
    if (s && s.isPlaying && s.isPlaying()) {
      s.stop();
    }
  }
}

// ------------------------------------------------------------
// animateCharacter() — Dynamic state animation processing
// ------------------------------------------------------------
function animateCharacter() {
  let inSea = player.form === FORM_FISH;
  let inStart = player.form === FORM_HUMAN;

  if (player.form === FORM_HUMAN) {
    if (player.isMoving) {
      player.frameTimer++;
      if (player.frameTimer >= HUMAN_SPRITE.animSpeed) {
        player.frameTimer = 0;
        player.currentFrame =
          (player.currentFrame + 1) % HUMAN_SPRITE.numFrames;
      }
    } else {
      player.currentFrame = 0;
      player.frameTimer = 0;
    }
  } else if (player.form === FORM_BIRD) {
    // Bird animation (unchanged)
    let isFlapping = keyIsDown(87) || keyIsDown(UP_ARROW) || keyIsDown(32);
    let currentAnimMode = isFlapping ? "flying" : "running";
    let maxFrames = BIRD_SPRITE.maxFrames[currentAnimMode];
    if (isFlapping || player.isMoving) {
      player.frameTimer++;
      if (player.frameTimer >= BIRD_SPRITE.animSpeed) {
        player.frameTimer = 0;
        player.currentFrame = (player.currentFrame + 1) % maxFrames;
      }
    } else {
      player.currentFrame = 0;
      player.frameTimer = 0;
    }
  } else if (player.form === FORM_FISH) {
    // Fish animation (unchanged)
    if (player.isMoving) {
      player.frameTimer++;
      if (player.frameTimer >= FISH_SPRITE.animSpeed) {
        player.frameTimer = 0;
        player.currentFrame = (player.currentFrame + 1) % FISH_SPRITE.numFrames;
      }
    } else {
      player.currentFrame = 0;
      player.frameTimer = 0;
    }
  }
}

// let inSea = playerInWater();
// let inStart = player.x < TILE_SIZE * startArea.mapWidth;

function enforceLocationForm() {
  // Level 3 phase 2: player is locked into bird form for the rest of the
  // fight, regardless of standing over water tiles in the arena — this
  // overrides the normal location-based form rules below.
 if (
  currentScreen === LEVEL_THREE &&
  typeof level3Phase !== "undefined" &&
  level3Phase === LEVEL3_PHASE.FLY &&
  level3Boss   // ADDED — only lock to bird form while the fight is actually ongoing
) {
  if (player.form !== FORM_BIRD) player.form = FORM_BIRD;
  return;
}
  if (playerInWater()) {
    if (player.form !== FORM_FISH) player.form = FORM_FISH;
    return;
  }

  // Level 2: anywhere before the wind current, player must be human —
  // including if they fly/walk backward past it after already transforming.
  if (currentScreen === LEVEL_TWO && windZones.length > 0) {
    const windZoneStart = windZones[0].x;
    if (player.x < windZoneStart && player.form !== FORM_HUMAN) {
      player.form = FORM_HUMAN;
    }
  }

  const bird = findArea(levelAreas, "bird");
  if (!bird) return;

  const inBirdAreaBounds =
    player.x >= bird.bounds.x &&
    player.x < bird.bounds.x + bird.bounds.w &&
    player.y < bird.bounds.y + bird.bounds.h;

  // Only re-trigger the human->bird transform going forward — a fish who
  // surfaces (leaves water) while still inside the bird area's bounding
  // box shouldn't get bounced back to bird form, since FORM_ORDER is a
  // one-way progression (human -> bird -> fish).
  if (
    inBirdAreaBounds &&
    player.form !== FORM_BIRD &&
    FORM_ORDER.indexOf(player.form) < FORM_ORDER.indexOf(FORM_BIRD)
  ) {
    player.form = FORM_BIRD;
  }
}
// ------------------------------------------------------------
// updateCamera()
// Smoothly moves the camera toward the player each frame.
// Clamps so the camera never shows outside the world.
// ------------------------------------------------------------
function updateCamera() {
  let visibleW = width / camZoom;
  let visibleH = height / camZoom;

  let targetX = player.x - width / 2;
  let targetY = player.y - height / 1.7;

  const b = getCamClampBounds(player.x, player.y);
  // The render transform (drawLevelScreen: translate by (width/2)*(1-camZoom)
  // - camX*camZoom, then scale(camZoom)) scales around screen-center, so the
  // true visible world window is centered at (camX + width/2), spanning
  // [camX + width/2 - visibleW/2, camX + width/2 + visibleW/2] — not
  // [camX, camX+visibleW] as constraining camX directly assumes. Those only
  // coincide when camZoom === 1; at any other zoom (idle is 0.8) clamping
  // camX itself left the true edge several tiles short on one side and
  // that same amount past it on the other.
  const halfW = visibleW / 2;
  const halfH = visibleH / 2;
  const minX = b.x0 - width / 2 + halfW;
  const maxX = b.x1 - width / 2 - halfW;
  const minY = b.y0 - height / 2 + halfH;
  const maxY = b.y1 - height / 2 - halfH;
  targetX = constrain(targetX, Math.min(minX, maxX), Math.max(minX, maxX));
  targetY = constrain(targetY, Math.min(minY, maxY), Math.max(minY, maxY));

  camX = lerp(camX, targetX, CAM_SMOOTHING);
  camY = lerp(camY, targetY, CAM_SMOOTHING);
}

// ------------------------------------------------------------
// ADDED — updateInvincibility()
// Counts down the player's invincibility window after taking a
// If you already decrement invincibleTimer somewhere else in your
// full project, remove this function to avoid double-counting.
// ------------------------------------------------------------
function updateInvincibility() {
  if (player.invincible) {
    player.invincibleTimer--;
    if (player.invincibleTimer <= 0) {
      player.invincible = false;
      player.invincibleTimer = 0;
    }
  }

  // Tick down jump cooldown
  if (player.jumpCooldown > 0) {
    player.jumpCooldown--;
  }
}

// ============================================================
// ADDED — TILE PHYSICS
// ============================================================

// ------------------------------------------------------------
// processJsonLayers()
// Helper function to extract and categorize tiles from a JSON
// file's layers. Can be called for birdArea, fishArea, or any
// other future JSON files to build a unified collision system.
// Applies world offsets so fishArea tiles are positioned correctly.
// ------------------------------------------------------------
function processJsonLayers(
  jsonFile,
  checkpointTiles,
  keyTiles,
  offsetX = 0,
  offsetY = 0,
) {
  if (!jsonFile || !jsonFile.layers) return;

  for (const layer of jsonFile.layers) {
    const isWater = layer.name === "water";
    const isSolid = SOLID_LAYERS.includes(layer.name);
    const isHazard = HAZARD_LAYERS.includes(layer.name);
    const isCheckpoint = layer.name === CHECKPOINT_LAYER;
    const isKey = layer.name === KEY_LAYER;
    const isWhirlpool = layer.name === WHIRLPOOL_LAYER;
    const isSeaweed = layer.name === SEAWEED_LAYER; // ADDED
    const isPortal = layer.name === PORTAL_LAYER;
    const isDragonSpawn = layer.name === DRAGON_SPAWN_LAYER;
  const isBat = layer.name === BAT_LAYER;
    const isSafeZone = layer.name === SAFE_ZONE_LAYER;

    if (
      !isSolid &&
      !isHazard &&
      !isCheckpoint &&
      !isKey &&
      !isWhirlpool &&
      !isWater &&
      !isSeaweed &&
      !isPortal &&
      !isDragonSpawn &&
      !isBat &&
      !isSafeZone
    )
      continue;

    for (const t of layer.tiles) {
      const rect = {
        x: t.x * TILE_SIZE + offsetX,
        y: t.y * TILE_SIZE + offsetY,
        w: TILE_SIZE,
        h: TILE_SIZE,
        tx: t.x,
        ty: t.y,
        layerName: layer.name,
      };
      if (isSolid) solidTiles.push(rect);
      else if (isHazard) hazardTiles.push(rect);
      else if (isCheckpoint) checkpointTiles.push(rect);
      else if (isKey) keyTiles.push(rect);
      else if (isWhirlpool) whirlpoolTiles.push(rect);
      else if (isWater) waterTiles.push(rect);
      else if (isSeaweed)
        seaweedTiles.push(rect); // ADDED
      else if (isPortal) portalTiles.push(rect);
      else if (isDragonSpawn) dragonSpawnTiles.push(rect);
      else if (isBat) batSpawnTiles.push(rect);
      else if (isSafeZone) safeZoneTiles.push(rect);
    }
  }
}

// ============================================================
// ADDED — TILE PHYSICS
// ============================================================

// ------------------------------------------------------------
// buildTileCollision()
// Walks every layer in birdArea once, sorting tiles into
// solidTiles / hazardTiles / raw checkpoint tiles based on the
// layer's name. Called once from setup(). Call it again if you
// ever swap birdArea for a different scene/map at runtime.
// ------------------------------------------------------------
function buildTileCollision() {
  solidTiles = [];
  hazardTiles = [];
  const checkpointTiles = [];
  const keyTiles = [];
  whirlpoolTiles = [];
  portalTiles = [];
  waterTiles = [];
  seaweedTiles = []; // ADDED

  processJsonLayers(startArea, checkpointTiles, keyTiles, 0, 0);

  // Process layers from birdArea (no offset)
  processJsonLayers(
    birdArea,
    checkpointTiles,
    keyTiles,
    startArea.mapWidth * TILE_SIZE,
    0,
  );

  // Process layers from fishArea with world offsets
  const fishAreaOffsetX =
    TILE_SIZE * (startArea.mapWidth + birdArea.mapWidth - 37);
  const fishAreaOffsetY = TILE_SIZE * birdArea.mapHeight;
  processJsonLayers(
    fishArea,
    checkpointTiles,
    keyTiles,
    fishAreaOffsetX,
    fishAreaOffsetY,
  );

  processJsonLayers(
    endArea,
    checkpointTiles,
    keyTiles,
    TILE_SIZE * (startArea.mapWidth + birdArea.mapWidth),
    TILE_SIZE * (birdArea.mapHeight - endArea.mapHeight),
  );

  checkpoints = groupCheckpointTiles(checkpointTiles);
  console.log("Checkpoints found:", checkpoints.length, checkpoints);
  console.log("Total checkpoint tiles:", checkpointTiles.length);

  keyTilesList = keyTiles;
  keyMap = new Map();
  keyTotal = keyTilesList.length;
  keyCollected = 0;
  portalUnlocked = false;
  for (const k of keyTilesList) {
    const mk = getWorldTileKey(k.x, k.y);
    keyMap.set(mk, false);
  }
}

// ------------------------------------------------------------
// groupCheckpointTiles()
// Checkpoint tiles are usually placed as a small cluster (a
// flag/banner a few tiles wide). This flood-fills adjacent
// checkpoint tiles into a single zone so touching ANY tile in
// the cluster counts as reaching that checkpoint, and gives each
// zone one spawn point (top-centre of the cluster).
// ------------------------------------------------------------
function groupCheckpointTiles(tileRects) {
  const key = (tx, ty) => tx + "," + ty;
  const lookup = new Map();
  for (const r of tileRects) lookup.set(key(r.tx, r.ty), r);

  const visited = new Set();
  const groups = [];

  for (const start of tileRects) {
    const startKey = key(start.tx, start.ty);
    if (visited.has(startKey)) continue;

    const queue = [start];
    visited.add(startKey);
    const cluster = [];

    while (queue.length) {
      const cur = queue.shift();
      cluster.push(cur);

      const neighbours = [
        [cur.tx + 1, cur.ty],
        [cur.tx - 1, cur.ty],
        [cur.tx, cur.ty + 1],
        [cur.tx, cur.ty - 1],
      ];
      for (const [nx, ny] of neighbours) {
        const nk = key(nx, ny);
        if (lookup.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(lookup.get(nk));
        }
      }
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const c of cluster) {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + c.w);
      maxY = Math.max(maxY, c.y + c.h);
    }

    groups.push({
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
      spawnX: (minX + maxX) / 2,
      spawnY: minY - player.r - 4, // spawn just above the checkpoint tiles
    });
  }

  // Left-to-right order so "furthest checkpoint reached" is just an index.
  groups.sort((a, b) => a.x - b.x);
  return groups;
}

// ------------------------------------------------------------
// resolveSolidCollisions()
// Pushes the player out of any overlapping rock/seaweed tile.
// Run AFTER handleInput()/applyBounce() so movement this frame
// has already been applied, then corrected.
// ------------------------------------------------------------
// Multiple passes: resolving against one tile can push the player straight
// into a neighboring tile at a corner/staircase junction (very common in
// level 1's terrain) since each tile is only checked once per pass with no
// knowledge of the others — a single pass could leave the player still
// overlapping, or (combined with a big single-frame move, e.g. bird flight
// speed) resolve toward the wrong edge entirely and land them inside a
// solid tile. Iterating lets it converge to a clean, non-overlapping spot.
const SOLID_COLLISION_PASSES = 4;

function resolveSolidCollisions() {
  for (let pass = 0; pass < SOLID_COLLISION_PASSES; pass++) {
    for (const t of solidTiles) {
      const requiredKeys = GATE_LAYERS[t.layerName];
      if (requiredKeys !== undefined && keyCollected >= requiredKeys) {
        continue; // this gate is open, no collision
      }
      resolveCircleRect(player, t);
    }
  }
}

// ------------------------------------------------------------
// resolveCircleRect()
// Circle (player) vs axis-aligned rect (tile) overlap + push-out.
// Mutates p.x / p.y directly so the player can never end up
// inside a solid tile.
// ------------------------------------------------------------
function resolveCircleRect(p, rect) {
  // Find nearest point on tile to player circle
  const closestX = constrain(p.x, rect.x, rect.x + rect.w);
  const closestY = constrain(p.y, rect.y, rect.y + rect.h);

  const dx = p.x - closestX;
  const dy = p.y - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= p.r * p.r) return;

  const dist = sqrt(distSq);

  // If circle center is not exactly inside the tile corner/edge case
  if (dist > 0) {
    const overlap = p.r - dist;

    // Push out mostly vertically if falling onto the tile
    if (abs(dy) > abs(dx)) {
      p.y += (dy / dist) * overlap;

      if (dy < 0 && p.vy > 0) {
        p.vy = 0;
        p.isGrounded = true;
      } else if (dy > 0 && p.vy < 0) {
        p.vy = 0;
      }
    } else {
      p.x += (dx / dist) * overlap;
      p.vx = 0;
    }
    return;
  }

  // If the player center is inside the tile, push out by smallest distance
  const pushLeft = abs(p.x - rect.x);
  const pushRight = abs(rect.x + rect.w - p.x);
  const pushTop = abs(p.y - rect.y);
  const pushBottom = abs(rect.y + rect.h - p.y);

  const minPush = min(pushLeft, pushRight, pushTop, pushBottom);

  if (minPush === pushTop) {
    p.y = rect.y - p.r;
    if (p.vy > 0) p.vy = 0;
    p.isGrounded = true;
  } else if (minPush === pushBottom) {
    p.y = rect.y + rect.h + p.r;
    if (p.vy < 0) p.vy = 0;
  } else if (minPush === pushLeft) {
    p.x = rect.x - p.r;
    p.vx = 0;
  } else if (minPush === pushRight) {
    p.x = rect.x + rect.w + p.r;
    p.vx = 0;
  }
}

// ------------------------------------------------------------
// checkHazardCollisions()
// Spikes kill on contact — same circle-vs-rect overlap test as
// the solid tiles, but on touch it kills/respawns instead of
// pushing the player out.
// ------------------------------------------------------------
function checkHazardCollisions() {
  if (player.invincible) return;

  const start = findArea(levelAreas, "start");
  if (
    start &&
    player.x < start.bounds.x + start.bounds.w &&
    player.y > 30 * TILE_SIZE
  ) {
    respawnFromHazard();
    return;
  }

  for (const t of hazardTiles) {
    const closestX = constrain(player.x, t.x, t.x + t.w);
    const closestY = constrain(player.y, t.y, t.y + t.h);
    if (dist(player.x, player.y, closestX, closestY) < player.r) {
      if (currentScreen === LEVEL_THREE) {
        playerTakeDragonHit(); // uses the 5-hit health bar, not checkpoint respawn
      } else {
        respawnFromHazard();
      }
      break;
    }
  }
}
// ------------------------------------------------------------
// checkCheckpoints()
// Activates the furthest checkpoint the player has touched.
// activeCheckpointIndex only ever moves forward, so walking back
// over an earlier checkpoint doesn't undo your progress.
// ------------------------------------------------------------
function checkCheckpoints() {
  for (let i = activeCheckpointIndex + 1; i < checkpoints.length; i++) {
    const cp = checkpoints[i];
    const overlapsX =
      player.x + player.r > cp.x - CHECKPOINT_TRIGGER_MARGIN &&
      player.x - player.r < cp.x + cp.w + CHECKPOINT_TRIGGER_MARGIN;
    const overlapsY =
      player.y + player.r > cp.y - CHECKPOINT_TRIGGER_MARGIN &&
      player.y - player.r < cp.y + cp.h + CHECKPOINT_TRIGGER_MARGIN;
    if (overlapsX && overlapsY) {
      activeCheckpointIndex = i;
      lastCheckpoint = { x: cp.spawnX, y: cp.spawnY };
      console.log("Checkpoint activated:", i, lastCheckpoint);
    }
  }
}

// ------------------------------------------------------------
// respawnPlayer()
// When the player loses health, spawn at the closest checkpoint
// they have passed, with (0, 0) as the fallback.
// Grants a short invincibility window so they don't immediately
// die again on the same hazard.
// ------------------------------------------------------------
function respawnPlayer() {
  const spawn =
    findClosestPassedCheckpoint(player.x, player.y) ||
    lastCheckpoint ||
    playerStart;

  player.x = spawn.x;
  player.y = spawn.y;
  player.bounceVX = 0;
  player.bounceVY = 0;
  player.invincible = true;
  player.invincibleTimer = INVINCIBLE_FRAMES;

  player.stamina = FISH_STAMINA_MAX;
player.flapVelocity = 0;
player.flapQueued = false;

  snapCameraToPlayer();

  player.noiseLevel = 0;
}

// ------------------------------------------------------------
// findClosestPassedCheckpoint()
// Returns the nearest spawn point among checkpoints the player
// has already reached, or null if none have been reached.
// ------------------------------------------------------------

function findClosestPassedCheckpoint(px, py) {
  if (activeCheckpointIndex < 0) return null;

  let best = null;
  let minD = Infinity;

  for (let i = 0; i <= activeCheckpointIndex; i++) {
    const cp = checkpoints[i];
    const d = dist(px, py, cp.spawnX, cp.spawnY);
    if (d < minD) {
      minD = d;
      best = { x: cp.spawnX, y: cp.spawnY };
    }
  }

  return best;
}

// ------------------------------------------------------------
// respawnFromHazard()
// Immediate respawn used for spike contacts: does NOT reduce
// player health and does NOT grant invincibility (no flicker).
// Respawns at the nearest passed checkpoint or start.
// ------------------------------------------------------------
/**function respawnFromHazard() {
  if (diesound) diesound.play();
  if (walkingsound && walkingsound.isPlaying()) walkingsound.stop();
  if (flappingsound && flappingsound.isPlaying()) flappingsound.stop();
  if (fishareasound && fishareasound.isPlaying()) fishareasound.stop();

  const spawn =
    lastCheckpoint ||
    findClosestPassedCheckpoint(player.x, player.y) ||
    playerStart;

  player.x = spawn.x;
  player.y = spawn.y;
  player.vy = 0;
  player.bounceVX = 0;
  player.bounceVY = 0;
  // no invincibility here — user requested no glitching/flicker

  snapCameraToPlayer();
}**/
function respawnFromHazard() {
  if (isRespawning) return; // already dying — ignore extra triggers

  if (diesound) diesound.play();
  if (walkingsound && walkingsound.isPlaying()) walkingsound.stop();
  if (flappingsound && flappingsound.isPlaying()) flappingsound.stop();
  if (fishareasound && fishareasound.isPlaying()) fishareasound.stop();

  beginRespawnDelay(() => {
    const spawn =
      lastCheckpoint ||
      findClosestPassedCheckpoint(player.x, player.y) ||
      playerStart;

    player.x = spawn.x;
    player.y = spawn.y;
    player.vy = 0;
    player.bounceVX = 0;
    player.bounceVY = 0;

    snapCameraToPlayer();
  });

  player.noiseLevel = 0;
}

function setupDragonForLevel(levelId) {
  dragon = null;
  dragonSpawnPoint = null;
  dragonTriggerRuneKey = null;
  fishCheckpointBeforeDragon = -1;
  fishCheckpointAfterDragon = -1;
 
  if (levelId !== LEVEL_TWO) return; // only these have dragons  
  if (dragonSpawnTiles.length === 0) {
    console.warn('setupDragonForLevel: no "dragon spawn" tiles found for', levelId);
    return;
  }
 
  // Sleeping position = centroid of the dragon spawn tiles
  let sx = 0, sy = 0;
  for (const t of dragonSpawnTiles) {
    sx += t.x + t.w / 2;
    sy += t.y + t.h / 2;
  }
  dragonSpawnPoint = {
    x: sx / dragonSpawnTiles.length,
    y: sy / dragonSpawnTiles.length,
  };

  dragon = {
    x: dragonSpawnPoint.x,
  y: dragonSpawnPoint.y,
  w: DRAGON_CONFIG.tileSpan * TILE_SIZE,
  h: DRAGON_CONFIG.tileSpan * TILE_SIZE,
  state: DRAGON_STATE.SLEEPING,
  facing: "left",
  health: DRAGON_CONFIG.maxHealth,
  maxHealth: DRAGON_CONFIG.maxHealth,
  wakeGracePeriod: 0, // ADD THIS
};
 

  // "The rune next to it" — closest key tile to the dragon's spawn point.
  // No per-tile metadata needed in Tiled; proximity is enough to identify it.
  let closestDist = Infinity;
  for (const k of keyTilesList) {
    const cx = k.x + k.w / 2;
    const cy = k.y + k.h / 2;
    const d = dist(cx, cy, dragonSpawnPoint.x, dragonSpawnPoint.y);
    if (d < closestDist) {
      closestDist = d;
      dragonTriggerRuneKey = getWorldTileKey(k.x, k.y);
            dragonTriggerRunePos = { x: cx, y: cy };
    }
  }

  // Find the two fish-area checkpoints that bracket the encounter —
  // first one inside the fish area's x-range is "before", second is "after".
  const fish = findArea(levelAreas, "fish");
if (fish) {
  const inFish = [];
  checkpoints.forEach((cp, i) => {
    if (
      cp.x >= fish.bounds.x && cp.x < fish.bounds.x + fish.bounds.w &&
      cp.y >= fish.bounds.y && cp.y < fish.bounds.y + fish.bounds.h
    ) {
      inFish.push(i);
    }
  });
  fishCheckpointBeforeDragon = inFish[0] ?? -1;
  fishCheckpointAfterDragon = inFish[1] ?? -1;

  if (fishCheckpointBeforeDragon === -1 || fishCheckpointAfterDragon === -1) {
    console.warn(
      "Dragon encounter expects 2 checkpoints in the fish area, found:",
      inFish.length,
    );
  }
}
}
 
function wakeDragon() {
  if (!dragon || dragon.state !== DRAGON_STATE.SLEEPING) return;
  dragon.state = DRAGON_STATE.CHASING;
  chaseCamZoomTarget = 0.7;
  startChaseMusic();
  console.log("Dragon woke up — chase started.");
dragonScreech.play();

  dragonPath = [];
dragonPathIndex = 0;
dragonPathRecalcTimer = DRAGON_PATH_RECALC_INTERVAL; // forces recalc on the very next updateDragon() call
  dragonStillFrames = 0;
  dragonPrevX = dragon.x;
  dragonPrevY = dragon.y;
  dragonNudging = false;
}

// ------------------------------------------------------------
// BATS (Level 2 only)
// Two-state machine: SLEEPING (parked at spawn, drawn as a
// placeholder box) -> AWAKE (homes in on the bird every frame).
// Waking is permanent — batsWoken never resets, so re-triggering
// either wake condition after the fact is a harmless no-op.
// ------------------------------------------------------------
function setupBatsForLevel(levelId) {
  bats = [];
  batsWoken = false;
  secondRuneKey = null;
  batTriggerRuneKey = null;

  if (levelId !== LEVEL_TWO) return;

  let sumX = 0, sumY = 0;
  for (const t of batSpawnTiles) {
    const spawnX = t.x + t.w / 2;
    const spawnY = t.y + t.h / 2;
    bats.push({
      x: spawnX,
      y: spawnY,
      spawnX,
      spawnY,
      state: BAT_STATE.SLEEPING,
      speed: PLAYER_SPEED * BAT_SPEED_MULTIPLIER, // 150% of the bird's move speed
    });
    sumX += spawnX;
    sumY += spawnY;
  }

  // "The rune gem" that wakes them — same identity-based approach as
  // dragonTriggerRuneKey (closest rune to the bats' spawn centroid),
  // instead of assuming it's always whichever rune happens to be the
  // player's 2nd pickup by raw count — that broke whenever the player's
  // path collected the runes in a different order.
  if (batSpawnTiles.length > 0) {
    const spawnCentroidX = sumX / batSpawnTiles.length;
    const spawnCentroidY = sumY / batSpawnTiles.length;
    let closestDist = Infinity;
    for (const k of keyTilesList) {
      const cx = k.x + k.w / 2;
      const cy = k.y + k.h / 2;
      const d = dist(cx, cy, spawnCentroidX, spawnCentroidY);
      if (d < closestDist) {
        closestDist = d;
        batTriggerRuneKey = getWorldTileKey(k.x, k.y);
      }
    }
  }
}

function wakeAllBats() {
  if (batsWoken) return; // already triggered — never re-fire, never re-sleep
  batsWoken = true;

  for (const b of bats) {
    b.state = BAT_STATE.AWAKE;
  }
batsound.play();
  console.log("Bats awakened — chase started.");
}

// Puts bats back to sleep at spawn. Does NOT touch the rune or
// keyCollected — safe to call any time bats just need to go quiet
// (e.g. player becomes a fish).
function sleepBats() {
  batsWoken = false;
  batsound.stop();
  for (const b of bats) {
    b.state = BAT_STATE.SLEEPING;
    b.x = b.spawnX;
    b.y = b.spawnY;
  }
}

// Full reset used ONLY when a bat actually kills the player: puts
// bats to sleep AND un-collects the 2nd rune, rolling keyCollected
// back so barriers gated on it re-lock correctly.
function resetBats() {
  sleepBats();

  if (secondRuneKey) {
    keyMap.set(secondRuneKey, false);
    // Un-collecting exactly one rune should lose exactly one rune's worth
    // of credit — hardcoding to 1 overwrote whatever the player's real
    // total was (same bug as respawnFromDragon() had), so re-collecting
    // the last rune later could still fall short of requiredPortalKeys
    // and never open the portal.
    keyCollected = Math.max(0, keyCollected - 1);
    portalUnlocked = portalIsUnlocked();
  }
  secondRuneKey = null;
}

function updateBats() {
  if (currentScreen !== LEVEL_TWO) return; // level restriction

 // Bird -> fish transformation puts bats back to sleep.
  // Does NOT touch the rune/keyCollected — only a bat kill does that.
  if (player.form === FORM_FISH && batsWoken) {
    sleepBats();
  }

  for (const b of bats) {
    if (b.state !== BAT_STATE.AWAKE) continue; // sleeping bats stay at spawn

    const dx = player.x - b.x;
    const dy = player.y - b.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;

    b.x += (dx / d) * b.speed;
    b.y += (dy / d) * b.speed;
  }
}


// TEMP placeholder rendering — swap this function's body for real
// bat sprites later; updateBats()/wakeAllBats() never need to change.
function drawBats() {
  if (currentScreen !== LEVEL_TWO || bats.length === 0) return;

  batAnimTimer++;
  if (batAnimTimer >= BAT_SPRITE.animSpeed) {
    batAnimTimer = 0;
    batAnimFrame = (batAnimFrame + 1) % BAT_SPRITE.numFrames;
  }

  push();
  imageMode(CENTER);

  for (const b of bats) {
    if (b.state === BAT_STATE.AWAKE && batFlySheet) {
      const sx = batAnimFrame * BAT_SPRITE.frameWidth;
      const dw = BAT_SPRITE.frameWidth * BAT_SPRITE.scale;
      const dh = BAT_SPRITE.frameHeight * BAT_SPRITE.scale;
      image(
        batFlySheet,
        b.x, b.y, dw, dh,
        sx, 0, BAT_SPRITE.frameWidth, BAT_SPRITE.frameHeight,
      );
    } else if (batIdleImg) {
    const dw = batIdleImg.width * BAT_SPRITE.idleScale;
    const dh = batIdleImg.height * BAT_SPRITE.idleScale;
    image(batIdleImg, b.x, b.y, dw, dh);
   }
  }

  pop();
}
 
function dragonInSeaweed() {
  if (!dragon) return false;
  const halfW = dragon.w / 2;
  const halfH = dragon.h / 2;
  for (const t of seaweedTiles) {
    const overlapsX = dragon.x + halfW > t.x && dragon.x - halfW < t.x + t.w;
    const overlapsY = dragon.y + halfH > t.y && dragon.y - halfH < t.y + t.h;
    if (overlapsX && overlapsY) return true;
  }
  return false;
}
// Moves the dragon toward the player. Called every frame while chasing.
function updateDragon() {
  if (!dragon || dragon.state !== DRAGON_STATE.CHASING) return;

  const speed = dragonInSeaweed()
    ? DRAGON_CONFIG.chaseSpeed / DRAGON_CONFIG.seaweedSlowFactor
    : DRAGON_CONFIG.chaseSpeed;

  // Currently easing up out of a stuck spot (see below) — glide toward the
  // target tile instead of snapping, and skip normal path-following until
  // it arrives so the two movements don't fight each other.
  if (dragonNudging) {
    const diff = dragonNudgeTargetY - dragon.y;
    if (Math.abs(diff) < speed) {
      dragon.y = dragonNudgeTargetY;
      dragonNudging = false;
    } else {
      dragon.y += Math.sign(diff) * speed;
    }
    resolveDragonSolidCollisions();
    dragonPrevX = dragon.x;
    dragonPrevY = dragon.y;
    return;
  }

  dragonPathRecalcTimer++;
  if (dragonPathRecalcTimer >= DRAGON_PATH_RECALC_INTERVAL || dragonPathIndex >= dragonPath.length) {
    dragonPathRecalcTimer = 0;
    recalcDragonPath();
  }

  let target = { x: player.x, y: player.y }; // fallback if no path yet
  if (dragonPath.length > 0 && dragonPathIndex < dragonPath.length) {
    const isFinalNode = dragonPathIndex === dragonPath.length - 1;
    const node = dragonPath[dragonPathIndex];
    // The final node is only a tile-center approximation of the player's
    // real (continuous) position — near a tight ledge that grid-snapped
    // point can be a worse spot than the player's actual position, since
    // real collision resolution isn't grid-locked. Home in on the player
    // directly for the last leg instead of the tile center.
    target = isFinalNode
      ? { x: player.x, y: player.y }
      : { x: node.tx * TILE_SIZE + TILE_SIZE / 2, y: node.ty * TILE_SIZE + TILE_SIZE / 2 };
    const waypointRadius = Math.max(DRAGON_PATH_WAYPOINT_RADIUS, (dragon.w / 2) * 0.6);
    if (!isFinalNode && dist(dragon.x, dragon.y, target.x, target.y) < waypointRadius) {
      dragonPathIndex++;
    }
  }

  const dx = target.x - dragon.x;
  const dy = target.y - dragon.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;

  dragon.x += (dx / d) * speed;
  dragon.y += (dy / d) * speed;
  dragon.facing = dx < 0 ? "left" : "right";

  resolveDragonSolidCollisions();

  // If the dragon hasn't actually moved for a while (snagged on a corner/
  // ledge), ease it up one tile to break out rather than sitting frozen —
  // but only if there's actually open space to move into. Without this
  // check, a player resting somewhere the dragon can never reach (e.g. a
  // tight refuge) makes it re-trigger endlessly, climbing tile after tile
  // until it rams a solid ceiling and sits pinned there.
  const moved = dist(dragon.x, dragon.y, dragonPrevX, dragonPrevY);
  if (moved < 0.5) {
    dragonStillFrames++;
    if (dragonStillFrames > 30) {
      if (!dragonBoxOverlapsSolid(dragon.x, dragon.y - TILE_SIZE)) {
        dragonNudging = true;
        dragonNudgeTargetY = dragon.y - TILE_SIZE;
      }
      dragonStillFrames = 0;
    }
  } else {
    dragonStillFrames = 0;
  }
  dragonPrevX = dragon.x;
  dragonPrevY = dragon.y;
}

// True if the dragon's collision box, centered at (x,y), would overlap any
// currently-solid tile — a pure check, doesn't move anything.
function dragonBoxOverlapsSolid(x, y) {
  const halfW = dragon.w / 2;
  const halfH = dragon.h / 2;
  for (const t of solidTiles) {
    const requiredKeys = GATE_LAYERS[t.layerName];
    if (requiredKeys !== undefined && keyCollected >= requiredKeys) continue;
    const overlapX = Math.min(x + halfW, t.x + t.w) - Math.max(x - halfW, t.x);
    const overlapY = Math.min(y + halfH, t.y + t.h) - Math.max(y - halfH, t.y);
    if (overlapX > 0 && overlapY > 0) return true;
  }
  return false;
}

// Same idea as resolveSolidCollisions()/resolveCircleRect() for the
// player, but box-vs-box (AABB) since the dragon is a 3x3 tile block
// rather than a circle. Respects the same rune-gated barriers.
/**
function resolveDragonSolidCollisions() {
  if (!dragon) return;
  const halfW = dragon.w / 2;
  const halfH = dragon.h / 2;

  for (const t of solidTiles) {
    const requiredKeys = GATE_LAYERS[t.layerName];
    if (requiredKeys !== undefined && keyCollected >= requiredKeys) continue; // gate is open
    resolveBoxRect(dragon, halfW, halfH, t);
  }
}
**/
function resolveDragonSolidCollisions() {
  if (!dragon) return;
  const halfW = dragon.w / 2;
  const halfH = dragon.h / 2;

  // Collides against dragon.x/y directly (not the offset hitbox used for
  // player-touch damage) so this shares the same frame of reference as the
  // A* path, which is also built around dragon.x/y — otherwise the path
  // considers a corner "clear" that the offset collision box still clips.
  for (const t of solidTiles) {
    const requiredKeys = GATE_LAYERS[t.layerName];
    if (requiredKeys !== undefined && keyCollected >= requiredKeys) continue;
    resolveBoxRect(dragon, halfW, halfH, t);
  }
}

function resolveBoxRect(entity, halfW, halfH, rect) {
  const left = entity.x - halfW;
  const right = entity.x + halfW;
  const top = entity.y - halfH;
  const bottom = entity.y + halfH;

  const overlapX = Math.min(right, rect.x + rect.w) - Math.max(left, rect.x);
  const overlapY = Math.min(bottom, rect.y + rect.h) - Math.max(top, rect.y);

  if (overlapX <= 0 || overlapY <= 0) return; // no overlap

  // Push out along whichever axis has the smaller overlap.
  if (overlapX < overlapY) {
    if (entity.x < rect.x + rect.w / 2) entity.x -= overlapX;
    else entity.x += overlapX;
  } else {
    if (entity.y < rect.y + rect.h / 2) entity.y -= overlapY;
    else entity.y += overlapY;
  }
}
 

// Checked every frame regardless of state — sleeping dragons wake on
// touch, chasing dragons kill on touch.
function checkDragonCollision() {
  if (!dragon) return;

  const halfW = dragon.w / 2;
  const halfH = dragon.h / 2;
  const hitbox = getDragonHitboxCenter();
  const closestX = constrain(player.x, dragon.x - halfW, dragon.x + halfW);
  const closestY = constrain(player.y, dragon.y - halfH, dragon.y + halfH);

  if (dragon.state === DRAGON_STATE.CHASING) {
  console.log("dragon-player dist:", dist(player.x, player.y, closestX, closestY), "player.r:", player.r, "invincible:", player.invincible, "invincibleTimer:", player.invincibleTimer);
}
  if (dist(player.x, player.y, closestX, closestY) >= player.r) return;

  if (dragon.state === DRAGON_STATE.SLEEPING) {
    wakeDragon();
  } else if (dragon.state === DRAGON_STATE.CHASING && !player.invincible) {
    respawnFromDragon();
  }
}
 
function checkBatCollision() {
  if (currentScreen !== LEVEL_TWO || player.invincible) return;

  for (const b of bats) {
    if (b.state !== BAT_STATE.AWAKE) continue;

    const d = dist(player.x, player.y, b.x, b.y);
    if (d < player.r + TILE_SIZE * 0.4) {
      resetBats();
      respawnFromHazard();
      break;
    }
  }
}

// Eases camZoom toward chaseCamZoomTarget. Call this every frame
// (e.g. right next to updateCamera()) — it's a no-op once camZoom
// has caught up to the target.
function updateCamZoom() {
  const target = currentScreen === LEVEL_THREE ? level3CamZoomTarget : chaseCamZoomTarget;
  camZoom = lerp(camZoom, target, 0.03);
}

function respawnFromDragon() {
  if (isRespawning) return; // already dying — ignore extra triggers

  if (diesound) diesound.play();
  stopAllGameSounds();

  beginRespawnDelay(() => {
    const reachedAfter =
      fishCheckpointAfterDragon !== -1 &&
      activeCheckpointIndex >= fishCheckpointAfterDragon;

    if (reachedAfter) {
      const cp = checkpoints[fishCheckpointAfterDragon];
      player.x = cp.spawnX;
      player.y = cp.spawnY;
      player.stamina = FISH_STAMINA_MAX;
      player.flapVelocity = 0;
      player.flapQueued = false;

      dragon.state = DRAGON_STATE.CHASING;
      dragon.x = player.x - DRAGON_CONFIG.behindOffsetX;
      dragon.y = player.y;

      chaseCamZoomTarget = 0.7;

      dragonPath = [];
      dragonPathIndex = 0;
      dragonPathRecalcTimer = DRAGON_PATH_RECALC_INTERVAL;
      dragonStillFrames = 0;
      dragonPrevX = dragon.x;
      dragonPrevY = dragon.y;
      dragonNudging = false;

      startChaseMusic();
    } else {
      const cpIndex =
        fishCheckpointBeforeDragon !== -1
          ? fishCheckpointBeforeDragon
          : activeCheckpointIndex;
      const cp = checkpoints[cpIndex] || null;
      const spawn = cp ? { x: cp.spawnX, y: cp.spawnY } : lastCheckpoint || playerStart;

      player.x = spawn.x;
      player.y = spawn.y;

      dragon.state = DRAGON_STATE.SLEEPING;
      dragon.x = dragonSpawnPoint.x;
      dragon.y = dragonSpawnPoint.y;

      if (dragonTriggerRuneKey) {
        keyMap.set(dragonTriggerRuneKey, false);
        // Un-collecting exactly one rune (the trigger rune) should lose
        // exactly one rune's worth of credit — not hard-reset to a fixed
        // count, which overwrote whatever the player's real total was
        // (e.g. respawning with 2 runes credited despite only really
        // having 1, and later falling short of requiredPortalKeys after
        // re-collecting it, so the portal never opened).
        keyCollected = Math.max(0, keyCollected - 1);
        portalUnlocked = portalIsUnlocked();
      }

      chaseCamZoomTarget = 0.8;
    }

    player.vy = 0;
    player.vx = 0;
    player.bounceVX = 0;
    player.bounceVY = 0;
    player.stamina = FISH_STAMINA_MAX;
    player.flapVelocity = 0;
    player.flapQueued = false;

    snapCameraToPlayer();
  });
}
 
function drawDragon() {
  
  if (!dragon) return;
  // If the final "The End" fade is active, don't advance dragon animation
  // or draw movement so the creature remains frozen on-screen.
  if (level3EndScreenFadeActive && currentScreen === LEVEL_THREE) {
    // Render a single idle frame and return
    push();
    imageMode(CENTER);
    const row = dragon.facing === "left" ? DRAGON_SPRITE.rows.idleLeft : DRAGON_SPRITE.rows.idleRight;
    const sx = 0;
    const sy = row * DRAGON_SPRITE.frameHeight;
    const dw = DRAGON_SPRITE.frameWidth * DRAGON_SPRITE.scale;
    const dh = DRAGON_SPRITE.frameHeight * DRAGON_SPRITE.scale;
    if (dragonSheet) {
      image(dragonSheet, dragon.x, dragon.y, dw, dh, sx, sy, DRAGON_SPRITE.frameWidth, DRAGON_SPRITE.frameHeight);
    }
    pop();
    return;
  }

  push();
  imageMode(CENTER);

  if (dragon.state === DRAGON_STATE.SLEEPING) {
    // Animate sleeping sprite with pingpong
    dragonSleepTimer++;
    if (dragonSleepTimer >= DRAGON_SLEEPING_SPRITE.animSpeed) {
      dragonSleepTimer = 0;
      dragonSleepFrame = (dragonSleepFrame + 1) % DRAGON_SLEEPING_SPRITE.numFrames;
    }

    const sx = dragonSleepFrame * DRAGON_SLEEPING_SPRITE.frameWidth;
    const dw = DRAGON_SLEEPING_SPRITE.frameWidth * DRAGON_SLEEPING_SPRITE.scale;  // FIXED
const dh = DRAGON_SLEEPING_SPRITE.frameHeight * DRAGON_SLEEPING_SPRITE.scale;

    if (dragonSleepingSheet) {
      image(dragonSleepingSheet, dragon.x, dragon.y, dw, dh,
            sx, 0, DRAGON_SLEEPING_SPRITE.frameWidth, DRAGON_SLEEPING_SPRITE.frameHeight);
    }

  } else {
    // Animate flying/idle sprite
    dragonAnimTimer++;
    if (dragonAnimTimer >= DRAGON_SPRITE.animSpeed) {
      dragonAnimTimer = 0;
      dragonAnimFrame = (dragonAnimFrame + 1) % DRAGON_SPRITE.numFrames;
    }

    const row = dragon.facing === "left"
      ? DRAGON_SPRITE.rows.flyingLeft
      : DRAGON_SPRITE.rows.flyingRight;

    const sx = dragonAnimFrame * DRAGON_SPRITE.frameWidth;
    const sy = row * DRAGON_SPRITE.frameHeight;
    const dw = DRAGON_SPRITE.frameWidth * DRAGON_SPRITE.scale;
    const dh = DRAGON_SPRITE.frameHeight * DRAGON_SPRITE.scale;

    if (dragonSheet) {
      image(dragonSheet, dragon.x, dragon.y, dw, dh,
            sx, sy, DRAGON_SPRITE.frameWidth, DRAGON_SPRITE.frameHeight);
    }
  }

  pop();
}
 
// ------------------------------------------------------------
// checkCollectables()
// Detects overlap with coin tiles and marks them collected.
// When all coins are collected sets `allCoinCollected`.
// ------------------------------------------------------------
function getWorldTileKey(x, y) {
  return `${Math.round(x)},${Math.round(y)}`;
}

function portalIsUnlocked() {
  return keyCollected >= requiredPortalKeys;
}

// Shared by real key-pickups (checkKeys()) and the debug win action, so
// both trigger the same one-shot sound + fade message instead of the
// debug path silently skipping it.
function unlockPortal() {
  portalUnlocked = portalIsUnlocked();
  if (portalUnlocked && !portalOpeningPlayed) {
    if (portalOpeningSound) portalOpeningSound.play();
    if (portalChime) portalChime.play();
    showFadeMessage("A portal has opened...");
    portalOpeningPlayed = true;
  }
}

function checkKeys() {
  if (gameState !== STATE_PLAY || keyTotal === 0 || portalUnlocked) return;

  for (const t of keyTilesList) {
    const mapKey = getWorldTileKey(t.x, t.y);
    if (keyMap.get(mapKey)) continue; // already collected

    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    const d = dist(player.x, player.y, cx, cy);

    if (d < player.r + TILE_SIZE * 0.35) {
      keyMap.set(mapKey, true);
      keyCollected++;
      unlockPortal();

    // Bats (Level 2): this specific rune (closest to the bats' spawn,
    // identified in setupBatsForLevel()) spikes noise to max and wakes
    // them — not just "whichever rune happens to be the 2nd pickup",
    // which broke whenever the player's path collected them out of order.
      if (currentScreen === LEVEL_TWO && mapKey === batTriggerRuneKey && !batsWoken) {
        secondRuneKey = mapKey; // remember which physical rune this was
        player.noiseLevel = NOISE_LEVEL_MAX;
        wakeAllBats();
      }

      if (runesound) runesound.play(); // NEW — plays on every key pickup

      console.log("Rune collected:", keyCollected, "/", keyTotal);

      if (dragon && mapKey === dragonTriggerRuneKey && dragon.state === DRAGON_STATE.SLEEPING) {
            wakeDragon();
      } 
      // This is the "pick up the rune next to it" trigger. Touch-based
// waking is handled separately in checkDragonCollision()
    }
  }
}

function checkPortalEntrance() {
  if (gameState !== STATE_PLAY || !portalUnlocked) return;

  for (const t of portalTiles) {
    const overlapsX =
      player.x + player.r > t.x && player.x - player.r < t.x + t.w;
    const overlapsY =
      player.y + player.r > t.y && player.y - player.r < t.y + t.h;

    if (overlapsX && overlapsY) {
      stopAllGameSounds();
      if (runesound) {
        runesound.play();
      }
      gameState = STATE_WIN;
      level3EndScreenFadeFrames = 0; // start TheEnd.png's fade-in fresh
      console.log("Portal entered with enough runes.");
      return;
    }
  }
}

// ------------------------------------------------------------
// checkSafeZone()
// Level 2's "safe zone" tiles (fish area) — reaching one fades
// chaseMusic out instead of letting it keep playing once the
// dragon chase is effectively over.
// ------------------------------------------------------------
function checkSafeZone() {
  if (safeZoneReached || !safeZoneTiles || safeZoneTiles.length === 0) return;

  for (const t of safeZoneTiles) {
    const overlapsX = player.x + player.r > t.x && player.x - player.r < t.x + t.w;
    const overlapsY = player.y + player.r > t.y && player.y - player.r < t.y + t.h;
    if (overlapsX && overlapsY) {
      safeZoneReached = true;
      if (chaseMusic && chaseMusic.isPlaying()) chaseMusic.fade(0, 2);
      chaseCamZoomTarget = 0.8; // back to idle zoom — the chase is over
      break;
    }
  }
}

// ------------------------------------------------------------
// checkWhirlpools()
// Applies a pulling force toward any whirlpool tile the player
// is near. If the player gets too close they are pulled in.
// ------------------------------------------------------------
function checkWhirlpools() {
  if (!whirlpoolTiles || whirlpoolTiles.length === 0) return;

  for (const t of whirlpoolTiles) {
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    const dx = cx - player.x;
    const dy = cy - player.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    const influence = t.w * 2; // radius of effect
    if (d < influence && d > 0.1) {
      // pull strength increases as you get closer
      const pull = map(d, influence, 0, 0.4, 3.0);
      player.x += (dx / d) * pull;
      player.y += (dy / d) * pull;
    }

    // Optional: if the player is extremely close, respawn them
    if (d < 6) {
      respawnFromHazard();
      break;
    }
  }
}

function updateNoiseLevel() {
  if (currentScreen !== LEVEL_TWO || player.form !== FORM_BIRD) return;

  const bird = findArea(levelAreas, "bird");

  // Before the noise-tracking zone: don't accumulate, but keep decaying
  // any noise the player already built up, instead of freezing it.
  if (!bird || player.x < bird.bounds.x + 10 * TILE_SIZE) {
    player.noiseLevel = max(player.noiseLevel - NOISE_DECAY_RATE, 0);
    return;
  }

  if (player.isMoving) {
    player.noiseLevel = min(
      player.noiseLevel + NOISE_INCREASE_RATE,
      NOISE_LEVEL_MAX,
    );
  } else {
    player.noiseLevel = max(player.noiseLevel - NOISE_DECAY_RATE, 0);
  }

    if (player.noiseLevel >= NOISE_LEVEL_MAX && !batsWoken) {
    wakeAllBats();
  }
}

function updateMoveSpeed() {
  // Level 3 phase 2: player is a bird flying over the arena's water —
  // keep full bird speed instead of the fish-swim slowdown below.
  if (
    currentScreen === LEVEL_THREE &&
    typeof level3Phase !== "undefined" &&
    level3Phase === LEVEL3_PHASE.FLY
  ) {
    moveSpeed = PLAYER_SPEED;
    return;
  }

  if (playerInWater()) {
    moveSpeed = playerInSeaweed() ? 4 / SEAWEED_SLOW_FACTOR : 4;
  } else {
    moveSpeed = PLAYER_SPEED;
  }
}

function playerInWater() {
  for (const t of waterTiles) {
    const closestX = constrain(player.x, t.x, t.x + t.w);
    const closestY = constrain(player.y, t.y, t.y + t.h);
    if (dist(player.x, player.y, closestX, closestY) < player.r) {
      return true;
    }
  }
  return false;
}

function playerInSeaweed() {
  for (const t of seaweedTiles) {
    const closestX = constrain(player.x, t.x, t.x + t.w);
    const closestY = constrain(player.y, t.y, t.y + t.h);
    if (dist(player.x, player.y, closestX, closestY) < player.r) {
      return true;
    }
  }
  return false;
}

// Find leftmost tile of each checkpoint group
let checkpointLeftmost = new Set();
for (const cp of checkpoints) {
  // cp.x is the world left edge — find the tile whose world x matches
  const tileX = Math.round(
    (cp.x - (jsonFile === birdArea ? TILE_SIZE * startArea.mapWidth : 0)) /
      TILE_SIZE,
  );
  checkpointLeftmost.add(tileX + "," + Math.round(cp.y / TILE_SIZE));
}

// Groups whirlpool tiles into their connected 3x3 (or whatever shape)
// clusters via 4-directional flood fill on tile-grid coords, then draws ONE
// scaled whirlpool animation frame per cluster's bounding box — instead of
// tiling 9 separate small animated images together per group.
function drawWhirlpoolLayer(tiles, mapXOffset, mapYOffset) {
  const byKey = new Map(tiles.map((t) => [`${t.x},${t.y}`, t]));
  const visited = new Set();
  const clusters = [];

  for (const t of tiles) {
    const key = `${t.x},${t.y}`;
    if (visited.has(key)) continue;
    const cluster = [];
    const stack = [t];
    visited.add(key);
    while (stack.length) {
      const cur = stack.pop();
      cluster.push(cur);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nKey = `${cur.x + dx},${cur.y + dy}`;
        const neighbor = byKey.get(nKey);
        if (neighbor && !visited.has(nKey)) {
          visited.add(nKey);
          stack.push(neighbor);
        }
      }
    }
    clusters.push(cluster);
  }

  for (const cluster of clusters) {
    const minX = Math.min(...cluster.map((t) => t.x));
    const maxX = Math.max(...cluster.map((t) => t.x));
    const minY = Math.min(...cluster.map((t) => t.y));
    const maxY = Math.max(...cluster.map((t) => t.y));
    const x = minX * TILE_SIZE + mapXOffset;
    const y = minY * TILE_SIZE + mapYOffset;
    const w = (maxX - minX + 1) * TILE_SIZE;
    const h = (maxY - minY + 1) * TILE_SIZE;

    push();
    if (whirlpoolImg) {
      const frameW = whirlpoolImg.width / WHIRLPOOL_SPRITE.numFrames;
      const frameH = whirlpoolImg.height;
      const sx = whirlpoolFrame * frameW;
      imageMode(CORNER);
      image(whirlpoolImg, x, y, w * WHIRLPOOL_SPRITE.scale, h * WHIRLPOOL_SPRITE.scale, sx, 0, frameW, frameH);
    } else {
      fill(10, 50, 120, 160);
      ellipse(x + w / 2, y + h / 2, Math.min(w, h) * 0.6);
    }
    pop();
  }
}

function drawTiles(area) {
  const jsonFile = area.json;
  const mapXOffset = area.bounds.x;
  const mapYOffset = area.bounds.y;
  const layers = jsonFile.layers;
  let rockPositions = new Set();

  for (const rockLayer of layers) {
    if (rockLayer.name === "rock") {
      for (const tile of rockLayer.tiles)
        rockPositions.add(`${tile.x},${tile.y}`);
    }
  }

  // First pass: water
  for (let l = layers.length - 1; l > -1; l--) {
    const layer = layers[l];
    if (layer.name !== "water") continue;
    for (const t of layer.tiles) {
      push();
      const x = t.x * TILE_SIZE + mapXOffset;
      const y = t.y * TILE_SIZE + mapYOffset;
      fill(tileColor(layer.name, t.id));
      noStroke();
      rect(x, y, TILE_SIZE, TILE_SIZE);
      pop();
    }
  }

  if (area.key === "start" && area.bg) {
    image(
      area.bg,
      mapXOffset,
      mapYOffset,
      area.bgSize?.[0] ?? area.bounds.w,
      area.bgSize?.[1] ?? area.bounds.h,
    );
  }
  if (area.key === "fish" && area.bg) {
    image(
      area.bg,
      mapXOffset,
      mapYOffset,
      area.bgSize?.[0] ?? area.bounds.w,
      area.bgSize?.[1] ?? area.bounds.h,
    );
  }
  if (area.key === "end" && area.bg) {
    image(area.bg, mapXOffset, mapYOffset, area.bounds.w, area.bounds.h);
  }

  // Bird area: bg green + cavebg, drawn before the rest
  if (area.key === "bird" && area.bg) {
    for (let l = layers.length - 1; l > -1; l--) {
      const layer = layers[l];
      if (layer.name !== "bg green") continue;
      for (const t of layer.tiles) {
        const x = t.x * TILE_SIZE + mapXOffset;
        const y = t.y * TILE_SIZE + mapYOffset;
        fill(tileColor(layer.name, t.id));
        rect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }
    // Only draw cavebg for level 1 — level 2 uses cavebg2 positioned differently
    if (currentScreen === LEVEL_ONE) {
      const fishArea = findArea(levelAreas, "fish");
      const fishAreaStartX = fishArea
        ? fishArea.bounds.x
        : mapXOffset + area.bounds.w;
      const buffer = -7 * TILE_SIZE;
      const caveX = fishAreaStartX - buffer - area.bg.width;
      image(area.bg, caveX, mapYOffset);
    } else {
      image(area.bg, mapXOffset, mapYOffset);
    }
  }

  for (let l = layers.length - 1; l > -1; l--) {
    const layer = layers[l]; // skip drawing these tiles
    if (layer.name === "water") continue;
    if (layer.name === "bg green") continue;
    if (layer.name === "background") continue;
    if (layer.name === BAT_LAYER) continue;
    if (layer.name === DRAGON_SPAWN_LAYER) continue;
   if (layer.name === "safe zone") continue;

    if (layer.name === "fish spawn") continue;
    if (layer.name === "bird spawn") continue; // marker layer, position only
    if (layer.name === "stone") continue; // marker layer — actual pedestals drawn elsewhere
    if (layer.name === "human spawn") continue; // marker layer, position only
    if (layer.name === SAFE_ZONE_LAYER) continue; // trigger zone, not visible terrain
    if (layer.name === WHIRLPOOL_LAYER) {
      drawWhirlpoolLayer(layer.tiles, mapXOffset, mapYOffset);
      continue;
    }

    let spikePositions = null;
    if (area.key === "bird" && layer.name === "spikes") {
      spikePositions = new Set(
        layer.tiles.map((tile) => `${tile.x},${tile.y}`),
      );
    }

    for (const t of layer.tiles) {
      push();
      const x = t.x * TILE_SIZE + mapXOffset;
      const y = t.y * TILE_SIZE + mapYOffset;

      if (layer.name === KEY_LAYER) {
        const mapKey = getWorldTileKey(x, y);
        if (keyMap.get(mapKey)) {
          pop();
          continue;
        }
        if (runeSheet) {
          const sx = runeFrame * RUNE_SPRITE.frameWidth;
          const dw = RUNE_SPRITE.frameWidth * RUNE_SPRITE.scale;
          const dh = RUNE_SPRITE.frameHeight * RUNE_SPRITE.scale;
          imageMode(CENTER);
          image(
            runeSheet,
            x + TILE_SIZE / 2,
            y + TILE_SIZE / 2,
            dw,
            dh,
            sx,
            0,
            RUNE_SPRITE.frameWidth,
            RUNE_SPRITE.frameHeight,
          );
        }
      } else if (area.key === "fish" && layer.name === "sand") {
        const sandSprite = (currentScreen === LEVEL_TWO || currentScreen === LEVEL_THREE) && sand2Img ? sand2Img : sandImg;
        sandSprite
          ? image(sandSprite, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
      } else if (area.key === "fish" && layer.name === "rock") {
        // This "rock" layer is the fish area's actual ground/floor tiles
        // (sandrockImg) — the dominant "sand" you actually see; the
        // separately-named "sand" layer above is a sparser decorative one.
        const rockSprite = (currentScreen === LEVEL_TWO || currentScreen === LEVEL_THREE) && sand2Img ? sand2Img : sandrockImg;
        rockSprite
          ? image(rockSprite, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
      } else if (
        (area.key === "bird" || area.key === "start" || area.key === "end") &&
        layer.name === "rock"
      ) {
        if (currentScreen === LEVEL_TWO && area.key === "bird" && rock2Img) {
          image(rock2Img, x, y, TILE_SIZE, TILE_SIZE);
        } else if (rockImg) {
          image(rockImg, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          fill(tileColor(layer.name, t.id));
          rect(x, y, TILE_SIZE, TILE_SIZE);
        }
      } else if (layer.name === "background rock") {
        bgRockImg
          ? image(bgRockImg, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
      } else if (layer.name === "background sky") {
        fill(tileColor(layer.name, t.id));
        rect(x, y, TILE_SIZE, TILE_SIZE);
      } else if (layer.name === "barrier") {
        fill(0, 0, 0, 0);
        rect(x, y, TILE_SIZE, TILE_SIZE);
      } else if (layer.name === "grass") {
        const grassSprite = currentScreen === LEVEL_TWO ? grass2Img : grassImg;
        grassSprite
          ? image(grassSprite, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
      } else if (layer.name === "ground") {
        const groundSprite = currentScreen === LEVEL_TWO ? ground2Img : groundImg;
        groundSprite
          ? image(groundSprite, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
      } else if (layer.name === "bark") {
        barkImg
          ? image(barkImg, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
      } else if (layer.name === "bridge") {
        bridgeImg
          ? image(bridgeImg, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
      } else if (layer.name === "water surface") {
        const waterSurfaceSprite = currentScreen === LEVEL_TWO && waterSurface2Img ? waterSurface2Img : waterSurfaceImg;
        waterSurfaceSprite
          ? image(waterSurfaceSprite, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
      } else if (currentScreen === LEVEL_THREE && area.key === "fish" && layer.name === "spikes") {
        const spikeImages = [spike1Img3, spike2Img3];
        const rockAbove = rockPositions.has(`${t.x},${t.y - 1}`);
        const rockBelow = rockPositions.has(`${t.x},${t.y + 1}`);
        const rockLeft = rockPositions.has(`${t.x - 1},${t.y}`);
        const rockRight = rockPositions.has(`${t.x + 1},${t.y}`);
        const tileSeed = (t.x * 37 + t.y * 19 + Math.round(area.bounds.x / TILE_SIZE)) % spikeImages.length;
        const spikeImg = spikeImages[tileSeed];

        let rotation = 0;
        if (rockAbove) {
          rotation = PI;
        } else if (rockLeft) {
          rotation = HALF_PI;
        } else if (rockRight) {
          rotation = -HALF_PI;
        }

        if (spikeImg) {
          translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
          rotate(rotation);
          imageMode(CENTER);
          image(spikeImg, 0, 0, TILE_SIZE, TILE_SIZE);
          imageMode(CORNER);
        } else {
          fill(tileColor(layer.name, t.id));
          rect(x, y, TILE_SIZE, TILE_SIZE);
        }
      } else if (area.key === "bird" && layer.name === "spikes") {
        const leftNeighbor = spikePositions.has(`${t.x - 1},${t.y}`);
        const rightNeighbor = spikePositions.has(`${t.x + 1},${t.y}`);
        const rockAbove = rockPositions.has(`${t.x},${t.y - 1}`);
        const rockLeft = rockPositions.has(`${t.x - 1},${t.y}`);
        const rockRight = rockPositions.has(`${t.x + 1},${t.y}`);
        const rockBelow = rockPositions.has(`${t.x},${t.y + 1}`);

        let spikeImg = spike3Img;
        if (leftNeighbor) spikeImg = spike2Img;
        else if (rightNeighbor) spikeImg = spike1Img;
        else {
          const posHash = (t.x + t.y * 7) % 2;
          spikeImg = rockAbove
            ? posHash === 0
              ? spike3Img
              : spike4Img
            : posHash === 0
              ? spike4Img
              : spike3Img;
        }
        if (currentScreen === LEVEL_TWO && spikeImg2) spikeImg = spikeImg2;

        let rotation = 0;
        if (!rockBelow) {
          if (rockAbove) rotation = PI;
          else if (rockLeft) rotation = HALF_PI;
          else if (rockRight) rotation = -HALF_PI;
        }

        if (spikeImg) {
          translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
          rotate(rotation);
          imageMode(CENTER);
          image(spikeImg, 0, 0, TILE_SIZE, TILE_SIZE);
          imageMode(CORNER);
        } else {
          fill(tileColor(layer.name, t.id));
          rect(x, y, TILE_SIZE, TILE_SIZE);
        }
      } else if (layer.name === "seaweed") {
        const seaweedSprite = currentScreen === LEVEL_TWO && seaweed2Img ? seaweed2Img : seaweedImg;
        seaweedSprite
          ? image(seaweedSprite, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
      } else if (GATE_LAYERS[layer.name] !== undefined) {
        const isOpen = keyCollected >= GATE_LAYERS[layer.name];
        if (!isOpen) image(barrierImg, x, y, TILE_SIZE, TILE_SIZE);
      } else if (layer.name === PORTAL_LAYER) {
  const isOpen = portalUnlocked; // CHANGED — was checking the hardcoded REQUIRED_PORTAL_KEYS fallback (5) instead of this level's actual requiredPortalKeys, so level 2 (needs 4) never showed the open image
  const pImg = isOpen ? portalOpenImg : portalClosedImg;
  
        if (pImg) {
          const tiles = layer.tiles;
          const minX = Math.min(...tiles.map((tt) => tt.x));
          const maxX = Math.max(...tiles.map((tt) => tt.x));
          const minY = Math.min(...tiles.map((tt) => tt.y));
          const maxY = Math.max(...tiles.map((tt) => tt.y));
          imageMode(CORNER);
          image(
            pImg,
            minX * TILE_SIZE + mapXOffset,
            minY * TILE_SIZE + mapYOffset,
            (maxX - minX + 1) * TILE_SIZE,
            (maxY - minY + 1) * TILE_SIZE,
          );
          pop();
          continue;
        } else {
          fill(portalUnlocked ? 80 : 40, 180, 80);
          rect(x, y, TILE_SIZE, TILE_SIZE);
        }
            } else if (layer.name === CHECKPOINT_LAYER) {
        for (let i = 0; i < checkpoints.length; i++) {
          const cp = checkpoints[i];
          if (abs(x - cp.x) < 1 && abs(y - cp.y) < 1) {
            // flagdown.png/flagup.png are both square (50x50) — the old
            // 1.2:2.2 box forced a ~2x vertical stretch onto them. Draw at
            // a single square size instead so the art isn't distorted.
            const flagSize = TILE_SIZE * 1.6;
            const flagSprite = i <= activeCheckpointIndex ? flagUpImg : flagDownImg;
            imageMode(CORNER);
            image(
              flagSprite,
              x + TILE_SIZE / 2 - flagSize / 2,
              y - flagSize,
              flagSize,
              flagSize,
            );
            break;
          }
        }
      } else {
        fill(tileColor(layer.name, t.id));
        rect(x, y, TILE_SIZE, TILE_SIZE);
      }

      pop();
    }
  }
}

// ------------------------------------------------------------
// ADDED — tileColor()
// Centralises tile colour lookup by layer name. Swap any of
// these for image()/sprite drawing later without touching the
// physics code above.
// ------------------------------------------------------------
function tileColor(layerName, id) {
  switch (layerName) {
    case "background sky":
      return color(229, 254, 225); // sky
    case "bark":
      return color("brown"); // bark
    case "spikes":
      return color(200, 40, 40); // red — danger
    case "checkpoint":
      return color(255, 215, 0); // gold — flag
    case "rock":
      return color(90, 90, 90); // grey — solid
    case "seaweed":
      return color(40, 140, 60); // green — solid
    case "key":
      return color(230, 200, 80); // gold key
    case "whirlpool":
      return color(30, 100, 200); // blue whirlpool
    case "sand":
      return color("yellow"); // yellow — background
    case "water":
      return color(0, 68, 85); // blue — background
    case "water surface":
      return color(50, 130, 200, 180); // translucent blue, or whatever fits
  }

  // fallback: old id-based colours, for any layer name not listed above
  switch (id) {
    case "0":
      return color("gray");
    case "1":
      return color("lightblue");
    case "2":
      return color("purple");
    case "3":
      return color("orange");
    case "4":
      return color("yellow");
    case "5":
      return color(0);
    case "6":
      return color(0, 0, 200);
    case "7":
      return color("blue");
    case "8":
      return color(80, 80, 100);
    case "9":
      return color(200, 240, 255);
    case "10":
      return color("pink");
    default:
      return color("green");
  }
}

// ------------------------------------------------------------
// applyBounce()
// Applies and decays bounce velocity each frame.
// ------------------------------------------------------------
function applyBounce() {
  if (abs(player.bounceVX) > 0.1 || abs(player.bounceVY) > 0.1) {
    player.x += player.bounceVX;
    player.y += player.bounceVY;
    player.bounceVX *= 0.75;
    player.bounceVY *= 0.75;

    player.x = constrain(player.x, player.r, WORLD_W - player.r);
    player.y = constrain(player.y, player.r, WORLD_H - player.r);
  }
}

// ------------------------------------------------------------
// handleInput()
// WASD moves the player in world coordinates.
// Constrained to world boundaries.
// W key flaps/jumps when not in the start area.
// ------------------------------------------------------------
// ------------------------------------------------------------
// handleInput() — Updates player position and tracking direction
// ------------------------------------------------------------
function handleInput() {
  if (
    currentScreen === LEVEL_THREE &&
    (level3EpilogueState === LEVEL3_EPILOGUE_STATE.DIALOGUE ||
      level3EpilogueState === LEVEL3_EPILOGUE_STATE.CHOICE)
  ) {
    player.isMoving = false;
    // Still apply gravity — otherwise a player who's mid-air (mid-jump)
    // right as dialogue starts gets suspended there, frozen until it ends,
    // instead of just continuing to fall like normal.
    if (!player.isGrounded) {
      player.vx = 0;
      const currentGravity =
        activeCheckpointIndex >= 0 ? GRAVITY_AFTER_CHECKPOINT : GRAVITY;
      player.vy += player.form === FORM_HUMAN ? HUMAN_GRAVITY : currentGravity;
      player.vy = constrain(player.vy, -TERMINAL_VELOCITY, TERMINAL_VELOCITY);
      player.y += player.vy;
    }
    return;
  }

  // Rock-throwing tutorial popup: the boss fight already pauses for this
  // (see level3ShowRockTutorial in updateLevel3BossFight()), but the
  // player could still fly around freely while it's up — freeze them too.
  if (currentScreen === LEVEL_THREE && level3ShowRockTutorial) {
    player.isMoving = false;
    return;
  }

  player.isMoving = false;

  // --- Horizontal Movement ---
  if (player.form === FORM_HUMAN) {
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) {
      player.x -= HUMAN_SPEED;
      player.facing = "left";
      player.isMoving = true;
    }
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) {
      player.x += HUMAN_SPEED;
      player.facing = "right";
      player.isMoving = true;
    }
  } else {
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) {
      player.x -= moveSpeed;
      player.facing = "left";
      player.isMoving = true;
    }
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) {
      player.x += moveSpeed;
      player.facing = "right";
      player.isMoving = true;
    }
  }

  // --- Vertical Movement (form-based, not area-based) ---
  if (player.form === FORM_FISH) {
    player.vy += FISH_SINK_FORCE;
    if (!keyIsDown(87)) {
      player.stamina = min(
        player.stamina + FISH_STAMINA_REGEN,
        FISH_STAMINA_MAX,
      );
    }
    if (player.flapQueued && player.stamina >= FISH_STAMINA_COST) {
      player.flapVelocity = -FISH_FLAP_FORCE;
      player.stamina -= FISH_STAMINA_COST;
      player.flapQueued = false;
      player.isMoving = true;
      player.facing = "up"; // ADD
    } else {
      player.flapQueued = false;
    }
    player.flapVelocity *= 1 - FISH_FLAP_DECAY;
    player.vy += player.flapVelocity;
    if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) {
      player.vy += FISH_SWIM_DOWN;
      player.isMoving = true;
      player.facing = "down"; // ADD
    }
    // Reset to left/right when moving horizontally
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) player.facing = "left";
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) player.facing = "right";

    player.vy *= FISH_WATER_DRAG;
    player.vx *= FISH_WATER_DRAG;
    player.vy = constrain(player.vy, -8, 6);
    player.vx = constrain(player.vx, -moveSpeed, moveSpeed);
    player.x += player.vx;
    player.y += player.vy;
  } else {
    player.vx = 0;
    const currentGravity =
      activeCheckpointIndex >= 0 ? GRAVITY_AFTER_CHECKPOINT : GRAVITY;

    player.vy += player.form === FORM_HUMAN ? HUMAN_GRAVITY : currentGravity;
    player.vy = constrain(player.vy, -TERMINAL_VELOCITY, TERMINAL_VELOCITY);
    player.y += player.vy;

    if (player.form === FORM_BIRD && (keyIsDown(87) || keyIsDown(UP_ARROW) || keyIsDown(32))) {
  player.vy = FLAP_FORCE;
  player.isMoving = true;
}

    player.isGrounded = false;
  }

  player.x = constrain(player.x, player.r, WORLD_W - player.r);
  player.y = constrain(player.y, player.r, WORLD_H - player.r);
}

// ------------------------------------------------------------
// drawPlayer() — Slices active state asset based on environment
// ------------------------------------------------------------
function drawPlayer() {
  if (player.invincible && floor(player.invincibleTimer / 6) % 2 === 0) return;

  // let inSea = playerInWater();
  // let inStart = player.x < TILE_SIZE * startArea.mapWidth; // before bird area
  let inSea = player.form === FORM_FISH;
  let inStart = player.form === FORM_HUMAN;
  push();
  imageMode(CENTER);

  if (inStart) {
    let row = HUMAN_SPRITE.rows[player.facing] ?? 0; // row 0 = right, row 1 = left
    let sx = player.currentFrame * HUMAN_SPRITE.frameWidth;
    let sy = row * HUMAN_SPRITE.frameHeight;
    let dw = HUMAN_SPRITE.frameWidth * HUMAN_SPRITE.scale;
    let dh = HUMAN_SPRITE.frameHeight * HUMAN_SPRITE.scale;
    image(
      humanSheet,
      player.x,
      player.y - TILE_SIZE * 0.5,
      dw,
      dh,
      sx,
      sy,
      HUMAN_SPRITE.frameWidth,
      HUMAN_SPRITE.frameHeight,
    );
  } else if (inSea) {
    // --- Render Fish --- (existing code unchanged)
    let row = FISH_SPRITE.rows[player.facing];
    let sx = player.currentFrame * FISH_SPRITE.frameWidth;
    let sy = row * FISH_SPRITE.frameHeight;
    let dw = FISH_SPRITE.frameWidth * FISH_SPRITE.scale;
    let dh = FISH_SPRITE.frameHeight * FISH_SPRITE.scale;
    image(
      fishSheet,
      player.x,
      player.y,
      dw,
      dh,
      sx,
      sy,
      FISH_SPRITE.frameWidth,
      FISH_SPRITE.frameHeight,
    );

    // Vertical stamina bar — drawn to the right of the fish
    const barW = 5;
    const barH = 40;
    const bx = player.x + player.r + 40; // right side of fish
    const by = player.y - barH / 2; // vertically centred on fish
    const fill_h = map(player.stamina, 0, FISH_STAMINA_MAX, 0, barH);

    noStroke();
    fill(0, 0, 0, 100);
    rect(bx, by, barW, barH, 2); // background track
    fill(
      map(player.stamina, 0, FISH_STAMINA_MAX, 255, 80),
      map(player.stamina, 0, FISH_STAMINA_MAX, 60, 200),
      120,
    );
    rect(bx, by + (barH - fill_h), barW, fill_h, 2); // fills from bottom up
  } else {
    // --- Render Bird --- (existing code unchanged)
    let isFlapping = keyIsDown(87) || keyIsDown(UP_ARROW) || keyIsDown(32);
    let animMode = isFlapping ? "flying" : "running";
    let row = BIRD_SPRITE.rows[animMode];
    let safeFrame = player.currentFrame % BIRD_SPRITE.maxFrames[animMode];
    let sx = safeFrame * BIRD_SPRITE.frameWidth;
    let sy = row * BIRD_SPRITE.frameHeight;
    let dw = BIRD_SPRITE.frameWidth * BIRD_SPRITE.scale;
    let dh = BIRD_SPRITE.frameHeight * BIRD_SPRITE.scale;

    translate(player.x, player.y);
    if (player.facing === "left") scale(-1, 1);
    image(
      birdSheet,
      0,
      0,
      dw,
      dh,
      sx,
      sy,
      BIRD_SPRITE.frameWidth,
      BIRD_SPRITE.frameHeight,
    );
  }

  pop();
}

// The peaceful epilogue outcome — offering a rune in the first encounter's
// CHOICE ([N]), or concluding the rematch's final dialogue line ([Enter])
// in the second encounter. Same result either way: the dragon mimics the
// player and the portal unlocks.
function chooseLevel3Peace() {
  level3EpilogueState = LEVEL3_EPILOGUE_STATE.MIMIC;

  // Compute initial moving state immediately so we don't show a single
  // idle frame when the dragon should already be trailing the player.
  if (level3EndDragon) {
    const halfW = level3EndDragon.w / 2;
    const gap = player.x - level3EndDragon.x; // signed
    const edgeDist = Math.abs(gap) - halfW;
    level3EndDragonIsMoving = edgeDist > LEVEL3_MIMIC_CONFIG.followRange;
    level3EndDragon.facing = gap < 0 ? "left" : "right";
    level3MimicTargetY = level3EndDragon.y;
  } else {
    level3EndDragonIsMoving = false;
  }

  level3EpilogueLineText = "This will work. Let us depart together.";
  level3EpilogueLineTimer = 150;
  portalUnlocked = true;
}

// ------------------------------------------------------------
// keyPressed()
// ------------------------------------------------------------
function keyPressed(event) {
  // Space/arrow keys are also browser scroll shortcuts — p5 calls
  // preventDefault() on our behalf whenever this returns false, but a page
  // scroll from spacebar while flying could shift/scroll the canvas out of
  // view, making a perfectly-working flap look like it did nothing.
  if (event && (keyCode === 32 || keyCode === UP_ARROW || keyCode === DOWN_ARROW || keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW)) {
    event.preventDefault();
  }

  // Debug menu access should never be blocked by an in-game popup —
  // check this before the rock-tutorial swallow below.
  if (handleDebugKeyPress(key, keyCode)) {
    return;
  }

  if (level3ShowRockTutorial) {
    // Ignored for the first second it's actually visible — otherwise an
    // [Enter] mashed during the white-flash transition (before the popup
    // is even visible) could dismiss it instantly.
    if (key === "Enter" && level3RockTutorialFrames >= 60) {
      level3ShowRockTutorial = false;
    }
    return; // swallow this keypress so it doesn't also jump/throw
  }

  if (currentScreen === TITLE_SCREEN && key === "Enter") {
    const FADE_SEC = 0.6;
    if (typeof titleMusic !== 'undefined' && titleMusic && titleMusic.isPlaying && titleMusic.isPlaying()) {
      titleMusic.fade(0, FADE_SEC);
      // stop and switch screens after fade completes
      setTimeout(() => {
        if (titleMusic && titleMusic.isPlaying && titleMusic.isPlaying()) titleMusic.stop();
        goToScreen(LEVEL_ONE);
      }, Math.ceil(FADE_SEC * 1000) + 50);
    } else {
      goToScreen(LEVEL_ONE);
    }
    return;
  } else if (gameState === STATE_WIN && currentScreen === LEVEL_ONE && key === "Enter") {
    goToScreen(LEVEL_TWO);
    return;
} else if (gameState === STATE_WIN && currentScreen === LEVEL_TWO && key === "Enter") {
    goToScreen(LEVEL_THREE);
    return;
} else if (gameState === STATE_OVER && currentScreen === LEVEL_THREE && key === "Enter") {
    // Caught after choosing N — retry from the start of the end area.
    gameState = STATE_PLAY;
    initLevel3Epilogue();
    return;
}

//yes and no in epilogue dialogue
if (currentScreen === LEVEL_THREE && level3EpilogueState === LEVEL3_EPILOGUE_STATE.DIALOGUE && key === "Enter") {
  level3DialogueIndex++;
  if (level3DialogueIndex >= level3DialogueLines.length) {
    if (level3SecondEncounter) {
      // No separate choice this time — the last dialogue line ("Yes, I'm
      // done fighting.") already IS the answer, so this same [Enter] press
      // concludes it directly instead of needing a second press once
      // redundantly re-showing that same image in a CHOICE state.
      chooseLevel3Peace();
    } else {
      level3EpilogueState = LEVEL3_EPILOGUE_STATE.CHOICE;
    }
  }
  return;
}

if (currentScreen === LEVEL_THREE && level3EpilogueState === LEVEL3_EPILOGUE_STATE.CHOICE) {
 if (key === "n" || key === "N") {
  chooseLevel3Peace();
  return;
}
  if (key === "y" || key === "Y") {
    // "Keep fighting" — loop back into a full rematch instead of the old
    // instant chase/bad-end. Clear the epilogue state immediately (not
    // just once the transition finishes) — otherwise drawLevel3DialogueUI()
    // saw level3SecondEncounter already true while still in the old CHOICE
    // state and flashed the 2dialogue8 image for the frames before the
    // white transition actually swapped areas.
    level3SecondEncounter = true;
    level3EpilogueState = LEVEL3_EPILOGUE_STATE.NONE;
    startLevel3Rematch();
    return;
  }
  return;
}

  // Level 3 phase 2 — E throws the currently-carried rock at the
  // boss (auto-aimed). No-op outside phase 2 or without a rock carried;
  // see throwLevel3Rock() in levelthree_boss.js.
  if (
    (key === "e" || key === "E") &&
    currentScreen === LEVEL_THREE &&
    typeof throwLevel3Rock === "function"
  ) {
    throwLevel3Rock();
  }

  // isGrounded (not just the cooldown) gates this — without it, the
  // cooldown alone let the player jump again every 30 frames while still
  // airborne, effectively double-jumping and "sticking" to walls by
  // repeatedly re-boosting upward mid-air right next to one.
  const canJump =
    player.form === FORM_HUMAN && !playerInWater() && player.jumpCooldown <= 0 && player.isGrounded;

  if (
    (key === "w" || key === "W" || keyCode === 87 || keyCode === UP_ARROW ||
      key === " " || keyCode === 32) &&
    canJump
  ) {
    player.vy = -14;
    player.jumpCooldown = 30;
  }

if ((keyCode === 87 || keyCode === UP_ARROW || keyCode === 32) && playerInWater()) {
    player.flapQueued = true;
}
}