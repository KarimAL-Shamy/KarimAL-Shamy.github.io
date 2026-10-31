/**
 * Dynamic Mathematical Clock
 * Author: Karim Hassan
 * Description: Real-time trigonometry polar-coordinate clock using p5.js
 */

var clockDim = 500;

function setup() {
  var size = Math.min(500, Math.max(300, windowWidth - 32));
  clockDim = size;
  createCanvas(size, size);
  angleMode(DEGREES);
}

function windowResized() {
  var size = Math.min(500, Math.max(300, windowWidth - 32));
  if (size !== clockDim) {
    clockDim = size;
    resizeCanvas(size, size);
  }
}

function draw() {
  background(11, 15, 25);
  translate(width / 2, height / 2);
  
  var scaleFactor = width / 500;
  scale(scaleFactor);

  rotate(-90);

  var mon = month();
  var d = day();
  var y = year();
  var hr = hour();
  var mn = minute();
  var sc = second();
  var tempDate = new Date();
  var mil = tempDate.getMilliseconds();

  // Hours radial arc
  strokeWeight(8);
  stroke(150, 255, 100);
  noFill();
  var hourAngle = map((hr % 12) + (mn / 60), 0, 12, 0, 360);
  arc(0, 0, 260, 260, 0, hourAngle);

  // Minutes radial arc
  strokeWeight(6);
  stroke(4, 194, 201);
  var minuteAngle = map(mn, 0, 60, 0, 360);
  arc(0, 0, 280, 280, 0, minuteAngle);

  // Seconds radial arc
  strokeWeight(3);
  stroke(255, 100, 150);
  var secondAngle = map(sc, 0, 60, 0, 360);
  arc(0, 0, 300, 300, 0, secondAngle);

  // Milliseconds radial arc
  strokeWeight(2);
  stroke(255, 255, 255, 180);
  var milAngle = map(mil, 0, 1000, 0, 360);
  arc(0, 0, 80, 80, 0, milAngle);

  // Digital Center Display
  fill(255);
  strokeWeight(1);
  stroke(255, 63, 142);
  rotate(90);
  textAlign(CENTER, CENTER);
  textSize(18);

  var hrDisplay = hr % 12 ? (hr % 12 > 9 ? hr % 12 : '0' + (hr % 12)) : '12';
  var mnDisplay = mn > 9 ? mn : '0' + mn;
  var scDisplay = sc > 9 ? sc : '0' + sc;
  text(hrDisplay + ':' + mnDisplay + ':' + scDisplay, 0, -2);

  textSize(13);
  text(hr >= 12 ? 'PM' : 'AM', 0, 20);

  drawNumerals();

  textSize(15);
  fill(4, 194, 201, 160);
  noStroke();
  text(d + ' / ' + mon + ' / ' + y, 0, 216);
}

function drawNumerals() {
  var ang = 180;
  stroke(255, 255, 255, 140);
  strokeWeight(1.5);
  fill(255, 255, 255, 220);

  for (var i = 1; i <= 12; i++) {
    ang += 30;
    textAlign(CENTER, CENTER);
    var posX = sin(-ang) * 180;
    var posY = cos(-ang) * 180;
    textSize(24);
    text(i, posX, posY);
  }
}
