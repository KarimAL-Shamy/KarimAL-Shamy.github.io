$(function() {
  var isMobile;
  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  ) {
    isMobile = true;

    // Mobile height fix
    $('.height-fix').each(function() {
      var h = $(this).height();
      $(this).height(h);
    });
  }

  // NAV POSITION
  function getNavPos() {
    if (!$('nav').hasClass('fixed')) {
      return $('nav').position().top;
    }
    return $('#home').outerHeight() - $('nav').outerHeight();
  }

  var navPos = getNavPos();
  var lastPos = $(window).scrollTop();
  var scrollTicking = false;

  // RESIZE RESETS
  $(window).resize(function() {
    posFilterBar($('.filter').first());
    navPos = getNavPos();
  });

  // Sticky Nav on Mobile or on Initial Scrolled Load
  if (isMobile) {
    $('nav').addClass('fixed');
  } else {
    $('nav').addClass('desk');
    if ($(window).scrollTop() >= navPos + $('nav').height()) {
      $('nav').addClass('fixed');
    }
  }

  $(window).on('scroll', function() {
    if (!scrollTicking) {
      window.requestAnimationFrame(function() {
        onScrollHandler();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  });

  function onScrollHandler() {
    var pos = $(window).scrollTop();
    var pos2 = pos + 50;
    var scrollBottom = pos + $(window).height();

    if (!isMobile) {
      if (pos >= navPos + $('nav').height() && lastPos < pos) {
        $('nav').addClass('fixed');
      }
      if (pos < navPos && lastPos > pos) {
        $('nav').removeClass('fixed');
      }
      lastPos = pos;
    }

    // Link Highlighting
    if (pos2 > $('#home').offset().top) {
      highlightLink('home');
    }
    if (pos2 > $('#about').offset().top) {
      highlightLink('about');
    }
    if (pos2 > $('#portfolio').offset().top) {
      highlightLink('portfolio');
    }
    if ($('#experience').length && pos2 > $('#experience').offset().top) {
      highlightLink('experience');
    } else if ($('#blog').length && pos2 > $('#blog').offset().top) {
      highlightLink('blog');
    }
    if ($('#certificates').length && pos2 > $('#certificates').offset().top) {
      highlightLink('certificates');
    }
    if (
      $('#contact').length &&
      (pos2 > $('#contact').offset().top ||
        pos + $(window).height() * 0.45 > $('#contact').offset().top ||
        scrollBottom >= $(document).height() - 40)
    ) {
      highlightLink('contact');
    }
  }

  function highlightLink(anchor) {
    $('nav .active').removeClass('active');
    $('nav')
      .find('[dest="' + anchor + '"]')
      .addClass('active');
  }

  // EVENT HANDLERS
  $('.page-link').click(function() {
    var anchor = $(this).attr('dest');
    $('.link-wrap').removeClass('visible');

    highlightLink(anchor);

    $('html, body').animate(
      {
        scrollTop: $('#' + anchor).offset().top
      },
      400
    );
  });

  $('.mdi-menu').click(function() {
    $('.link-wrap').toggleClass('visible');
  });

  $('.blog-wrap').hover(
    function() {
      $('.blog-wrap')
        .not(this)
        .addClass('fade');
      $(this).addClass('hover');
    },
    function() {
      $(this).removeClass('hover');
      $('.blog-wrap').removeClass('fade');
    }
  );

  posFilterBar($('.filter').first());

  $('.filter').click(function() {
    posFilterBar(this);
  });

  function posFilterBar(elem) {
    var origin = $(elem)
      .parent()
      .offset().left;
    var pos = $(elem).offset().left;
    $('.float-bar').css({
      left: pos - origin,
      width: $(elem).innerWidth()
    });
    $('.float-bar .row').css('left', (pos - origin) * -1);
  }

  // GALLERY
  $('#gallery').mixItUp({});

  function mixClear() {
    setTimeout(function() {
      $('#gallery').removeClass('waypoint');
    }, 2000);
  }

  // SCROLL ANIMATIONS
  function onScrollInit(items, elemTrigger) {
    var offset = $(window).height() / 1.6;
    items.each(function() {
      var elem = $(this),
        animationClass = elem.attr('data-animation'),
        animationDelay = elem.attr('data-delay');

      elem.css({
        '-webkit-animation-delay': animationDelay,
        '-moz-animation-delay': animationDelay,
        'animation-delay': animationDelay
      });

      var trigger = elemTrigger ? trigger : elem;

      trigger.waypoint(
        function() {
          elem.addClass('animated').addClass(animationClass);
          if (elem.get(0).id === 'gallery') mixClear(); //OPTIONAL
        },
        {
          triggerOnce: true,
          offset: offset
        }
      );
    });
  }

  setTimeout(function() {
    onScrollInit($('.waypoint'));
  }, 10);

  // CONTACT FORM
  $('#contact-form').submit(function(e) {
    e.preventDefault();
    
    $.ajax({
      url: 'php/sendEmail.php',
      method: 'POST',
      data: { message: $('form').serialize() },
      dataType: 'json'
    }).done(function(response) {
      $('#success').addClass('expand');
      $('#contact-form')
        .find('input[type=text], input[type=email], textarea')
        .val('');
    });
  });

  $('#close').click(function() {
    $('#success').removeClass('expand');
  });

  // SKILLS INTERACTIVE FILTER
  $('.skill-filter-btn').on('click', function() {
    var filter = $(this).attr('data-filter');
    $('.skill-filter-btn').removeClass('active');
    $(this).addClass('active');

    if (filter === 'all') {
      $('.bars-wrap .bar, .tech-badge').removeClass('dimmed highlighted');
    } else {
      $('.bars-wrap .bar').each(function() {
        var cats = $(this).attr('data-category') || '';
        var catList = cats.split(/\s+/);
        if (catList.indexOf(filter) !== -1) {
          $(this).removeClass('dimmed').addClass('highlighted');
        } else {
          $(this).addClass('dimmed').removeClass('highlighted');
        }
      });

      $('.tech-badge').each(function() {
        var cats = $(this).attr('data-category') || '';
        var catList = cats.split(/\s+/);
        if (catList.indexOf(filter) !== -1) {
          $(this).removeClass('dimmed').addClass('highlighted');
        } else {
          $(this).addClass('dimmed').removeClass('highlighted');
        }
      });
    }
  });

  // AVATAR CLICK INTERACTION
  $('.skills-wrapper .me').on('click', function() {
    $(this).css('transform', 'scale(1.15) rotate(360deg)');
    var that = this;
    setTimeout(function() {
      $(that).css('transform', '');
    }, 600);
  });

  // TOP BUTTON SCROLL
  $('#topButton').on('click', function(e) {
    e.preventDefault();
    $('html, body').animate({ scrollTop: $('#home').offset().top }, 400);
  });

  // WAVING HAND CLICK
  $('.waving-hand').on('click', function() {
    $(this).css('animation', 'wave-animation 0.5s 3 ease-in-out');
    var self = this;
    setTimeout(function() {
      $(self).css('animation', '');
    }, 1600);
  });

  // THEME TOGGLE (Default to visitor's system setting)
  (function initTheme() {
    var $btn = $('#theme-toggle');
    var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme(theme, isManual) {
      if (theme === 'dark') {
        $('html').addClass('dark-theme');
        $btn.attr('title', 'Switch to light theme');
        $btn.attr('aria-checked', 'true');
      } else {
        $('html').removeClass('dark-theme');
        $btn.attr('title', 'Switch to dark theme');
        $btn.attr('aria-checked', 'false');
      }
      if (isManual) {
        try {
          localStorage.setItem('theme', theme);
        } catch (e) {}
      }
    }

    // Determine initial theme
    var saved = null;
    try {
      saved = localStorage.getItem('theme');
    } catch (e) {}

    if (saved) {
      applyTheme(saved, false);
    } else {
      applyTheme(mediaQuery.matches ? 'dark' : 'light', false);
    }

    // Toggle button click
    $btn.on('click', function(e) {
      e.preventDefault();
      var isDark = $('html').hasClass('dark-theme');
      applyTheme(isDark ? 'light' : 'dark', true);
    });

    // Listen for system appearance changes if user hasn't manually set a theme
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', function(e) {
        try {
          if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light', false);
          }
        } catch (err) {}
      });
    }
  })();

  // CERTIFICATES LIGHTBOX MODAL
  $('.cert-card').on('click', function() {
    var imgSrc = $(this).attr('data-cert-img');
    var title = $(this).attr('data-cert-title');
    var date = $(this).attr('data-cert-date');
    var issuer = $(this).attr('data-cert-issuer') || 'SoloLearn';

    $('#cert-modal-img').attr('src', imgSrc);
    $('#cert-modal-title').text(title);
    $('#cert-modal-sub').text(issuer + ' • ' + date);
    $('#cert-modal-full-link').attr('href', imgSrc);

    $('#cert-lightbox').addClass('active');
    $('body').css('overflow', 'hidden');
  });

  $('.cert-modal-close, #cert-lightbox').on('click', function(e) {
    if (e.target === this || $(this).hasClass('cert-modal-close') || $(this).parents('.cert-modal-close').length) {
      $('#cert-lightbox').removeClass('active');
      $('body').css('overflow', '');
    }
  });

  $(document).on('keydown', function(e) {
    if (e.key === 'Escape' && $('#cert-lightbox').hasClass('active')) {
      $('#cert-lightbox').removeClass('active');
      $('body').css('overflow', '');
    }
  });

  // CONTACT QUICK-COPY INTERACTION
  $('.contact-copy-btn').on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var textToCopy = $(this).attr('data-copy');
    var $btn = $(this);
    var $tooltip = $btn.find('.copy-tooltip');
    var $icon = $btn.find('i');

    function showCopied() {
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
      navigator.clipboard.writeText(textToCopy).then(showCopied).catch(function() {
        fallbackCopy(textToCopy);
      });
    } else {
      fallbackCopy(textToCopy);
    }

    function fallbackCopy(text) {
      var $temp = $('<input>');
      $('body').append($temp);
      $temp.val(text).select();
      document.execCommand('copy');
      $temp.remove();
      showCopied();
    }
  });
});
