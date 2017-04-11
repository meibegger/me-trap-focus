/**
 * @license me-trap-focus 3.0.0 Copyright (c) Mandana Eibegger <scripts@schoener.at>
 * Available via the MIT license.
 * see: https://github.com/meibegger/me-trap-focus for details
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.meTrapFocus = factory();
  }
}(this, function () {


/**
 * @license almond 0.3.2 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/almond/LICENSE
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part, normalizedBaseParts,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name) {
            name = name.split('/');
            lastIndex = name.length - 1;

            // If wanting node ID compatibility, strip .js from end
            // of IDs. Have to do this here, and not in nameToUrl
            // because node allows either .js or non .js to map
            // to same file.
            if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
            }

            // Starts with a '.' so need the baseName
            if (name[0].charAt(0) === '.' && baseParts) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that 'directory' and not name of the baseName's
                //module. For instance, baseName of 'one/two/three', maps to
                //'one/two/three.js', but we want the directory, 'one/two' for
                //this normalization.
                normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                name = normalizedBaseParts.concat(name);
            }

            //start trimDots
            for (i = 0; i < name.length; i++) {
                part = name[i];
                if (part === '.') {
                    name.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && name[2] === '..') || name[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        name.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
            //end trimDots

            name = name.join('/');
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

/**
 * @license me-tools 3.0.0 Copyright (c) Mandana Eibegger <scripts@schoener.at>
 * Available via the MIT license.
 * see: https://github.com/meibegger/me-tools for details
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('meTools.fn.variable', [
    ], factory);
  } else if(typeof exports === 'object') {
    if (typeof module === 'object') {
      module.exports = factory();
    } else {
      exports['meTools.fn.variable'] = factory();
    }
  } else {
    root.meTools = root.meTools || {};
    root.meTools.fn = root.meTools.fn || {};
    root.meTools.fn.variable = factory();
  }
}(this, function () {

  /*
   ---------------
   functions
   ---------------
   */

  /**
   * Create a copy of a variable.
   *
   * copyValues(vals [, deep])
   *
   * @param vals mixed
   * @param deep bool; optional; deep-copy; default is true
   * @returns {*} mixed; a copy of the passed value
   */
  function copyValues(vals, deep) {
    deep = (typeof(deep) === 'undefined') || deep;

    var copy,
      val;
    if (Array.isArray(vals)) {
      copy = [];
      for (var i in vals) {
        val = vals[i];
        copy.push((deep && typeof val === 'object') ?
          copyValues(val)
          : val);
      }

    } else if (vals && typeof(vals) === 'object' && typeof(vals.tagName) === 'undefined' && vals !== window && vals !== document) {
      copy = {};
      for (var key in vals) {
        val = vals[key];
        copy[key] = (deep && typeof val === 'object') ?
          copyValues(val)
          : val;
      }

    } else {
      copy = vals;
    }
    return copy;
  }

  /**
   * Merge 2 Objects and return a copy.
   *
   * mergeObjects(object1, object2)
   *
   * @param object1 Object
   * @param object2 Object
   * @returns {{}} New merged Object
   */
  function mergeObjects(object1, object2) {
    object1 = object1 || {};
    object2 = object2 || {};
    var result = {};
    for (var key1 in object1) {
      var option1 = object1[key1];
      if (object2.hasOwnProperty(key1)) {
        var option2 = object2[key1];
        if (Array.isArray(option2) || typeof(option2) !== 'object' || typeof(option1) !== 'object') {
          result[key1] = copyValues(option2);
        } else {
          result[key1] = mergeObjects(option1, option2);
        }
      } else {
        result[key1] = copyValues(option1);
      }
    }
    for (var key2 in object2) {
      if (!result.hasOwnProperty(key2)) {
        result[key2] = copyValues(object2[key2]);
      }
    }
    return result;
  }

  /**
   * Check if an object is empty.
   *
   * isEmptyObject(object)
   *
   * @param object Object
   * @returns {boolean}
   */
  function isEmptyObject(object) {
    for (var i in object) {
      return false;
    }
    return true;
  }

  /*
   ---------------
   api
   ---------------
   */

  return {
    copyValues: copyValues,
    mergeObjects: mergeObjects,
    isEmptyObject: isEmptyObject
  };

}));

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('meTools.fn.element', [
    ], factory);
  } else if(typeof exports === 'object') {
    if (typeof module === 'object') {
      module.exports = factory();
    } else {
      exports['meTools.fn.element'] = factory();
    }
  } else {
    root.meTools = root.meTools || {};
    root.meTools.fn = root.meTools.fn || {};
    root.meTools.fn.element = factory();
  }
}(this, function () {

  /*
   ---------------
   functions
   ---------------
   */

  /**
   * Get the specified element.
   *
   * getElementById(elementSpec)
   *
   * @param elementSpec mixed; string (id) or element;
   * @returns {*} element or null
   */
  function getElementById(elementSpec) {
    if (typeof(elementSpec) === 'object' && typeof(elementSpec.tagName) !== 'undefined') {
      return elementSpec;

    } else if (typeof(elementSpec) === 'string') {
      return document.getElementById(elementSpec);

    } else {
      return null;
    }
  }

  /**
   * Get the ID of an element. If the element has no ID, it will be assigned a random ID.
   *
   * getId(element [, prefix])
   *
   * @param element DOM element
   * @param prefix string; optional; A prefix for generated IDs; default is 'id-'
   * @returns {string} ID
   */
  function getId(element, prefix) {
    var id = element.getAttribute('id');

    if (!id) { // assign an ID
      prefix = prefix || 'id-';
      do {
        var date = new Date();
        id = prefix + Math.ceil(date.valueOf() % 10000 * Math.random());
      } while (document.getElementById(id));

      element.setAttribute('id', id);
    }

    return id;
  }

  /**
   * Get all ancestors of an element, possibly matching a selector, up to an optional container.
   *
   * Note: this function uses matches(selector), so you need to include a polyfill for all IEs!
   *
   * getAncestors(element [, selector] [, container] [, single])
   *
   * @param element DOM-Element;
   * @param selector String; optional; selector to match the parents against
   * @param container DOM-Element; optional; max parent to check; default is body
   * @param single Boolean; optional; return only the next matching ancestor
   * @return mixed; array or false/element if single===true
   */
  function getAncestors(element, selector, container, single) {
    // prepare arguments
    var
      argSelector = false,
      argContainer = false,
      argSingle = false;
    for (var i = 1; i < arguments.length; i++) {
      switch (typeof(arguments[i])) {
        case 'string':
          argSelector = arguments[i];
          break;
        case 'object':
          argContainer = arguments[i];
          break;
        case 'boolean':
          argSingle = arguments[i];
          break;
      }
    }
    selector = argSelector;
    container = argContainer || document.body;
    single = argSingle;

    var parents = [],
      getAncestors = function (element) {
        var parent = element.parentElement;
        if (!selector || parent.matches(selector)) {
          if (single) {
            return parent;
          } else {
            parents.push(parent);
          }
        }
        if (parent === container) {
          return single ? false : parents;
        }
        return getAncestors(parent);
      }
      ;
    return getAncestors(element);
  }

  /**
   * Check if an element is the parent of another element.
   *
   * isParent(parent, child)
   *
   * @param parent DOM-element
   * @param child DOM-element
   * @returns {boolean}
   */
  function isParent(parent, child) {
    var node = child.parentNode;
    while (node !== null) {
      if (node === parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  /**
   * Add 1 or more values to an attribute.
   *
   * addAttributeValues(element, attributeName, values)
   *
   * @param element DOM-element
   * @param attributeName string
   * @param values mixed; string or array of strings
   */
  function addAttributeValues(element, attributeName, values) {
    values = Array.isArray(values) ? values : [values];

    var
      attributeVal = element.getAttribute(attributeName),
      currentVals = attributeVal ? attributeVal.split(' ') : [];

    for (var i = 0; i < values.length; i++) {
      var value = values[i];
      if (currentVals.indexOf(value) === -1) {
        currentVals.push(value);
      }
    }
    element.setAttribute(attributeName, currentVals.join(' '));
  }

  /**
   * Remove one or more values from an attribute.
   *
   * removeAttributeValues(element, attributeName, values, keepEmptyAttribute)
   *
   * @param element DOM-element
   * @param attributeName string
   * @param values mixed; string or array of strings
   * @param keepEmptyAttribute bool
   */
  function removeAttributeValues(element, attributeName, values, keepEmptyAttribute) {
    var attributeVal = element.getAttribute(attributeName);
    if (attributeVal) {
      var
        expStart = '((^| )',
        expEnd = '(?= |$))';

      attributeVal = attributeVal.replace(new RegExp(Array.isArray(values) ?
        expStart + values.join(expEnd + '|' + expStart) + expEnd :
        expStart + values + expEnd, 'g'),
        '');

      if (keepEmptyAttribute || attributeVal) {
        element.setAttribute(attributeName, attributeVal);
      } else {
        element.removeAttribute(attributeName);
      }
    }
  }

  /**
   * Checks if an attribute has a value (word).
   *
   * hasAttributeValue(element, attributeName, value)
   *
   * @param element DOM-element
   * @param attributeName string
   * @param value string
   * @returns {boolean}
   */
  function hasAttributeValue(element, attributeName, value) {
    var attributeVal = element.getAttribute(attributeName);
    if (attributeVal) {
      var
        expStart = '((^| )',
        expEnd = '(?= |$))';

      return !!attributeVal.match(new RegExp(expStart + value + expEnd, 'g'));
    }
    return false;
  }

  /**
   * Get all radio-buttons belonging to a radio-button's group
   * @param radio DOM-Element radio element
   * @returns []
   */
  function getRadioGroup(radio) {
    // get the form for the radiobutton
    var
      form = getAncestors(radio, 'form', true) || // radiobutton is contained in a form
        document,
      name = radio.getAttribute('name');

    return [].slice.call(form.querySelectorAll('input[type="radio"][name="' + name + '"]'));
  }


  /**
   * Returns all focusable elements, ordered by tabindex
   * @param container DOM-Element; required
   * @param selector String selector for elements which are focusable; optionsl; default is 'a,frame,iframe,input:not([type=hidden]),select,textarea,button,*[tabindex]'
   * @returns {Array}
   */
  function fetchFocusables (container, selector) {
    selector = selector || 'a,frame,iframe,input:not([type=hidden]),select,textarea,button,*[tabindex]:not([tabindex="-1"])';
    return orderByTabindex(container.querySelectorAll(selector));

  }

  /**
   * @param focusables Array of Dom-Elements
   * @returns {Array}
   */
  function orderByTabindex (focusables) {
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
   * Return not disabled, visible, tabable-radio ordered by the specified tab-direction
   * @param focusables Array of DOM-Elements; required
   * @param tabDirection int; optional; tab-direction (-1 or 1); default is 1
   * @returns {Array} or false
   */
  function getFocusables (focusables, tabDirection) {
    // prepare argument
    tabDirection = typeof(tabDirection) === 'undefined' ? 1 : tabDirection;

    var
      filtered = [],
      doneRadios = []; // already processed radio-buttons

    function evalCandidate(candidate) {
      if (candidate.matches(':not([disabled])') && (candidate.offsetWidth || candidate.offsetHeight)) { // not disabled & visible
        if (candidate.matches('input[type="radio"]')) { // remove all radio buttons which are not tabable
          if (doneRadios.indexOf(candidate) === -1) { // group of this radio not processed yet
            // get radio-group
            var
              radioGroup = getRadioGroup(candidate),
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
              focusableRadio = tabDirection === -1 ? radioGroup[radioGroup.length-1] : radioGroup[0]; // default is tabable in tab-direction!!!
            }
            return focusableRadio;
          }

        } else {
          return candidate;
        }

        return false;
      }
    }

    // remove all elements which are not tabable
    if (tabDirection === 1) {
      for (var i = 0; i < focusables.length; i++) {
        var tabable = evalCandidate(focusables[i]);
        if (tabable) {
          filtered.push(tabable);
        }
      }
    } else {
      for (var j = focusables.length-1; j >= 0; j--) {
        var backwardTabable = evalCandidate(focusables[j]);
        if (backwardTabable) {
          filtered.push(backwardTabable);
        }
      }
    }

    return filtered;
  }

  /**
   *
   * @param container DOM-Element
   * @param fn(container, focusables) Function returning the element to focus
   */
  function focusInside(container, fn) {
    var
      toFocus = null,
      focusables = getFocusables(fetchFocusables(container));

    if (typeof fn === 'function') {
      toFocus = fn(container, focusables);
    }
    if (!toFocus && focusables.length) {
      toFocus = focusables[0];
    }
    if (!toFocus) {
      var containerTabindex = container.getAttribute('tabindex');
      if (!containerTabindex) {
        container.setAttribute('tabindex', '-1');
      }
      toFocus = container;
    }

    toFocus.focus();
  }

  /*
   ---------------
   api
   ---------------
   */

  return {
    getElementById: getElementById,
    getId: getId,
    getAncestors: getAncestors,
    isParent: isParent,
    addAttributeValues: addAttributeValues,
    removeAttributeValues: removeAttributeValues,
    hasAttributeValue: hasAttributeValue,
    fetchFocusables: fetchFocusables,
    orderByTabindex: orderByTabindex,
    getFocusables: getFocusables,
    focusInside: focusInside
  };

}));

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('meTools.fn.event', [
      'meTools.fn.variable'
    ], factory);
  } else if(typeof exports === 'object') {
    var fnVariable = require('./variable');
    if (typeof module === 'object') {
      module.exports = factory(fnVariable);
    } else {
      exports['meTools.fn.event'] = factory(fnVariable);
    }
  } else {
    root.meTools = root.meTools || {};
    root.meTools.fn = root.meTools.fn || {};
    root.meTools.fn.event = factory(root.meTools.fn.variable);
  }
}(this, function (fnVariable) {

  /*
   ---------------
   functions
   ---------------
   */

  /**
   * Add an event-listener and register it to an instance.
   * The instance will get a property 'registeredEvents' storing the registered events.
   *
   * registerEvent(scope, target, type, fn [, capture])
   *
   * @param scope object; instance to register the event to
   * @param target DOM object; event target
   * @param type string; event name
   * @param fn function; event handler
   * @param capture boolean; optional; capture the event; default is false
   */
  function registerEvent(scope, target, type, fn, capture) {

    capture = capture || false;

    var
      registeredEvents = scope.registeredEvents = scope.registeredEvents || {},
      typeListeners = registeredEvents[type] = registeredEvents[type] || [],
      targetTypeHandlers = false
      ;

    for (var i in typeListeners) {
      var typeHandlers = typeListeners[i];
      if (typeHandlers.tg === target) {
        targetTypeHandlers = typeHandlers;
        break;
      }
    }

    if (!targetTypeHandlers) {
      targetTypeHandlers = {
        tg: target,
        fns: []
      };
      typeListeners.push(targetTypeHandlers);
    }

    targetTypeHandlers.fns.push([fn, capture]);

    target.addEventListener(type, fn, capture);

  }

  /**
   * Remove (an) event-listener(s), previously registered to an instance.
   *
   * unregisterEvent(scope [, target] [, type] [, fn] [, capture])
   *
   * @param scope object; instance the event was registered to
   * @param target DOM object; optional; event target; if not set, matching events will be removed on all targets
   * @param type string; optional; event name; if not set, all event-types will be removed
   * @param fn function; optional; event handler; if not set, all event-handlers will be removed
   * @param capture boolean; optional; if not set, captured & not-captured events are removed, if true only captured events are removed, if false only not-captured events are removed
   */
  function unregisterEvent(scope, target, type, fn, capture) {
    if (!scope.registeredEvents) {
      return;
    }
    var registeredEvents = scope.registeredEvents;

    if (!type) {
      for (type in registeredEvents) {
        unregisterEvent(scope, target, type, fn, capture);
      }
      return;
    }

    if (!registeredEvents.hasOwnProperty(type)) {
      return;
    }
    var typeListeners = registeredEvents[type];

    if (!target) {
      var cTypeListeners = fnVariable.copyValues(typeListeners);
      while (cTypeListeners.length) {
        var typeListener = cTypeListeners.shift();
        unregisterEvent(scope, typeListener.tg, type, fn, capture);
      }
      return;
    }

    var fns = false,
      typeHandlers;
    for (var j in typeListeners) {
      typeHandlers = typeListeners[j];
      if (typeHandlers.tg === target) {
        fns = typeHandlers.fns;
        break;
      }
    }
    if (!fns) {
      return;
    }

    for (var k = 0; k < fns.length; k++) {
      var fnDef = fns[k];
      if ((typeof(fn) === 'undefined' || !fn || fn === fnDef[0]) &&
        (typeof(capture) === 'undefined' || capture === fnDef[1])) {
        fns.splice(k, 1);
        target.removeEventListener(type, fnDef[0], fnDef[1]);
        k--;
      }
    }

    // remove unused info
    if (!fns.length) {
      typeListeners.splice(j, 1);
    }
    if (!typeListeners.length) {
      delete registeredEvents[type];
    }

  }

  /**
   * Rate-limit the execution of a function (e.g. for events like resize and scroll).
   * Returns a new function, that when called repetitively, executes the original function no more than once every delay milliseconds.
   * (based on https://remysharp.com/2010/07/21/throttling-function-calls)
   *
   * throttle(fn [, threshhold] [, trailing] [, scope])
   *
   * @param fn function; original function to call
   * @param threshhold int; optional; delay (ms) - execute fn no more than once every delay milliseconds; default is 250
   * @param trailing boolean; optional; execute fn after the calls stopped; default is true
   * @param scope object; optional; instance the function should be applied to
   * @returns {Function}
   */
  function throttle(fn, threshhold, trailing, scope) {
    // prepare arguments
    threshhold = threshhold || 250;
    trailing = typeof(trailing) === 'undefined' ? true:trailing;
    scope = scope || this;

    var
      last,
      deferTimer = null;

    return function () {
      var
        now = +new Date(),
        args = arguments;

      if (last && now < last + threshhold) {
        if (trailing) {
          // hold on to it
          clearTimeout(deferTimer);
          deferTimer = setTimeout(function () {
            last = now;
            fn.apply(scope, args);
          }, threshhold);
        }

      } else {
        last = now;
        clearTimeout(deferTimer);
        fn.apply(scope, args);
      }
    };
  }

  /**
   * Coalesce multiple sequential calls into a single execution at either the beginning or end (e.g. for events like keydown).
   * Returns a new function, that when called repetitively, executes the original function just once per “bunch” of calls.
   *
   * debounce(fn [, pause] [, beginning] [, scope])
   *
   * @param fn function; original function to call
   * @param pause int; optional; min pause (ms) between bunches of calls; default is 250
   * @param beginning boolean; execute at the beginning of the call-bunch; default is false
   * @param scope object; optional; instance the function should be applied to
   * @returns {Function}
   */
  function debounce(fn, pause, beginning, scope) {
    // prepare arguments
    pause = pause || 250;
    scope = scope || this;

    var
      last,
      pauseTimer = null;

    return function () {
      var
        now = +new Date(),
        args = arguments;

      if (!beginning) {
        // defer a possible function call
        clearTimeout(pauseTimer);
        pauseTimer = setTimeout(function () {
          fn.apply(scope, args);
        }, pause);

      } else if (!last || now > last + pause) {
        fn.apply(scope, args);
      }

      last = now;
    };
  }

  /*
   ---------------
   api
   ---------------
   */

  return {
    registerEvent: registerEvent,
    unregisterEvent: unregisterEvent,
    throttle: throttle,
    debounce: debounce
  };

}));

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('me-tools',[
      'meTools.fn.variable',
      'meTools.fn.element',
      'meTools.fn.event'
    ], factory);
  } else if(typeof exports === 'object') {
    var
      fnVariable = require('./fn/variable'),
      fnElement = require('./fn/element'),
      fnEvent = require('./fn/event');
    if (typeof module === 'object') {
      module.exports = factory(fnVariable, fnElement, fnEvent);
    } else {
      exports.meTools = factory(fnVariable, fnElement, fnEvent);
    }
  } else {
    var meTools = root.meTools;
    root.meTools = factory(meTools.fn.variable, meTools.fn.element, meTools.fn.event);
    for (var i in meTools) {
      root.meTools[i] = meTools[i];
    }
  }
}(this, function (fnVariable, fnElement, fnEvent) {
  var api = {};
  for (var i in arguments) {
    for (var j in arguments[i]) {
      api[j] = arguments[i][j];
    }
  }

  return api;

}));


;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('meTrapFocus',['me-tools'], factory);
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
/***********************************************************************************************************************
 * MATCHES
 * Add matches support for all IEs and others (http://caniuse.com/#feat=matchesselector)
 **********************************************************************************************************************/
// as described in https://developer.mozilla.org/en/docs/Web/API/Element/matches#Browser_compatibility
(function(ElementPrototype) {
  ElementPrototype.matches = ElementPrototype.matches ||
  ElementPrototype.matchesSelector ||
  ElementPrototype.mozMatchesSelector ||
  ElementPrototype.msMatchesSelector ||
  ElementPrototype.oMatchesSelector ||
  ElementPrototype.webkitMatchesSelector ||
  function (selector) {
    var $element = this
      , $matches = [].slice.call(document.querySelectorAll(selector))
      ;
    return $matches.indexOf($element)!==-1;
  }
})(Element.prototype);


define("matchesPolyfill", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.matchesPolyfill;
    };
}(this)));



  return require('meTrapFocus');
}));

