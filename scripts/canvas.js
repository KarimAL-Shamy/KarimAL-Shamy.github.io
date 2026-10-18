var space;

function distToSegment(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  var lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    var ex = px - x1;
    var ey = py - y1;
    return Math.sqrt(ex * ex + ey * ey);
  }
  var t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  if (t < 0) {
    var ex = px - x1;
    var ey = py - y1;
    return Math.sqrt(ex * ex + ey * ey);
  } else if (t > 1) {
    var ex = px - x2;
    var ey = py - y2;
    return Math.sqrt(ex * ex + ey * ey);
  }
  var projX = x1 + t * dx;
  var projY = y1 + t * dy;
  var ex = px - projX;
  var ey = py - projY;
  return Math.sqrt(ex * ex + ey * ey);
}

function floatySpace() {
  var colors = [
    "#FF3F8E", "#04C2C9", "#2E55C1"
  ];

  space = new CanvasSpace("canvas", false).display();
  var form = new Form(space);

  // Elements
  var pts = [];
  var center = space.size.$divide(1.8);
  var angle = -(window.innerWidth * 0.5);
  var count = window.innerWidth * 0.05;
  if (count > 150) count = 150;
  var line = new Line(0, angle).to(space.size.x, 0);
  var mouse = new Vector(-9999, -9999);

  var r = Math.min(space.size.x, space.size.y) * 1;
  for (var i = 0; i < count; i++) {
    var p = new Vector(Math.random() * r - Math.random() * r, Math.random() * r - Math.random() * r);
    p.moveBy(center).rotate2D(i * Math.PI / count, center);
    p.brightness = 0.1;
    pts.push(p);
  }

  // Canvas
  space.add({
    animate: function(time, fps, context) {
      for (var i = 0; i < pts.length; i++) {
        // rotate the points slowly
        var pt = pts[i];

        pt.rotate2D(Const.one_degree / 20, center);
        form.stroke(false).fill(colors[i % 3]).point(pt, 1);

        // get line segment from pt to the perpendicular intersection on the reference line
        var perp = line.getPerpendicularFromPoint(pt);
        var ln = new Line(pt).to(perp);

        // Calculate true distance from mouse to the actual visible line segment (not infinite line)
        var distFromMouse = distToSegment(mouse.x, mouse.y, pt.x, pt.y, perp.x, perp.y);

        if (distFromMouse < 45) {
          if (pts[i].brightness < 0.3) pts[i].brightness += 0.02;
        } else {
          if (pts[i].brightness > 0.1) pts[i].brightness -= 0.01;
        }

        var color = "rgba(255,255,255," + pts[i].brightness + ")";
        form.stroke(color).fill(true).line(ln);
      }
    },

    onMouseAction: function(type, x, y, evt) {
      if (type == "move") {
        mouse.set(x, y);
      } else if (type == "out" || type == "leave") {
        mouse.set(-9999, -9999);
      }
    },

    onTouchAction: function(type, x, y, evt) {
      if (type == "move" || type == "down") {
        this.onMouseAction("move", x, y);
      } else if (type == "up" || type == "out") {
        this.onMouseAction("out", x, y);
      }
    }
  });

  space.bindMouse();
  space.play();

  $('#home').on('mouseleave', function() {
    mouse.set(-9999, -9999);
  });

  if ('IntersectionObserver' in window) {
    var homeElem = document.getElementById('home');
    if (homeElem) {
      var canvasObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            space.resume();
          } else {
            space.pause(true);
          }
        });
      }, { threshold: 0.05 });
      canvasObserver.observe(homeElem);
    }
  }
}

floatySpace();

$(window).resize(function() {
  space.removeAll();
  $('canvas').remove();
  floatySpace();
});
