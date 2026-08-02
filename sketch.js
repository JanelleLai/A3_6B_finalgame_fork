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
  scale: 0.4,
};

let dragonSheet;
let dragonSleepingSheet;
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
  idleScale: 1.5,
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
const NOISE_INCREASE_RATE = 2.5; // per frame while moving
const NOISE_DECAY_RATE = 0.9;    // per frame while idle

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
  health: 5,
  maxHealth: 5,
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
let chaseMusic; 
let dragonGrowl;

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
  numFrames: 4, // 4 frames horizontal
  animSpeed: 15, // Lower number = faster rotation speed
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
let sandImg;
let sandrockImg;
let rockImg;
let bgRockImg;
let spike1Img;
let spike2Img;
let spike3Img;
let spike4Img;
let waterSurfaceImg;
let portalClosedImg;
let portalOpenImg;
let windImg;
let portalImg;
let bridgeImg;
let flagDownImg;
let flagUpImg;
let barrierImg;
let level1MessageImg;

let fishareaBG;
let fishareaOverlay;
let cavebg;
let cavebg2;
let endbg;


let fishareaBG2;
let fishareaOverlay2;

let fishSheet; //fish sprite sheet
let birdSheet; //bird sprite sheet


//sound effects
let diesound;
let runesound;
let walkingsound;
let flappingsound;
let fishareasound;
let humanBGsound;
let birdBGsound;
let batsound;

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
let whirlpoolTiles = []; // [{x,y,w,h}]
let portalTiles = []; // [{x,y,w,h}] portal/door tiles
let seaweedTiles = []; // [{x,y,w,h}] world-space rects — slows the fish, doesn't block it
const SEAWEED_LAYER = "seaweed";
const SEAWEED_SLOW_FACTOR = 2.5; // divides moveSpeed — tune to taste for "150% slower"
const REQUIRED_PORTAL_KEYS = 5; // fallback default, used if a level doesn't define requiredKeys
let requiredPortalKeys = REQUIRED_PORTAL_KEYS; // set per-level in loadLevel()
const PORTAL_LAYER = "door";

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
        anchorRightOf: "bird",
        shiftTiles: -32,
        anchorBelow: "bird",
      },
    ],
    playerStart: { x: 4 * TILE_SIZE, y: 10 * TILE_SIZE },
    buildWindZones: buildLevel2WindZones,
    requiredKeys: 4,
  },
  [LEVEL_THREE]: {
    areas: [
      { key: "fish", json: "fishArea3" },
      {
        key: "bird",
        json: "birdArea3",
        // bg: 'cavebg2', overlay: 'fishareaOverlay2',
      },
      {
        key: "end",
        json: "endArea3",
      },
    ],
    playerStart: { x: 10 * TILE_SIZE, y: 26 * TILE_SIZE },
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
// Press M to toggle. While active, number keys jump directly
// to a screen. Add one line to DEBUG_KEY_MAP per new screen.
// ============================================================
let debugModeActive = false;

const DEBUG_KEY_MAP = {
  "1": { screen: LEVEL_ONE,    label: "Level 1" },
  "2": { screen: LEVEL_TWO,    label: "Level 2" },
 "3": { screen: LEVEL_THREE, label: "Level 3" },  // 
};

function isDebugModeActive() {
  return debugModeActive;
}

// Returns true if it handled the keypress (so keyPressed() should stop).
function handleDebugKeyPress(key, keyCode) {
  if (key === "m" || key === "M") {
    debugModeActive = !debugModeActive;
    return true;
  }

  if (!debugModeActive) return false;

  const entry = DEBUG_KEY_MAP[key];
  if (entry) {
    goToScreen(entry.screen);
    debugModeActive = false; // close menu after jumping
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
  text("DEBUG MODE", width / 2, height / 2 - 80);

  textSize(14);
  let y = height / 2 - 40;
  for (const key in DEBUG_KEY_MAP) {
    text(`[${key}] ${DEBUG_KEY_MAP[key].label}`, width / 2, y);
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

  grassImg = loadImage("assets/images/grass.png");
  groundImg = loadImage("assets/images/ground.png");
  grass2Img = loadImage("assets/images/grass2.png");
  ground2Img = loadImage("assets/images/ground2.png");
  barkImg = loadImage("assets/images/bark.png");

  seaweedImg = loadImage("assets/images/seaweed.png");
  sandImg = loadImage("assets/images/sand.png");
  sandrockImg = loadImage("assets/images/sandrock.png");

  rockImg = loadImage("assets/images/rock.png");
  bgRockImg = loadImage("assets/images/bgrock.jpg");
  spike1Img = loadImage("assets/images/spike1.png");
  spike2Img = loadImage("assets/images/spike2.png");
  spike3Img = loadImage("assets/images/spike3.png");
  spike4Img = loadImage("assets/images/spike4.png");
  barrierImg = loadImage("assets/images/barrier.png");

  waterSurfaceImg = loadImage("assets/images/watersurface.png");
  fishareaBG = loadImage("assets/images/fishareaBG.png");
  fishareaOverlay = loadImage("assets/images/fishareaoverlay.png");
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
  bridgeImg = loadImage("assets/images/bridge.png");
  dragonSheet = loadImage("assets/images/dragonSheet.png");
  dragonSleepingSheet = loadImage("assets/images/dragonSleeping.png");

  endbg = loadImage("assets/images/endareabg.png");
  flagDownImg = loadImage("assets/images/flagdown.png");
  flagUpImg = loadImage("assets/images/flagup.png");
  level1MessageImg = loadImage("assets/images/Level1Message.png");

  startarea2Img = loadImage("assets/images/2startarea.png");

  diesound = loadSound("assets/sounds/die.mp3");
  runesound = loadSound("assets/sounds/rune.mp3");
  walkingsound = loadSound("assets/sounds/walking.mp3");
  flappingsound = loadSound("assets/sounds/flappingbird.mp3");
  fishareasound = loadSound("assets/sounds/fisharea.mp3");
  humanBGsound = loadSound("assets/sounds/HumanBG.mp3");
  birdBGsound = loadSound("assets/sounds/birdBG.mp3");
  if (birdBGsound) {
    birdBGsound.setVolume(0.15);
  }
  chaseMusic = loadSound("assets/sounds/chaseMusic.mp3");
  if (chaseMusic) {
    chaseMusic.setVolume(0.25);
  }
  dragonGrowl = loadSound("assets/sounds/dragongrowl.mp3");
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
    //fishareaBG2,
    fishareaOverlay,
    //fishareaOverlay2,

    fishArea3,
  birdArea3,
  endArea3,
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
  requiredPortalKeys = def.requiredKeys ?? REQUIRED_PORTAL_KEYS;
  whirlpoolTiles = [];
  portalTiles = [];
  waterTiles = [];
  seaweedTiles = [];
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

  camX = constrain(player.x - width / 2, 0, WORLD_W - width);
  camY = constrain(player.y - height / 2, 0, WORLD_H - height);
  gameState = STATE_PLAY;
}


function findArea(levelAreas, key) {
  return levelAreas.find((a) => a.key === key);
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
    x: fish.bounds.x + fish.bounds.w - 6 * TILE_SIZE,
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
  const start = findArea(levelAreas, "start");
  const inStart = start && player.x < start.bounds.x + start.bounds.w;
  if (!inStart) return;

  push();
  noStroke();
  fill(0, 0, 0, 140);
  rect(14, height - 110, 140, 95, 8);

  fill(255);
  textSize(12);
  textFont("monospace");
  textAlign(LEFT, TOP);
  text("CONTROLS:", 24, height - 100);
  fill(200);
  text("A / D / S — move", 24, height - 82);
  text("W or space — jump", 24, height - 66);
  text("", 24, height - 50);
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
        handleInput();
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
        
        if (currentScreen === LEVEL_THREE) {
  updateLevel3BossFight();
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

  if (currentScreen === LEVEL_THREE && typeof drawLevel3BossFightWorld === "function") {
    drawLevel3BossFightWorld();
  }

  const fish = findArea(levelAreas, "fish");
  if (fish && fish.overlay) {
    image(fish.overlay, fish.bounds.x, fish.bounds.y, fish.bounds.w, 800);
  }

  drawDragonDebugHitbox();

  pop();
  drawKeyHUD();
  drawNoiseHUD();
  if (currentScreen === LEVEL_THREE && typeof drawLevel3HUD === "function") {
    drawLevel3HUD();
  }
  drawInstructions();
  if (gameState === STATE_WIN && level1MessageImg) {
    stopAllGameSounds();
    drawEndScreen();
  }
}



let DEBUG_SHOW_DRAGON_HITBOX = true; // flip to false, or toggle at runtime (see keyPressed note)

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

  if (dragonTriggerRunePos) {
    const halfW = dragon.w / 2;
    const halfH = dragon.h / 2;
    const insideX =
      dragonTriggerRunePos.x > hitbox.x - halfW &&
      dragonTriggerRunePos.x < hitbox.x + halfW;
    const insideY =
      dragonTriggerRunePos.y > hitbox.y - halfH &&
      dragonTriggerRunePos.y < hitbox.y + halfH;
    const isInside = insideX && insideY;

    noFill();
    stroke(isInside ? color(255, 0, 0) : color(255, 255, 0));
    strokeWeight(2);
    ellipse(dragonTriggerRunePos.x, dragonTriggerRunePos.y, 16, 16);

    noStroke();
    fill(255);
    textAlign(CENTER, BOTTOM);
    textSize(11);
    text(
      isInside ? "RUNE: INSIDE HITBOX" : "RUNE: outside hitbox",
      dragonTriggerRunePos.x,
      dragonTriggerRunePos.y - 12,
    );
  }

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
  fill(0, 0, 0, 140);
  rect(x - 10, y - 30, barW + 20, barH + 40, 8);

  fill(255);
  textSize(11);
  textFont("monospace");
  textAlign(CENTER, TOP);
  text("NOISE", x + barW / 2, y - 20);

  // Track (empty background of the bar)
  fill(60, 60, 60);
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
 
function drawEndScreen() {
  push();
  imageMode(CENTER);
  const overlayW = min(width * 0.75, 600);
  const overlayH =
    (level1MessageImg.height / level1MessageImg.width) * overlayW;
  image(level1MessageImg, width / 2, height / 2 + 20, overlayW, overlayH);
  pop();
}

function drawKeyHUD() {
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

function updateHumanBGSound() {
  if (!humanBGsound) return;

  const shouldPlay = player.form === FORM_HUMAN;

  if (shouldPlay) {
    if (!humanBGsound.isPlaying()) {
      humanBGsound.loop();
    }
  } else {
    if (humanBGsound.isPlaying()) {
      humanBGsound.stop();
    }
  }
}

function updateBirdBGSound() {
  if (!birdBGsound) return;

  const shouldPlay = player.form === FORM_BIRD;

  if (shouldPlay) {
    if (!birdBGsound.isPlaying()) {
      birdBGsound.loop();
    }
  } else {
    if (birdBGsound.isPlaying()) {
      birdBGsound.stop();
    }
  }
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
  if (!fishareasound) return; // use whatever variable name you declared

  const shouldPlay = playerInWater();

  if (shouldPlay) {
    if (!fishareasound.isPlaying()) {
      fishareasound.loop();
    }
  } else {
    if (fishareasound.isPlaying()) {
      fishareasound.stop();
    }
  }
}

// ------------------------------------------------------------
// updateFlappingSound()
// Loops flappingbird.mp3 while the player is in bird form AND
// physically within the bird area's x-range. Stops the
// instant they leave bird form or leave the bird area bounds.
// ------------------------------------------------------------
function updateFlappingSound() {
  if (!flappingsound) return;

  const bird = findArea(levelAreas, "bird"); // ADDED
  if (!bird) return; // ADDED — guard in case levelAreas isn't populated yet

  const inBirdArea =
    player.x >= bird.bounds.x && player.x < bird.bounds.x + bird.bounds.w;
  const isFlapping = keyIsDown(87) || keyIsDown(UP_ARROW);
  const shouldPlay =
    player.form === FORM_BIRD && inBirdArea && (player.isMoving || isFlapping);

  if (shouldPlay) {
    if (!flappingsound.isPlaying()) flappingsound.loop();
  } else {
    if (flappingsound.isPlaying()) flappingsound.stop();
  }
}

function stopAllGameSounds() {
  const sounds = [
    walkingsound,
    flappingsound,
    fishareasound,
    humanBGsound,
    birdBGsound,
    runesound,
    diesound,
    chaseMusic,
    dragonGrowl,
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
    let isFlapping = keyIsDown(87) || keyIsDown(UP_ARROW);
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
    level3Phase === LEVEL3_PHASE.FLY
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

  if (inBirdAreaBounds && player.form !== FORM_BIRD) {
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

  targetX = constrain(targetX, 0, WORLD_W - width);
  targetY = constrain(targetY, 0, WORLD_H - height);

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
      !isBat
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
function resolveSolidCollisions() {
  for (const t of solidTiles) {
    const requiredKeys = GATE_LAYERS[t.layerName];
    if (requiredKeys !== undefined && keyCollected >= requiredKeys) {
      print("keycollected >= required keys");
      continue; // ADDED — this gate is open, no collision
    }
    resolveCircleRect(player, t);
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

  camX = constrain(player.x - width / 2, 0, WORLD_W - width);
  camY = constrain(player.y - height / 2, 0, WORLD_H - height);

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

  camX = constrain(player.x - width / 2, 0, WORLD_W - width);
  camY = constrain(player.y - height / 2, 0, WORLD_H - height);
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

    camX = constrain(player.x - width / 2, 0, WORLD_W - width);
    camY = constrain(player.y - height / 2, 0, WORLD_H - height);
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
  if (chaseMusic && !chaseMusic.isPlaying()) chaseMusic.loop();
  console.log("Dragon woke up — chase started.");
dragonGrowl.play();

  dragonPath = [];
dragonPathIndex = 0;
dragonPathRecalcTimer = DRAGON_PATH_RECALC_INTERVAL; // forces recalc on the very next updateDragon() call
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

  if (levelId !== LEVEL_TWO) return;

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
    keyCollected = 1; // reset to 1 so the player has to re-collect the 2nd rune
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

  dragonPathRecalcTimer++;
  if (dragonPathRecalcTimer >= DRAGON_PATH_RECALC_INTERVAL || dragonPathIndex >= dragonPath.length) {
    dragonPathRecalcTimer = 0;
    recalcDragonPath();
  }

  const speed = dragonInSeaweed()
    ? DRAGON_CONFIG.chaseSpeed / DRAGON_CONFIG.seaweedSlowFactor
    : DRAGON_CONFIG.chaseSpeed;

  let target = { x: player.x, y: player.y }; // fallback if no path yet
  if (dragonPath.length > 0 && dragonPathIndex < dragonPath.length) {
    const node = dragonPath[dragonPathIndex];
    target = {
      x: node.tx * TILE_SIZE + TILE_SIZE / 2,
      y: node.ty * TILE_SIZE + TILE_SIZE / 2,
    };
    if (dist(dragon.x, dragon.y, target.x, target.y) < DRAGON_PATH_WAYPOINT_RADIUS) {
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

  const hitbox = getDragonHitboxCenter();
  const proxy = { x: hitbox.x, y: hitbox.y };

  for (const t of solidTiles) {
    const requiredKeys = GATE_LAYERS[t.layerName];
    if (requiredKeys !== undefined && keyCollected >= requiredKeys) continue;
    resolveBoxRect(proxy, halfW, halfH, t);
  }

  dragon.x += proxy.x - hitbox.x;
  dragon.y += proxy.y - hitbox.y;
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

      if (chaseMusic && !chaseMusic.isPlaying()) chaseMusic.loop();
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
        keyCollected = 2;
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

    camX = constrain(player.x - width / 2, 0, WORLD_W - width);
    camY = constrain(player.y - height / 2, 0, WORLD_H - height);
  });
}
 
function drawDragon() {
  if (!dragon) return;

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
    const dw = DRAGON_SLEEPING_SPRITE.frameWidth * DRAGON_SPRITE.scale;
    const dh = DRAGON_SLEEPING_SPRITE.frameHeight * DRAGON_SPRITE.scale;

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
      portalUnlocked = portalIsUnlocked();

    // Bats (Level 2): the 2nd rune spikes noise to max and wakes them.
      if (currentScreen === LEVEL_TWO && keyCollected === 2 && !batsWoken) {
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
      console.log("Portal entered with enough runes.");
      return;
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
    const layer = layers[l];
    if (layer.name === "water") continue;
    if (layer.name === "bg green") continue;
    if (layer.name === "background") continue;
    if (layer.name === BAT_LAYER) continue;              
    if (layer.name === DRAGON_SPAWN_LAYER) continue;

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
      } else if (layer.name === WHIRLPOOL_LAYER) {
        if (whirlpoolImg) {
          const frameW = whirlpoolImg.width / WHIRLPOOL_SPRITE.numFrames;
          const frameH = whirlpoolImg.height;
          const sx = whirlpoolFrame * frameW;
          imageMode(CENTER);
          translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
          image(
            whirlpoolImg,
            0,
            0,
            TILE_SIZE * WHIRLPOOL_SPRITE.scale,
            TILE_SIZE * WHIRLPOOL_SPRITE.scale,
            sx,
            0,
            frameW,
            frameH,
          );
        } else {
          fill(tileColor(layer.name, t.id));
          rect(x, y, TILE_SIZE, TILE_SIZE, TILE_SIZE * 0.25);
          fill(10, 50, 120, 160);
          ellipse(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE * 0.6);
        }
      } else if (area.key === "fish" && layer.name === "sand") {
        sandImg
          ? image(sandImg, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
      } else if (area.key === "fish" && layer.name === "rock") {
        sandrockImg
          ? image(sandrockImg, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
      } else if (
        (area.key === "bird" || area.key === "start" || area.key === "end") &&
        layer.name === "rock"
      ) {
        rockImg
          ? image(rockImg, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
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
      } else if (layer.name === "water surface") {
        waterSurfaceImg
          ? image(waterSurfaceImg, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
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
        seaweedImg
          ? image(seaweedImg, x, y, TILE_SIZE, TILE_SIZE)
          : (fill(tileColor(layer.name, t.id)),
            rect(x, y, TILE_SIZE, TILE_SIZE));
      } else if (GATE_LAYERS[layer.name] !== undefined) {
        const isOpen = keyCollected >= GATE_LAYERS[layer.name];
        if (!isOpen) image(barrierImg, x, y, TILE_SIZE, TILE_SIZE);
      } else if (layer.name === PORTAL_LAYER) {
        const pImg =
          keyCollected >= requiredPortalKeys
            ? portalOpenImg
            : portalClosedImg;
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
            const flagW = TILE_SIZE * 1.2;
            const flagH = TILE_SIZE * 2.2;
            const flagSprite = i <= activeCheckpointIndex ? flagUpImg : flagDownImg;
            imageMode(CORNER);
            image(
              flagSprite,
              x + TILE_SIZE / 2 - flagW / 2,
              y - flagH,
              flagW,
              flagH,
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

    if (player.form === FORM_BIRD && (keyIsDown(87) || keyIsDown(UP_ARROW))) {
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
    let isFlapping = keyIsDown(87) || keyIsDown(UP_ARROW);
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

// ------------------------------------------------------------
// keyPressed()
// ------------------------------------------------------------
function keyPressed() {
  if (handleDebugKeyPress(key, keyCode)) {
    return;
  }

  if (currentScreen === TITLE_SCREEN && key === "Enter") {
    goToScreen(LEVEL_ONE);
    return;
  } else if (gameState === STATE_WIN && currentScreen === LEVEL_ONE && key === "Enter") {
    goToScreen(LEVEL_TWO);
    return;
} else if (gameState === STATE_WIN && currentScreen === LEVEL_TWO && key === "Enter") {
    goToScreen(LEVEL_THREE);
    return;
}
  // Level 3 phase 2 — Space throws the currently-carried rock at the
  // boss (auto-aimed). No-op outside phase 2 or without a rock carried;
  // see throwLevel3Rock() in levelthree_boss.js.
  if (
    key === " " &&
    currentScreen === LEVEL_THREE &&
    typeof throwLevel3Rock === "function"
  ) {
    throwLevel3Rock();
  }

  const canJump =
    player.form === FORM_HUMAN && !playerInWater() && player.jumpCooldown <= 0;

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