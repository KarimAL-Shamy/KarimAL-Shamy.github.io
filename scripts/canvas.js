/**
 * @file canvas.js
 * @description Interactive generative canvas particle animation for the hero section.
 *
 * Software Engineering Principles & Methodologies Applied:
 * - Encapsulation & Scope Isolation: Zero global namespace pollution via IIFE.
 * - Defensive Programming: Guards against missing Pt.js dependencies or DOM elements.
 * - Performance & Energy Efficiency:
 *   - IntersectionObserver lifecycle management pauses animation loops when off-screen.
 *   - Debounced window resizing eliminates redundant canvas re-creations during browser drag.
 *   - Proper resource teardown (removeAll, DOM cleanup) prevents memory leaks.
 *
 * @author Karim Hassan
 * @license MIT
 */

(function(window, document, $) {
  'use strict';

  var space = null;
  var observer = null;
  var resizeTimer = null;

  /**
   * Calculates minimum Euclidean distance from a point to a finite line segment.
   * @param {number} px Point X
   * @param {number} py Point Y
   * @param {number} x1 Segment start X
   * @param {number} y1 Segment start Y
   * @param {number} x2 Segment end X
   * @param {number} y2 Segment end Y
   * @returns {number} Minimum distance
   */
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
      var ex0 = px - x1;
      var ey0 = py - y1;
      return Math.sqrt(ex0 * ex0 + ey0 * ey0);
    } else if (t > 1) {
      var ex1 = px - x2;
      var ey1 = py - y2;
      return Math.sqrt(ex1 * ex1 + ey1 * ey1);
    }

    var projX = x1 + t * dx;
    var projY = y1 + t * dy;
    var exP = px - projX;
    var eyP = py - projY;
    return Math.sqrt(exP * exP + eyP * eyP);
  }

  /**
   * Initializes the generative Pt.js particle space.
   */
  function initHeroCanvas() {
    if (typeof CanvasSpace === 'undefined' || typeof Form === 'undefined' || typeof Vector === 'undefined') {
      return;
    }

    var canvasContainer = document.getElementById('pt');
    if (!canvasContainer) return;

    // Clean up existing space if present
    if (space) {
      try {
        space.stop();
        space.removeAll();
      } catch (err) {}
      $(canvasContainer).find('canvas').remove();
      space = null;
    }

    var colors = ['#FF3F8E', '#04C2C9', '#2E55C1'];

    try {
      space = new CanvasSpace('canvas', false).display();
    } catch (err) {
      return;
    }

    var form = new Form(space);
    var pts = [];
    var center = space.size.$divide(1.8);
    var angle = -(window.innerWidth * 0.5);
    var count = Math.min(150, Math.floor(window.innerWidth * 0.05));
    var line = new Line(0, angle).to(space.size.x, 0);
    var mouse = new Vector(-9999, -9999);

    var r = Math.min(space.size.x, space.size.y);
    for (var i = 0; i < count; i++) {
      var p = new Vector(
        Math.random() * r - Math.random() * r,
        Math.random() * r - Math.random() * r
      );
      p.moveBy(center).rotate2D((i * Math.PI) / count, center);
      p.brightness = 0.1;
      pts.push(p);
    }

    space.add({
      animate: function() {
        for (var j = 0; j < pts.length; j++) {
          var pt = pts[j];
          pt.rotate2D(Const.one_degree / 20, center);
          form.stroke(false).fill(colors[j % 3]).point(pt, 1);

          var perp = line.getPerpendicularFromPoint(pt);
          var ln = new Line(pt).to(perp);

          var distFromMouse = distToSegment(mouse.x, mouse.y, pt.x, pt.y, perp.x, perp.y);
          if (distFromMouse < 45) {
            if (pts[j].brightness < 0.3) pts[j].brightness += 0.02;
          } else {
            if (pts[j].brightness > 0.1) pts[j].brightness -= 0.01;
          }

          var color = 'rgba(255,255,255,' + pts[j].brightness + ')';
          form.stroke(color).fill(true).line(ln);
        }
      },

      onMouseAction: function(type, x, y) {
        if (type === 'move') {
          mouse.set(x, y);
        } else if (type === 'out' || type === 'leave') {
          mouse.set(-9999, -9999);
        }
      },

      onTouchAction: function(type, x, y) {
        if (type === 'move' || type === 'down') {
          this.onMouseAction('move', x, y);
        } else if (type === 'up' || type === 'out') {
          this.onMouseAction('out', x, y);
        }
      }
    });

    space.bindMouse();
    space.play();

    $('#home').on('mouseleave', function() {
      mouse.set(-9999, -9999);
    });

    // Pause animation when scrolled away to save power
    if ('IntersectionObserver' in window && !observer) {
      var homeElem = document.getElementById('home');
      if (homeElem) {
        observer = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (!space) return;
            if (entry.isIntersecting) {
              try { space.resume(); } catch (e) {}
            } else {
              try { space.pause(true); } catch (e) {}
            }
          });
        }, { threshold: 0.05 });
        observer.observe(homeElem);
      }
    }
  }

  // Bootstrap when ready
  $(function() {
    initHeroCanvas();

    // Debounced window resize handler
    $(window).on('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        initHeroCanvas();
      }, 180);
    });
  });

})(typeof window !== 'undefined' ? window : this, document, jQuery);
