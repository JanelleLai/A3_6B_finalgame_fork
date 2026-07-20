let titleFrame1;
let titleFrame2;
let currentFrame = 0;
let frameTimer = 0;
const frameInterval = 0.6;

function preload() {
  titleFrame1 = loadImage('assets/images/Title frame1.png');
  titleFrame2 = loadImage('assets/images/Title frame2.png');
}

function setup() {
  createCanvas(800, 450);
  imageMode(CORNER);
}

function windowResized() {
  // Prevent canvas from resizing with window
}

function draw() {
    
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
