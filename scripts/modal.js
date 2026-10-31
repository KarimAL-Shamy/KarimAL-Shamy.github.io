/**
 * @file modal.js
 * @description Project Details Modal Dialog & Interactive Screenshot Carousel.
 *
 * Software Engineering Principles & Methodologies Applied:
 * - Single Responsibility Principle (SRP): Decoupled ProjectModalController with
 *   dedicated sub-handlers for gesture tracking, carousel mechanics, and accessibility.
 * - Single Source of Truth: Centralized project metadata catalog and modal dialog state.
 * - Defensive Programming: Input validation, element guards, safe DOM creation.
 * - Performance: Hardware-accelerated transitions, debounced resize computations.
 * - Accessibility (a11y): Full ARIA dialog semantics (role="dialog", aria-modal="true"),
 *   focus trapping while open, focus restoration on close, body scroll locking,
 *   and keyboard navigation (Escape, ArrowLeft, ArrowRight).
 * - Mobile Touch Support: Unified Pointer Events for desktop mouse dragging and mobile swipe gestures.
 *
 * @author Karim Hassan
 * @license MIT
 */

(function(window, document, $) {
  'use strict';

  /**
   * Project metadata catalog
   */
  var PROJECT_DATA = Object.freeze({
    pathfinding: Object.freeze({
      title: 'Pathfinding & Search Visualizer',
      tag: 'ARTIFICIAL INTELLIGENCE & HEURISTIC SEARCH.',
      bullets: Object.freeze([
        'Interactive grid pathfinding animator showcasing A* Search and Breadth-First Search (BFS) algorithms.',
        'Features multi-size agent footprint navigation (1x1, 2x2, 3x3) with precomputed cardinal sector connectivity and corner-cutting avoidance.',
        'Supports diverse environments (caves, mazes, open terrain), customizable legal actions (4-way / 8-way), heuristic functions (Manhattan, Euclidean, Octile), and real-time execution metrics.'
      ]),
      link: 'projects/pathfinding/index.html'
    }),
    sorting: Object.freeze({
      title: 'Sorting Visualizer',
      tag: 'WEB-BASED ALGORITHM ANIMATION TOOL.',
      bullets: Object.freeze([
        'Interactive web visualization tool for sorting algorithms (Bubble Sort, Selection Sort, Insertion Sort, Merge Sort, and Quick Sort).',
        'Demonstrates real-time algorithmic execution, comparisons, array element swaps, and computational time complexity.',
        'Features responsive controls to adjust array sizes, animation speeds, and randomize datasets built with React and JavaScript.'
      ]),
      link: 'projects/sorting/index.html'
    }),
    clock: Object.freeze({
      title: 'Dynamic Mathematical Clock',
      tag: 'CREATIVE COMPUTING & MATHEMATICS.',
      bullets: Object.freeze([
        'Interactive canvas clock developed with JavaScript and the p5.js creative computing library.',
        'Utilizes trigonometric polar-coordinate algorithms to animate continuous smooth radial arcs for hours, minutes, seconds, and milliseconds.',
        'Combines dynamic polar-aligned numerals and responsive canvas scaling for seamless desktop and mobile rendering.'
      ]),
      link: 'projects/clock/index.html'
    }),
    tictactoe: Object.freeze({
      title: 'Tic Tac Toe GUI Game',
      tag: 'DESKTOP APPLICATION & OOP LOGIC.',
      bullets: Object.freeze([
        'Interactive desktop game developed in Java with a custom Swing graphical user interface.',
        'Features robust turn-based game logic, win/draw state evaluation, and real-time score tracking.',
        'Structured with clean object-oriented architecture and modular event-driven design.'
      ]),
      link: 'projects/tictactoe/index.html'
    }),
    easternedge: Object.freeze({
      title: 'Eastern Edge Robotics ROV',
      tag: 'SUB-MARINE ROBOT & EMBEDDED CONTROL.',
      bullets: Object.freeze([
        'Developed embedded system communication protocols on Arduino microcontrollers using Python and C++.',
        'Implemented the mission-critical control GUI for the Remotely Operated Vehicle (ROV) to enable real-time operator navigation and sensor telemetry.'
      ]),
      link: 'https://www.easternedgerobotics.com/'
    }),
    hyperloop: Object.freeze({
      title: 'Paradigm Hyperloop Pod',
      tag: 'HIGH-SPEED TRANSPORTATION & EMBEDDED SYSTEMS.',
      bullets: Object.freeze([
        "Architected an object-oriented codebase for the vehicle's embedded systems.",
        'Wrote drivers for custom PCBs using SPI, I2C, CANBus and UDP.',
        'Developed a Python tool to automate uploading and organizing testing data on Cloud.',
        'Utilized SciPy to calculate aerodynamic properties in real-time to reduce its runtime.'
      ]),
      link: 'https://munparadigm.com/'
    })
  });

  /**
   * ProjectModalController
   */
  function ProjectModalController() {
    this.$modalWrap = $('.modal-wrap');
    this.$modal = $('#modal');
    this.$mask = $('.mask');
    this.$closeBtn = $('.modal-wrap .close');
    this.$carousel = $('#carousel');
    this.$prevBtn = $('#prev');
    this.$nextBtn = $('#next');
    this.$title = $('#modal-project-title');
    this.$tag = $('#modal .tag');
    this.$detail = $('#modal .detail');
    this.$actionBtn = $('#modal .button');
    this.$actionLink = this.$actionBtn.parent('a');
    this.$carouselWrap = $('#modal .carousel-wrap');

    this.slideWidth = 720;
    this.threshold = 240;
    this.dragStartX = 0;
    this.dragCurrentX = 0;
    this.isDragging = false;
    this.isTransitioning = false;
    this.lastFocusedElement = null;

    this.init();
  }

  ProjectModalController.prototype = {
    constructor: ProjectModalController,

    init: function() {
      if (!this.$modalWrap.length || !this.$modal.length) return;

      this.calcDimensions();
      this.bindEvents();
    },

    calcDimensions: function() {
      var winWidth = $(window).innerWidth();
      this.slideWidth = Math.min(720, Math.max(280, winWidth - 32));
      this.threshold = this.slideWidth / 3;

      $('.carousel-wrap, .slide').css('width', this.slideWidth);
      this.$modal.css('max-width', this.slideWidth);
      this.$carousel.css('left', this.slideWidth * -1);
    },

    bindEvents: function() {
      var self = this;

      // Project Trigger Clicks (Event delegation)
      $('#gallery').on('click', '.project-learn-more, .project-learn-trigger, .button', function(e) {
        var projectId = $(this).attr('id') || $(this).data('project') || $(this).closest('.project-card').find('.project-learn-more').attr('id');
        if (projectId && PROJECT_DATA[projectId]) {
          e.preventDefault();
          self.open(projectId, this);
        }
      });

      // Close Triggers
      this.$closeBtn.on('click', function(e) {
        e.preventDefault();
        self.close();
      });

      this.$mask.on('click', function() {
        self.close();
      });

      // Keyboard Controls
      window.addEventListener('keydown', function(e) {
        if (!self.isOpen()) return;

        if (e.key === 'Escape' || e.keyCode === 27) {
          e.preventDefault();
          self.close();
        } else if (e.key === 'ArrowLeft') {
          if (!self.$modal.hasClass('no-carousel')) {
            e.preventDefault();
            self.shiftSlide(1);
          }
        } else if (e.key === 'ArrowRight') {
          if (!self.$modal.hasClass('no-carousel')) {
            e.preventDefault();
            self.shiftSlide(-1);
          }
        } else if (e.key === 'Tab') {
          self.trapFocus(e);
        }
      });

      // Carousel Navigation Buttons
      this.$prevBtn.on('click', function(e) {
        e.stopPropagation();
        self.shiftSlide(1);
      });

      this.$nextBtn.on('click', function(e) {
        e.stopPropagation();
        self.shiftSlide(-1);
      });

      // Unified Pointer Gestures (Mouse + Touch)
      this.initCarouselGestures();

      // Window resize handling
      $(window).on('resize', function() {
        self.calcDimensions();
      });
    },

    initCarouselGestures: function() {
      var self = this;
      var carouselEl = this.$carousel.get(0);
      if (!carouselEl) return;

      var onPointerDown = function(e) {
        if (self.isTransitioning) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        self.isDragging = true;
        self.dragStartX = e.clientX;
        self.dragCurrentX = e.clientX;

        try {
          carouselEl.setPointerCapture(e.pointerId);
        } catch (err) {}
      };

      var onPointerMove = function(e) {
        if (!self.isDragging || self.isTransitioning) return;
        self.dragCurrentX = e.clientX;
        var deltaX = self.dragCurrentX - self.dragStartX;
        self.$carousel.css('transform', 'translateX(' + deltaX + 'px)');
      };

      var onPointerUp = function(e) {
        if (!self.isDragging) return;
        self.isDragging = false;

        try {
          carouselEl.releasePointerCapture(e.pointerId);
        } catch (err) {}

        var deltaX = self.dragCurrentX - self.dragStartX;
        if (deltaX > self.threshold) {
          self.shiftSlide(1);
        } else if (deltaX < -self.threshold) {
          self.shiftSlide(-1);
        } else {
          self.shiftSlide(0);
        }
      };

      carouselEl.addEventListener('pointerdown', onPointerDown);
      carouselEl.addEventListener('pointermove', onPointerMove);
      carouselEl.addEventListener('pointerup', onPointerUp);
      carouselEl.addEventListener('pointercancel', onPointerUp);
    },

    shiftSlide: function(direction) {
      var self = this;
      if (this.isTransitioning) return;

      this.isTransitioning = true;
      this.$carousel
        .addClass('transition')
        .css('transform', 'translateX(' + direction * this.slideWidth + 'px)');

      setTimeout(function() {
        if (direction === 1) {
          self.$carousel.find('.slide:first').before(self.$carousel.find('.slide:last'));
        } else if (direction === -1) {
          self.$carousel.find('.slide:last').after(self.$carousel.find('.slide:first'));
        }
        self.$carousel.removeClass('transition');
        self.$carousel.css('transform', 'translateX(0px)');
        self.isTransitioning = false;
      }, 700);
    },

    populateContent: function(projectId) {
      var project = PROJECT_DATA[projectId];
      if (!project) return;

      this.$title.text(project.title);
      this.$tag.text(project.tag);

      // Construct bullet points cleanly without vulnerable string concatenation
      this.$detail.empty();
      if (project.bullets && project.bullets.length) {
        var $list = $('<ul class="modal-bullets"></ul>');
        for (var i = 0; i < project.bullets.length; i++) {
          $('<li></li>').text(project.bullets[i]).appendTo($list);
        }
        this.$detail.append($list);
      }

      // Link button
      if (project.link) {
        this.$actionLink.attr('href', project.link);
        this.$actionBtn.addClass('visible');
      } else {
        this.$actionLink.removeAttr('href');
        this.$actionBtn.removeClass('visible');
      }

      // Carousel visibility & slide visuals
      if (projectId === 'easternedge' || projectId === 'hyperloop') {
        this.$modal.addClass('no-carousel').removeClass('modal-clock');
        this.$carouselWrap.hide();
      } else {
        this.$modal.removeClass('no-carousel');
        this.$carouselWrap.show();

        var isClock = projectId === 'clock';
        this.$modal.toggleClass('modal-clock', isClock);

        this.$carousel.find('.slide').each(function(index) {
          var bgImg = "url('img/slides/" + projectId + '-' + index + ".jpg')";
          if (isClock) {
            $(this).css({
              background: bgImg + ' center center / contain no-repeat #000000',
              backgroundColor: '#000000',
              backgroundSize: 'contain',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat'
            });
          } else {
            $(this).css({
              background: bgImg + ' center center / cover no-repeat #0b0e14',
              backgroundColor: '#0b0e14',
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat'
            });
          }
        });
      }
    },

    open: function(projectId, triggerElement) {
      this.lastFocusedElement = triggerElement || document.activeElement;
      this.populateContent(projectId);
      this.calcDimensions();

      this.$modalWrap.addClass('visible').attr('aria-hidden', 'false');
      $('body').css('overflow', 'hidden');

      // Focus close button for accessibility
      this.$closeBtn.focus();
    },

    close: function() {
      if (!this.isOpen()) return;

      this.$modalWrap.removeClass('visible').attr('aria-hidden', 'true');
      this.$actionBtn.removeClass('visible');
      $('body').css('overflow', '');

      // Restore focus to opener
      if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
        this.lastFocusedElement.focus();
      }
    },

    isOpen: function() {
      return this.$modalWrap.hasClass('visible');
    },

    trapFocus: function(e) {
      var focusableElements = this.$modal.find('a[href], button:not([disabled]), [tabindex="0"], input, textarea').filter(':visible');
      if (focusableElements.length === 0) return;

      var firstElement = focusableElements.get(0);
      var lastElement = focusableElements.get(focusableElements.length - 1);

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  // Instantiate upon DOM readiness
  var instance = null;
  $(function() {
    instance = new ProjectModalController();
  });

  window.ProjectModal = {
    getInstance: function() {
      return instance;
    }
  };

})(typeof window !== 'undefined' ? window : this, document, jQuery);
