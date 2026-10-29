/**
 * Certificates Card Swipe Carousel (Skiper UI Fanned Deck Engine)
 * Pure vanilla JavaScript with 3D bottom-pivot fan physics, touch/pointer swipe gestures,
 * autoplay with animated SVG circular progress ring, and responsive pagination controls.
 * Full integration with Certificate Lightbox Preview Modal.
 */
(function () {
  'use strict';

  var state = {
    currentIndex: 0,
    total: 0,
    isPressed: false,
    isDragging: false,
    justDragged: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    dragDeltaX: 0,
    dragDeltaY: 0,
    dragDistance: 0,
    pointerId: null,
    hasPointerCapture: false,
    isAnimating: false,
    autoplay: true,
    autoplayIntervalMs: 4500,
    autoplayStartTime: 0,
    autoplayRafId: null,
    loop: true,
    swipeThresholdPx: 80,
    soundEnabled: true
  };

  var deckEl = null;
  var cardElements = [];
  var prevBtn = null;
  var nextBtn = null;
  var autoplayBtn = null;
  var playIcon = null;
  var pauseIcon = null;
  var progressRing = null;
  var paginationContainer = null;
  var currentCounterEl = null;
  var totalCounterEl = null;
  var swipeLeftBadge = null;
  var swipeRightBadge = null;

  var CIRCUMFERENCE = 2 * Math.PI * 14; // r=14 => ~87.9646

  // Web Audio Synthesizer for tactile feedback
  var audioCtx = null;
  function playTactileSound(type) {
    if (!state.soundEnabled) return;
    try {
      if (!audioCtx) {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      if (!audioCtx) return;

      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      var now = audioCtx.currentTime;

      if (type === 'swipe') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.16);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'snap') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch (e) {}
  }

  /**
   * Opens the certificate lightbox modal with the card's data
   */
  function openCertLightbox(card) {
    if (!card) return;
    var imgSrc = card.getAttribute('data-cert-img');
    var title = card.getAttribute('data-cert-title');
    var date = card.getAttribute('data-cert-date');
    var issuer = card.getAttribute('data-cert-issuer') || 'SoloLearn';

    var modalImg = document.getElementById('cert-modal-img');
    var modalTitle = document.getElementById('cert-modal-title');
    var modalSub = document.getElementById('cert-modal-sub');
    var modalFullLink = document.getElementById('cert-modal-full-link');
    var lightbox = document.getElementById('cert-lightbox');

    if (modalImg) modalImg.src = imgSrc;
    if (modalTitle) modalTitle.textContent = title;
    if (modalSub) modalSub.textContent = issuer + ' • ' + date;
    if (modalFullLink) modalFullLink.href = imgSrc;

    if (lightbox) {
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    pauseAutoplayTimer();
  }

  /**
   * Closes the certificate lightbox modal
   */
  function closeCertLightbox() {
    var lightbox = document.getElementById('cert-lightbox');
    if (lightbox) {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
    restartAutoplayTimer();
  }

  /**
   * Calculates resting 3D transform for a card in the fanned deck stack
   */
  function getStackTransform(distance) {
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

    // Authentic bottom-pivot fanned deck angles and offsets matching Skiper UI
    var fanAngles = [0, 4.8, -5.2, 9.2, -9.8, 13.5, -14.0, 17.5];
    var fanXOffsets = [0, 11, -11, 18, -18, 24, -24, 30];
    var fanYOffsets = [0, 2, 5, 8, 11, 14, 17, 21];

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

    var rot = fanAngles[distance] || 0;
    var x = fanXOffsets[distance] || 0;
    var y = fanYOffsets[distance] || 0;
    var z = -distance * 35;
    var scale = Math.max(0.95, 1 - distance * 0.012);
    var opacity = Math.max(0.85, 1 - distance * 0.05);
    var brightness = Math.max(0.82, 1 - distance * 0.04);

    return {
      x: x,
      y: y,
      z: z,
      scale: scale,
      rotate: rot,
      opacity: opacity,
      pointerEvents: 'none',
      filter: 'brightness(' + brightness + ')'
    };
  }

  /**
   * Updates visual layout of all cards in the stack
   */
  function updateStackLayout(animate) {
    if (animate === undefined) animate = true;

    cardElements.forEach(function (el, cardIdx) {
      var distance;
      if (state.loop) {
        distance = (cardIdx - state.currentIndex + state.total) % state.total;
      } else {
        distance = cardIdx - state.currentIndex;
      }

      if (distance < 0) {
        if (animate) {
          el.classList.add('card-spring-transition');
        } else {
          el.classList.remove('card-spring-transition');
        }
        el.style.transform = 'translate3d(-140%, 20px, 0px) rotate(-24deg) scale(0.95)';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '1';
        return;
      }

      var target = getStackTransform(distance);

      if (animate) {
        el.classList.add('card-spring-transition');
      } else {
        el.classList.remove('card-spring-transition');
      }

      el.style.transform = 'translate3d(' + target.x + 'px, ' + target.y + 'px, ' + target.z + 'px) rotate(' + target.rotate + 'deg) scale(' + target.scale + ')';
      el.style.opacity = target.opacity.toString();
      el.style.filter = target.filter;
      el.style.pointerEvents = target.pointerEvents;
      el.style.zIndex = String(state.total - distance);
    });

    updatePaginationUI();
  }

  function getActiveCard() {
    return cardElements[state.currentIndex];
  }

  function handleDragMove(clientX, clientY) {
    state.currentX = clientX;
    state.currentY = clientY;
    state.dragDeltaX = clientX - state.startX;
    state.dragDeltaY = clientY - state.startY;

    var dx = state.dragDeltaX;
    var dy = state.dragDeltaY;

    // Top card rotation anchored from bottom pivot
    var maxRotation = 26;
    var rotation = Math.max(Math.min(dx * 0.08, maxRotation), -maxRotation);

    var activeCard = getActiveCard();
    if (activeCard) {
      activeCard.style.transform = 'translate3d(' + dx + 'px, ' + (dy * 0.28) + 'px, 0px) rotate(' + rotation + 'deg) scale(1.02)';
    }

    // Dynamic un-fanning of cards behind as top card is pulled away
    var progress = Math.min(Math.abs(dx) / 180, 1);

    var card1 = cardElements[(state.currentIndex + 1) % state.total];
    if (card1) {
      var base1 = getStackTransform(1);
      var next1 = getStackTransform(0);
      var curRot1 = base1.rotate + (next1.rotate - base1.rotate) * progress;
      var curX1 = base1.x + (next1.x - base1.x) * progress;
      var curY1 = base1.y + (next1.y - base1.y) * progress;
      var curZ1 = base1.z + (next1.z - base1.z) * progress;
      var curScale1 = base1.scale + (next1.scale - base1.scale) * progress;
      card1.style.transform = 'translate3d(' + curX1 + 'px, ' + curY1 + 'px, ' + curZ1 + 'px) rotate(' + curRot1 + 'deg) scale(' + curScale1 + ')';
    }

    var card2 = cardElements[(state.currentIndex + 2) % state.total];
    if (card2) {
      var base2 = getStackTransform(2);
      var next2 = getStackTransform(1);
      var curRot2 = base2.rotate + (next2.rotate - base2.rotate) * progress;
      var curX2 = base2.x + (next2.x - base2.x) * progress;
      var curY2 = base2.y + (next2.y - base2.y) * progress;
      var curZ2 = base2.z + (next2.z - base2.z) * progress;
      var curScale2 = base2.scale + (next2.scale - base2.scale) * progress;
      card2.style.transform = 'translate3d(' + curX2 + 'px, ' + curY2 + 'px, ' + curZ2 + 'px) rotate(' + curRot2 + 'deg) scale(' + curScale2 + ')';
    }

    // Direction indicators
    if (swipeRightBadge && swipeLeftBadge) {
      if (dx > 40) {
        swipeRightBadge.style.opacity = Math.min((dx - 40) / 70, 1).toString();
        swipeRightBadge.style.transform = 'translateY(-50%) translateX(' + Math.min(dx * 0.12, 14) + 'px)';
        swipeLeftBadge.style.opacity = '0';
      } else if (dx < -40) {
        swipeLeftBadge.style.opacity = Math.min((Math.abs(dx) - 40) / 70, 1).toString();
        swipeLeftBadge.style.transform = 'translateY(-50%) translateX(' + (-Math.min(Math.abs(dx) * 0.12, 14)) + 'px)';
        swipeRightBadge.style.opacity = '0';
      } else {
        swipeLeftBadge.style.opacity = '0';
        swipeRightBadge.style.opacity = '0';
      }
    }
  }

  function handleDragEnd() {
    if (deckEl) deckEl.classList.remove('is-dragging');

    if (swipeLeftBadge) swipeLeftBadge.style.opacity = '0';
    if (swipeRightBadge) swipeRightBadge.style.opacity = '0';

    var dx = state.dragDeltaX;
    var dt = Math.max(performance.now() - state.startTime, 1);
    var velocity = dx / dt;

    var isSwipeRight = dx > state.swipeThresholdPx || (dx > 30 && velocity > 0.42);
    var isSwipeLeft = dx < -state.swipeThresholdPx || (dx < -30 && velocity < -0.42);

    if (isSwipeRight) {
      dismissCard('right');
    } else if (isSwipeLeft) {
      dismissCard('left');
    } else {
      playTactileSound('snap');
      var activeCard = getActiveCard();
      if (activeCard) activeCard.classList.add('card-spring-transition');
      updateStackLayout(true);
      restartAutoplayTimer();
    }

    // Reset justDragged after short delay so synthetic clicks from this drag are suppressed
    setTimeout(function () {
      state.justDragged = false;
    }, 150);
  }

  function dismissCard(direction) {
    if (direction === undefined) direction = 'right';
    if (state.isAnimating) return;
    state.isAnimating = true;

    var activeCard = getActiveCard();
    if (!activeCard) {
      state.isAnimating = false;
      return;
    }

    playTactileSound('swipe');

    activeCard.classList.remove('card-spring-transition');
    activeCard.classList.add('card-exit-transition');

    var exitX = direction === 'right' ? window.innerWidth * 0.85 : -window.innerWidth * 0.85;
    var exitRotate = direction === 'right' ? 32 : -32;

    activeCard.style.transform = 'translate3d(' + exitX + 'px, 30px, 0px) rotate(' + exitRotate + 'deg) scale(0.95)';
    activeCard.style.opacity = '0';
    activeCard.style.pointerEvents = 'none';

    cardElements.forEach(function (el, cardIdx) {
      if (cardIdx === state.currentIndex) return;
      el.classList.add('card-spring-transition');
    });

    setTimeout(function () {
      var nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.total) {
        nextIndex = state.loop ? 0 : state.total - 1;
      }

      state.currentIndex = nextIndex;
      updateStackLayout(true);

      state.isAnimating = false;
      restartAutoplayTimer();
    }, 340);
  }

  function goToPrev() {
    if (state.isAnimating) return;

    var prevIndex = state.currentIndex - 1;
    if (prevIndex < 0) {
      if (!state.loop) return;
      prevIndex = state.total - 1;
    }

    state.isAnimating = true;
    playTactileSound('click');

    var prevCard = cardElements[prevIndex];
    prevCard.classList.remove('card-spring-transition', 'card-exit-transition');
    prevCard.style.transform = 'translate3d(-125%, 0px, 0px) rotate(-28deg) scale(0.95)';
    prevCard.style.opacity = '0';
    prevCard.style.zIndex = String(state.total + 2);

    void prevCard.offsetWidth; // Force reflow

    state.currentIndex = prevIndex;
    prevCard.classList.add('card-spring-transition');
    updateStackLayout(true);

    setTimeout(function () {
      state.isAnimating = false;
      restartAutoplayTimer();
    }, 450);
  }

  function goToSlide(targetIndex) {
    if (state.isAnimating || targetIndex === state.currentIndex) return;
    state.currentIndex = targetIndex;
    playTactileSound('click');
    updateStackLayout(true);
    restartAutoplayTimer();
  }

  // --- Autoplay Progress Engine ---
  function tickAutoplayProgress() {
    if (!state.autoplay || state.isPressed || state.isDragging || state.isAnimating) return;

    // Check if lightbox modal is open - pause if so
    var lightbox = document.getElementById('cert-lightbox');
    if (lightbox && lightbox.classList.contains('active')) {
      state.autoplayRafId = requestAnimationFrame(tickAutoplayProgress);
      return;
    }

    var elapsed = performance.now() - state.autoplayStartTime;
    var progress = Math.min(elapsed / state.autoplayIntervalMs, 1);

    if (progressRing) {
      var offset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
      progressRing.style.strokeDashoffset = offset;
    }

    if (progress >= 1) {
      dismissCard('right');
    } else {
      state.autoplayRafId = requestAnimationFrame(tickAutoplayProgress);
    }
  }

  function pauseAutoplayTimer() {
    if (state.autoplayRafId) {
      cancelAnimationFrame(state.autoplayRafId);
      state.autoplayRafId = null;
    }
  }

  function restartAutoplayTimer() {
    pauseAutoplayTimer();
    if (state.autoplay) {
      state.autoplayStartTime = performance.now();
      state.autoplayRafId = requestAnimationFrame(tickAutoplayProgress);
    } else if (progressRing) {
      progressRing.style.strokeDashoffset = CIRCUMFERENCE;
    }
  }

  function toggleAutoplay() {
    state.autoplay = !state.autoplay;
    playTactileSound('click');
    if (state.autoplay) {
      if (playIcon) playIcon.classList.add('hidden');
      if (pauseIcon) pauseIcon.classList.remove('hidden');
      restartAutoplayTimer();
    } else {
      if (playIcon) playIcon.classList.remove('hidden');
      if (pauseIcon) pauseIcon.classList.add('hidden');
      pauseAutoplayTimer();
      if (progressRing) progressRing.style.strokeDashoffset = CIRCUMFERENCE;
    }
  }

  function initPaginationDots() {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';
    for (var i = 0; i < state.total; i++) {
      (function (idx) {
        var dot = document.createElement('button');
        dot.setAttribute('aria-label', 'Go to certificate ' + (idx + 1));
        dot.className = 'cert-pagination-bullet' + (idx === state.currentIndex ? ' active' : '');
        dot.addEventListener('click', function (e) {
          e.stopPropagation();
          if (state.isAnimating || idx === state.currentIndex) return;
          goToSlide(idx);
        });
        paginationContainer.appendChild(dot);
      })(i);
    }
  }

  function updatePaginationUI() {
    if (currentCounterEl) currentCounterEl.textContent = state.currentIndex + 1;
    if (totalCounterEl) totalCounterEl.textContent = state.total;

    if (paginationContainer) {
      var dots = paginationContainer.querySelectorAll('.cert-pagination-bullet');
      dots.forEach(function (dot, idx) {
        if (idx === state.currentIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }
  }

  function setupGestures() {
    if (!deckEl) return;

    // Deferred pointer capture: ONLY capture if user moves > 6px (actual drag)
    deckEl.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (state.isAnimating) return;

      state.isPressed = true;
      state.isDragging = false;
      state.justDragged = false;
      state.hasPointerCapture = false;
      state.pointerId = e.pointerId;
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.currentX = e.clientX;
      state.currentY = e.clientY;
      state.startTime = performance.now();
      state.dragDeltaX = 0;
      state.dragDeltaY = 0;
      state.dragDistance = 0;
    });

    deckEl.addEventListener('pointermove', function (e) {
      if (!state.isPressed) return;

      var dx = e.clientX - state.startX;
      var dy = e.clientY - state.startY;
      var dist = Math.hypot(dx, dy);

      // Only transition to dragging once moved > 6px
      if (!state.isDragging) {
        if (dist > 6) {
          if (state.isAnimating) return;
          state.isDragging = true;
          state.justDragged = true;
          pauseAutoplayTimer();

          try {
            deckEl.setPointerCapture(state.pointerId);
            state.hasPointerCapture = true;
          } catch (err) {}

          if (deckEl) deckEl.classList.add('is-dragging');

          var activeCard = getActiveCard();
          if (activeCard) {
            activeCard.classList.remove('card-spring-transition', 'card-exit-transition');
          }
          var nextCard = cardElements[(state.currentIndex + 1) % state.total];
          if (nextCard) nextCard.classList.remove('card-spring-transition', 'card-exit-transition');
          var secondCard = cardElements[(state.currentIndex + 2) % state.total];
          if (secondCard) secondCard.classList.remove('card-spring-transition', 'card-exit-transition');
        } else {
          return; // Still just a click or tiny wiggle
        }
      }

      handleDragMove(e.clientX, e.clientY);
    });

    deckEl.addEventListener('pointerup', function (e) {
      if (!state.isPressed) return;
      state.isPressed = false;

      if (state.hasPointerCapture) {
        try {
          deckEl.releasePointerCapture(state.pointerId);
        } catch (err) {}
        state.hasPointerCapture = false;
      }

      if (state.isDragging) {
        state.isDragging = false;
        handleDragEnd();
      } else {
        // Plain tap/click without dragging: reset state
        state.isDragging = false;
        state.justDragged = false;
        state.startTime = 0;
      }
    });

    deckEl.addEventListener('pointercancel', function (e) {
      state.isPressed = false;
      if (state.hasPointerCapture) {
        try {
          deckEl.releasePointerCapture(state.pointerId);
        } catch (err) {}
        state.hasPointerCapture = false;
      }
      if (state.isDragging) {
        state.isDragging = false;
        handleDragEnd();
      }
      state.startTime = 0;
    });

    // Delegated click handler on the deck container
    deckEl.addEventListener('click', function (e) {
      if (state.justDragged) {
        e.preventDefault();
        e.stopPropagation();
        state.justDragged = false;
        return false;
      }

      var activeCard = getActiveCard();
      if (!activeCard) return;

      // If user clicked inside the active card or on view certificate button: open modal!
      var clickedCard = e.target.closest('.cert-card');
      if (clickedCard === activeCard || e.target.closest('.cert-view-btn') || e.target.closest('.cert-overlay')) {
        e.preventDefault();
        openCertLightbox(activeCard);
      }
    });

    // Also attach direct click handler to each card element
    cardElements.forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (state.justDragged || state.isDragging) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        var active = getActiveCard();
        if (card === active) {
          e.preventDefault();
          openCertLightbox(card);
        }
      });
    });

    // Lightbox modal close listeners
    var lightbox = document.getElementById('cert-lightbox');
    if (lightbox) {
      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox || e.target.closest('.cert-modal-close')) {
          closeCertLightbox();
        }
      });
    }

    // Pause autoplay on mouse enter, resume on mouse leave
    deckEl.addEventListener('mouseenter', function () {
      if (state.autoplay && !state.isDragging) pauseAutoplayTimer();
    });
    deckEl.addEventListener('mouseleave', function () {
      if (state.autoplay && !state.isDragging) restartAutoplayTimer();
    });

    if (prevBtn) prevBtn.addEventListener('click', goToPrev);
    if (nextBtn) nextBtn.addEventListener('click', function () { dismissCard('right'); });
    if (autoplayBtn) autoplayBtn.addEventListener('click', toggleAutoplay);

    // Keyboard navigation
    window.addEventListener('keydown', function (e) {
      var lightbox = document.getElementById('cert-lightbox');
      if (e.key === 'Escape') {
        if (lightbox && lightbox.classList.contains('active')) {
          closeCertLightbox();
          return;
        }
      }

      var certSec = document.getElementById('certificates');
      if (!certSec) return;
      var rect = certSec.getBoundingClientRect();
      var inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (!inView) return;

      if (lightbox && lightbox.classList.contains('active')) return;
      var tag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'ArrowRight') {
        dismissCard('right');
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        toggleAutoplay();
      }
    });

    window.addEventListener('resize', function () {
      updateStackLayout(false);
    });

    // Observe Lightbox Modal to pause autoplay when open, resume when closed
    if (lightbox && window.MutationObserver) {
      var observer = new MutationObserver(function () {
        if (lightbox.classList.contains('active')) {
          pauseAutoplayTimer();
        } else {
          restartAutoplayTimer();
        }
      });
      observer.observe(lightbox, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function init() {
    deckEl = document.getElementById('certCardDeck');
    if (!deckEl) return;

    cardElements = Array.from(deckEl.querySelectorAll('.cert-card'));
    state.total = cardElements.length;
    if (state.total === 0) return;

    prevBtn = document.getElementById('certPrevBtn');
    nextBtn = document.getElementById('certNextBtn');
    autoplayBtn = document.getElementById('certAutoplayBtn');
    playIcon = document.getElementById('certPlayIcon');
    pauseIcon = document.getElementById('certPauseIcon');
    progressRing = document.getElementById('certAutoplayProgressRing');
    paginationContainer = document.getElementById('certPaginationDots');
    currentCounterEl = document.getElementById('certCurrentCounter');
    totalCounterEl = document.getElementById('certTotalCounter');
    swipeLeftBadge = document.getElementById('certSwipeLeftBadge');
    swipeRightBadge = document.getElementById('certSwipeRightBadge');

    initPaginationDots();
    updateStackLayout(false);
    setupGestures();
    restartAutoplayTimer();

    window.certCarousel = {
      pauseAutoplay: pauseAutoplayTimer,
      resumeAutoplay: restartAutoplayTimer,
      openModal: openCertLightbox,
      closeModal: closeCertLightbox,
      isDragging: function () { return state.isDragging || state.justDragged; }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
