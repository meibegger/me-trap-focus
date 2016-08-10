# meTrapFocus #

meTrapFocus is a small utility script to trap the focus within a container element.

Trapping the focus is for instance necessary for accessible modal dialogs (see [http://www.w3.org/TR/wai-aria-practices/#make_modal](http://www.w3.org/TR/wai-aria-practices/#make_modal)).
But many dialog-widgets out there don't support keyboard/focus-handling. To enhance the accessibility of those widgets, just initialize meTrapFocus on the container of the dialog (see "Usage").

## Usage ##

### 1. Include the JavaScript ###
#### Bundled & minified versions ####

meTrapFocus depends on [meTools](https://github.com/meibegger/me-tools).
It also uses `Element.prototype.matches`, so you need to include a polyfill for IE (see [http://caniuse.com/#feat=matchesselector](http://caniuse.com/#feat=matchesselector)), which you can find at [mePolyfills](https://github.com/meibegger/me-polyfills) in the sources-folder.

- Either include all the dependencies yourself and include `me-trap-focus.min.js` from the `dist` folder in your HTML page.
- or use the standalone bundled `me-trap-focus.bundle.min.js`.

#### Source versions ####
You can find the original JavaScript file in the `src` folder of this package.

#### AMD ####
meTrapFocus has AMD support. This allows it to be lazy-loaded with an AMD loader, such as RequireJS.

### 2. Prepare your HTML ###
In most cases you won't have to change anything in your HTML.

#### iFrames ####
If you have an iFrame as first/last focusable element of the container, tabbing out of the container may not be noticed.
In this case add a tab-reachable dummy-element with the class `me-tabout` as first/last element of the container to prevent tabbing out of the container.

If the iFrame has a cross-domain source it can not be focused via script in FireFox.
In this case wrap the iFrame in a focusable wrapper and initialize meTrapFocus with an adjusted `focusableSelector` option to prevent the cross-domain-iFrame being detected as focusable.

### 3. Use meTrapFocus ###
Initialize meTrapFocus

```javascript
/**
 * Create a new instance
 * @param container mixed; id or element; the container in which the focus should be maintained
 * @param options object; optional; overwrite the default options
 */
var myFocusTrapper = new meTrapFocus(container [,options])

```

If the focusable elements within the container change (elements are added or removed) you need to update the list of focusable elements.
To update the list of focusable elements, call

```javascript
myFocusTrapper.update();
```

To get all possibly focusable elements, call

```javascript
myFocusTrapper.getFocusables();
```

To get all elements reachable by tab, call

```javascript
myFocusTrapper.getTabable();
```

To get all elements reachable by back-tab, call

```javascript
myFocusTrapper.getTabable(true);
```

To destroy the instance, call
 
```javascript
myFocusTrapper = myFocusTrapper.destroy();
```

### 4. Default Options ###
```javascript
{
  // selector for elements which are focusable
  focusableSelector: 'a,frame,iframe,input:not([type=hidden]),select,textarea,button,*[tabindex]',
  
  // selector for an optional element placed before the 1st or after the last tabable element to prevent tabbing out of the page directly to the browser-window (e.g. placed after an iframe as last tabable element)
  taboutIndicator: '.me-tabout' 
}
```


## Package managers ##
You can install meTrapFocus using npm or Bower.

```
$ npm install me-trap-focus
```

or

```
$ bower install me-trap-focus
```

## License ##
meTrapFocus is licenses under the [MIT licence](https://opensource.org/licenses/MIT).