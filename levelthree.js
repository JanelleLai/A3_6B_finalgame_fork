function checkDragonFightTrigger() {
     if (currentScreen !== LEVEL_THREE) return;
  if (!dragon || dragon.state !== DRAGON_STATE.CHASING) return;

    startDragonFight();
}


function startDragonFight() {
      console.log("startDragonFight called, dragon:", dragon, "state:", dragon?.state);

  if (!dragon || dragon.state !== DRAGON_STATE.CHASING) return;
  dragon.state = DRAGON_STATE.FIGHTING;
  dragon.health = dragon.maxHealth; // fresh health going into the fight

  chaseCamZoomTarget = 0.7; // same zoom-in as the chase, held through the fight

  console.log("Boss fight started.");
}

