;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['meTools'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(meTools);
  } else {
    root.meTrapFocus = factory(meTools);
  }
} (this, function(meTools) {

  /**
   * me-trap-focus - A small utility script to trap the focus within a container element
   *
   * @link https://github.com/meibegger/me-trap-focus
   * @license MIT
   */

  var
  /*
   ---------------
   constants
   ---------------
   */

    KEY_TAB = 9,

  /*
   ---------------
   settings
   ---------------
   */


    defaultOptions = {
      focusableSelector: 'a,frame,iframe,input:not([type=hidden]),select,textarea,button,*[tabindex]',  // selector for elements which are focusable
      taboutIndicator: '.me-tabout' // selector for an optional element placed before the 1st or after the last tabable element to prevent tabbing out of the page directly to the browser-window (e.g. placed after an iframe as last tabable element)
    }
    ;

  /*
   ---------------
   meTrapFocus
   ---------------
   */


  /**
   * Create a new instance
   * @param container mixed; id or element; the container in which the focus should be maintained
   * @param options object; optional; overwrite the default options
   */
  function meTrapFocus(container, options) {

    var that = this;

    // check arguments
    var containerElement = container && meTools.getElementById(container);
    if (!containerElement) {
      throw new Error('meTrapFocus: Container element not found');
    }

    // merge options
    initProperties.call(that).options = meTools.mergeObjects(defaultOptions, options);

    // prepare container
    that.container = containerElement;
    if (!containerElement.getAttribute('tabindex')) { // add tabindex to the container, so that it can get focus onClick and receives tab-events as target (to prevent tabbing out)
      containerElement.setAttribute('tabindex', '-1');
    }
    meTools.registerEvent(that, containerElement, 'keydown', function (event) {
      handleKeyboard.call(that, event);
    });

    fetchFocusables.call(that);

  }


  /*
   ---------------
   private functions
   ---------------
   */

  function initProperties() {
    var that = this;

    that.options = {};

    that.container = null;
    that.focusables = []; // all possibly focusable elements ordered by tabindex

    return that;
  }

  function handleKeyboard(event) {
    if (!event.ctrlKey && !event.altKey) {
      var code = (event.keyCode ? event.keyCode : event.which);

      if (code == KEY_TAB) {  // tab-loop
        var that = this,
          taboutIndicator = that.options.taboutIndicator,
          focusables = that.focusables,
          tabables;

        if (event.shiftKey) {   // back-tab
          tabables = getFilteredFocusables.call(that,-1);

          if (tabables[tabables[0].matches(taboutIndicator) ? 1 : 0] === event.target ||    // back-tab on first element -> focus last element
            focusables.indexOf(event.target) < focusables.indexOf(tabables[0]) ||
            event.target===that.container) {

            focusLast.call(that,tabables);

            event.preventDefault();
          }

        } else {    // tab
          tabables = getFilteredFocusables.call(that,1);

          if (tabables[tabables.length - (tabables[tabables.length - 1].matches(taboutIndicator) ? 2 : 1)] === event.target ||    // tab on last element -> focus first element
            focusables.indexOf(event.target) > focusables.indexOf(tabables[tabables.length-1])) {

            focusFirst.call(that,tabables);

            event.preventDefault();
          }
        }
      }
    }
  }

  /**
   * Get all radio-buttons belonging to a radio-button's group
   * @param radioButton
   * @returns []
   */
  function getRadioGroup(radioButton) {
    // get the form for the radiobutton
    var
      form = meTools.getAncestors(radioButton, 'form', true) || // radiobutton is contained in a form
        document,
      name = radioButton.getAttribute('name');

    return [].slice.call(form.querySelectorAll('input[type="radio"][name="' + name + '"]'));
  }

  function fetchFocusables () {
    var
      that = this,
      options = that.options,
      _taboutFocus = function (event) {
        taboutFocus.call(that, event);
      };

    that.focusables = orderFocusables(that.container.querySelectorAll(options.focusableSelector));

    for (var i = 0; i < that.focusables.length; i++) {
      var element = that.focusables[i];

      if (element.matches(options.taboutIndicator)) {
        meTools.unregisterEvent(that, element, 'focus'); // unregister old event
        meTools.registerEvent(that, element, 'focus', _taboutFocus);
      }
    }

    return that;
  }

  function orderFocusables (focusables) {
    var
      byTabindex = [],
      ordered = [];

    for (var i = 0; i < focusables.length; i++) {
      var
        focusable = focusables[i],
        tabindex = Math.max(0, focusable.getAttribute('tabindex') || 0);

      byTabindex[tabindex] = byTabindex[tabindex] || [];
      byTabindex[tabindex].push(focusable);
    }

    for (var j in byTabindex) {
      for (var k in byTabindex[j]) {
        ordered.push(byTabindex[j][k]);
      }
    }

    return ordered;
  }

  /**
   * Return not disabled, tabindex!=-1, visible, tabable radio ordered by the specified tab-direction
   * @param orderByTabindex int; optional; tab-direction (-1 or 1); default is 1
   * @returns {Array}
   */
  function getFilteredFocusables (orderByTabindex) {
    // prepare argument
    orderByTabindex = typeof(orderByTabindex) === 'undefined' ? 1 : orderByTabindex;

    var
      that = this,
      focusables = that.focusables,
      filtered = [],
      doneRadios = []; // already processed radio-buttons

    // remove all elements which are not tabable
    for (var i = 0; i < focusables.length; i++) {

      var
        focusable = focusables[i],
        fitting = null,
        tabindex = focusable.getAttribute('tabindex') || 0;

      if (focusable.matches(':not([disabled])') && focusable.matches(':not([tabindex="-1"])') && (focusable.offsetWidth || focusable.offsetHeight)) { // not disabled, tabindex!=-1 & visible
        if (focusable.matches('input[type="radio"]')) { // remove all radio buttons which are not tabable
          if (doneRadios.indexOf(focusable) === -1) { // group of this radio not processed yet
            // get radio-group
            var
              radioGroup = getRadioGroup.call(that, focusable),
              focusableRadio = null;

            doneRadios = doneRadios.concat(radioGroup);

            // get tabable radios of the group (checked or first&last of group)
            for (var j = 0; j < radioGroup.length; j++) {
              var radio = radioGroup[j];
              if (radio.checked) {
                focusableRadio = radio;
                break;
              }
            }
            if (!focusableRadio) {
              focusableRadio = orderByTabindex === -1 ? radioGroup[radioGroup.length-1] : radioGroup[0]; // default is tabable in tab-direction!!!
            }
            fitting = focusableRadio;
          }

        } else {
          fitting = focusable;
        }
      }

      if (fitting) {
        filtered.push(fitting);
      }
    }

    return filtered;
  }

  function focusFirst(tabables) {
    var
      that = this,
      taboutIndicator = that.options.taboutIndicator,
      focusNext = tabables[0];

    if (focusNext.matches(taboutIndicator)) {
      focusNext = tabables[1];
    }

    if (focusNext.matches('iframe'))
      setTimeout(function () {
        focusNext.contentWindow.focus();
      }, 100);
    else {
      focusNext.focus();
    }
  }

  function focusLast(tabables) {
    var
      that = this,
      taboutIndicator = that.options.taboutIndicator,
      focusNext = tabables[tabables.length - 1];

    if (focusNext.matches(taboutIndicator)) {
      focusNext = tabables[tabables.length - 2];
    }

    if (focusNext.matches('iframe'))
      setTimeout(function () {
        focusNext.contentWindow.focus();
      }, 100);
    else {
      focusNext.focus();
    }
  }

  function taboutFocus(event) {
    var
      that = this,
      element = event.target,
      tabableTab = getFilteredFocusables.call(that,1),
      tabableBackTab = getFilteredFocusables.call(that,-1);

    if (element == tabableBackTab[0]) { // focus on start-focus-out -> focus last element
      focusLast.call(that,tabableBackTab);

    } else if (element == tabableTab[tabableTab.length - 1]) { // focus on end-focus-out -> focus first element
      focusFirst.call(that,tabableTab);
    }

  }


  /*
   ---------------
   prototype
   ---------------
   */

  /**
   * Update the list of focusable elements. Call this, if the focusable elements within the container change (elements are added or removed)
   * @returns this
   */
  meTrapFocus.prototype.update = function () {
    return fetchFocusables.call(this);
  };

  /**
   * Get all possibly focusable elements
   * @returns {[]} DOM-elements
   */
  meTrapFocus.prototype.getFocusables = function () {
    return meTools.copyValues(this.focusables, false);
  };

  /**
   * Get all elements reachable by (back-) tab
   * @param backTab boolean; optional; default is false
   * @returns {[]} DOM-elements
   */
  meTrapFocus.prototype.getTabable = function (backTab) {
    return meTools.copyValues(backTab ? getFilteredFocusables.call(this,-1) : getFilteredFocusables.call(this,1), false);
  };

  /**
   * Destroy the instance
   * @returns {null}
   */
  meTrapFocus.prototype.destroy = function () {
    var that = this;

    initProperties.call(that);
    meTools.unregisterEvent(that);

    return null;
  };

  return meTrapFocus;

}));