/**
 * @file index.js
 * @description Core interactive controller for the portfolio website.
 *
 * Software Engineering Principles & Methodologies Applied:
 * - Single Responsibility Principle (SRP): Decoupled controllers for Navigation,
 *   Theme, Portfolio Filtering, Skills Matrix, Clipboard, and Micro-interactions.
 * - Single Source of Truth: Centralized theme and navigation state management.
 * - Defensive Programming: Element existence checks, feature detection (Clipboard API, MatchMedia, Waypoints).
 * - Performance: requestAnimationFrame scroll throttling, debounced resize handling.
 * - Accessibility (a11y): ARIA attributes synchronization (aria-expanded, aria-checked),
 *   keyboard-friendly interaction, smooth scroll navigation.
 * - Clean Code: Zero dead code, elimination of brittle user-agent sniffing, strict mode execution.
 *
 * @author Karim Hassan
 * @license MIT
 */

(function(window, document, $) {
  'use strict';

  /**
   * Utility: Debounces rapid function invocations
   * @param {Function} func 
   * @param {number} waitMs 
   * @returns {Function}
   */
  function debounce(func, waitMs) {
    var timeout;
    return function() {
      var context = this;
      var args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, waitMs);
    };
  }

  /**
   * NavigationController
   * Manages sticky navigation, scroll-spy section highlighting, smooth scrolling,
   * and mobile drawer menu state.
   */
  var NavigationController = {
    $nav: null,
    $navMenuToggle: null,
    $linkWrap: null,
    $home: null,
    $window: null,
    navPos: 0,
    lastScrollY: 0,
    scrollTicking: false,

    init: function() {
      this.$nav = $('nav');
      this.$navMenuToggle = $('.mdi-menu');
      this.$linkWrap = $('.link-wrap');
      this.$home = $('#home');
      this.$window = $(window);

      if (!this.$nav.length) return;

      this.calcNavPos();
      this.initStickyState();
      this.bindEvents();
    },

    calcNavPos: function() {
      if (!this.$nav.hasClass('fixed')) {
        this.navPos = this.$nav.position().top;
      } else if (this.$home.length) {
        this.navPos = this.$home.outerHeight() - this.$nav.outerHeight();
      }
    },

    initStickyState: function() {
      var isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      if (isTouch) {
        this.$nav.addClass('fixed');
      } else {
        this.$nav.addClass('desk');
        if (this.$window.scrollTop() >= this.navPos + this.$nav.height()) {
          this.$nav.addClass('fixed');
        }
      }
    },

    bindEvents: function() {
      var self = this;

      // Throttled scroll handling via requestAnimationFrame
      this.$window.on('scroll', function() {
        if (!self.scrollTicking) {
          window.requestAnimationFrame(function() {
            self.onScroll();
            self.scrollTicking = false;
          });
          self.scrollTicking = true;
        }
      });

      // Debounced window resize
      this.$window.on('resize', debounce(function() {
        self.calcNavPos();
      }, 150));

      // Smooth scroll for page navigation links
      $(document).on('click', '.page-link', function(e) {
        var anchor = $(this).attr('dest');
        if (!anchor) return;

        var $target = $('#' + anchor);
        if (!$target.length) return;

        e.preventDefault();
        self.closeMobileMenu();
        self.highlightLink(anchor);

        $('html, body').stop().animate(
          { scrollTop: $target.offset().top },
          400
        );
      });

      // Mobile Menu Toggle with ARIA state management
      this.$navMenuToggle.on('click', function(e) {
        e.stopPropagation();
        var isVisible = self.$linkWrap.toggleClass('visible').hasClass('visible');
        self.$navMenuToggle.attr('aria-expanded', String(isVisible));
      });

      // Close mobile menu when clicking outside
      $(document).on('click', function(e) {
        if (self.$linkWrap.hasClass('visible') && !$(e.target).closest('nav').length) {
          self.closeMobileMenu();
        }
      });
    },

    closeMobileMenu: function() {
      this.$linkWrap.removeClass('visible');
      this.$navMenuToggle.attr('aria-expanded', 'false');
    },

    onScroll: function() {
      var scrollY = this.$window.scrollTop();
      var navHeight = this.$nav.height();
      var isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

      if (!isTouch) {
        if (scrollY >= this.navPos + navHeight && this.lastScrollY < scrollY) {
          this.$nav.addClass('fixed');
        } else if (scrollY < this.navPos && this.lastScrollY > scrollY) {
          this.$nav.removeClass('fixed');
        }
        this.lastScrollY = scrollY;
      }

      this.updateScrollSpy(scrollY);
    },

    updateScrollSpy: function(scrollY) {
      var triggerY = scrollY + 50;
      var scrollBottom = scrollY + this.$window.height();
      var sections = ['home', 'about', 'portfolio', 'experience', 'certificates', 'contact'];
      var activeSection = 'home';

      for (var i = 0; i < sections.length; i++) {
        var $sec = $('#' + sections[i]);
        if ($sec.length && triggerY > $sec.offset().top) {
          activeSection = sections[i];
        }
      }

      var $contact = $('#contact');
      if ($contact.length && (scrollBottom >= $(document).height() - 40 || scrollY + this.$window.height() * 0.45 > $contact.offset().top)) {
        activeSection = 'contact';
      }

      this.highlightLink(activeSection);
    },

    highlightLink: function(anchor) {
      this.$nav.find('.page-link.active').removeClass('active');
      this.$nav.find('[dest="' + anchor + '"]').addClass('active');
    }
  };

  /**
   * PortfolioFilterController
   * Initializes MixItUp gallery grid and synchronizes sliding category filter indicator.
   */
  var PortfolioFilterController = {
    $filters: null,
    $floatBar: null,
    $floatBarRow: null,
    $gallery: null,

    init: function() {
      this.$filters = $('.filter');
      this.$floatBar = $('.float-bar');
      this.$floatBarRow = $('.float-bar .row');
      this.$gallery = $('#gallery');

      if (!this.$filters.length) return;

      this.initMixItUp();
      this.positionBar(this.$filters.first());
      this.bindEvents();
    },

    initMixItUp: function() {
      if (typeof $.fn.mixItUp === 'function' && this.$gallery.length) {
        this.$gallery.mixItUp({});
      }
    },

    positionBar: function(elem) {
      var $elem = $(elem);
      if (!$elem.length || !this.$floatBar.length) return;

      var origin = $elem.parent().offset().left;
      var pos = $elem.offset().left;
      var leftOffset = pos - origin;

      this.$floatBar.css({
        left: leftOffset,
        width: $elem.innerWidth()
      });
      this.$floatBarRow.css('left', leftOffset * -1);
    },

    bindEvents: function() {
      var self = this;
      this.$filters.on('click', function() {
        self.positionBar(this);
      });

      $(window).on('resize', debounce(function() {
        var $active = self.$filters.filter('.active');
        self.positionBar($active.length ? $active : self.$filters.first());
      }, 150));
    }
  };

  /**
   * SkillsMatrixController
   * Handles interactive skills filtering across languages, frameworks, and tools.
   */
  var SkillsMatrixController = {
    init: function() {
      var $filterBtns = $('.skill-filter-btn');
      var $bars = $('.bars-wrap .bar');
      var $badges = $('.tech-badge');

      if (!$filterBtns.length) return;

      $filterBtns.on('click', function() {
        var filter = $(this).attr('data-filter');
        $filterBtns.removeClass('active');
        $(this).addClass('active');

        if (filter === 'all') {
          $bars.add($badges).removeClass('dimmed highlighted');
          return;
        }

        $bars.each(function() {
          var categories = ($(this).attr('data-category') || '').split(/\s+/);
          var isMatch = categories.indexOf(filter) !== -1;
          $(this).toggleClass('highlighted', isMatch).toggleClass('dimmed', !isMatch);
        });

        $badges.each(function() {
          var categories = ($(this).attr('data-category') || '').split(/\s+/);
          var isMatch = categories.indexOf(filter) !== -1;
          $(this).toggleClass('highlighted', isMatch).toggleClass('dimmed', !isMatch);
        });
      });
    }
  };

  /**
   * ThemeController
   * Manages light and dark theme switching with system detection, localStorage persistence,
   * and WCAG accessibility states.
   */
  var ThemeController = {
    $btn: null,
    mediaQuery: null,

    init: function() {
      this.$btn = $('#theme-toggle');
      this.mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

      var savedTheme = null;
      try {
        savedTheme = localStorage.getItem('theme');
      } catch (err) {}

      if (savedTheme) {
        this.applyTheme(savedTheme, false);
      } else {
        var isSystemDark = Boolean(this.mediaQuery && this.mediaQuery.matches);
        this.applyTheme(isSystemDark ? 'dark' : 'light', false);
      }

      this.bindEvents();
    },

    applyTheme: function(theme, isManual) {
      var isDark = theme === 'dark';
      $('html').toggleClass('dark-theme', isDark);

      if (this.$btn && this.$btn.length) {
        this.$btn.attr('title', isDark ? 'Switch to light theme' : 'Switch to dark theme');
        this.$btn.attr('aria-checked', String(isDark));
      }

      if (isManual) {
        try {
          localStorage.setItem('theme', theme);
        } catch (err) {}
      }
    },

    bindEvents: function() {
      var self = this;

      if (this.$btn && this.$btn.length) {
        this.$btn.on('click', function(e) {
          e.preventDefault();
          var isDark = $('html').hasClass('dark-theme');
          self.applyTheme(isDark ? 'light' : 'dark', true);
        });
      }

      if (this.mediaQuery && this.mediaQuery.addEventListener) {
        this.mediaQuery.addEventListener('change', function(e) {
          try {
            if (!localStorage.getItem('theme')) {
              self.applyTheme(e.matches ? 'dark' : 'light', false);
            }
          } catch (err) {}
        });
      }
    }
  };

  /**
   * ClipboardService
   * Facilitates reliable text copy to system clipboard with tactile UI notification.
   */
  var ClipboardService = {
    init: function() {
      $(document).on('click', '.contact-copy-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var textToCopy = $(this).attr('data-copy');
        if (!textToCopy) return;

        var $btn = $(this);
        var $tooltip = $btn.find('.copy-tooltip');
        var $icon = $btn.find('i');

        function notifyCopied() {
          $btn.addClass('copied');
          $icon.removeClass('mdi-content-copy').addClass('mdi-check');
          $tooltip.text('Copied!');
          setTimeout(function() {
            $btn.removeClass('copied');
            $icon.removeClass('mdi-check').addClass('mdi-content-copy');
            $tooltip.text('Copy');
          }, 2000);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy)
            .then(notifyCopied)
            .catch(function() {
              ClipboardService.fallbackCopy(textToCopy, notifyCopied);
            });
        } else {
          ClipboardService.fallbackCopy(textToCopy, notifyCopied);
        }
      });
    },

    fallbackCopy: function(text, onSuccess) {
      var $temp = $('<textarea>')
        .css({ position: 'fixed', left: '-9999px', top: '0', opacity: '0' })
        .val(text);
      $('body').append($temp);
      $temp.focus().select();
      try {
        document.execCommand('copy');
        if (typeof onSuccess === 'function') onSuccess();
      } catch (err) {}
      $temp.remove();
    }
  };

  /**
   * MicroInteractions
   * Handles tactile interactive flourishes (avatar wobble, waving hand, scroll-to-top).
   */
  var MicroInteractions = {
    init: function() {
      // Interactive avatar spin
      $('.skills-wrapper .me').on('click', function() {
        var $me = $(this);
        $me.css('transform', 'scale(1.15) rotate(360deg)');
        setTimeout(function() {
          $me.css('transform', '');
        }, 600);
      });

      // Waving hand click animation
      $('.waving-hand').on('click', function() {
        var $hand = $(this);
        $hand.css('animation', 'wave-animation 0.5s 3 ease-in-out');
        setTimeout(function() {
          $hand.css('animation', '');
        }, 1600);
      });

      // Scroll-to-top button
      $('#topButton').on('click', function(e) {
        e.preventDefault();
        var $home = $('#home');
        if ($home.length) {
          $('html, body').stop().animate({ scrollTop: $home.offset().top }, 400);
        }
      });
    }
  };

  /**
   * ScrollAnimationController
   * Initializes waypoints scroll entrance animations.
   */
  var ScrollAnimationController = {
    init: function() {
      if (typeof $.fn.waypoint !== 'function') return;

      var offset = $(window).height() / 1.6;
      $('.waypoint').each(function() {
        var $elem = $(this);
        var animationClass = $elem.attr('data-animation');
        var animationDelay = $elem.attr('data-delay');

        if (animationDelay) {
          $elem.css({
            '-webkit-animation-delay': animationDelay,
            'animation-delay': animationDelay
          });
        }

        $elem.waypoint(
          function() {
            $elem.addClass('animated').addClass(animationClass);
            if ($elem.attr('id') === 'gallery') {
              setTimeout(function() {
                $elem.removeClass('waypoint');
              }, 2000);
            }
          },
          {
            triggerOnce: true,
            offset: offset
          }
        );
      });
    }
  };

  /**
   * TerminalTypingController
   * Sets up terminal typing animation with multi-language greetings.
   */
  var TerminalTypingController = {
    init: function() {
      if ($('.type').length && typeof Typed !== 'undefined') {
        try {
          new Typed('.type', {
            strings: ['Hey There!', 'Hello!', 'Bonjour!', 'السلام عليكم!\u200F'],
            typeSpeed: 100,
            backSpeed: 50,
            backDelay: 1000,
            startDelay: 500,
            loop: true,
            showCursor: true
          });
        } catch (err) {}
      }
    }
  };

  // Bootstrap all controllers upon DOM readiness
  $(function() {
    NavigationController.init();
    PortfolioFilterController.init();
    SkillsMatrixController.init();
    ThemeController.init();
    ClipboardService.init();
    MicroInteractions.init();
    TerminalTypingController.init();

    setTimeout(function() {
      ScrollAnimationController.init();
    }, 20);
  });

})(typeof window !== 'undefined' ? window : this, document, jQuery);
