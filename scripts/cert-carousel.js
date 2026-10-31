/**
 * @file cert-carousel.js
 * @description Production-grade 3D Fanned-Deck Card Swipe Carousel with Autoplay,
 * Gestural Physics, and Lightbox Integration.
 *
 * Software Engineering Principles & Methodologies Applied:
 * - Single Responsibility Principle (SRP): Decoupled SoundService, CertificateLightbox, and CertificateDeckCarousel
 * - Single Source of Truth: Centralized Modal and Carousel state management
 * - Defensive Programming: Input guards, bound checks, safe DOM queries
 * - Performance & Optimization: Hardware-accelerated CSS 3D transforms, requestAnimationFrame loops,
 *   tab visibility management via document.hidden to prevent background CPU cycles
 * - Accessibility (a11y): ARIA carousel roles, keyboard navigation, prefers-reduced-motion compliance
 * - Event Hygiene: Delegated event handling, deferred pointer capture, clean teardown
 *
 * @author Karim Hassan
 * @license MIT
 */

(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CertificateCarousel = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /**
   * Immutable Configuration Constants
   */
  const CONFIG = Object.freeze({
    SWIPE_THRESHOLD_PX: 80,
    SWIPE_VELOCITY_THRESHOLD: 0.42,
    MIN_DRAG_DISPLACEMENT_PX: 6,
    AUTOPLAY_INTERVAL_MS: 4500,
    ANIMATION_RESET_DELAY_MS: 340,
    PREV_ANIMATION_DELAY_MS: 450,
    SYNTHETIC_CLICK_SUPPRESS_MS: 150,
    MAX_ROTATION_DEG: 26,
    ROTATION_FACTOR: 0.08,
    VERTICAL_DRAG_DAMPING: 0.28,
    PROGRESS_RING_RADIUS: 14,
    PROGRESS_CIRCUMFERENCE: 2 * Math.PI * 14, // ~87.9646
    FAN_ANGLES: Object.freeze([0, 4.8, -5.2, 9.2, -9.8, 13.5, -14.0, 17.5]),
    FAN_X_OFFSETS: Object.freeze([0, 11, -11, 18, -18, 24, -24, 30]),
    FAN_Y_OFFSETS: Object.freeze([0, 2, 5, 8, 11, 14, 17, 21]),
    AUDIO: Object.freeze({
      SWIPE: { type: 'sine', startFreq: 280, endFreq: 120, duration: 0.16, gain: 0.06 },
      SNAP: { type: 'triangle', startFreq: 180, endFreq: 260, duration: 0.08, gain: 0.05 },
      CLICK: { type: 'sine', startFreq: 480, endFreq: 320, duration: 0.06, gain: 0.04 }
    })
  });

  /**
   * SoundService: Synthesizes subtle tactile audio feedback using Web Audio API.
   * Lazily initializes AudioContext on user interaction to comply with browser autoplay policies.
   */
  class SoundService {
    constructor() {
      this.audioCtx = null;
      this.enabled = true;
    }

    _getAudioContext() {
      if (!this.enabled) return null;
      try {
        if (!this.audioCtx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        return this.audioCtx;
      } catch (err) {
        return null;
      }
    }

    play(soundType) {
      if (!this.enabled) return;
      const ctx = this._getAudioContext();
      if (!ctx) return;

      const spec = CONFIG.AUDIO[soundType];
      if (!spec) return;

      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        osc.type = spec.type;
        osc.frequency.setValueAtTime(spec.startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(spec.endFreq, now + spec.duration);

        gain.gain.setValueAtTime(spec.gain, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);

        osc.start(now);
        osc.stop(now + spec.duration);
      } catch (err) {
        // Silently swallow audio exceptions
      }
    }

    playSwipe() { this.play('SWIPE'); }
    playSnap() { this.play('SNAP'); }
    playClick() { this.play('CLICK'); }

    setEnabled(isEnabled) { this.enabled = Boolean(isEnabled); }
    isEnabled() { return this.enabled; }
  }

  /**
   * CertificateLightbox: Manages the preview modal dialog for certificates.
   * Single Source of Truth for certificate modal state and keyboard accessibility.
   */
  class CertificateLightbox {
    constructor(options = {}) {
      this.lightbox = document.getElementById('cert-lightbox');
      this.modalImg = document.getElementById('cert-modal-img');
      this.modalTitle = document.getElementById('cert-modal-title');
      this.modalSub = document.getElementById('cert-modal-sub');
      this.modalFullLink = document.getElementById('cert-modal-full-link');
      this.closeBtn = this.lightbox ? this.lightbox.querySelector('.cert-modal-close') : null;

      this.onOpen = typeof options.onOpen === 'function' ? options.onOpen : null;
      this.onClose = typeof options.onClose === 'function' ? options.onClose : null;

      this._handleBackdropClick = this._handleBackdropClick.bind(this);
      this._handleKeyDown = this._handleKeyDown.bind(this);

      this._initEvents();
    }

    _initEvents() {
      if (!this.lightbox) return;
      this.lightbox.addEventListener('click', this._handleBackdropClick);
      window.addEventListener('keydown', this._handleKeyDown);
    }

    _handleBackdropClick(e) {
      if (!this.lightbox) return;
      if (e.target === this.lightbox || (this.closeBtn && (e.target === this.closeBtn || this.closeBtn.contains(e.target)))) {
        e.preventDefault();
        this.close();
      }
    }

    _handleKeyDown(e) {
      if (e.key === 'Escape' && this.isOpen()) {
        e.preventDefault();
        this.close();
      }
    }

    open(cardElement) {
      if (!cardElement || !this.lightbox) return;

      const imgSrc = cardElement.getAttribute('data-cert-img') || '';
      const title = cardElement.getAttribute('data-cert-title') || 'Certificate';
      const date = cardElement.getAttribute('data-cert-date') || '';
      const issuer = cardElement.getAttribute('data-cert-issuer') || 'SoloLearn';

      if (this.modalImg) {
        this.modalImg.src = imgSrc;
        this.modalImg.alt = title;
      }
      if (this.modalTitle) this.modalTitle.textContent = title;
      if (this.modalSub) this.modalSub.textContent = date ? `${issuer} • ${date}` : issuer;
      if (this.modalFullLink) this.modalFullLink.href = imgSrc;

      this.lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';

      if (this.onOpen) this.onOpen(cardElement);
    }

    close() {
      if (!this.lightbox || !this.isOpen()) return;

      this.lightbox.classList.remove('active');
      document.body.style.overflow = '';

      if (this.onClose) this.onClose();
    }

    isOpen() {
      return Boolean(this.lightbox && this.lightbox.classList.contains('active'));
    }

    destroy() {
      if (!this.lightbox) return;
      this.lightbox.removeEventListener('click', this._handleBackdropClick);
      window.removeEventListener('keydown', this._handleKeyDown);
    }
  }

  /**
   * CertificateDeckCarousel: 3D Fanned-Deck Stack Engine with Gestures,
   * Physics, and Circular SVG Autoplay Integration.
   */
  class CertificateDeckCarousel {
    constructor() {
      this.deckEl = document.getElementById('certCardDeck');
      if (!this.deckEl) return;

      this.cardElements = Array.from(this.deckEl.querySelectorAll('.cert-card'));
      if (this.cardElements.length === 0) return;

      // Controls DOM
      this.prevBtn = document.getElementById('certPrevBtn');
      this.nextBtn = document.getElementById('certNextBtn');
      this.autoplayBtn = document.getElementById('certAutoplayBtn');
      this.playIcon = document.getElementById('certPlayIcon');
      this.pauseIcon = document.getElementById('certPauseIcon');
      this.progressRing = document.getElementById('certAutoplayProgressRing');
      this.paginationContainer = document.getElementById('certPaginationDots');
      this.currentCounterEl = document.getElementById('certCurrentCounter');
      this.totalCounterEl = document.getElementById('certTotalCounter');
      this.swipeLeftBadge = document.getElementById('certSwipeLeftBadge');
      this.swipeRightBadge = document.getElementById('certSwipeRightBadge');

      // Services
      this.sound = new SoundService();
      this.lightbox = new CertificateLightbox({
        onOpen: () => this.pauseAutoplay(),
        onClose: () => this.restartAutoplay()
      });

      // Internal State
      this.state = {
        currentIndex: 0,
        total: this.cardElements.length,
        isPressed: false,
        isDragging: false,
        justDragged: false,
        isAnimating: false,
        autoplay: true,
        autoplayStartTime: 0,
        autoplayRafId: null,
        loop: true,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        startTime: 0,
        dragDeltaX: 0,
        dragDeltaY: 0,
        pointerId: null,
        hasPointerCapture: false
      };

      // Respect user motion preference (prefers-reduced-motion)
      const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      if (motionQuery && motionQuery.matches) {
        this.state.autoplay = false;
      }

      // Bound Event Handlers
      this._onPointerDown = this._onPointerDown.bind(this);
      this._onPointerMove = this._onPointerMove.bind(this);
      this._onPointerUp = this._onPointerUp.bind(this);
      this._onPointerCancel = this._onPointerCancel.bind(this);
      this._onDeckClick = this._onDeckClick.bind(this);
      this._onKeyDown = this._onKeyDown.bind(this);
      this._onResize = this._onResize.bind(this);
      this._onVisibilityChange = this._onVisibilityChange.bind(this);
      this._tickAutoplay = this._tickAutoplay.bind(this);

      this.init();
    }

    /**
     * Initializes DOM structures, accessibility attributes, and listeners
     */
    init() {
      this._setupAccessibility();
      this._initPaginationDots();
      this.updateStackLayout(false);
      this._bindEvents();
      this.restartAutoplay();
    }

    _setupAccessibility() {
      const carouselRegion = this.deckEl.closest('.cert-carousel-stage');
      if (carouselRegion) {
        carouselRegion.setAttribute('role', 'region');
        carouselRegion.setAttribute('aria-roledescription', 'carousel');
        carouselRegion.setAttribute('aria-label', 'Certificates Carousel');
      }

      this.cardElements.forEach((card, index) => {
        card.setAttribute('role', 'group');
        card.setAttribute('aria-roledescription', 'slide');
        const title = card.getAttribute('data-cert-title') || `Certificate ${index + 1}`;
        card.setAttribute('aria-label', `${title} (${index + 1} of ${this.state.total})`);
      });
    }

    _initPaginationDots() {
      if (!this.paginationContainer) return;
      this.paginationContainer.innerHTML = '';

      this.cardElements.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Go to certificate ${idx + 1}`);
        dot.className = `cert-pagination-bullet${idx === this.state.currentIndex ? ' active' : ''}`;
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.state.isAnimating || idx === this.state.currentIndex) return;
          this.goToSlide(idx);
        });
        this.paginationContainer.appendChild(dot);
      });
    }

    _updatePaginationUI() {
      if (this.currentCounterEl) this.currentCounterEl.textContent = String(this.state.currentIndex + 1);
      if (this.totalCounterEl) this.totalCounterEl.textContent = String(this.state.total);

      if (this.paginationContainer) {
        const dots = this.paginationContainer.querySelectorAll('.cert-pagination-bullet');
        dots.forEach((dot, idx) => {
          const isActive = idx === this.state.currentIndex;
          dot.classList.toggle('active', isActive);
          if (isActive) {
            dot.setAttribute('aria-current', 'true');
          } else {
            dot.removeAttribute('aria-current');
          }
        });
      }
    }

    /**
     * Calculates authentic 3D fanned-deck resting transform
     */
    getStackTransform(distance) {
      if (distance === 0) {
        return {
          x: 0,
          y: 0,
          z: 0,
          scale: 1,
          rotate: 0,
          opacity: 1,
          pointerEvents: 'auto',
          filter: 'brightness(1)'
        };
      }

      if (distance > 4) {
        return {
          x: 0,
          y: 18,
          z: -160,
          scale: 0.94,
          rotate: 0,
          opacity: 0,
          pointerEvents: 'none',
          filter: 'brightness(0.7)'
        };
      }

      const rot = CONFIG.FAN_ANGLES[distance] || 0;
      const x = CONFIG.FAN_X_OFFSETS[distance] || 0;
      const y = CONFIG.FAN_Y_OFFSETS[distance] || 0;
      const z = -distance * 35;
      const scale = Math.max(0.95, 1 - distance * 0.012);
      const opacity = Math.max(0.85, 1 - distance * 0.05);
      const brightness = Math.max(0.82, 1 - distance * 0.04);

      return {
        x,
        y,
        z,
        scale,
        rotate: rot,
        opacity,
        pointerEvents: 'none',
        filter: `brightness(${brightness})`
      };
    }

    /**
     * Updates visual transform, opacity, and z-index for all cards
     */
    updateStackLayout(animate = true) {
      this.cardElements.forEach((el, cardIdx) => {
        let distance;
        if (this.state.loop) {
          distance = (cardIdx - this.state.currentIndex + this.state.total) % this.state.total;
        } else {
          distance = cardIdx - this.state.currentIndex;
        }

        if (distance < 0) {
          el.classList.toggle('card-spring-transition', animate);
          el.style.transform = 'translate3d(-140%, 20px, 0px) rotate(-24deg) scale(0.95)';
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          el.style.zIndex = '1';
          return;
        }

        const target = this.getStackTransform(distance);
        el.classList.toggle('card-spring-transition', animate);
        el.style.transform = `translate3d(${target.x}px, ${target.y}px, ${target.z}px) rotate(${target.rotate}deg) scale(${target.scale})`;
        el.style.opacity = String(target.opacity);
        el.style.filter = target.filter;
        el.style.pointerEvents = target.pointerEvents;
        el.style.zIndex = String(this.state.total - distance);
      });

      this._updatePaginationUI();
    }

    getActiveCard() {
      return this.cardElements[this.state.currentIndex] || null;
    }

    // --- Gesture & Drag Mechanics ---
    _onPointerDown(e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (this.state.isAnimating) return;

      this.state.isPressed = true;
      this.state.isDragging = false;
      this.state.justDragged = false;
      this.state.hasPointerCapture = false;
      this.state.pointerId = e.pointerId;
      this.state.startX = e.clientX;
      this.state.startY = e.clientY;
      this.state.currentX = e.clientX;
      this.state.currentY = e.clientY;
      this.state.startTime = performance.now();
      this.state.dragDeltaX = 0;
      this.state.dragDeltaY = 0;
    }

    _onPointerMove(e) {
      if (!this.state.isPressed) return;

      const dx = e.clientX - this.state.startX;
      const dy = e.clientY - this.state.startY;
      const displacement = Math.hypot(dx, dy);

      // Deferred Pointer Capture: Only engage drag once movement threshold is exceeded
      if (!this.state.isDragging) {
        if (displacement > CONFIG.MIN_DRAG_DISPLACEMENT_PX) {
          if (this.state.isAnimating) return;
          this.state.isDragging = true;
          this.state.justDragged = true;
          this.pauseAutoplay();

          try {
            this.deckEl.setPointerCapture(this.state.pointerId);
            this.state.hasPointerCapture = true;
          } catch (err) {}

          this.deckEl.classList.add('is-dragging');

          const activeCard = this.getActiveCard();
          if (activeCard) {
            activeCard.classList.remove('card-spring-transition', 'card-exit-transition');
          }
          const nextCard = this.cardElements[(this.state.currentIndex + 1) % this.state.total];
          if (nextCard) nextCard.classList.remove('card-spring-transition', 'card-exit-transition');
          const secondCard = this.cardElements[(this.state.currentIndex + 2) % this.state.total];
          if (secondCard) secondCard.classList.remove('card-spring-transition', 'card-exit-transition');
        } else {
          return; // Still a tap/click
        }
      }

      this._handleDragMove(e.clientX, e.clientY);
    }

    _handleDragMove(clientX, clientY) {
      this.state.currentX = clientX;
      this.state.currentY = clientY;
      this.state.dragDeltaX = clientX - this.state.startX;
      this.state.dragDeltaY = clientY - this.state.startY;

      const dx = this.state.dragDeltaX;
      const dy = this.state.dragDeltaY;

      const rotation = Math.max(
        Math.min(dx * CONFIG.ROTATION_FACTOR, CONFIG.MAX_ROTATION_DEG),
        -CONFIG.MAX_ROTATION_DEG
      );

      const activeCard = this.getActiveCard();
      if (activeCard) {
        activeCard.style.transform = `translate3d(${dx}px, ${dy * CONFIG.VERTICAL_DRAG_DAMPING}px, 0px) rotate(${rotation}deg) scale(1.02)`;
      }

      // Dynamic Un-fanning of cards behind as top card is pulled away
      const progress = Math.min(Math.abs(dx) / 180, 1);

      const card1 = this.cardElements[(this.state.currentIndex + 1) % this.state.total];
      if (card1) {
        const base1 = this.getStackTransform(1);
        const next1 = this.getStackTransform(0);
        const curRot1 = base1.rotate + (next1.rotate - base1.rotate) * progress;
        const curX1 = base1.x + (next1.x - base1.x) * progress;
        const curY1 = base1.y + (next1.y - base1.y) * progress;
        const curZ1 = base1.z + (next1.z - base1.z) * progress;
        const curScale1 = base1.scale + (next1.scale - base1.scale) * progress;
        card1.style.transform = `translate3d(${curX1}px, ${curY1}px, ${curZ1}px) rotate(${curRot1}deg) scale(${curScale1})`;
      }

      const card2 = this.cardElements[(this.state.currentIndex + 2) % this.state.total];
      if (card2) {
        const base2 = this.getStackTransform(2);
        const next2 = this.getStackTransform(1);
        const curRot2 = base2.rotate + (next2.rotate - base2.rotate) * progress;
        const curX2 = base2.x + (next2.x - base2.x) * progress;
        const curY2 = base2.y + (next2.y - base2.y) * progress;
        const curZ2 = base2.z + (next2.z - base2.z) * progress;
        const curScale2 = base2.scale + (next2.scale - base2.scale) * progress;
        card2.style.transform = `translate3d(${curX2}px, ${curY2}px, ${curZ2}px) rotate(${curRot2}deg) scale(${curScale2})`;
      }

      // Direction Badge Feedback
      if (this.swipeRightBadge && this.swipeLeftBadge) {
        if (dx > 40) {
          this.swipeRightBadge.style.opacity = String(Math.min((dx - 40) / 70, 1));
          this.swipeRightBadge.style.transform = `translateY(-50%) translateX(${Math.min(dx * 0.12, 14)}px)`;
          this.swipeLeftBadge.style.opacity = '0';
        } else if (dx < -40) {
          this.swipeLeftBadge.style.opacity = String(Math.min((Math.abs(dx) - 40) / 70, 1));
          this.swipeLeftBadge.style.transform = `translateY(-50%) translateX(${-Math.min(Math.abs(dx) * 0.12, 14)}px)`;
          this.swipeRightBadge.style.opacity = '0';
        } else {
          this.swipeLeftBadge.style.opacity = '0';
          this.swipeRightBadge.style.opacity = '0';
        }
      }
    }

    _onPointerUp() {
      if (!this.state.isPressed) return;
      this.state.isPressed = false;

      if (this.state.hasPointerCapture) {
        try {
          this.deckEl.releasePointerCapture(this.state.pointerId);
        } catch (err) {}
        this.state.hasPointerCapture = false;
      }

      if (this.state.isDragging) {
        this.state.isDragging = false;
        this._handleDragEnd();
      } else {
        this.state.isDragging = false;
        this.state.justDragged = false;
      }
    }

    _onPointerCancel() {
      this.state.isPressed = false;
      if (this.state.hasPointerCapture) {
        try {
          this.deckEl.releasePointerCapture(this.state.pointerId);
        } catch (err) {}
        this.state.hasPointerCapture = false;
      }
      if (this.state.isDragging) {
        this.state.isDragging = false;
        this._handleDragEnd();
      }
    }

    _handleDragEnd() {
      this.deckEl.classList.remove('is-dragging');

      if (this.swipeLeftBadge) this.swipeLeftBadge.style.opacity = '0';
      if (this.swipeRightBadge) this.swipeRightBadge.style.opacity = '0';

      const dx = this.state.dragDeltaX;
      const dt = Math.max(performance.now() - this.state.startTime, 1);
      const velocity = dx / dt;

      const isSwipeRight = dx > CONFIG.SWIPE_THRESHOLD_PX || (dx > 30 && velocity > CONFIG.SWIPE_VELOCITY_THRESHOLD);
      const isSwipeLeft = dx < -CONFIG.SWIPE_THRESHOLD_PX || (dx < -30 && velocity < -CONFIG.SWIPE_VELOCITY_THRESHOLD);

      if (isSwipeRight) {
        this.dismissCard('right');
      } else if (isSwipeLeft) {
        this.dismissCard('left');
      } else {
        this.sound.playSnap();
        const activeCard = this.getActiveCard();
        if (activeCard) activeCard.classList.add('card-spring-transition');
        this.updateStackLayout(true);
        this.restartAutoplay();
      }

      // Suppress clicks resulting from drag release
      setTimeout(() => {
        this.state.justDragged = false;
      }, CONFIG.SYNTHETIC_CLICK_SUPPRESS_MS);
    }

    _onDeckClick(e) {
      if (this.state.justDragged || this.state.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        this.state.justDragged = false;
        return false;
      }

      const activeCard = this.getActiveCard();
      if (!activeCard) return;

      const clickedCard = e.target.closest('.cert-card');
      const isViewBtn = e.target.closest('.cert-view-btn') || e.target.closest('.cert-overlay');

      if (clickedCard === activeCard || isViewBtn) {
        e.preventDefault();
        this.lightbox.open(activeCard);
      }
    }

    // --- Navigation & Dismissal ---
    dismissCard(direction = 'right') {
      if (this.state.isAnimating) return;
      this.state.isAnimating = true;

      const activeCard = this.getActiveCard();
      if (!activeCard) {
        this.state.isAnimating = false;
        return;
      }

      this.sound.playSwipe();

      activeCard.classList.remove('card-spring-transition');
      activeCard.classList.add('card-exit-transition');

      const exitX = direction === 'right' ? window.innerWidth * 0.85 : -window.innerWidth * 0.85;
      const exitRotate = direction === 'right' ? 32 : -32;

      activeCard.style.transform = `translate3d(${exitX}px, 30px, 0px) rotate(${exitRotate}deg) scale(0.95)`;
      activeCard.style.opacity = '0';
      activeCard.style.pointerEvents = 'none';

      this.cardElements.forEach((el, cardIdx) => {
        if (cardIdx === this.state.currentIndex) return;
        el.classList.add('card-spring-transition');
      });

      setTimeout(() => {
        let nextIndex = this.state.currentIndex + 1;
        if (nextIndex >= this.state.total) {
          nextIndex = this.state.loop ? 0 : this.state.total - 1;
        }

        this.state.currentIndex = nextIndex;
        this.updateStackLayout(true);

        this.state.isAnimating = false;
        this.restartAutoplay();
      }, CONFIG.ANIMATION_RESET_DELAY_MS);
    }

    goToPrev() {
      if (this.state.isAnimating) return;

      let prevIndex = this.state.currentIndex - 1;
      if (prevIndex < 0) {
        if (!this.state.loop) return;
        prevIndex = this.state.total - 1;
      }

      this.state.isAnimating = true;
      this.sound.playClick();

      const prevCard = this.cardElements[prevIndex];
      prevCard.classList.remove('card-spring-transition', 'card-exit-transition');
      prevCard.style.transform = 'translate3d(-125%, 0px, 0px) rotate(-28deg) scale(0.95)';
      prevCard.style.opacity = '0';
      prevCard.style.zIndex = String(this.state.total + 2);

      void prevCard.offsetWidth; // Force reflow

      this.state.currentIndex = prevIndex;
      prevCard.classList.add('card-spring-transition');
      this.updateStackLayout(true);

      setTimeout(() => {
        this.state.isAnimating = false;
        this.restartAutoplay();
      }, CONFIG.PREV_ANIMATION_DELAY_MS);
    }

    goToSlide(targetIndex) {
      if (this.state.isAnimating || targetIndex === this.state.currentIndex) return;
      if (targetIndex < 0 || targetIndex >= this.state.total) return;

      this.state.currentIndex = targetIndex;
      this.sound.playClick();
      this.updateStackLayout(true);
      this.restartAutoplay();
    }

    // --- Autoplay Engine ---
    _tickAutoplay() {
      if (!this.state.autoplay || this.state.isPressed || this.state.isDragging || this.state.isAnimating) return;
      if (this.lightbox.isOpen()) {
        this.state.autoplayRafId = requestAnimationFrame(this._tickAutoplay);
        return;
      }

      const elapsed = performance.now() - this.state.autoplayStartTime;
      const progress = Math.min(elapsed / CONFIG.AUTOPLAY_INTERVAL_MS, 1);

      if (this.progressRing) {
        const offset = CONFIG.PROGRESS_CIRCUMFERENCE - (progress * CONFIG.PROGRESS_CIRCUMFERENCE);
        this.progressRing.style.strokeDashoffset = String(offset);
      }

      if (progress >= 1) {
        this.dismissCard('right');
      } else {
        this.state.autoplayRafId = requestAnimationFrame(this._tickAutoplay);
      }
    }

    pauseAutoplay() {
      if (this.state.autoplayRafId) {
        cancelAnimationFrame(this.state.autoplayRafId);
        this.state.autoplayRafId = null;
      }
    }

    restartAutoplay() {
      this.pauseAutoplay();
      if (this.state.autoplay) {
        this.state.autoplayStartTime = performance.now();
        this.state.autoplayRafId = requestAnimationFrame(this._tickAutoplay);
      } else if (this.progressRing) {
        this.progressRing.style.strokeDashoffset = String(CONFIG.PROGRESS_CIRCUMFERENCE);
      }
    }

    toggleAutoplay() {
      this.state.autoplay = !this.state.autoplay;
      this.sound.playClick();

      if (this.playIcon) this.playIcon.classList.toggle('hidden', this.state.autoplay);
      if (this.pauseIcon) this.pauseIcon.classList.toggle('hidden', !this.state.autoplay);

      if (this.state.autoplay) {
        this.restartAutoplay();
      } else {
        this.pauseAutoplay();
        if (this.progressRing) {
          this.progressRing.style.strokeDashoffset = String(CONFIG.PROGRESS_CIRCUMFERENCE);
        }
      }
    }

    // --- Events & Lifecycle ---
    _bindEvents() {
      // Pointer Gestures
      this.deckEl.addEventListener('pointerdown', this._onPointerDown);
      this.deckEl.addEventListener('pointermove', this._onPointerMove);
      this.deckEl.addEventListener('pointerup', this._onPointerUp);
      this.deckEl.addEventListener('pointercancel', this._onPointerCancel);
      this.deckEl.addEventListener('click', this._onDeckClick);

      // Hover-based autoplay pausing
      this.deckEl.addEventListener('mouseenter', () => {
        if (this.state.autoplay && !this.state.isDragging) this.pauseAutoplay();
      });
      this.deckEl.addEventListener('mouseleave', () => {
        if (this.state.autoplay && !this.state.isDragging) this.restartAutoplay();
      });

      // Controls
      if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.goToPrev());
      if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.dismissCard('right'));
      if (this.autoplayBtn) this.autoplayBtn.addEventListener('click', () => this.toggleAutoplay());

      // Global listeners
      window.addEventListener('keydown', this._onKeyDown);
      window.addEventListener('resize', this._onResize);
      document.addEventListener('visibilitychange', this._onVisibilityChange);
    }

    _onKeyDown(e) {
      if (this.lightbox.isOpen()) return;

      const certSec = document.getElementById('certificates');
      if (!certSec) return;
      const rect = certSec.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (!inView) return;

      const tag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.dismissCard('right');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.goToPrev();
      } else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        this.toggleAutoplay();
      }
    }

    _onResize() {
      this.updateStackLayout(false);
    }

    _onVisibilityChange() {
      if (document.hidden) {
        this.pauseAutoplay();
      } else if (this.state.autoplay) {
        this.restartAutoplay();
      }
    }

    destroy() {
      this.pauseAutoplay();
      this.lightbox.destroy();

      this.deckEl.removeEventListener('pointerdown', this._onPointerDown);
      this.deckEl.removeEventListener('pointermove', this._onPointerMove);
      this.deckEl.removeEventListener('pointerup', this._onPointerUp);
      this.deckEl.removeEventListener('pointercancel', this._onPointerCancel);
      this.deckEl.removeEventListener('click', this._onDeckClick);

      window.removeEventListener('keydown', this._onKeyDown);
      window.removeEventListener('resize', this._onResize);
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
    }
  }

  // Auto-instantiate on DOMContentLoaded
  let instance = null;
  function bootstrap() {
    if (!instance && document.getElementById('certCardDeck')) {
      instance = new CertificateDeckCarousel();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  return {
    getInstance: () => instance,
    SoundService,
    CertificateLightbox,
    CertificateDeckCarousel
  };
});
