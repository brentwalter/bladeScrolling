/**
  ASSUMPTIONS:
    - There is only one .js-bladesContainer per page
    - Requires style="visibility:hidden" on .js-bladesContainer

  DATA MODEL (blades): array of objects
    - el:
    - height:
    - viewportOverhang:

  BROWSER SUPPORT:
    - IE9+
    - All other modern, desktop browsers
*/

(function(window, document){
  'use strict';

  var BLADE_CLASS = 'js-blade',
      BLADES_CONTAINER_ID = 'js-bladesContainer',
      blades = [],
      bladesContainerEl,
      totalBladeHeight = 0,
      totalScrollHeight = 0,
      pageYOffsetCache = 0;
      // bladeOverflowWindowHeight = 0,
      // wrapperElement;

  // start the widget, assumes this file is below all the necessary DOM elements
  init();

  function init() {
    // fetch blades, coerce into an array of objects
    bladesContainerEl = document.getElementById(BLADES_CONTAINER_ID);
    blades = getBlades(bladesContainerEl, BLADE_CLASS);
    console.log(blades.length + ' blades: ', blades);

    totalBladeHeight = getTotalBladeHeight(blades);
    totalScrollHeight = totalBladeHeight-window.innerHeight

    // we need to simulate the space needed for scrolling, so we wrap the element and fake the height
    var wrapperElement = document.createElement('div');
    wrapElement(bladesContainerEl, wrapperElement).style.height = totalBladeHeight + 'px';

    setInitialPositionOfBlades(blades);

    console.log('SUM height: ', ( function() {
      return blades.reduce(function(prev, next) {
        return prev += next.height;
      }, 0);
    }() ) );
    console.log('SUM initOffsetTop: ', ( function() {
      return blades.reduce(function(prev, next) {
        return prev += next.initOffsetTop;
      }, 0);
    }() ) );
    console.log('SUM initMovableSpace: ', ( function() {
      return blades.reduce(function(prev, next) {
        return prev += next.initMovableSpace;
      }, 0);
    }() ) );

    console.log('totalBladeHeight: ', totalBladeHeight);
    console.log('totalScrollHeight: ', totalScrollHeight);
    // console.log('Last blade: ', blades[blades.length-1]);

    setEventListeners();

    // reveal the blades UI
    bladesContainerEl.style.visibility = 'visible';
  };

  /**
   * Setup event listeners
   */
  function setEventListeners() {
    window.addEventListener('scroll', handleScroll);
  }



  /**
   * EVENT HANDLERS
   */

  /**
   * move blades in response to scrolling of the browsers
   * @param {obj} e - event
   */
  function handleScroll(e) {
    var pageYOffset = window.pageYOffset;
    var scrollDelta = pageYOffset - pageYOffsetCache;
    pageYOffsetCache = pageYOffset;

    var currentBlades = getBladesToMove(scrollDelta);

    console.log('currentBlades: ', currentBlades);
    console.log(e,
      '\nwindow.innerHeight: ', window.innerHeight, // 782 fixed
      '\ntotalScrollHeight: ', totalScrollHeight, // 802 fixed
      '\ntotalBladeHeight: ', totalBladeHeight, // 1584 fixed
      '\nwindow.pageYOffset: ', window.pageYOffset, // 0 - 802
      '\npageYOffsetCache: ', pageYOffsetCache, // 0 - 802
      '\nLeft to scroll: ', (totalBladeHeight - window.innerHeight) - window.pageYOffset, // 802 - 0
      '\nscrollDelta: ', scrollDelta); // variable

    moveBlades(currentBlades, scrollDelta);
  }



  /**
   * HELPERS
   */

  /**
   * Return new array of the blades that still have scrollable space Left
   * @param {int} scrollDelta - the amount and dirction of scrolling
   * @return {array} subset of blades array that should be moved
   */
  function getBladesToMove(scrollDelta) {
    return blades.filter(function(blade, index) {
      if (scrollDelta > 0) {
        // scrolling down the page: foward
        return blade.currentMovableSpace > 0;
      } else {
        // scrolling up the page: backward
        if (index < blades.length-1) { // if not the last blade
          // if a blade is overlapped, don't scroll it
          return (blades[index+1].currentOffsetTop >= blade.height - blade.viewportOverhang) && (blade.currentOffsetTop < blade.initOffsetTop);
        } else {
          return blade.currentOffsetTop < blade.initOffsetTop;
        }
      }
    });
  }

  /**
   * Animate the blades
   * @param {array} bladesToMove - the blades being animated
   * @param {int} scrollDelta - the amount and direction to move the blades
   */
  function moveBlades(bladesToMove, scrollDelta) {
    bladesToMove.forEach(function(blade) {
      // if (scrollDelta > 0) {
      //   // blade.currentOffsetTop can't be < 0
      //   blade.currentOffsetTop = (blade.currentOffsetTop - scrollDelta < 0) ? 0 : blade.currentOffsetTop - scrollDelta;
      //   blade.currentMovableSpace = (blade.currentMovableSpace - scrollDelta < 0) ? 0 : blade.currentMovableSpace - scrollDelta;
      // } else {
      //   // blade.currentOffsetTop cant be > blade.initOffsetTop
      //   blade.currentOffsetTop = (blade.currentOffsetTop - scrollDelta > blade.initOffsetTop) ? blade.initOffsetTop : blade.currentOffsetTop - scrollDelta;
      //   blade.currentMovableSpace = (blade.currentMovableSpace - scrollDelta > blade.initMovableSpace) ? blade.initMovableSpace : blade.currentMovableSpace - scrollDelta;
      // }

      blade.currentOffsetTop -= scrollDelta;
      blade.currentMovableSpace -= scrollDelta;
      setTransform(blade.el, 'translate3d(0px, ' + blade.currentOffsetTop + 'px, 0px)');
    });
  }

  /**
   * Takes in a class name, returns an array of data objects
   * @param {dom} rootEl - the container element that holds the blades
   * @param {string} className - the class name of the elements to fetch and inspect
   * @return {array} one object for each DOM element
   */
  function getBlades(rootEl, className) {
    return Array.prototype.slice.apply(rootEl.getElementsByClassName(className)).map(function(blade) {
      return {
        el: blade,
        height: blade.offsetHeight,
        viewportOverhang: blade.offsetHeight > window.innerHeight ? blade.offsetHeight - window.innerHeight : 0,
        initOffsetTop: 0,
        initMovableSpace: 0,
        currentOffsetTop: 0,
        currentMovableSpace: 0
      };
    });
  }

  /**
   * Calculate total height of all blades
   * @param {array} blades - array of blade objects
   * @return {int} height of all blades
   */
  function getTotalBladeHeight(blades) {
    return blades.reduce(function(prev, next) {
      return prev + next.height;
    }, 0);
  }

  /**
   * Sets the initial positioning of the blades
   * @param {array} blades - the array containing the blade data model
   * @returns {array} blades
   */
  function setInitialPositionOfBlades(blades) {
    blades.reduce(function (prev, next) {
      next.initOffsetTop = next.currentOffsetTop = prev;
      next.initMovableSpace = next.currentMovableSpace = next.currentOffsetTop + next.viewportOverhang;
      setTransform(next.el, 'translate3d(0px, ' + prev + 'px, 0px)');
      return prev + next.height;
    }, 0);
    return blades;
  }

  /**
   * Sets the CSS3 transform property of an element
   * @param {dom} el - DOM node of the blade to position
   * @param {string} - transformProp
   */
  function setTransform(el, transformProp) {
    el.style.WebkitTransform = transformProp;
    el.style.MozTransform = transformProp;
    el.style.msTransform = transformProp;
    el.style.OTransform = transformProp;
    el.style.transform = transformProp;
  }

  /**
   * Places target element inside wrapper in the target's original location
   * @param {dom} target - the element to be wrapped
   * @param {dom} wrapper - the element that will contain target
   * @return {dom} wrapper
   */
  function wrapElement(target, wrapper) {
    var parent = target.parentNode;
    parent.replaceChild(wrapper, target);
    wrapper.appendChild(target);
    return wrapper;
  }

  /**
   * Removes a class from an element
   * @param {dom} el - DOM element to have class name removed
   * @param {string} className - the class name to removed
   */
  // function removeClassName(el, className) {
  //   debugger;
  //   var regex = new window.RegExp('(?:^|\\s)' + className + '(?!\\S)', 'g');
  //   el.className.replace(regex, '');
  // }

}(window, document));
