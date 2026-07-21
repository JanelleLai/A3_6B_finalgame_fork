function drawLevelOne() {
    background(20);
  console.log(player.x / 50, player.y / 50); // for troubleshooting

  updateCamera();
  updateInvincibility(); // ADDED — ticks down player.invincibleTimer

  // Everything inside push/pop is drawn in world coordinates
  push();
  let screenOffsetX = Math.round((width / 2) * (1 - camZoom) - camX * camZoom);
  let screenOffsetY = Math.round((height / 2) * (1 - camZoom) - camY * camZoom);

  translate(screenOffsetX, screenOffsetY);
  scale(camZoom);
  if (shouldDrawArea(startArea)) {
    drawTiles(startArea);
  }

  if (shouldDrawArea(birdArea)) {
    drawTiles(birdArea);
  }

  if (shouldDrawArea(fishArea)) {
    drawTiles(fishArea);
  }

  if (shouldDrawArea(endArea)) {
    drawTiles(endArea);
  }

  if (gameState === STATE_PLAY) {
    updateMoveSpeed();
    handleInput();
    updateHumanBGSound();
    updateBirdBGSound();
    updateWalkingSound(); 
    updateFlappingSound(); 
    updateFishAreaSound(); // NEW

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

    // ADDED — tile physics: solid blockage, hazards, checkpoints
    resolveSolidCollisions();
    checkWhirlpools();
    checkKeys();
    checkPortalEntrance();
    checkHazardCollisions();
    checkCheckpoints();

    drawWindZones(); 

    animateCharacter();
    drawPlayer();

    // ADDED: draw fish area overlay on top of everything (world coordinates)
    if (fishareaOverlay) {
      const fishAreaOffsetX =
        TILE_SIZE * (startArea.mapWidth + birdArea.mapWidth - 37);
      const fishAreaOffsetY = TILE_SIZE * birdArea.mapHeight;
      image(fishareaOverlay, fishAreaOffsetX, fishAreaOffsetY, fishArea.mapWidth * TILE_SIZE, 800);
    }
  }

  pop(); // restore screen coordinates
  drawKeyHUD();
  drawInstructions();
  if (gameState === STATE_WIN && level1MessageImg) {
    stopAllGameSounds();
    drawEndScreen();
  }
}