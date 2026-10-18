function setup() {
  createCanvas(500, 500);
  angleMode(DEGREES);
}

function draw() {
  background(0);
  translate(width/2, height/2);
  rotate(-90);
    
  let mon = month();
  let d = day();
  let y = year();
  let hr = hour();
  let mn = minute();
  let sc = second();
  let tempDate = new Date();
  let mil = tempDate.getMilliseconds();
  
  strokeWeight(8);
  stroke(150, 255, 100);
  noFill();
  let hourAngle = map((hr % 12) + (mn/ 60), 0, 12, 0, 360);
  arc(0, 0, 260, 260, 0, hourAngle);
  // arc(0, 0, 110, 110,hourAngle, 0);
  // push();
  // rotate(hourAngle);
  // line(55, 0, 130, 0);
  // pop();
  

  strokeWeight(6);
  stroke(4, 0, 255);
  let minuteAngle = map(mn, 0, 60, 0, 360);
  arc(0, 0, 280, 280, 0, minuteAngle);
  // arc(0, 0, 100, 100,minuteAngle, 0);
  // push();
  // rotate(minuteAngle);
  // line(50, 0, 140, 0);
  // pop();
  
  strokeWeight(3);
  stroke(255, 100, 150);
  let secondAngle = map(sc, 0, 60, 0, 360);
  arc(0, 0, 300, 300, 0, secondAngle);
  // arc(0, 0, 90, 90,secondAngle, 0);
  // push();
  // rotate(secondAngle);
  // line(45, 0, 150, 0);
  // pop();
  
  strokeWeight(2);
  stroke(255, 255, 255);
  let milAngle = map(mil, 0, 1000, 0, 360);
  arc(0, 0, 80, 80, 0,milAngle);

    
  fill(255);
  strokeWeight(2);
  stroke(255, 0, 0);
  rotate(90);
  textSize(18);
  text((hr%12 ? ((hr%12)>9 ? hr%12:'0'+hr%12) :'12')
       +':' + (mn>9 ? mn:'0'+mn) 
       + ':' + (sc>9 ? sc:'0'+sc) , 0, -2);
  if(hr>=12){
    text("PM", 0, 20);
  }else{
    text("AM", 0, 20);
  }
  back();
  textSize(20);
  fill(0, 125, 253, 80);
  text(d + " / " + mon + " / " + y, 0, 220);
}

function back() {

  let ang = 180;
  stroke(255,255,255);
  strokeWeight(1.8);
  for (let i = 1 ; i <= 12 ; i++) {
    ang += 30;
    textAlign(CENTER, CENTER);
    let posX = sin(-ang) * 180;
    let posY = cos(-ang) * 180;
    textSize(50);
    
    text(i, posX, posY);

  }

}