$(document).ready(function() {
  // MODAL
  var modalText = {
    sorting: {
      title: 'Sorting Visualizer',
      tag: 'WEB-BASED ALGORITHM ANIMATION TOOL.',
      bullets: [
        'Interactive web visualization tool for sorting algorithms (Bubble Sort, Selection Sort, Insertion Sort, Merge Sort, and Quick Sort).',
        'Demonstrates real-time algorithmic execution, comparisons, array element swaps, and computational time complexity.',
        'Features responsive controls to adjust array sizes, animation speeds, and randomize datasets built with React and JavaScript.'
      ],
      link: 'projects/sorting/index.html'
    },
    clock: {
      title: 'Dynamic Mathematical Clock',
      tag: 'CREATIVE COMPUTING & MATHEMATICS.',
      bullets: [
        'Interactive canvas clock developed with JavaScript and the p5.js creative computing library.',
        'Utilizes trigonometric polar-coordinate algorithms to animate continuous smooth radial arcs for hours, minutes, seconds, and milliseconds.',
        'Combines dynamic polar-aligned numerals and responsive canvas scaling for seamless desktop and mobile rendering.'
      ],
      link: 'projects/clock/index.html'
    },
    tictactoe: {
      title: 'Tic Tac Toe GUI Game',
      tag: 'DESKTOP APPLICATION & OOP LOGIC.',
      bullets: [
        'Interactive desktop game developed in Java with a custom Swing graphical user interface.',
        'Features robust turn-based game logic, win/draw state evaluation, and real-time score tracking.',
        'Structured with clean object-oriented architecture and modular event-driven design.'
      ],
      link: 'projects/tictactoe/index.html'
    },
    easternedge: {
      title: 'Eastern Edge Robotics ROV',
      tag: 'SUB-MARINE ROBOT & EMBEDDED CONTROL.',
      bullets: [
        'Developed embedded system communication protocols on Arduino microcontrollers using Python and C++.',
        'Implemented the mission-critical control GUI for the Remotely Operated Vehicle (ROV) to enable real-time operator navigation and sensor telemetry.'
      ],
      link: 'https://www.easternedgerobotics.com/'
    },
    hyperloop: {
      title: 'Paradigm Hyperloop Pod',
      tag: 'HIGH-SPEED TRANSPORTATION & EMBEDDED SYSTEMS.',
      bullets: [
        'Architected an object-oriented codebase for the vehicle\'s embedded systems.',
        'Wrote drivers for custom PCBs using SPI, I2C, CANBus and UDP.',
        'Developed a Python tool to automate uploading and organizing testing data on Cloud.',
        'Utilized SciPy to calculate aerodynamic properties in real-time to reduce its runtime.'
      ],
      link: 'https://munparadigm.com/'
    }
  };

  $('#gallery').on('click', '.project-learn-more, .project-learn-trigger, .button', function(e) {
    var projectId = $(this).attr('id') || $(this).data('project') || $(this).closest('.project-card').find('.project-learn-more').attr('id');
    if (projectId && modalText[projectId]) {
      fillModal(projectId);
      setDimensions();
      $('.modal-wrap').addClass('visible');
    }
  });

  $('.close').on('click', function() {
    $('.modal-wrap, #modal .button').removeClass('visible');
  });

  $('.mask').on('click', function() {
    $('.modal-wrap, #modal .button').removeClass('visible');
  });

  $(document).on('keydown', function(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      $('.modal-wrap, #modal .button').removeClass('visible');
    }
  });

  var carousel = $('#carousel'),
    slideWidth = 720,
    threshold = slideWidth / 3,
    dragStart,
    dragEnd;

  setDimensions();
  $(window).on('resize', setDimensions);

  $('#next').click(function() {
    shiftSlide(-1);
  });
  $('#prev').click(function() {
    shiftSlide(1);
  });

  carousel.on('mousedown', function(e) {
    if (carousel.hasClass('transition')) return;
    dragStart = e.pageX;
    dragEnd = e.pageX;
    $(this).on('mousemove', function(e) {
      dragEnd = e.pageX;
      $(this).css('transform', 'translateX(' + dragPos() + 'px)');
    });
    $(document).on('mouseup', function() {
      carousel.off('mousemove');
      $(document).off('mouseup');
      if (dragPos() > threshold) {
        return shiftSlide(1);
      }
      if (dragPos() < -threshold) {
        return shiftSlide(-1);
      }
      shiftSlide(0);
    });
  });

  function setDimensions() {
    var winW = $(window).innerWidth();
    slideWidth = Math.min(720, winW - 32);
    if (slideWidth < 280) slideWidth = 280;
    threshold = slideWidth / 3;
    $('.carousel-wrap, .slide').css('width', slideWidth);
    $('.modal').css('max-width', slideWidth);
    $('#carousel').css('left', slideWidth * -1);
  }

  function dragPos() {
    return dragEnd - dragStart;
  }

  function shiftSlide(direction) {
    if (carousel.hasClass('transition')) return;
    dragEnd = dragStart;
    $(document).off('mouseup');
    carousel
      .off('mousemove')
      .addClass('transition')
      .css('transform', 'translateX(' + direction * slideWidth + 'px)');
    setTimeout(function() {
      if (direction === 1) {
        $('.slide:first').before($('.slide:last'));
      } else if (direction === -1) {
        $('.slide:last').after($('.slide:first'));
      }
      carousel.removeClass('transition');
      carousel.css('transform', 'translateX(0px)');
    }, 700);
  }

  function fillModal(id) {
    $('#modal .title').text(modalText[id].title);
    $('#modal .tag').text(modalText[id].tag);

    if (modalText[id].bullets && modalText[id].bullets.length) {
      var bulletsHtml = '<ul class="modal-bullets">';
      for (var i = 0; i < modalText[id].bullets.length; i++) {
        bulletsHtml += '<li>' + modalText[id].bullets[i] + '</li>';
      }
      bulletsHtml += '</ul>';
      $('#modal .detail').html(bulletsHtml);
    } else {
      $('#modal .detail').text(modalText[id].detail || '');
    }

    if (modalText[id].link) {
      $('#modal .button')
        .addClass('visible')
        .parent()
        .attr('href', modalText[id].link);
    } else {
      $('#modal .button').removeClass('visible');
    }

    if (id === 'easternedge' || id === 'hyperloop') {
      $('#modal').addClass('no-carousel').removeClass('modal-clock');
      $('#modal .carousel-wrap').hide();
    } else {
      $('#modal').removeClass('no-carousel');
      $('#modal .carousel-wrap').show();

      if (id === 'clock') {
        $('#modal').addClass('modal-clock');
        $.each($('#modal .slide'), function(index, value) {
          $(this).css({
            background:
              "url('img/slides/" + id + '-' + index + ".jpg') center center / contain no-repeat #000000",
            backgroundColor: '#000000',
            backgroundSize: 'contain',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat'
          });
        });
      } else {
        $('#modal').removeClass('modal-clock');
        $.each($('#modal .slide'), function(index, value) {
          $(this).css({
            background:
              "url('img/slides/" + id + '-' + index + ".jpg') center center / cover no-repeat #0b0e14",
            backgroundColor: '#0b0e14',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat'
          });
        });
      }
    }
  }
});
