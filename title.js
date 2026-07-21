/*
function setup() {
  createCanvas(800, 450);
  imageMode(CORNER);
}

function windowResized() {
  // Prevent canvas from resizing with window
} 
*/

function drawTitleScreen() {
    
    frameTimer += deltaTime / 1000;

  if (frameTimer >= frameInterval) {
    frameTimer = 0;
    currentFrame = currentFrame === 0 ? 1 : 0;
  }

  if (currentFrame === 0 && titleFrame1) {
    image(titleFrame1, 0, 0, 800, 450);
  } else if (currentFrame === 1 && titleFrame2) {
    image(titleFrame2, 0, 0, 800, 450);
  }

  // Small red rectangle slightly beneath center
  fill(255, 255, 255);
  noStroke();
  fill ("white");
  textFont("Lancelot");
  textSize(25);
  text("Press Enter to Start", 310, 350);
  
}
/*
function mousePressed() {
  if (mouseX > 375 && mouseX < 425 && mouseY > 320 && mouseY < 350) {
    window.location.href = 'game.html';
  }
}

function keyPressed() {
  if (key === 'Enter') {
    window.location.href = 'game.html';
  }
}
*/