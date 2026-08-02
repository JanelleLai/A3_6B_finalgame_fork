// ------------------------------------------------------------
// A* PATHFINDING — replaces the breadcrumb trail. The dragon
// paths to the player's CURRENT tile over the same solid-tile
// grid used for collision, recomputed periodically rather than
// every frame. Erratic player movement just means the target
// tile keeps changing — it doesn't distort the route itself.
// ------------------------------------------------------------
const DRAGON_PATH_RECALC_INTERVAL = 24; // frames between recomputes (~0.4s at 60fps)
const DRAGON_PATH_WAYPOINT_RADIUS = 14; // how close to a path tile's center before advancing
const DRAGON_PATH_MAX_NODES = 3000; // safety cap so a big open level can't stall a frame

let dragonPath = []; // [{tx,ty}, ...] tile coords, from just-past-dragon to goal
let dragonPathIndex = 0;
let dragonPathRecalcTimer = 0;

function tileKey(tx, ty) {
  return `${tx},${ty}`;
}

// Rebuilt fresh each recalc so it automatically respects currently-open
// GATE_LAYERS barriers, same as resolveDragonSolidCollisions() does.
function buildDragonBlockedSet() {
  const blocked = new Set();
  for (const t of solidTiles) {
    const requiredKeys = GATE_LAYERS[t.layerName];
    if (requiredKeys !== undefined && keyCollected >= requiredKeys) continue; // gate open
    blocked.add(tileKey(Math.round(t.x / TILE_SIZE), Math.round(t.y / TILE_SIZE)));
  }
  return blocked;
}

// CHANGED — accepts tileSpanTiles instead of hardcoding DRAGON_CONFIG.tileSpan
function isDragonBlockedTile(tx, ty, blockedSet, tileSpanTiles = DRAGON_CONFIG.tileSpan) {
  const inflate = Math.floor(tileSpanTiles / 2);
  for (let dx = -inflate; dx <= inflate; dx++) {
    for (let dy = -inflate; dy <= inflate; dy++) {
      if (blockedSet.has(tileKey(tx + dx, ty + dy))) return true;
    }
  }
  return false;
}

function heuristic(tx, ty, gx, gy) {
  return Math.hypot(gx - tx, gy - ty);
}

function findDragonPath(startTx, startTy, goalTx, goalTy, blockedSet, tileSpanTiles = DRAGON_CONFIG.tileSpan) {  const startKey = tileKey(startTx, startTy);
  const goalKey = tileKey(goalTx, goalTy);

  const open = new Map();
  const cameFrom = new Map();
  const gScore = new Map();
  const closed = new Set();

  gScore.set(startKey, 0);
  open.set(startKey, { tx: startTx, ty: startTy, f: heuristic(startTx, startTy, goalTx, goalTy) });

  const neighbors8 = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
  ];

  let visited = 0;

  while (open.size > 0) {
    if (++visited > DRAGON_PATH_MAX_NODES) return null; // too big — bail, caller falls back to direct chase

    let currentKey = null, currentNode = null, bestF = Infinity;
    for (const [k, n] of open) {
      if (n.f < bestF) { bestF = n.f; currentKey = k; currentNode = n; }
    }

    if (currentKey === goalKey) {
      const path = [];
      let k = currentKey;
      while (cameFrom.has(k)) {
        const [tx, ty] = k.split(",").map(Number);
        path.unshift({ tx, ty });
        k = cameFrom.get(k);
      }
      return path;
    }

    open.delete(currentKey);
    closed.add(currentKey);

    for (const [dx, dy, cost] of neighbors8) {
      const ntx = currentNode.tx + dx;
      const nty = currentNode.ty + dy;
      const nKey = tileKey(ntx, nty);
      if (closed.has(nKey)) continue;
  if (isDragonBlockedTile(ntx, nty, blockedSet, tileSpanTiles)) continue;

      // Don't let it cut diagonally through a wall corner
       if (dx !== 0 && dy !== 0) {
    if (
      isDragonBlockedTile(currentNode.tx + dx, currentNode.ty, blockedSet, tileSpanTiles) ||
      isDragonBlockedTile(currentNode.tx, currentNode.ty + dy, blockedSet, tileSpanTiles)
    ) continue;
  }

      const tentativeG = gScore.get(currentKey) + cost;
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, currentKey);
        gScore.set(nKey, tentativeG);
        open.set(nKey, { tx: ntx, ty: nty, f: tentativeG + heuristic(ntx, nty, goalTx, goalTy) });
      }
    }
  }

  return null; // no path exists
}


// ADDED — generic version any entity (dragon, level3Boss, etc.) can call
function recalcEntityPath(entity, tileSpanTiles, targetX, targetY) {
  const blocked = buildDragonBlockedSet();
  const startTx = Math.round(entity.x / TILE_SIZE);
  const startTy = Math.round(entity.y / TILE_SIZE);
  const goalTx = Math.round(targetX / TILE_SIZE);
  const goalTy = Math.round(targetY / TILE_SIZE);
  return findDragonPath(startTx, startTy, goalTx, goalTy, blocked, tileSpanTiles);
}

// CHANGED — recalcDragonPath is now just a thin wrapper around the generic version
function recalcDragonPath() {
  const path = recalcEntityPath(dragon, DRAGON_CONFIG.tileSpan, player.x, player.y);
  if (path) {
    dragonPath = path;
    dragonPathIndex = 0;
  }
}  // if no path found, keep the stale one — it'll retry next interval
