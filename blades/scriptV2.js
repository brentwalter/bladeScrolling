/**

  SUMMARY:
  This is meant to be an exercise in createing a generic animation framework that will
  enable us to experiment and create new and interesting interaction patterns across
  devices and modern browsers. My hope is that we can swap in other algorithms to create
  new and interesting behavior. Perhaps we can enhance this to include X axis, Z axis,
  rotational and alpha animations.

  Mentally, I imagined a video editor with the scrollbar acting as a timeline scrubber.
  The goal was to be able to absolutely position all elements on the canvas based on
  the "time". So, it is essentailly a functional approach to animation. Send in a single
  value and the "stage" renders with the correct state.

  ASSUMPTIONS:
    - There is only one #js-bladesContainer per page
    - Requires style="visibility:hidden" on #js-bladesContainer
    - All blades are fixed position 0, 0
    - This JS file is loaded after all DOM elements required for the widget


  DATA MODEL (blades): array of blade objects
    - el: the DOM node of the blade
    - height: the height of the element
    - viewportOverhang: how much taller a blade is than viewport
    - startPositionY: the location to start the blade
    - endPositionY: the location of where the blade should be when animation done
    - timeToStart: at which point in the timeline to start the animation
    - timeToStop: at which point in the timeline the animation should be completed
    - isActive: whether or not it has been clicked and selected
    - forcedPositionY: if you need to get a fixed/static position temporarily

  BROWSER/DEVICE SUPPORT:
    - IE10+
    - All other modern, desktop browsers (scrollbar, dragging and mousewheel)
    - Mobile/touch

  TODO:
    - Externalize settings and getter/setter methods
      - setting: container ID
      - setting: blade className
      - setting: func to set timeToStart, timeToStop
      - setting: func to set startPositionY, endPositionY
      - setting: func to set timelineLength
      - setting: func to handle clicks on blades
      - method: to get blades array
    - Make module into UMD format for AMD or commonJS
    - Improve weirdness about the click expansion and how to handle internal content
    - Create other animation behavior algorithms that can be plugged in: controlled by setPositions(blades) and setStartStopTimes(blades)
    - Enable support multiple instances of blade containers per page
    - Enable sending in a specific timeline location to jump/render to that state
*/

window.BLADES = window.BLADES || {};

window.BLADES.animate = window.BLADES.animate || (function(window, document){
  'use strict';


  //
  // Global variables
  //

  var BLADE_CLASS = 'js-blade',
      BLADES_CONTAINER_ID = 'js-bladesContainer',
      blades = [],
      bladesContainerEl,
      timelineLength = 0, // the px height of scrollbar range
      RENDER_INTERVAL = 10, // how long between render invocations
      animationInterval = null; // this will keep a reference to the rendering setInterval


  //
  // THE SETUP
  //

  /**
   * start the widget, assumes this JS file is loaded after all the necessary DOM elements
   */
  function init(settings) {
    bladesContainerEl = document.getElementById(BLADES_CONTAINER_ID);
    blades = getBlades(bladesContainerEl, BLADE_CLASS);

    setupStage();
    startRender();
    setWindowResizeListener();
    setClickListeners();
  };

  /**
   * Takes in a class name and root element, returns an array of data objects based on the
   * classeName element inside rootEl
   * @param {dom} rootEl - the container element that holds the blades
   * @param {string} className - the class name of the elements to fetch and inspect; will become a blade
   * @return {array} one object for each DOM element
   */
  function getBlades(rootEl, className) {
    return Array.prototype.slice.apply(rootEl.getElementsByClassName(className)).map(function(blade) {
      return {
        el: blade,
        height: blade.offsetHeight,
        viewportOverhang: blade.offsetHeight > window.innerHeight ? blade.offsetHeight - window.innerHeight : 0,
        startPositionY: 0, // default
        endPositionY: 0, // default
        timeToStart: 0, // default
        timeToStop: 0, // default
        isActive: false, // default
        forcedPositionY: null // default
      };
    });
  }

  /**
   * Get everything setup to go, used on init and window resizing
   * All functions invoked here must be idempotent because window resizing pounds this
   **/
  function setupStage() {
    timelineLength = getTimelineLength(blades);
    setTimelineLength(timelineLength);
    setPositions(blades);
    setStartStopTimes(blades);
    bladesContainerEl.style.visibility = 'visible';
  }

  /**
   * create scrollbar: lenght + height of current browser window
   * @param {int} length - how tall to make the shim element that creates the scroll height (timeline)
   */
  function setTimelineLength(length) {
    var elId = "timelineLengthCreator";
    var isElementInDom = !!document.getElementById(elId);
    // this function should be idempotent becuase it can be called for window resize events, many times
    if (!isElementInDom) {
      // if element doesn't exist, create it
      var el = document.createElement('div');
      el.id = elId;
      el.style.height = length + 'px';
      document.body.appendChild(el);
    } else {
      // otherwise, resize it
      document.getElementById(elId).style.height = length + 'px';
    }
  }


  //
  // RENDER FUNCTIONALLITY
  //

  /**
   * Stops calls to renderStage
   */
  function stopRender() {
    clearInterval(animationInterval);
  }

  /**
   * Begins calls to renderStage
   */
  function startRender() {
    animationInterval = setInterval(renderStage, RENDER_INTERVAL);
  }

  /**
   * Itterates through all the blades and renders each
   */
  function renderStage() {
    window.requestAnimationFrame(function() {
      for (var i = 0; i < blades.length; i++) {
        renderBlade(blades[i]);
      }
    });
  }

  /**
   * This is where all the positioning magic happens
   * Basically, convert all "times" to a percentage 0.000 to ( 1.000 - window.innerHeight/timelineLength)
   * Always, always always, render each element per cycle to avoide missed calculations (handled by renderStage() function).
   * Positions are absolute values based on fixed positioning, all derived from window.pageYOffset / timelineLength
   * @param {obj} blade - the blade object to render
   */
  function renderBlade(blade) {
    var currentTimelineLocation = window.pageYOffset / timelineLength;
    var convertedTimeToStart = blade.timeToStart / timelineLength;
    var convertedTimeToStop = blade.timeToStop / timelineLength;

    // console.log('currentTimelineLocation: ', currentTimelineLocation,
    //             '\n convertedTimeToStart: ', convertedTimeToStart,
    //             '\n convertedTimeToStop: ', convertedTimeToStop);

    if (blade.forcedPositionY != null) {
      // if there's a forced, static position, put the blade there
      setTranslate3dY(blade.el, blade.forcedPositionY);
    } else if (currentTimelineLocation < convertedTimeToStart) {
      // if it's too early to move, keep blade at starting location
      setTranslate3dY(blade.el, blade.startPositionY);
    } else if (currentTimelineLocation > convertedTimeToStop) {
      // if it's too late to move, keep blade at the ending location
      setTranslate3dY(blade.el, blade.endPositionY);
    } else {
      // otherwise, move the blade
      var convertedTimeStartStopDelta = convertedTimeToStop - convertedTimeToStart;
      var pixelsToMovePerIncrement = (blade.endPositionY - blade.startPositionY) / (convertedTimeStartStopDelta * 1000)
      var calculatedPosition = blade.startPositionY + (pixelsToMovePerIncrement * ((currentTimelineLocation - convertedTimeToStart) * 1000));

      // console.log('convertedTimeStartStopDelta: ', convertedTimeStartStopDelta,
      //             '\n pixelsToMovePerIncrement: ', pixelsToMovePerIncrement,
      //             '\n calculatedPosition: ', calculatedPosition);

      setTranslate3dY(blade.el, calculatedPosition);
    }
  }

  /**
   * Sets the CSS3 transform property of an element
   * @param {dom} el - DOM node of the blade to position
   * @param {string} - transformProp
   */
  function setTranslate3dY(el, transformProp) {
    transformProp = 'translate3d(0px, ' + transformProp + 'px, 0px)'
    el.style.WebkitTransform = transformProp;
    el.style.MozTransform = transformProp;
    el.style.msTransform = transformProp;
    el.style.OTransform = transformProp;
    el.style.transform = transformProp;
  }


  //
  // EVENT RELATED STUFF
  //

  /**
   * Recalculate everything if window changes size, with a debounce added for good measure!
   */
  function setWindowResizeListener() {
    window.addEventListener("resize", resizeThrottler, false);

    var resizeTimeout;
    function resizeThrottler() {
      // ignore resize events as long as an actualResizeHandler execution is in the queue
      if ( !resizeTimeout ) {
        resizeTimeout = setTimeout(function() {
          resizeTimeout = null;
          setupStage();
         }, 66); // The actualResizeHandler will execute at a rate of 15fps
      }
    }
  }

  /**
   * Enables each blade to be clickable, and closes over the scope in order to pass
   * the blade itself into the context of the event handler. As long as you have
   * a reasonable number of blades, you won't bork the memory
   */
  function setClickListeners() {
    for (var i = 0; i < blades.length; i++)(function() {
      var blade = blades[i];
      blade.el.addEventListener('click', function(e) { handleClick(e, blade) });
    }());
  }

  /**
   * Toggles the state of the clicked/active blade
   */
  function handleClick(e, blade) {
    e.preventDefault();
    if (!blade.isActive) {
      // expand height of blade to fill window, stack obove others and
      // move top of blade to top of viewport
      blade.isActive = true;
      blade.el.style.height = window.innerHeight + 'px';
      blade.el.style.zIndex = '1';
      blade.forcedPositionY = 0;
    } else {
      // reset it all
      blade.isActive = false;
      blade.el.style.height = blade.height;
      blade.el.style.zIndex = '';
      blade.forcedPositionY = null;
    }
  }








  //
  // I think all these valuse should be settable by another script, send in function or int
  // but for now, I'll leave them in here for convenience. And yes, there are 3 separate
  // "reduce" loops, but it's for readability.
  //

  //
  // SPECIFIC AMIMATION EFFECT LOGIC: BLADES
  //

  /**
   * Calculates the length of the timeline based on the heigh of all blades
   * @param {array} blades - the global blade array
   */
  function getTimelineLength(blades) {
    // It simplifies the timing logic significantly to have the timeline be eqal to the height of all
    // the blades. Otherwise, my head would explode. Although, theoretically, you could get it to work
    return blades.reduce(function(prev, next) {
      return prev += next.height
    }, 0);
  }

  /**
   * Sets the starting and ending positions for each blade
   * @param {array} blades - the global blade array
   */
  function setPositions(blades) {
    // This positioning has the assumption that all blades have a fixed position of 0, 0 (top left of the window).
    // Therefore, position = 0 equates to the top of the blade being at the top of the visible window
    blades.reduce(function(prev, next) {
      // START POSITION
      if (prev < window.innerHeight) {
        // if sum of the heights of those blades before it is less than window.innerHeight, position it after them
        next.startPositionY = prev;
      } else {
        // otherwise, hide it just below the bottom of the window, out of view
        next.startPositionY = window.innerHeight;
      }
      // END POSITION
      // if the remaining timelineLength - the height of all previous blades < window.innerHeight, blade needs to stop early
      if (timelineLength - prev < window.innerHeight) {
        next.endPositionY = window.innerHeight - (timelineLength - prev);
      } else {
        // else, use the normal algorithm
        if (next.viewportOverhang > 0) {
          // if the blade is too big to fit in the window, it will need to scroll up to be fully revealed
          next.endPositionY = -next.viewportOverhang;
        } else {
          // otherwise, it can stop at the top of the window
          next.endPositionY = 0;
        }
      }

      return prev += next.height;
    }, 0);
  }

  /**
   * Sets the beginning time and ending time of a blade's animation
   * @param {array} blades - the global blade array
   */
  function setStartStopTimes(blades) {
    // all these calculation rest on the fact that the timelineLength === the total hight of all blades.
    // If this is not the case, the amount to move and the time needed to move don't coordinate correctly.
    // This makes the math much more reasonable
    blades.reduce(function(prev, next) {
      // START TIME
      // The blade is either partially in view of off screen
      // If it's in view, it should start moving immediately
      // If it's off screen, it should wait until all previous blades have moved
      if (prev < window.innerHeight) {
        next.timeToStart = 0;
      } else {
        next.timeToStart = prev - window.innerHeight;
      }
      // STOP TIME
      // There is a lot to account for when deciding when each blade's animation should be complete
      // 1) Does the blade start out in view? If so, it only needs to move to the top of the screen, or until it's overhang has scrolled off screen
      // 2) Will the remaining amount of blade height fill the entire screen? If so, move the blade to the top of the sceen or past the top to account for overlap
      //    If not, you only want to move the blade the amount necessary to reveal the remaining height of the last blade(s)
      // 3) You'll notice that both #1 and #2 take into account if a blade is taller than the visible window. It's a critical aspect to remember.
      if (prev < window.innerHeight) {
        if (next.viewportOverhang > 0) {
          next.timeToStop = next.timeToStart + prev + next.viewportOverhang;
        } else {
          next.timeToStop = next.timeToStart + prev;
        }
      } else {
        if (timelineLength - prev > window.innerHeight) {
          if (next.viewportOverhang > 0) {
            next.timeToStop = next.timeToStart + next.height;
          } else {
            next.timeToStop = next.timeToStart + window.innerHeight;
          }
        } else {
          next.timeToStop = next.timeToStart + (timelineLength - prev);
        }
      }
      return prev += next.height;
    }, 0);
  }

  // public export signature
  return function(settings) {
    init(settings);
  }

}(window, document));


// start the show
BLADES.animate();
