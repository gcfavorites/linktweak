var CLOSURE_NO_DEPS = true;
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Bootstrap for the Google JS Library (Closure).
 *
 * In uncompiled mode base.js will write out Closure's deps file, unless the
 * global <code>CLOSURE_NO_DEPS</code> is set to true.  This allows projects to
 * include their own deps file(s) from different locations.
 *
 */


/**
 * @define {boolean} Overridden to true by the compiler when --closure_pass
 *     or --mark_as_compiled is specified.
 */
var COMPILED = false;


/**
 * Base namespace for the Closure library.  Checks to see goog is
 * already defined in the current scope before assigning to prevent
 * clobbering if base.js is loaded more than once.
 *
 * @const
 */
var goog = goog || {};


/**
 * Reference to the global context.  In most cases this will be 'window'.
 */
goog.global = this;


/**
 * @define {boolean} DEBUG is provided as a convenience so that debugging code
 * that should not be included in a production js_binary can be easily stripped
 * by specifying --define goog.DEBUG=false to the JSCompiler. For example, most
 * toString() methods should be declared inside an "if (goog.DEBUG)" conditional
 * because they are generally used for debugging purposes and it is difficult
 * for the JSCompiler to statically determine whether they are used.
 */
goog.DEBUG = true;


/**
 * @define {string} LOCALE defines the locale being used for compilation. It is
 * used to select locale specific data to be compiled in js binary. BUILD rule
 * can specify this value by "--define goog.LOCALE=<locale_name>" as JSCompiler
 * option.
 *
 * Take into account that the locale code format is important. You should use
 * the canonical Unicode format with hyphen as a delimiter. Language must be
 * lowercase, Language Script - Capitalized, Region - UPPERCASE.
 * There are few examples: pt-BR, en, en-US, sr-Latin-BO, zh-Hans-CN.
 *
 * See more info about locale codes here:
 * http://www.unicode.org/reports/tr35/#Unicode_Language_and_Locale_Identifiers
 *
 * For language codes you should use values defined by ISO 693-1. See it here
 * http://www.w3.org/WAI/ER/IG/ert/iso639.htm. There is only one exception from
 * this rule: the Hebrew language. For legacy reasons the old code (iw) should
 * be used instead of the new code (he), see http://wiki/Main/IIISynonyms.
 */
goog.LOCALE = 'en';  // default to en


/**
 * Indicates whether or not we can call 'eval' directly to eval code in the
 * global scope. Set to a Boolean by the first call to goog.globalEval (which
 * empirically tests whether eval works for globals). @see goog.globalEval
 * @type {?boolean}
 * @private
 */
goog.evalWorksForGlobals_ = null;


/**
 * Creates object stubs for a namespace. When present in a file, goog.provide
 * also indicates that the file defines the indicated object. Calls to
 * goog.provide are resolved by the compiler if --closure_pass is set.
 * @param {string} name name of the object that this file defines.
 */
goog.provide = function(name) {
  if (!COMPILED) {
    // Ensure that the same namespace isn't provided twice. This is intended
    // to teach new developers that 'goog.provide' is effectively a variable
    // declaration. And when JSCompiler transforms goog.provide into a real
    // variable declaration, the compiled JS should work the same as the raw
    // JS--even when the raw JS uses goog.provide incorrectly.
    if (goog.getObjectByName(name) && !goog.implicitNamespaces_[name]) {
      throw Error('Namespace "' + name + '" already declared.');
    }

    var namespace = name;
    while ((namespace = namespace.substring(0, namespace.lastIndexOf('.')))) {
      goog.implicitNamespaces_[namespace] = true;
    }
  }

  goog.exportPath_(name);
};


/**
 * Marks that the current file should only be used for testing, and never for
 * live code in production.
 * @param {string=} opt_message Optional message to add to the error that's
 *     raised when used in production code.
 */
goog.setTestOnly = function(opt_message) {
  if (COMPILED && !goog.DEBUG) {
    opt_message = opt_message || '';
    throw Error('Importing test-only code into non-debug environment' +
                opt_message ? ': ' + opt_message : '.');
  }
};


if (!COMPILED) {
  /**
   * Namespaces implicitly defined by goog.provide. For example,
   * goog.provide('goog.events.Event') implicitly declares
   * that 'goog' and 'goog.events' must be namespaces.
   *
   * @type {Object}
   * @private
   */
  goog.implicitNamespaces_ = {};
}


/**
 * Builds an object structure for the provided namespace path,
 * ensuring that names that already exist are not overwritten. For
 * example:
 * "a.b.c" -> a = {};a.b={};a.b.c={};
 * Used by goog.provide and goog.exportSymbol.
 * @param {string} name name of the object that this file defines.
 * @param {*=} opt_object the object to expose at the end of the path.
 * @param {Object=} opt_objectToExportTo The object to add the path to; default
 *     is |goog.global|.
 * @private
 */
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split('.');
  var cur = opt_objectToExportTo || goog.global;

  // Internet Explorer exhibits strange behavior when throwing errors from
  // methods externed in this manner.  See the testExportSymbolExceptions in
  // base_test.html for an example.
  if (!(parts[0] in cur) && cur.execScript) {
    cur.execScript('var ' + parts[0]);
  }

  // Certain browsers cannot parse code in the form for((a in b); c;);
  // This pattern is produced by the JSCompiler when it collapses the
  // statement above into the conditional loop below. To prevent this from
  // happening, use a for-loop and reserve the init logic as below.

  // Parentheses added to eliminate strict JS warning in Firefox.
  for (var part; parts.length && (part = parts.shift());) {
    if (!parts.length && goog.isDef(opt_object)) {
      // last part and we have an object; use it
      cur[part] = opt_object;
    } else if (cur[part]) {
      cur = cur[part];
    } else {
      cur = cur[part] = {};
    }
  }
};


/**
 * Returns an object based on its fully qualified external name.  If you are
 * using a compilation pass that renames property names beware that using this
 * function will not find renamed properties.
 *
 * @param {string} name The fully qualified name.
 * @param {Object=} opt_obj The object within which to look; default is
 *     |goog.global|.
 * @return {Object} The object or, if not found, null.
 */
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split('.');
  var cur = opt_obj || goog.global;
  for (var part; part = parts.shift(); ) {
    if (goog.isDefAndNotNull(cur[part])) {
      cur = cur[part];
    } else {
      return null;
    }
  }
  return cur;
};


/**
 * Globalizes a whole namespace, such as goog or goog.lang.
 *
 * @param {Object} obj The namespace to globalize.
 * @param {Object=} opt_global The object to add the properties to.
 * @deprecated Properties may be explicitly exported to the global scope, but
 *     this should no longer be done in bulk.
 */
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for (var x in obj) {
    global[x] = obj[x];
  }
};


/**
 * Adds a dependency from a file to the files it requires.
 * @param {string} relPath The path to the js file.
 * @param {Array} provides An array of strings with the names of the objects
 *                         this file provides.
 * @param {Array} requires An array of strings with the names of the objects
 *                         this file requires.
 */
goog.addDependency = function(relPath, provides, requires) {
  if (!COMPILED) {
    var provide, require;
    var path = relPath.replace(/\\/g, '/');
    var deps = goog.dependencies_;
    for (var i = 0; provide = provides[i]; i++) {
      deps.nameToPath[provide] = path;
      if (!(path in deps.pathToNames)) {
        deps.pathToNames[path] = {};
      }
      deps.pathToNames[path][provide] = true;
    }
    for (var j = 0; require = requires[j]; j++) {
      if (!(path in deps.requires)) {
        deps.requires[path] = {};
      }
      deps.requires[path][require] = true;
    }
  }
};


/**
 * Implements a system for the dynamic resolution of dependencies
 * that works in parallel with the BUILD system. Note that all calls
 * to goog.require will be stripped by the JSCompiler when the
 * --closure_pass option is used.
 * @param {string} rule Rule to include, in the form goog.package.part.
 */
goog.require = function(rule) {

  // if the object already exists we do not need do do anything
  // TODO(user): If we start to support require based on file name this has
  //            to change
  // TODO(user): If we allow goog.foo.* this has to change
  // TODO(user): If we implement dynamic load after page load we should probably
  //            not remove this code for the compiled output
  if (!COMPILED) {
    if (goog.getObjectByName(rule)) {
      return;
    }
    var path = goog.getPathFromDeps_(rule);
    if (path) {
      goog.included_[path] = true;
      goog.writeScripts_();
    } else {
      var errorMessage = 'goog.require could not find: ' + rule;
      if (goog.global.console) {
        goog.global.console['error'](errorMessage);
      }

        throw Error(errorMessage);
    }
  }
};


/**
 * Path for included scripts
 * @type {string}
 */
goog.basePath = '';


/**
 * A hook for overriding the base path.
 * @type {string|undefined}
 */
goog.global.CLOSURE_BASE_PATH;


/**
 * Whether to write out Closure's deps file. By default,
 * the deps are written.
 * @type {boolean|undefined}
 */
goog.global.CLOSURE_NO_DEPS;


/**
 * A function to import a single script. This is meant to be overridden when
 * Closure is being run in non-HTML contexts, such as web workers. It's defined
 * in the global scope so that it can be set before base.js is loaded, which
 * allows deps.js to be imported properly.
 *
 * The function is passed the script source, which is a relative URI. It should
 * return true if the script was imported, false otherwise.
 */
goog.global.CLOSURE_IMPORT_SCRIPT;


/**
 * Null function used for default values of callbacks, etc.
 * @return {void} Nothing.
 */
goog.nullFunction = function() {};


/**
 * The identity function. Returns its first argument.
 *
 * @param {...*} var_args The arguments of the function.
 * @return {*} The first argument.
 * @deprecated Use goog.functions.identity instead.
 */
goog.identityFunction = function(var_args) {
  return arguments[0];
};


/**
 * When defining a class Foo with an abstract method bar(), you can do:
 *
 * Foo.prototype.bar = goog.abstractMethod
 *
 * Now if a subclass of Foo fails to override bar(), an error
 * will be thrown when bar() is invoked.
 *
 * Note: This does not take the name of the function to override as
 * an argument because that would make it more difficult to obfuscate
 * our JavaScript code.
 *
 * @type {!Function}
 * @throws {Error} when invoked to indicate the method should be
 *   overridden.
 */
goog.abstractMethod = function() {
  throw Error('unimplemented abstract method');
};


/**
 * Adds a {@code getInstance} static method that always return the same instance
 * object.
 * @param {!Function} ctor The constructor for the class to add the static
 *     method to.
 */
goog.addSingletonGetter = function(ctor) {
  ctor.getInstance = function() {
    return ctor.instance_ || (ctor.instance_ = new ctor());
  };
};


if (!COMPILED) {
  /**
   * Object used to keep track of urls that have already been added. This
   * record allows the prevention of circular dependencies.
   * @type {Object}
   * @private
   */
  goog.included_ = {};


  /**
   * This object is used to keep track of dependencies and other data that is
   * used for loading scripts
   * @private
   * @type {Object}
   */
  goog.dependencies_ = {
    pathToNames: {}, // 1 to many
    nameToPath: {}, // 1 to 1
    requires: {}, // 1 to many
    // used when resolving dependencies to prevent us from
    // visiting the file twice
    visited: {},
    written: {} // used to keep track of script files we have written
  };


  /**
   * Tries to detect whether is in the context of an HTML document.
   * @return {boolean} True if it looks like HTML document.
   * @private
   */
  goog.inHtmlDocument_ = function() {
    var doc = goog.global.document;
    return typeof doc != 'undefined' &&
           'write' in doc;  // XULDocument misses write.
  };


  /**
   * Tries to detect the base path of the base.js script that bootstraps Closure
   * @private
   */
  goog.findBasePath_ = function() {
    if (goog.global.CLOSURE_BASE_PATH) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return;
    } else if (!goog.inHtmlDocument_()) {
      return;
    }
    var doc = goog.global.document;
    var scripts = doc.getElementsByTagName('script');
    // Search backwards since the current script is in almost all cases the one
    // that has base.js.
    for (var i = scripts.length - 1; i >= 0; --i) {
      var src = scripts[i].src;
      var qmark = src.lastIndexOf('?');
      var l = qmark == -1 ? src.length : qmark;
      if (src.substr(l - 7, 7) == 'base.js') {
        goog.basePath = src.substr(0, l - 7);
        return;
      }
    }
  };


  /**
   * Imports a script if, and only if, that script hasn't already been imported.
   * (Must be called at execution time)
   * @param {string} src Script source.
   * @private
   */
  goog.importScript_ = function(src) {
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT ||
        goog.writeScriptTag_;
    if (!goog.dependencies_.written[src] && importScript(src)) {
      goog.dependencies_.written[src] = true;
    }
  };


  /**
   * The default implementation of the import function. Writes a script tag to
   * import the script.
   *
   * @param {string} src The script source.
   * @return {boolean} True if the script was imported, false otherwise.
   * @private
   */
  goog.writeScriptTag_ = function(src) {
    if (goog.inHtmlDocument_()) {
      var doc = goog.global.document;
      doc.write(
          '<script type="text/javascript" src="' + src + '"></' + 'script>');
      return true;
    } else {
      return false;
    }
  };


  /**
   * Resolves dependencies based on the dependencies added using addDependency
   * and calls importScript_ in the correct order.
   * @private
   */
  goog.writeScripts_ = function() {
    // the scripts we need to write this time
    var scripts = [];
    var seenScript = {};
    var deps = goog.dependencies_;

    function visitNode(path) {
      if (path in deps.written) {
        return;
      }

      // we have already visited this one. We can get here if we have cyclic
      // dependencies
      if (path in deps.visited) {
        if (!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path);
        }
        return;
      }

      deps.visited[path] = true;

      if (path in deps.requires) {
        for (var requireName in deps.requires[path]) {
          if (requireName in deps.nameToPath) {
            visitNode(deps.nameToPath[requireName]);
          } else if (!goog.getObjectByName(requireName)) {
            // If the required name is defined, we assume that this
            // dependency was bootstapped by other means. Otherwise,
            // throw an exception.
            throw Error('Undefined nameToPath for ' + requireName);
          }
        }
      }

      if (!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path);
      }
    }

    for (var path in goog.included_) {
      if (!deps.written[path]) {
        visitNode(path);
      }
    }

    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i]) {
        goog.importScript_(goog.basePath + scripts[i]);
      } else {
        throw Error('Undefined script input');
      }
    }
  };


  /**
   * Looks at the dependency rules and tries to determine the script file that
   * fulfills a particular rule.
   * @param {string} rule In the form goog.namespace.Class or project.script.
   * @return {?string} Url corresponding to the rule, or null.
   * @private
   */
  goog.getPathFromDeps_ = function(rule) {
    if (rule in goog.dependencies_.nameToPath) {
      return goog.dependencies_.nameToPath[rule];
    } else {
      return null;
    }
  };

  goog.findBasePath_();

  // Allow projects to manage the deps files themselves.
  if (!goog.global.CLOSURE_NO_DEPS) {
    goog.importScript_(goog.basePath + 'deps.js');
  }
}



//==============================================================================
// Language Enhancements
//==============================================================================


/**
 * This is a "fixed" version of the typeof operator.  It differs from the typeof
 * operator in such a way that null returns 'null' and arrays return 'array'.
 * @param {*} value The value to get the type of.
 * @return {string} The name of the type.
 */
goog.typeOf = function(value) {
  var s = typeof value;
  if (s == 'object') {
    if (value) {
      // Check these first, so we can avoid calling Object.prototype.toString if
      // possible.
      //
      // IE improperly marshals tyepof across execution contexts, but a
      // cross-context object will still return false for "instanceof Object".
      if (value instanceof Array) {
        return 'array';
      } else if (value instanceof Object) {
        return s;
      }

      // HACK: In order to use an Object prototype method on the arbitrary
      //   value, the compiler requires the value be cast to type Object,
      //   even though the ECMA spec explicitly allows it.
      var className = Object.prototype.toString.call(
          /** @type {Object} */ (value));
      // In Firefox 3.6, attempting to access iframe window objects' length
      // property throws an NS_ERROR_FAILURE, so we need to special-case it
      // here.
      if (className == '[object Window]') {
        return 'object';
      }

      // We cannot always use constructor == Array or instanceof Array because
      // different frames have different Array objects. In IE6, if the iframe
      // where the array was created is destroyed, the array loses its
      // prototype. Then dereferencing val.splice here throws an exception, so
      // we can't use goog.isFunction. Calling typeof directly returns 'unknown'
      // so that will work. In this case, this function will return false and
      // most array functions will still work because the array is still
      // array-like (supports length and []) even though it has lost its
      // prototype.
      // Mark Miller noticed that Object.prototype.toString
      // allows access to the unforgeable [[Class]] property.
      //  15.2.4.2 Object.prototype.toString ( )
      //  When the toString method is called, the following steps are taken:
      //      1. Get the [[Class]] property of this object.
      //      2. Compute a string value by concatenating the three strings
      //         "[object ", Result(1), and "]".
      //      3. Return Result(2).
      // and this behavior survives the destruction of the execution context.
      if ((className == '[object Array]' ||
           // In IE all non value types are wrapped as objects across window
           // boundaries (not iframe though) so we have to do object detection
           // for this edge case
           typeof value.length == 'number' &&
           typeof value.splice != 'undefined' &&
           typeof value.propertyIsEnumerable != 'undefined' &&
           !value.propertyIsEnumerable('splice')

          )) {
        return 'array';
      }
      // HACK: There is still an array case that fails.
      //     function ArrayImpostor() {}
      //     ArrayImpostor.prototype = [];
      //     var impostor = new ArrayImpostor;
      // this can be fixed by getting rid of the fast path
      // (value instanceof Array) and solely relying on
      // (value && Object.prototype.toString.vall(value) === '[object Array]')
      // but that would require many more function calls and is not warranted
      // unless closure code is receiving objects from untrusted sources.

      // IE in cross-window calls does not correctly marshal the function type
      // (it appears just as an object) so we cannot use just typeof val ==
      // 'function'. However, if the object has a call property, it is a
      // function.
      if ((className == '[object Function]' ||
          typeof value.call != 'undefined' &&
          typeof value.propertyIsEnumerable != 'undefined' &&
          !value.propertyIsEnumerable('call'))) {
        return 'function';
      }


    } else {
      return 'null';
    }

  } else if (s == 'function' && typeof value.call == 'undefined') {
    // In Safari typeof nodeList returns 'function', and on Firefox
    // typeof behaves similarly for HTML{Applet,Embed,Object}Elements
    // and RegExps.  We would like to return object for those and we can
    // detect an invalid function by making sure that the function
    // object has a call method.
    return 'object';
  }
  return s;
};


/**
 * Safe way to test whether a property is enumarable.  It allows testing
 * for enumerable on objects where 'propertyIsEnumerable' is overridden or
 * does not exist (like DOM nodes in IE). Does not use browser native
 * Object.propertyIsEnumerable.
 * @param {Object} object The object to test if the property is enumerable.
 * @param {string} propName The property name to check for.
 * @return {boolean} True if the property is enumarable.
 * @private
 */
goog.propertyIsEnumerableCustom_ = function(object, propName) {
  // KJS in Safari 2 is not ECMAScript compatible and lacks crucial methods
  // such as propertyIsEnumerable.  We therefore use a workaround.
  // Does anyone know a more efficient work around?
  if (propName in object) {
    for (var key in object) {
      if (key == propName &&
          Object.prototype.hasOwnProperty.call(object, propName)) {
        return true;
      }
    }
  }
  return false;
};


/**
 * Safe way to test whether a property is enumarable.  It allows testing
 * for enumerable on objects where 'propertyIsEnumerable' is overridden or
 * does not exist (like DOM nodes in IE).
 * @param {Object} object The object to test if the property is enumerable.
 * @param {string} propName The property name to check for.
 * @return {boolean} True if the property is enumarable.
 * @private
 */
goog.propertyIsEnumerable_ = function(object, propName) {
  // In IE if object is from another window, cannot use propertyIsEnumerable
  // from this window's Object. Will raise a 'JScript object expected' error.
  if (object instanceof Object) {
    return Object.prototype.propertyIsEnumerable.call(object, propName);
  } else {
    return goog.propertyIsEnumerableCustom_(object, propName);
  }
};


/**
 * Returns true if the specified value is not |undefined|.
 * WARNING: Do not use this to test if an object has a property. Use the in
 * operator instead.  Additionally, this function assumes that the global
 * undefined variable has not been redefined.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined.
 */
goog.isDef = function(val) {
  return val !== undefined;
};


/**
 * Returns true if the specified value is |null|
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is null.
 */
goog.isNull = function(val) {
  return val === null;
};


/**
 * Returns true if the specified value is defined and not null
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined and not null.
 */
goog.isDefAndNotNull = function(val) {
  // Note that undefined == null.
  return val != null;
};


/**
 * Returns true if the specified value is an array
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArray = function(val) {
  return goog.typeOf(val) == 'array';
};


/**
 * Returns true if the object looks like an array. To qualify as array like
 * the value needs to be either a NodeList or an object with a Number length
 * property.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  return type == 'array' || type == 'object' && typeof val.length == 'number';
};


/**
 * Returns true if the object looks like a Date. To qualify as Date-like
 * the value needs to be an object and have a getFullYear() function.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a like a Date.
 */
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == 'function';
};


/**
 * Returns true if the specified value is a string
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a string.
 */
goog.isString = function(val) {
  return typeof val == 'string';
};


/**
 * Returns true if the specified value is a boolean
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is boolean.
 */
goog.isBoolean = function(val) {
  return typeof val == 'boolean';
};


/**
 * Returns true if the specified value is a number
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a number.
 */
goog.isNumber = function(val) {
  return typeof val == 'number';
};


/**
 * Returns true if the specified value is a function
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a function.
 */
goog.isFunction = function(val) {
  return goog.typeOf(val) == 'function';
};


/**
 * Returns true if the specified value is an object.  This includes arrays
 * and functions.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an object.
 */
goog.isObject = function(val) {
  var type = goog.typeOf(val);
  return type == 'object' || type == 'array' || type == 'function';
};


/**
 * Gets a unique ID for an object. This mutates the object so that further
 * calls with the same object as a parameter returns the same value. The unique
 * ID is guaranteed to be unique across the current session amongst objects that
 * are passed into {@code getUid}. There is no guarantee that the ID is unique
 * or consistent across sessions. It is unsafe to generate unique ID for
 * function prototypes.
 *
 * @param {Object} obj The object to get the unique ID for.
 * @return {number} The unique ID for the object.
 */
goog.getUid = function(obj) {
  // TODO(user): Make the type stricter, do not accept null.

  // In Opera window.hasOwnProperty exists but always returns false so we avoid
  // using it. As a consequence the unique ID generated for BaseClass.prototype
  // and SubClass.prototype will be the same.
  return obj[goog.UID_PROPERTY_] ||
      (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_);
};


/**
 * Removes the unique ID from an object. This is useful if the object was
 * previously mutated using {@code goog.getUid} in which case the mutation is
 * undone.
 * @param {Object} obj The object to remove the unique ID field from.
 */
goog.removeUid = function(obj) {
  // TODO(user): Make the type stricter, do not accept null.

  // DOM nodes in IE are not instance of Object and throws exception
  // for delete. Instead we try to use removeAttribute
  if ('removeAttribute' in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_);
  }
  /** @preserveTry */
  try {
    delete obj[goog.UID_PROPERTY_];
  } catch (ex) {
  }
};


/**
 * Name for unique ID property. Initialized in a way to help avoid collisions
 * with other closure javascript on the same page.
 * @type {string}
 * @private
 */
goog.UID_PROPERTY_ = 'closure_uid_' +
    Math.floor(Math.random() * 2147483648).toString(36);


/**
 * Counter for UID.
 * @type {number}
 * @private
 */
goog.uidCounter_ = 0;


/**
 * Adds a hash code field to an object. The hash code is unique for the
 * given object.
 * @param {Object} obj The object to get the hash code for.
 * @return {number} The hash code for the object.
 * @deprecated Use goog.getUid instead.
 */
goog.getHashCode = goog.getUid;


/**
 * Removes the hash code field from an object.
 * @param {Object} obj The object to remove the field from.
 * @deprecated Use goog.removeUid instead.
 */
goog.removeHashCode = goog.removeUid;


/**
 * Clones a value. The input may be an Object, Array, or basic type. Objects and
 * arrays will be cloned recursively.
 *
 * WARNINGS:
 * <code>goog.cloneObject</code> does not detect reference loops. Objects that
 * refer to themselves will cause infinite recursion.
 *
 * <code>goog.cloneObject</code> is unaware of unique identifiers, and copies
 * UIDs created by <code>getUid</code> into cloned results.
 *
 * @param {*} obj The value to clone.
 * @return {*} A clone of the input value.
 * @deprecated goog.cloneObject is unsafe. Prefer the goog.object methods.
 */
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if (type == 'object' || type == 'array') {
    if (obj.clone) {
      return obj.clone();
    }
    var clone = type == 'array' ? [] : {};
    for (var key in obj) {
      clone[key] = goog.cloneObject(obj[key]);
    }
    return clone;
  }

  return obj;
};


/**
 * Forward declaration for the clone method. This is necessary until the
 * compiler can better support duck-typing constructs as used in
 * goog.cloneObject.
 *
 * TODO(user): Remove once the JSCompiler can infer that the check for
 * proto.clone is safe in goog.cloneObject.
 *
 * @type {Function}
 */
Object.prototype.clone;


/**
 * A native implementation of goog.bind.
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run. If the value is null or undefined, it
 *     will default to the global object.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @private
 * @suppress {deprecated} The compiler thinks that Function.prototype.bind
 *     is deprecated because some people have declared a pure-JS version.
 *     Only the pure-JS version is truly deprecated.
 */
goog.bindNative_ = function(fn, selfObj, var_args) {
  return /** @type {!Function} */ (fn.call.apply(fn.bind, arguments));
};


/**
 * A pure-JS implementation of goog.bind.
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run. If the value is null or undefined, it
 *     will default to the global object.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @private
 */
goog.bindJs_ = function(fn, selfObj, var_args) {
  var context = selfObj || goog.global;

  if (arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      // Prepend the bound arguments to the current arguments.
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(context, newArgs);
    };

  } else {
    return function() {
      return fn.apply(context, arguments);
    };
  }
};


/**
 * Partially applies this function to a particular 'this object' and zero or
 * more arguments. The result is a new function with some arguments of the first
 * function pre-filled and the value of |this| 'pre-specified'.<br><br>
 *
 * Remaining arguments specified at call-time are appended to the pre-
 * specified ones.<br><br>
 *
 * Also see: {@link #partial}.<br><br>
 *
 * Usage:
 * <pre>var barMethBound = bind(myFunction, myObj, 'arg1', 'arg2');
 * barMethBound('arg3', 'arg4');</pre>
 *
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run. If the value is null or undefined, it
 *     will default to the global object.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @suppress {deprecated} See above.
 */
goog.bind = function(fn, selfObj, var_args) {
  // TODO(nicksantos): narrow the type signature.
  if (Function.prototype.bind &&
      // NOTE(nicksantos): Somebody pulled base.js into the default
      // Chrome extension environment. This means that for Chrome extensions,
      // they get the implementation of Function.prototype.bind that
      // calls goog.bind instead of the native one. Even worse, we don't want
      // to introduce a circular dependency between goog.bind and
      // Function.prototype.bind, so we have to hack this to make sure it
      // works correctly.
      Function.prototype.bind.toString().indexOf('native code') != -1) {
    goog.bind = goog.bindNative_;
  } else {
    goog.bind = goog.bindJs_;
  }
  return goog.bind.apply(null, arguments);
};


/**
 * Like bind(), except that a 'this object' is not required. Useful when the
 * target function is already bound.
 *
 * Usage:
 * var g = partial(f, arg1, arg2);
 * g(arg3, arg4);
 *
 * @param {Function} fn A function to partially apply.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to fn.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 */
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    // Prepend the bound arguments to the current arguments.
    var newArgs = Array.prototype.slice.call(arguments);
    newArgs.unshift.apply(newArgs, args);
    return fn.apply(this, newArgs);
  };
};


/**
 * Copies all the members of a source object to a target object. This method
 * does not work on all browsers for all objects that contain keys such as
 * toString or hasOwnProperty. Use goog.object.extend for this purpose.
 * @param {Object} target Target.
 * @param {Object} source Source.
 */
goog.mixin = function(target, source) {
  for (var x in source) {
    target[x] = source[x];
  }

  // For IE7 or lower, the for-in-loop does not contain any properties that are
  // not enumerable on the prototype object (for example, isPrototypeOf from
  // Object.prototype) but also it will not include 'replace' on objects that
  // extend String and change 'replace' (not that it is common for anyone to
  // extend anything except Object).
};


/**
 * @return {number} An integer value representing the number of milliseconds
 *     between midnight, January 1, 1970 and the current time.
 */
goog.now = Date.now || (function() {
  // Unary plus operator converts its operand to a number which in the case of
  // a date is done by calling getTime().
  return +new Date();
});


/**
 * Evals javascript in the global scope.  In IE this uses execScript, other
 * browsers use goog.global.eval. If goog.global.eval does not evaluate in the
 * global scope (for example, in Safari), appends a script tag instead.
 * Throws an exception if neither execScript or eval is defined.
 * @param {string} script JavaScript string.
 */
goog.globalEval = function(script) {
  if (goog.global.execScript) {
    goog.global.execScript(script, 'JavaScript');
  } else if (goog.global.eval) {
    // Test to see if eval works
    if (goog.evalWorksForGlobals_ == null) {
      goog.global.eval('var _et_ = 1;');
      if (typeof goog.global['_et_'] != 'undefined') {
        delete goog.global['_et_'];
        goog.evalWorksForGlobals_ = true;
      } else {
        goog.evalWorksForGlobals_ = false;
      }
    }

    if (goog.evalWorksForGlobals_) {
      goog.global.eval(script);
    } else {
      var doc = goog.global.document;
      var scriptElt = doc.createElement('script');
      scriptElt.type = 'text/javascript';
      scriptElt.defer = false;
      // Note(user): can't use .innerHTML since "t('<test>')" will fail and
      // .text doesn't work in Safari 2.  Therefore we append a text node.
      scriptElt.appendChild(doc.createTextNode(script));
      doc.body.appendChild(scriptElt);
      doc.body.removeChild(scriptElt);
    }
  } else {
    throw Error('goog.globalEval not available');
  }
};


/**
 * Optional map of CSS class names to obfuscated names used with
 * goog.getCssName().
 * @type {Object|undefined}
 * @private
 * @see goog.setCssNameMapping
 */
goog.cssNameMapping_;


/**
 * Optional obfuscation style for CSS class names. Should be set to either
 * 'BY_WHOLE' or 'BY_PART' if defined.
 * @type {string|undefined}
 * @private
 * @see goog.setCssNameMapping
 */
goog.cssNameMappingStyle_;


/**
 * Handles strings that are intended to be used as CSS class names.
 *
 * This function works in tandem with @see goog.setCssNameMapping.
 *
 * Without any mapping set, the arguments are simple joined with a
 * hyphen and passed through unaltered.
 *
 * When there is a mapping, there are two possible styles in which
 * these mappings are used. In the BY_PART style, each part (i.e. in
 * between hyphens) of the passed in css name is rewritten according
 * to the map. In the BY_WHOLE style, the full css name is looked up in
 * the map directly. If a rewrite is not specified by the map, the
 * compiler will output a warning.
 *
 * When the mapping is passed to the compiler, it will replace calls
 * to goog.getCssName with the strings from the mapping, e.g.
 *     var x = goog.getCssName('foo');
 *     var y = goog.getCssName(this.baseClass, 'active');
 *  becomes:
 *     var x= 'foo';
 *     var y = this.baseClass + '-active';
 *
 * If one argument is passed it will be processed, if two are passed
 * only the modifier will be processed, as it is assumed the first
 * argument was generated as a result of calling goog.getCssName.
 *
 * @param {string} className The class name.
 * @param {string=} opt_modifier A modifier to be appended to the class name.
 * @return {string} The class name or the concatenation of the class name and
 *     the modifier.
 */
goog.getCssName = function(className, opt_modifier) {
  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName;
  };

  var renameByParts = function(cssName) {
    // Remap all the parts individually.
    var parts = cssName.split('-');
    var mapped = [];
    for (var i = 0; i < parts.length; i++) {
      mapped.push(getMapping(parts[i]));
    }
    return mapped.join('-');
  };

  var rename;
  if (goog.cssNameMapping_) {
    rename = goog.cssNameMappingStyle_ == 'BY_WHOLE' ?
        getMapping : renameByParts;
  } else {
    rename = function(a) {
      return a;
    };
  }

  if (opt_modifier) {
    return className + '-' + rename(opt_modifier);
  } else {
    return rename(className);
  }
};


/**
 * Sets the map to check when returning a value from goog.getCssName(). Example:
 * <pre>
 * goog.setCssNameMapping({
 *   "goog": "a",
 *   "disabled": "b",
 * });
 *
 * var x = goog.getCssName('goog');
 * // The following evaluates to: "a a-b".
 * goog.getCssName('goog') + ' ' + goog.getCssName(x, 'disabled')
 * </pre>
 * When declared as a map of string literals to string literals, the JSCompiler
 * will replace all calls to goog.getCssName() using the supplied map if the
 * --closure_pass flag is set.
 *
 * @param {!Object} mapping A map of strings to strings where keys are possible
 *     arguments to goog.getCssName() and values are the corresponding values
 *     that should be returned.
 * @param {string=} style The style of css name mapping. There are two valid
 *     options: 'BY_PART', and 'BY_WHOLE'.
 * @see goog.getCssName for a description.
 */
goog.setCssNameMapping = function(mapping, style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = style;
};


/**
 * Abstract implementation of goog.getMsg for use with localized messages.
 * @param {string} str Translatable string, places holders in the form {$foo}.
 * @param {Object=} opt_values Map of place holder name to value.
 * @return {string} message with placeholders filled.
 */
goog.getMsg = function(str, opt_values) {
  var values = opt_values || {};
  for (var key in values) {
    var value = ('' + values[key]).replace(/\$/g, '$$$$');
    str = str.replace(new RegExp('\\{\\$' + key + '\\}', 'gi'), value);
  }
  return str;
};


/**
 * Exposes an unobfuscated global namespace path for the given object.
 * Note that fields of the exported object *will* be obfuscated,
 * unless they are exported in turn via this function or
 * goog.exportProperty
 *
 * <p>Also handy for making public items that are defined in anonymous
 * closures.
 *
 * ex. goog.exportSymbol('Foo', Foo);
 *
 * ex. goog.exportSymbol('public.path.Foo.staticFunction',
 *                       Foo.staticFunction);
 *     public.path.Foo.staticFunction();
 *
 * ex. goog.exportSymbol('public.path.Foo.prototype.myMethod',
 *                       Foo.prototype.myMethod);
 *     new public.path.Foo().myMethod();
 *
 * @param {string} publicPath Unobfuscated name to export.
 * @param {*} object Object the name should point to.
 * @param {Object=} opt_objectToExportTo The object to add the path to; default
 *     is |goog.global|.
 */
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo);
};


/**
 * Exports a property unobfuscated into the object's namespace.
 * ex. goog.exportProperty(Foo, 'staticFunction', Foo.staticFunction);
 * ex. goog.exportProperty(Foo.prototype, 'myMethod', Foo.prototype.myMethod);
 * @param {Object} object Object whose static property is being exported.
 * @param {string} publicName Unobfuscated name to export.
 * @param {*} symbol Object the name should point to.
 */
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol;
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * <pre>
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { }
 *
 * function ChildClass(a, b, c) {
 *   ParentClass.call(this, a, b);
 * }
 *
 * goog.inherits(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // works
 * </pre>
 *
 * In addition, a superclass' implementation of a method can be invoked
 * as follows:
 *
 * <pre>
 * ChildClass.prototype.foo = function(a) {
 *   ChildClass.superClass_.foo.call(this, a);
 *   // other code
 * };
 * </pre>
 *
 * @param {Function} childCtor Child class.
 * @param {Function} parentCtor Parent class.
 */
goog.inherits = function(childCtor, parentCtor) {
  /** @constructor */
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
};


/**
 * Call up to the superclass.
 *
 * If this is called from a constructor, then this calls the superclass
 * contructor with arguments 1-N.
 *
 * If this is called from a prototype method, then you must pass
 * the name of the method as the second argument to this function. If
 * you do not, you will get a runtime error. This calls the superclass'
 * method with arguments 2-N.
 *
 * This function only works if you use goog.inherits to express
 * inheritance relationships between your classes.
 *
 * This function is a compiler primitive. At compile-time, the
 * compiler will do macro expansion to remove a lot of
 * the extra overhead that this function introduces. The compiler
 * will also enforce a lot of the assumptions that this function
 * makes, and treat it as a compiler error if you break them.
 *
 * @param {!Object} me Should always be "this".
 * @param {*=} opt_methodName The method name if calling a super method.
 * @param {...*} var_args The rest of the arguments.
 * @return {*} The return value of the superclass method.
 */
goog.base = function(me, opt_methodName, var_args) {
  var caller = arguments.callee.caller;
  if (caller.superClass_) {
    // This is a constructor. Call the superclass constructor.
    return caller.superClass_.constructor.apply(
        me, Array.prototype.slice.call(arguments, 1));
  }

  var args = Array.prototype.slice.call(arguments, 2);
  var foundCaller = false;
  for (var ctor = me.constructor;
       ctor; ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if (ctor.prototype[opt_methodName] === caller) {
      foundCaller = true;
    } else if (foundCaller) {
      return ctor.prototype[opt_methodName].apply(me, args);
    }
  }

  // If we did not find the caller in the prototype chain,
  // then one of two things happened:
  // 1) The caller is an instance method.
  // 2) This method was not called by the right caller.
  if (me[opt_methodName] === caller) {
    return me.constructor.prototype[opt_methodName].apply(me, args);
  } else {
    throw Error(
        'goog.base called from a method of one name ' +
        'to a method of a different name');
  }
};


/**
 * Allow for aliasing within scope functions.  This function exists for
 * uncompiled code - in compiled code the calls will be inlined and the
 * aliases applied.  In uncompiled code the function is simply run since the
 * aliases as written are valid JavaScript.
 * @param {function()} fn Function to call.  This function can contain aliases
 *     to namespaces (e.g. "var dom = goog.dom") or classes
 *    (e.g. "var Timer = goog.Timer").
 */
goog.scope = function(fn) {
  fn.call(goog.global);
};


// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Provides a base class for custom Error objects such that the
 * stack is correctly maintained.
 *
 * You should never need to throw goog.debug.Error(msg) directly, Error(msg) is
 * sufficient.
 *
 */

goog.provide('goog.debug.Error');



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
goog.debug.Error = function(opt_msg) {

  // Ensure there is a stack trace.
  this.stack = new Error().stack || '';

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(goog.debug.Error, Error);


/** @inheritDoc */
goog.debug.Error.prototype.name = 'CustomError';
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for string manipulation.
 */


/**
 * Namespace for string utilities
 */
goog.provide('goog.string');
goog.provide('goog.string.Unicode');


/**
 * Common Unicode string characters.
 * @enum {string}
 */
goog.string.Unicode = {
  NBSP: '\xa0'
};


/**
 * Fast prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix A string to look for at the start of {@code str}.
 * @return {boolean} True if {@code str} begins with {@code prefix}.
 */
goog.string.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0;
};


/**
 * Fast suffix-checker.
 * @param {string} str The string to check.
 * @param {string} suffix A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} ends with {@code suffix}.
 */
goog.string.endsWith = function(str, suffix) {
  var l = str.length - suffix.length;
  return l >= 0 && str.indexOf(suffix, l) == l;
};


/**
 * Case-insensitive prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix  A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} begins with {@code prefix} (ignoring
 *     case).
 */
goog.string.caseInsensitiveStartsWith = function(str, prefix) {
  return goog.string.caseInsensitiveCompare(
      prefix, str.substr(0, prefix.length)) == 0;
};


/**
 * Case-insensitive suffix-checker.
 * @param {string} str The string to check.
 * @param {string} suffix A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} ends with {@code suffix} (ignoring
 *     case).
 */
goog.string.caseInsensitiveEndsWith = function(str, suffix) {
  return goog.string.caseInsensitiveCompare(
      suffix, str.substr(str.length - suffix.length, suffix.length)) == 0;
};


/**
 * Does simple python-style string substitution.
 * subs("foo%s hot%s", "bar", "dog") becomes "foobar hotdog".
 * @param {string} str The string containing the pattern.
 * @param {...*} var_args The items to substitute into the pattern.
 * @return {string} A copy of {@code str} in which each occurrence of
 *     {@code %s} has been replaced an argument from {@code var_args}.
 */
goog.string.subs = function(str, var_args) {
  // This appears to be slow, but testing shows it compares more or less
  // equivalent to the regex.exec method.
  for (var i = 1; i < arguments.length; i++) {
    // We cast to String in case an argument is a Function.  Replacing $&, for
    // example, with $$$& stops the replace from subsituting the whole match
    // into the resultant string.  $$$& in the first replace becomes $$& in the
    //  second, which leaves $& in the resultant string.  Also:
    // $$, $`, $', $n $nn
    var replacement = String(arguments[i]).replace(/\$/g, '$$$$');
    str = str.replace(/\%s/, replacement);
  }
  return str;
};


/**
 * Converts multiple whitespace chars (spaces, non-breaking-spaces, new lines
 * and tabs) to a single space, and strips leading and trailing whitespace.
 * @param {string} str Input string.
 * @return {string} A copy of {@code str} with collapsed whitespace.
 */
goog.string.collapseWhitespace = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/[\s\xa0]+/g, ' ').replace(/^\s+|\s+$/g, '');
};


/**
 * Checks if a string is empty or contains only whitespaces.
 * @param {string} str The string to check.
 * @return {boolean} True if {@code str} is empty or whitespace only.
 */
goog.string.isEmpty = function(str) {
  // testing length == 0 first is actually slower in all browsers (about the
  // same in Opera).
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return /^[\s\xa0]*$/.test(str);
};


/**
 * Checks if a string is null, empty or contains only whitespaces.
 * @param {*} str The string to check.
 * @return {boolean} True if{@code str} is null, empty, or whitespace only.
 */
goog.string.isEmptySafe = function(str) {
  return goog.string.isEmpty(goog.string.makeSafe(str));
};


/**
 * Checks if a string is all breaking whitespace.
 * @param {string} str The string to check.
 * @return {boolean} Whether the string is all breaking whitespace.
 */
goog.string.isBreakingWhitespace = function(str) {
  return !/[^\t\n\r ]/.test(str);
};


/**
 * Checks if a string contains all letters.
 * @param {string} str string to check.
 * @return {boolean} True if {@code str} consists entirely of letters.
 */
goog.string.isAlpha = function(str) {
  return !/[^a-zA-Z]/.test(str);
};


/**
 * Checks if a string contains only numbers.
 * @param {*} str string to check. If not a string, it will be
 *     casted to one.
 * @return {boolean} True if {@code str} is numeric.
 */
goog.string.isNumeric = function(str) {
  return !/[^0-9]/.test(str);
};


/**
 * Checks if a string contains only numbers or letters.
 * @param {string} str string to check.
 * @return {boolean} True if {@code str} is alphanumeric.
 */
goog.string.isAlphaNumeric = function(str) {
  return !/[^a-zA-Z0-9]/.test(str);
};


/**
 * Checks if a character is a space character.
 * @param {string} ch Character to check.
 * @return {boolean} True if {code ch} is a space.
 */
goog.string.isSpace = function(ch) {
  return ch == ' ';
};


/**
 * Checks if a character is a valid unicode character.
 * @param {string} ch Character to check.
 * @return {boolean} True if {code ch} is a valid unicode character.
 */
goog.string.isUnicodeChar = function(ch) {
  return ch.length == 1 && ch >= ' ' && ch <= '~' ||
         ch >= '\u0080' && ch <= '\uFFFD';
};


/**
 * Takes a string and replaces newlines with a space. Multiple lines are
 * replaced with a single space.
 * @param {string} str The string from which to strip newlines.
 * @return {string} A copy of {@code str} stripped of newlines.
 */
goog.string.stripNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)+/g, ' ');
};


/**
 * Replaces Windows and Mac new lines with unix style: \r or \r\n with \n.
 * @param {string} str The string to in which to canonicalize newlines.
 * @return {string} {@code str} A copy of {@code} with canonicalized newlines.
 */
goog.string.canonicalizeNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)/g, '\n');
};


/**
 * Normalizes whitespace in a string, replacing all whitespace chars with
 * a space.
 * @param {string} str The string in which to normalize whitespace.
 * @return {string} A copy of {@code str} with all whitespace normalized.
 */
goog.string.normalizeWhitespace = function(str) {
  return str.replace(/\xa0|\s/g, ' ');
};


/**
 * Normalizes spaces in a string, replacing all consecutive spaces and tabs
 * with a single space. Replaces non-breaking space with a space.
 * @param {string} str The string in which to normalize spaces.
 * @return {string} A copy of {@code str} with all consecutive spaces and tabs
 *    replaced with a single space.
 */
goog.string.normalizeSpaces = function(str) {
  return str.replace(/\xa0|[ \t]+/g, ' ');
};


/**
 * Trims white spaces to the left and right of a string.
 * @param {string} str The string to trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trim = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
};


/**
 * Trims whitespaces at the left end of a string.
 * @param {string} str The string to left trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trimLeft = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/^[\s\xa0]+/, '');
};


/**
 * Trims whitespaces at the right end of a string.
 * @param {string} str The string to right trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trimRight = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/[\s\xa0]+$/, '');
};


/**
 * A string comparator that ignores case.
 * -1 = str1 less than str2
 *  0 = str1 equals str2
 *  1 = str1 greater than str2
 *
 * @param {string} str1 The string to compare.
 * @param {string} str2 The string to compare {@code str1} to.
 * @return {number} The comparator result, as described above.
 */
goog.string.caseInsensitiveCompare = function(str1, str2) {
  var test1 = String(str1).toLowerCase();
  var test2 = String(str2).toLowerCase();

  if (test1 < test2) {
    return -1;
  } else if (test1 == test2) {
    return 0;
  } else {
    return 1;
  }
};


/**
 * Regular expression used for splitting a string into substrings of fractional
 * numbers, integers, and non-numeric characters.
 * @type {RegExp}
 * @private
 */
goog.string.numerateCompareRegExp_ = /(\.\d+)|(\d+)|(\D+)/g;


/**
 * String comparison function that handles numbers in a way humans might expect.
 * Using this function, the string "File 2.jpg" sorts before "File 10.jpg". The
 * comparison is mostly case-insensitive, though strings that are identical
 * except for case are sorted with the upper-case strings before lower-case.
 *
 * This comparison function is significantly slower (about 500x) than either
 * the default or the case-insensitive compare. It should not be used in
 * time-critical code, but should be fast enough to sort several hundred short
 * strings (like filenames) with a reasonable delay.
 *
 * @param {string} str1 The string to compare in a numerically sensitive way.
 * @param {string} str2 The string to compare {@code str1} to.
 * @return {number} less than 0 if str1 < str2, 0 if str1 == str2, greater than
 *     0 if str1 > str2.
 */
goog.string.numerateCompare = function(str1, str2) {
  if (str1 == str2) {
    return 0;
  }
  if (!str1) {
    return -1;
  }
  if (!str2) {
    return 1;
  }

  // Using match to split the entire string ahead of time turns out to be faster
  // for most inputs than using RegExp.exec or iterating over each character.
  var tokens1 = str1.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var tokens2 = str2.toLowerCase().match(goog.string.numerateCompareRegExp_);

  var count = Math.min(tokens1.length, tokens2.length);

  for (var i = 0; i < count; i++) {
    var a = tokens1[i];
    var b = tokens2[i];

    // Compare pairs of tokens, returning if one token sorts before the other.
    if (a != b) {

      // Only if both tokens are integers is a special comparison required.
      // Decimal numbers are sorted as strings (e.g., '.09' < '.1').
      var num1 = parseInt(a, 10);
      if (!isNaN(num1)) {
        var num2 = parseInt(b, 10);
        if (!isNaN(num2) && num1 - num2) {
          return num1 - num2;
        }
      }
      return a < b ? -1 : 1;
    }
  }

  // If one string is a substring of the other, the shorter string sorts first.
  if (tokens1.length != tokens2.length) {
    return tokens1.length - tokens2.length;
  }

  // The two strings must be equivalent except for case (perfect equality is
  // tested at the head of the function.) Revert to default ASCII-betical string
  // comparison to stablize the sort.
  return str1 < str2 ? -1 : 1;
};


/**
 * Regular expression used for determining if a string needs to be encoded.
 * @type {RegExp}
 * @private
 */
goog.string.encodeUriRegExp_ = /^[a-zA-Z0-9\-_.!~*'()]*$/;


/**
 * URL-encodes a string
 * @param {*} str The string to url-encode.
 * @return {string} An encoded copy of {@code str} that is safe for urls.
 *     Note that '#', ':', and other characters used to delimit portions
 *     of URLs *will* be encoded.
 */
goog.string.urlEncode = function(str) {
  str = String(str);
  // Checking if the search matches before calling encodeURIComponent avoids an
  // extra allocation in IE6. This adds about 10us time in FF and a similiar
  // over head in IE6 for lower working set apps, but for large working set
  // apps like Gmail, it saves about 70us per call.
  if (!goog.string.encodeUriRegExp_.test(str)) {
    return encodeURIComponent(str);
  }
  return str;
};


/**
 * URL-decodes the string. We need to specially handle '+'s because
 * the javascript library doesn't convert them to spaces.
 * @param {string} str The string to url decode.
 * @return {string} The decoded {@code str}.
 */
goog.string.urlDecode = function(str) {
  return decodeURIComponent(str.replace(/\+/g, ' '));
};


/**
 * Converts \n to <br>s or <br />s.
 * @param {string} str The string in which to convert newlines.
 * @param {boolean=} opt_xml Whether to use XML compatible tags.
 * @return {string} A copy of {@code str} with converted newlines.
 */
goog.string.newLineToBr = function(str, opt_xml) {
  return str.replace(/(\r\n|\r|\n)/g, opt_xml ? '<br />' : '<br>');
};


/**
 * Escape double quote '"' characters in addition to '&', '<', and '>' so that a
 * string can be included in an HTML tag attribute value within double quotes.
 *
 * It should be noted that > doesn't need to be escaped for the HTML or XML to
 * be valid, but it has been decided to escape it for consistency with other
 * implementations.
 *
 * NOTE(user):
 * HtmlEscape is often called during the generation of large blocks of HTML.
 * Using statics for the regular expressions and strings is an optimization
 * that can more than half the amount of time IE spends in this function for
 * large apps, since strings and regexes both contribute to GC allocations.
 *
 * Testing for the presence of a character before escaping increases the number
 * of function calls, but actually provides a speed increase for the average
 * case -- since the average case often doesn't require the escaping of all 4
 * characters and indexOf() is much cheaper than replace().
 * The worst case does suffer slightly from the additional calls, therefore the
 * opt_isLikelyToContainHtmlChars option has been included for situations
 * where all 4 HTML entities are very likely to be present and need escaping.
 *
 * Some benchmarks (times tended to fluctuate +-0.05ms):
 *                                     FireFox                     IE6
 * (no chars / average (mix of cases) / all 4 chars)
 * no checks                     0.13 / 0.22 / 0.22         0.23 / 0.53 / 0.80
 * indexOf                       0.08 / 0.17 / 0.26         0.22 / 0.54 / 0.84
 * indexOf + re test             0.07 / 0.17 / 0.28         0.19 / 0.50 / 0.85
 *
 * An additional advantage of checking if replace actually needs to be called
 * is a reduction in the number of object allocations, so as the size of the
 * application grows the difference between the various methods would increase.
 *
 * @param {string} str string to be escaped.
 * @param {boolean=} opt_isLikelyToContainHtmlChars Don't perform a check to see
 *     if the character needs replacing - use this option if you expect each of
 *     the characters to appear often. Leave false if you expect few html
 *     characters to occur in your strings, such as if you are escaping HTML.
 * @return {string} An escaped copy of {@code str}.
 */
goog.string.htmlEscape = function(str, opt_isLikelyToContainHtmlChars) {

  if (opt_isLikelyToContainHtmlChars) {
    return str.replace(goog.string.amperRe_, '&amp;')
          .replace(goog.string.ltRe_, '&lt;')
          .replace(goog.string.gtRe_, '&gt;')
          .replace(goog.string.quotRe_, '&quot;');

  } else {
    // quick test helps in the case when there are no chars to replace, in
    // worst case this makes barely a difference to the time taken
    if (!goog.string.allRe_.test(str)) return str;

    // str.indexOf is faster than regex.test in this case
    if (str.indexOf('&') != -1) {
      str = str.replace(goog.string.amperRe_, '&amp;');
    }
    if (str.indexOf('<') != -1) {
      str = str.replace(goog.string.ltRe_, '&lt;');
    }
    if (str.indexOf('>') != -1) {
      str = str.replace(goog.string.gtRe_, '&gt;');
    }
    if (str.indexOf('"') != -1) {
      str = str.replace(goog.string.quotRe_, '&quot;');
    }
    return str;
  }
};


/**
 * Regular expression that matches an ampersand, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.amperRe_ = /&/g;


/**
 * Regular expression that matches a less than sign, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.ltRe_ = /</g;


/**
 * Regular expression that matches a greater than sign, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.gtRe_ = />/g;


/**
 * Regular expression that matches a double quote, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.quotRe_ = /\"/g;


/**
 * Regular expression that matches any character that needs to be escaped.
 * @type {RegExp}
 * @private
 */
goog.string.allRe_ = /[&<>\"]/;


/**
 * Unescapes an HTML string.
 *
 * @param {string} str The string to unescape.
 * @return {string} An unescaped copy of {@code str}.
 */
goog.string.unescapeEntities = function(str) {
  if (goog.string.contains(str, '&')) {
    // We are careful not to use a DOM if we do not have one. We use the []
    // notation so that the JSCompiler will not complain about these objects and
    // fields in the case where we have no DOM.
    // If the string contains < then there could be a script tag in there and in
    // that case we fall back to a non DOM solution as well.
    if ('document' in goog.global && !goog.string.contains(str, '<')) {
      return goog.string.unescapeEntitiesUsingDom_(str);
    } else {
      // Fall back on pure XML entities
      return goog.string.unescapePureXmlEntities_(str);
    }
  }
  return str;
};


/**
 * Unescapes an HTML string using a DOM. Don't use this function directly, it
 * should only be used by unescapeEntities. If used directly you will be
 * vulnerable to XSS attacks.
 * @private
 * @param {string} str The string to unescape.
 * @return {string} The unescaped {@code str} string.
 */
goog.string.unescapeEntitiesUsingDom_ = function(str) {
  // Use a DIV as FF3 generates bogus markup for A > PRE.
  var el = goog.global['document']['createElement']('div');
  // Wrap in PRE to preserve whitespace in IE.
  // The PRE must be part of the innerHTML markup,
  // just setting innerHTML on a PRE element does not work.
  // Also include a leading character since conforming HTML5
  // UAs will strip leading newlines inside a PRE element.
  el['innerHTML'] = '<pre>x' + str + '</pre>';
  // Accesing the function directly triggers some virus scanners.
  if (el['firstChild'][goog.string.NORMALIZE_FN_]) {
    el['firstChild'][goog.string.NORMALIZE_FN_]();
  }
  // Remove the leading character we added.
  str = el['firstChild']['firstChild']['nodeValue'].slice(1);
  el['innerHTML'] = '';
  // IE will also return non-standard newlines for TextNode.nodeValue,
  // switching \r and \n, so canonicalize them before returning.
  return goog.string.canonicalizeNewlines(str);
};


/**
 * Unescapes XML entities.
 * @private
 * @param {string} str The string to unescape.
 * @return {string} An unescaped copy of {@code str}.
 */
goog.string.unescapePureXmlEntities_ = function(str) {
  return str.replace(/&([^;]+);/g, function(s, entity) {
    switch (entity) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      default:
        if (entity.charAt(0) == '#') {
          var n = Number('0' + entity.substr(1));
          if (!isNaN(n)) {
            return String.fromCharCode(n);
          }
        }
        // For invalid entities we just return the entity
        return s;
    }
  });
};


/**
 * String name for the node.normalize function. Anti-virus programs use this as
 * a signature for some viruses so we need a work around (temporary).
 * @private
 * @type {string}
 */
goog.string.NORMALIZE_FN_ = 'normalize';


/**
 * Do escaping of whitespace to preserve spatial formatting. We use character
 * entity #160 to make it safer for xml.
 * @param {string} str The string in which to escape whitespace.
 * @param {boolean=} opt_xml Whether to use XML compatible tags.
 * @return {string} An escaped copy of {@code str}.
 */
goog.string.whitespaceEscape = function(str, opt_xml) {
  return goog.string.newLineToBr(str.replace(/  /g, ' &#160;'), opt_xml);
};


/**
 * Strip quote characters around a string.  The second argument is a string of
 * characters to treat as quotes.  This can be a single character or a string of
 * multiple character and in that case each of those are treated as possible
 * quote characters. For example:
 *
 * <pre>
 * goog.string.stripQuotes('"abc"', '"`') --> 'abc'
 * goog.string.stripQuotes('`abc`', '"`') --> 'abc'
 * </pre>
 *
 * @param {string} str The string to strip.
 * @param {string} quoteChars The quote characters to strip.
 * @return {string} A copy of {@code str} without the quotes.
 */
goog.string.stripQuotes = function(str, quoteChars) {
  var length = quoteChars.length;
  for (var i = 0; i < length; i++) {
    var quoteChar = length == 1 ? quoteChars : quoteChars.charAt(i);
    if (str.charAt(0) == quoteChar && str.charAt(str.length - 1) == quoteChar) {
      return str.substring(1, str.length - 1);
    }
  }
  return str;
};


/**
 * Truncates a string to a certain length and adds '...' if necessary.  The
 * length also accounts for the ellipsis, so a maximum length of 10 and a string
 * 'Hello World!' produces 'Hello W...'.
 * @param {string} str The string to truncate.
 * @param {number} chars Max number of characters.
 * @param {boolean=} opt_protectEscapedCharacters Whether to protect escaped
 *     characters from being cut off in the middle.
 * @return {string} The truncated {@code str} string.
 */
goog.string.truncate = function(str, chars, opt_protectEscapedCharacters) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }

  if (str.length > chars) {
    str = str.substring(0, chars - 3) + '...';
  }

  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }

  return str;
};


/**
 * Truncate a string in the middle, adding "..." if necessary,
 * and favoring the beginning of the string.
 * @param {string} str The string to truncate the middle of.
 * @param {number} chars Max number of characters.
 * @param {boolean=} opt_protectEscapedCharacters Whether to protect escaped
 *     characters from being cutoff in the middle.
 * @param {number=} opt_trailingChars Optional number of trailing characters to
 *     leave at the end of the string, instead of truncating as close to the
 *     middle as possible.
 * @return {string} A truncated copy of {@code str}.
 */
goog.string.truncateMiddle = function(str, chars,
    opt_protectEscapedCharacters, opt_trailingChars) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }

  if (opt_trailingChars) {
    if (opt_trailingChars > chars) {
      opt_trailingChars = chars;
    }
    var endPoint = str.length - opt_trailingChars;
    var startPoint = chars - opt_trailingChars;
    str = str.substring(0, startPoint) + '...' + str.substring(endPoint);
  } else if (str.length > chars) {
    // Favor the beginning of the string:
    var half = Math.floor(chars / 2);
    var endPos = str.length - half;
    half += chars % 2;
    str = str.substring(0, half) + '...' + str.substring(endPos);
  }

  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }

  return str;
};


/**
 * Special chars that need to be escaped for goog.string.quote.
 * @private
 * @type {Object}
 */
goog.string.specialEscapeChars_ = {
  '\0': '\\0',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\x0B': '\\x0B', // '\v' is not supported in JScript
  '"': '\\"',
  '\\': '\\\\'
};


/**
 * Character mappings used internally for goog.string.escapeChar.
 * @private
 * @type {Object}
 */
goog.string.jsEscapeCache_ = {
  '\'': '\\\''
};


/**
 * Encloses a string in double quotes and escapes characters so that the
 * string is a valid JS string.
 * @param {string} s The string to quote.
 * @return {string} A copy of {@code s} surrounded by double quotes.
 */
goog.string.quote = function(s) {
  s = String(s);
  if (s.quote) {
    return s.quote();
  } else {
    var sb = ['"'];
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      var cc = ch.charCodeAt(0);
      sb[i + 1] = goog.string.specialEscapeChars_[ch] ||
          ((cc > 31 && cc < 127) ? ch : goog.string.escapeChar(ch));
    }
    sb.push('"');
    return sb.join('');
  }
};


/**
 * Takes a string and returns the escaped string for that character.
 * @param {string} str The string to escape.
 * @return {string} An escaped string representing {@code str}.
 */
goog.string.escapeString = function(str) {
  var sb = [];
  for (var i = 0; i < str.length; i++) {
    sb[i] = goog.string.escapeChar(str.charAt(i));
  }
  return sb.join('');
};


/**
 * Takes a character and returns the escaped string for that character. For
 * example escapeChar(String.fromCharCode(15)) -> "\\x0E".
 * @param {string} c The character to escape.
 * @return {string} An escaped string representing {@code c}.
 */
goog.string.escapeChar = function(c) {
  if (c in goog.string.jsEscapeCache_) {
    return goog.string.jsEscapeCache_[c];
  }

  if (c in goog.string.specialEscapeChars_) {
    return goog.string.jsEscapeCache_[c] = goog.string.specialEscapeChars_[c];
  }

  var rv = c;
  var cc = c.charCodeAt(0);
  if (cc > 31 && cc < 127) {
    rv = c;
  } else {
    // tab is 9 but handled above
    if (cc < 256) {
      rv = '\\x';
      if (cc < 16 || cc > 256) {
        rv += '0';
      }
    } else {
      rv = '\\u';
      if (cc < 4096) { // \u1000
        rv += '0';
      }
    }
    rv += cc.toString(16).toUpperCase();
  }

  return goog.string.jsEscapeCache_[c] = rv;
};


/**
 * Takes a string and creates a map (Object) in which the keys are the
 * characters in the string. The value for the key is set to true. You can
 * then use goog.object.map or goog.array.map to change the values.
 * @param {string} s The string to build the map from.
 * @return {Object} The map of characters used.
 */
// TODO(user): It seems like we should have a generic goog.array.toMap. But do
//            we want a dependency on goog.array in goog.string?
goog.string.toMap = function(s) {
  var rv = {};
  for (var i = 0; i < s.length; i++) {
    rv[s.charAt(i)] = true;
  }
  return rv;
};


/**
 * Checks whether a string contains a given character.
 * @param {string} s The string to test.
 * @param {string} ss The substring to test for.
 * @return {boolean} True if {@code s} contains {@code ss}.
 */
goog.string.contains = function(s, ss) {
  return s.indexOf(ss) != -1;
};


/**
 * Removes a substring of a specified length at a specific
 * index in a string.
 * @param {string} s The base string from which to remove.
 * @param {number} index The index at which to remove the substring.
 * @param {number} stringLength The length of the substring to remove.
 * @return {string} A copy of {@code s} with the substring removed or the full
 *     string if nothing is removed or the input is invalid.
 */
goog.string.removeAt = function(s, index, stringLength) {
  var resultStr = s;
  // If the index is greater or equal to 0 then remove substring
  if (index >= 0 && index < s.length && stringLength > 0) {
    resultStr = s.substr(0, index) +
        s.substr(index + stringLength, s.length - index - stringLength);
  }
  return resultStr;
};


/**
 *  Removes the first occurrence of a substring from a string.
 *  @param {string} s The base string from which to remove.
 *  @param {string} ss The string to remove.
 *  @return {string} A copy of {@code s} with {@code ss} removed or the full
 *      string if nothing is removed.
 */
goog.string.remove = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), '');
  return s.replace(re, '');
};


/**
 *  Removes all occurrences of a substring from a string.
 *  @param {string} s The base string from which to remove.
 *  @param {string} ss The string to remove.
 *  @return {string} A copy of {@code s} with {@code ss} removed or the full
 *      string if nothing is removed.
 */
goog.string.removeAll = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), 'g');
  return s.replace(re, '');
};


/**
 * Escapes characters in the string that are not safe to use in a RegExp.
 * @param {*} s The string to escape. If not a string, it will be casted
 *     to one.
 * @return {string} A RegExp safe, escaped copy of {@code s}.
 */
goog.string.regExpEscape = function(s) {
  return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').
      replace(/\x08/g, '\\x08');
};


/**
 * Repeats a string n times.
 * @param {string} string The string to repeat.
 * @param {number} length The number of times to repeat.
 * @return {string} A string containing {@code length} repetitions of
 *     {@code string}.
 */
goog.string.repeat = function(string, length) {
  return new Array(length + 1).join(string);
};


/**
 * Pads number to given length and optionally rounds it to a given precision.
 * For example:
 * <pre>padNumber(1.25, 2, 3) -> '01.250'
 * padNumber(1.25, 2) -> '01.25'
 * padNumber(1.25, 2, 1) -> '01.3'
 * padNumber(1.25, 0) -> '1.25'</pre>
 *
 * @param {number} num The number to pad.
 * @param {number} length The desired length.
 * @param {number=} opt_precision The desired precision.
 * @return {string} {@code num} as a string with the given options.
 */
goog.string.padNumber = function(num, length, opt_precision) {
  var s = goog.isDef(opt_precision) ? num.toFixed(opt_precision) : String(num);
  var index = s.indexOf('.');
  if (index == -1) {
    index = s.length;
  }
  return goog.string.repeat('0', Math.max(0, length - index)) + s;
};


/**
 * Returns a string representation of the given object, with
 * null and undefined being returned as the empty string.
 *
 * @param {*} obj The object to convert.
 * @return {string} A string representation of the {@code obj}.
 */
goog.string.makeSafe = function(obj) {
  return obj == null ? '' : String(obj);
};


/**
 * Concatenates string expressions. This is useful
 * since some browsers are very inefficient when it comes to using plus to
 * concat strings. Be careful when using null and undefined here since
 * these will not be included in the result. If you need to represent these
 * be sure to cast the argument to a String first.
 * For example:
 * <pre>buildString('a', 'b', 'c', 'd') -> 'abcd'
 * buildString(null, undefined) -> ''
 * </pre>
 * @param {...*} var_args A list of strings to concatenate. If not a string,
 *     it will be casted to one.
 * @return {string} The concatenation of {@code var_args}.
 */
goog.string.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, '');
};


/**
 * Returns a string with at least 64-bits of randomness.
 *
 * Doesn't trust Javascript's random function entirely. Uses a combination of
 * random and current timestamp, and then encodes the string in base-36 to
 * make it shorter.
 *
 * @return {string} A random string, e.g. sn1s7vb4gcic.
 */
goog.string.getRandomString = function() {
  var x = 2147483648;
  return Math.floor(Math.random() * x).toString(36) +
         Math.abs(Math.floor(Math.random() * x) ^ goog.now()).toString(36);
};


/**
 * Compares two version numbers.
 *
 * @param {string|number} version1 Version of first item.
 * @param {string|number} version2 Version of second item.
 *
 * @return {number}  1 if {@code version1} is higher.
 *                   0 if arguments are equal.
 *                  -1 if {@code version2} is higher.
 */
goog.string.compareVersions = function(version1, version2) {
  var order = 0;
  // Trim leading and trailing whitespace and split the versions into
  // subversions.
  var v1Subs = goog.string.trim(String(version1)).split('.');
  var v2Subs = goog.string.trim(String(version2)).split('.');
  var subCount = Math.max(v1Subs.length, v2Subs.length);

  // Iterate over the subversions, as long as they appear to be equivalent.
  for (var subIdx = 0; order == 0 && subIdx < subCount; subIdx++) {
    var v1Sub = v1Subs[subIdx] || '';
    var v2Sub = v2Subs[subIdx] || '';

    // Split the subversions into pairs of numbers and qualifiers (like 'b').
    // Two different RegExp objects are needed because they are both using
    // the 'g' flag.
    var v1CompParser = new RegExp('(\\d*)(\\D*)', 'g');
    var v2CompParser = new RegExp('(\\d*)(\\D*)', 'g');
    do {
      var v1Comp = v1CompParser.exec(v1Sub) || ['', '', ''];
      var v2Comp = v2CompParser.exec(v2Sub) || ['', '', ''];
      // Break if there are no more matches.
      if (v1Comp[0].length == 0 && v2Comp[0].length == 0) {
        break;
      }

      // Parse the numeric part of the subversion. A missing number is
      // equivalent to 0.
      var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
      var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);

      // Compare the subversion components. The number has the highest
      // precedence. Next, if the numbers are equal, a subversion without any
      // qualifier is always higher than a subversion with any qualifier. Next,
      // the qualifiers are compared as strings.
      order = goog.string.compareElements_(v1CompNum, v2CompNum) ||
          goog.string.compareElements_(v1Comp[2].length == 0,
              v2Comp[2].length == 0) ||
          goog.string.compareElements_(v1Comp[2], v2Comp[2]);
      // Stop as soon as an inequality is discovered.
    } while (order == 0);
  }

  return order;
};


/**
 * Compares elements of a version number.
 *
 * @param {string|number|boolean} left An element from a version number.
 * @param {string|number|boolean} right An element from a version number.
 *
 * @return {number}  1 if {@code left} is higher.
 *                   0 if arguments are equal.
 *                  -1 if {@code right} is higher.
 * @private
 */
goog.string.compareElements_ = function(left, right) {
  if (left < right) {
    return -1;
  } else if (left > right) {
    return 1;
  }
  return 0;
};


/**
 * Maximum value of #goog.string.hashCode, exclusive. 2^32.
 * @type {number}
 * @private
 */
goog.string.HASHCODE_MAX_ = 0x100000000;


/**
 * String hash function similar to java.lang.String.hashCode().
 * The hash code for a string is computed as
 * s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
 * where s[i] is the ith character of the string and n is the length of
 * the string. We mod the result to make it between 0 (inclusive) and 2^32
 * (exclusive).
 * @param {string} str A string.
 * @return {number} Hash value for {@code str}, between 0 (inclusive) and 2^32
 *  (exclusive). The empty string returns 0.
 */
goog.string.hashCode = function(str) {
  var result = 0;
  for (var i = 0; i < str.length; ++i) {
    result = 31 * result + str.charCodeAt(i);
    // Normalize to 4 byte range, 0 ... 2^32.
    result %= goog.string.HASHCODE_MAX_;
  }
  return result;
};


/**
 * The most recent unique ID. |0 is equivalent to Math.floor in this case.
 * @type {number}
 * @private
 */
goog.string.uniqueStringCounter_ = Math.random() * 0x80000000 | 0;


/**
 * Generates and returns a string which is unique in the current document.
 * This is useful, for example, to create unique IDs for DOM elements.
 * @return {string} A unique id.
 */
goog.string.createUniqueString = function() {
  return 'goog_' + goog.string.uniqueStringCounter_++;
};


/**
 * Converts the supplied string to a number, which may be Ininity or NaN.
 * This function strips whitespace: (toNumber(' 123') === 123)
 * This function accepts scientific notation: (toNumber('1e1') === 10)
 *
 * This is better than Javascript's built-in conversions because, sadly:
 *     (Number(' ') === 0) and (parseFloat('123a') === 123)
 *
 * @param {string} str The string to convert.
 * @return {number} The number the supplied string represents, or NaN.
 */
goog.string.toNumber = function(str) {
  var num = Number(str);
  if (num == 0 && goog.string.isEmpty(str)) {
    return NaN;
  }
  return num;
};


/**
 * A memoized cache for goog.string.toCamelCase.
 * @type {Object.<string>}
 * @private
 */
goog.string.toCamelCaseCache_ = {};


/**
 * Converts a string from selector-case to camelCase (e.g. from
 * "multi-part-string" to "multiPartString"), useful for converting
 * CSS selectors and HTML dataset keys to their equivalent JS properties.
 * @param {string} str The string in selector-case form.
 * @return {string} The string in camelCase form.
 */
goog.string.toCamelCase = function(str) {
  return goog.string.toCamelCaseCache_[str] ||
      (goog.string.toCamelCaseCache_[str] =
          String(str).replace(/\-([a-z])/g, function(all, match) {
            return match.toUpperCase();
          }));
};


/**
 * A memoized cache for goog.string.toSelectorCase.
 * @type {Object.<string>}
 * @private
 */
goog.string.toSelectorCaseCache_ = {};


/**
 * Converts a string from camelCase to selector-case (e.g. from
 * "multiPartString" to "multi-part-string"), useful for converting JS
 * style and dataset properties to equivalent CSS selectors and HTML keys.
 * @param {string} str The string in camelCase form.
 * @return {string} The string in selector-case form.
 */
goog.string.toSelectorCase = function(str) {
  return goog.string.toSelectorCaseCache_[str] ||
      (goog.string.toSelectorCaseCache_[str] =
          String(str).replace(/([A-Z])/g, '-$1').toLowerCase());
};
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities to check the preconditions, postconditions and
 * invariants runtime.
 *
 * Methods in this package should be given special treatment by the compiler
 * for type-inference. For example, <code>goog.asserts.assert(foo)</code>
 * will restrict <code>foo</code> to a truthy value.
 *
 * The compiler has an option to disable asserts. So code like:
 * <code>
 * var x = goog.asserts.assert(foo()); goog.asserts.assert(bar());
 * </code>
 * will be transformed into:
 * <code>
 * var x = foo();
 * </code>
 * The compiler will leave in foo() (because its return value is used),
 * but it will remove bar() because it assumes it does not have side-effects.
 *
 */

goog.provide('goog.asserts');
goog.provide('goog.asserts.AssertionError');

goog.require('goog.debug.Error');
goog.require('goog.string');


/**
 * @define {boolean} Whether to strip out asserts or to leave them in.
 */
goog.asserts.ENABLE_ASSERTS = goog.DEBUG;



/**
 * Error object for failed assertions.
 * @param {string} messagePattern The pattern that was used to form message.
 * @param {!Array.<*>} messageArgs The items to substitute into the pattern.
 * @constructor
 * @extends {goog.debug.Error}
 */
goog.asserts.AssertionError = function(messagePattern, messageArgs) {
  messageArgs.unshift(messagePattern);
  goog.debug.Error.call(this, goog.string.subs.apply(null, messageArgs));
  // Remove the messagePattern afterwards to avoid permenantly modifying the
  // passed in array.
  messageArgs.shift();

  /**
   * The message pattern used to format the error message. Error handlers can
   * use this to uniquely identify the assertion.
   * @type {string}
   */
  this.messagePattern = messagePattern;
};
goog.inherits(goog.asserts.AssertionError, goog.debug.Error);


/** @inheritDoc */
goog.asserts.AssertionError.prototype.name = 'AssertionError';


/**
 * Throws an exception with the given message and "Assertion failed" prefixed
 * onto it.
 * @param {string} defaultMessage The message to use if givenMessage is empty.
 * @param {Array.<*>} defaultArgs The substitution arguments for defaultMessage.
 * @param {string|undefined} givenMessage Message supplied by the caller.
 * @param {Array.<*>} givenArgs The substitution arguments for givenMessage.
 * @throws {goog.asserts.AssertionError} When the value is not a number.
 * @private
 */
goog.asserts.doAssertFailure_ =
    function(defaultMessage, defaultArgs, givenMessage, givenArgs) {
  var message = 'Assertion failed';
  if (givenMessage) {
    message += ': ' + givenMessage;
    var args = givenArgs;
  } else if (defaultMessage) {
    message += ': ' + defaultMessage;
    args = defaultArgs;
  }
  // The '' + works around an Opera 10 bug in the unit tests. Without it,
  // a stack trace is added to var message above. With this, a stack trace is
  // not added until this line (it causes the extra garbage to be added after
  // the assertion message instead of in the middle of it).
  throw new goog.asserts.AssertionError('' + message, args || []);
};


/**
 * Checks if the condition evaluates to true if goog.asserts.ENABLE_ASSERTS is
 * true.
 * @param {*} condition The condition to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {*} The value of the condition.
 * @throws {goog.asserts.AssertionError} When the condition evaluates to false.
 */
goog.asserts.assert = function(condition, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !condition) {
    goog.asserts.doAssertFailure_('', null, opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return condition;
};


/**
 * Fails if goog.asserts.ENABLE_ASSERTS is true. This function is useful in case
 * when we want to add a check in the unreachable area like switch-case
 * statement:
 *
 * <pre>
 *  switch(type) {
 *    case FOO: doSomething(); break;
 *    case BAR: doSomethingElse(); break;
 *    default: goog.assert.fail('Unrecognized type: ' + type);
 *      // We have only 2 types - "default:" section is unreachable code.
 *  }
 * </pre>
 *
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @throws {goog.asserts.AssertionError} Failure.
 */
goog.asserts.fail = function(opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS) {
    throw new goog.asserts.AssertionError(
        'Failure' + (opt_message ? ': ' + opt_message : ''),
        Array.prototype.slice.call(arguments, 1));
  }
};


/**
 * Checks if the value is a number if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {number} The value, guaranteed to be a number when asserts enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a number.
 */
goog.asserts.assertNumber = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isNumber(value)) {
    goog.asserts.doAssertFailure_('Expected number but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {number} */ (value);
};


/**
 * Checks if the value is a string if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {string} The value, guaranteed to be a string when asserts enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a string.
 */
goog.asserts.assertString = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isString(value)) {
    goog.asserts.doAssertFailure_('Expected string but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {string} */ (value);
};


/**
 * Checks if the value is a function if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Function} The value, guaranteed to be a function when asserts
 *     enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a function.
 */
goog.asserts.assertFunction = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isFunction(value)) {
    goog.asserts.doAssertFailure_('Expected function but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Function} */ (value);
};


/**
 * Checks if the value is an Object if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Object} The value, guaranteed to be a non-null object.
 * @throws {goog.asserts.AssertionError} When the value is not an object.
 */
goog.asserts.assertObject = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isObject(value)) {
    goog.asserts.doAssertFailure_('Expected object but got %s: %s.',
        [goog.typeOf(value), value],
        opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Object} */ (value);
};


/**
 * Checks if the value is an Array if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Array} The value, guaranteed to be a non-null array.
 * @throws {goog.asserts.AssertionError} When the value is not an array.
 */
goog.asserts.assertArray = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isArray(value)) {
    goog.asserts.doAssertFailure_('Expected array but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Array} */ (value);
};


/**
 * Checks if the value is a boolean if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {boolean} The value, guaranteed to be a boolean when asserts are
 *     enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a boolean.
 */
goog.asserts.assertBoolean = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isBoolean(value)) {
    goog.asserts.doAssertFailure_('Expected boolean but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {boolean} */ (value);
};


/**
 * Checks if the value is an instance of the user-defined type if
 * goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {!Function} type A user-defined constructor.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @throws {goog.asserts.AssertionError} When the value is not an instance of
 *     type.
 */
goog.asserts.assertInstanceof = function(value, type, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !(value instanceof type)) {
    goog.asserts.doAssertFailure_('instanceof check failed.', null,
        opt_message, Array.prototype.slice.call(arguments, 3));
  }
};

// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Simple utilities for dealing with URI strings.
 *
 * This is intended to be a lightweight alternative to constructing goog.Uri
 * objects.  Whereas goog.Uri adds several kilobytes to the binary regardless
 * of how much of its functionality you use, this is designed to be a set of
 * mostly-independent utilities so that the compiler includes only what is
 * necessary for the task.  Estimated savings of porting is 5k pre-gzip and
 * 1.5k post-gzip.  To ensure the savings remain, future developers should
 * avoid adding new functionality to existing functions, but instead create
 * new ones and factor out shared code.
 *
 * Many of these utilities have limited functionality, tailored to common
 * cases.  The query parameter utilities assume that the parameter keys are
 * already encoded, since most keys are compile-time alphanumeric strings.  The
 * query parameter mutation utilities also do not tolerate fragment identifiers.
 *
 * By design, these functions can be slower than goog.Uri equivalents.
 * Repeated calls to some of functions may be quadratic in behavior for IE,
 * although the effect is somewhat limited given the 2kb limit.
 *
 * One advantage of the limited functionality here is that this approach is
 * less sensitive to differences in URI encodings than goog.Uri, since these
 * functions modify the strings in place, rather than decoding and
 * re-encoding.
 *
 * Uses features of RFC 3986 for parsing/formatting URIs:
 *   http://gbiv.com/protocols/uri/rfc/rfc3986.html
 *
 */

goog.provide('goog.uri.utils');
goog.provide('goog.uri.utils.ComponentIndex');

goog.require('goog.asserts');
goog.require('goog.string');


/**
 * Character codes inlined to avoid object allocations due to charCode.
 * @enum {number}
 * @private
 */
goog.uri.utils.CharCode_ = {
  AMPERSAND: 38,
  EQUAL: 61,
  HASH: 35,
  QUESTION: 63
};


/**
 * Builds a URI string from already-encoded parts.
 *
 * No encoding is performed.  Any component may be omitted as either null or
 * undefined.
 *
 * @param {?string=} opt_scheme The scheme such as 'http'.
 * @param {?string=} opt_userInfo The user name before the '@'.
 * @param {?string=} opt_domain The domain such as 'www.google.com', already
 *     URI-encoded.
 * @param {(string|number|null)=} opt_port The port number.
 * @param {?string=} opt_path The path, already URI-encoded.  If it is not
 *     empty, it must begin with a slash.
 * @param {?string=} opt_queryData The URI-encoded query data.
 * @param {?string=} opt_fragment The URI-encoded fragment identifier.
 * @return {string} The fully combined URI.
 */
goog.uri.utils.buildFromEncodedParts = function(opt_scheme, opt_userInfo,
    opt_domain, opt_port, opt_path, opt_queryData, opt_fragment) {
  var out = [];

  if (opt_scheme) {
    out.push(opt_scheme, ':');
  }

  if (opt_domain) {
    out.push('//');

    if (opt_userInfo) {
      out.push(opt_userInfo, '@');
    }

    out.push(opt_domain);

    if (opt_port) {
      out.push(':', opt_port);
    }
  }

  if (opt_path) {
    out.push(opt_path);
  }

  if (opt_queryData) {
    out.push('?', opt_queryData);
  }

  if (opt_fragment) {
    out.push('#', opt_fragment);
  }

  return out.join('');
};


/**
 * A regular expression for breaking a URI into its component parts.
 *
 * {@link http://www.gbiv.com/protocols/uri/rfc/rfc3986.html#RFC2234} says
 * As the "first-match-wins" algorithm is identical to the "greedy"
 * disambiguation method used by POSIX regular expressions, it is natural and
 * commonplace to use a regular expression for parsing the potential five
 * components of a URI reference.
 *
 * The following line is the regular expression for breaking-down a
 * well-formed URI reference into its components.
 *
 * <pre>
 * ^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?
 *  12            3  4          5       6  7        8 9
 * </pre>
 *
 * The numbers in the second line above are only to assist readability; they
 * indicate the reference points for each subexpression (i.e., each paired
 * parenthesis). We refer to the value matched for subexpression <n> as $<n>.
 * For example, matching the above expression to
 * <pre>
 *     http://www.ics.uci.edu/pub/ietf/uri/#Related
 * </pre>
 * results in the following subexpression matches:
 * <pre>
 *    $1 = http:
 *    $2 = http
 *    $3 = //www.ics.uci.edu
 *    $4 = www.ics.uci.edu
 *    $5 = /pub/ietf/uri/
 *    $6 = <undefined>
 *    $7 = <undefined>
 *    $8 = #Related
 *    $9 = Related
 * </pre>
 * where <undefined> indicates that the component is not present, as is the
 * case for the query component in the above example. Therefore, we can
 * determine the value of the five components as
 * <pre>
 *    scheme    = $2
 *    authority = $4
 *    path      = $5
 *    query     = $7
 *    fragment  = $9
 * </pre>
 *
 * The regular expression has been modified slightly to expose the
 * userInfo, domain, and port separately from the authority.
 * The modified version yields
 * <pre>
 *    $1 = http              scheme
 *    $2 = <undefined>       userInfo -\
 *    $3 = www.ics.uci.edu   domain     | authority
 *    $4 = <undefined>       port     -/
 *    $5 = /pub/ietf/uri/    path
 *    $6 = <undefined>       query without ?
 *    $7 = Related           fragment without #
 * </pre>
 * @type {!RegExp}
 * @private
 */
goog.uri.utils.splitRe_ = new RegExp(
    '^' +
    '(?:' +
      '([^:/?#.]+)' +                     // scheme - ignore special characters
                                          // used by other URL parts such as :,
                                          // ?, /, #, and .
    ':)?' +
    '(?://' +
      '(?:([^/?#]*)@)?' +                 // userInfo
      '([\\w\\d\\-\\u0100-\\uffff.%]*)' + // domain - restrict to letters,
                                          // digits, dashes, dots, percent
                                          // escapes, and unicode characters.
      '(?::([0-9]+))?' +                  // port
    ')?' +
    '([^?#]+)?' +                         // path
    '(?:\\?([^#]*))?' +                   // query
    '(?:#(.*))?' +                        // fragment
    '$');


/**
 * The index of each URI component in the return value of goog.uri.utils.split.
 * @enum {number}
 */
goog.uri.utils.ComponentIndex = {
  SCHEME: 1,
  USER_INFO: 2,
  DOMAIN: 3,
  PORT: 4,
  PATH: 5,
  QUERY_DATA: 6,
  FRAGMENT: 7
};


/**
 * Splits a URI into its component parts.
 *
 * Each component can be accessed via the component indices; for example:
 * <pre>
 * goog.uri.utils.split(someStr)[goog.uri.utils.CompontentIndex.QUERY_DATA];
 * </pre>
 *
 * @param {string} uri The URI string to examine.
 * @return {!Array.<string|undefined>} Each component still URI-encoded.
 *     Each component that is present will contain the encoded value, whereas
 *     components that are not present will be undefined or empty, depending
 *     on the browser's regular expression implementation.  Never null, since
 *     arbitrary strings may still look like path names.
 */
goog.uri.utils.split = function(uri) {
  // See @return comment -- never null.
  return /** @type {!Array.<string|undefined>} */ (
      uri.match(goog.uri.utils.splitRe_));
};


/**
 * @param {?string} uri A possibly null string.
 * @return {?string} The string URI-decoded, or null if uri is null.
 * @private
 */
goog.uri.utils.decodeIfPossible_ = function(uri) {
  return uri && decodeURIComponent(uri);
};


/**
 * Gets a URI component by index.
 *
 * It is preferred to use the getPathEncoded() variety of functions ahead,
 * since they are more readable.
 *
 * @param {goog.uri.utils.ComponentIndex} componentIndex The component index.
 * @param {string} uri The URI to examine.
 * @return {?string} The still-encoded component, or null if the component
 *     is not present.
 * @private
 */
goog.uri.utils.getComponentByIndex_ = function(componentIndex, uri) {
  // Convert undefined, null, and empty string into null.
  return goog.uri.utils.split(uri)[componentIndex] || null;
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The protocol or scheme, or null if none.  Does not
 *     include trailing colons or slashes.
 */
goog.uri.utils.getScheme = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.SCHEME, uri);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The user name still encoded, or null if none.
 */
goog.uri.utils.getUserInfoEncoded = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.USER_INFO, uri);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The decoded user info, or null if none.
 */
goog.uri.utils.getUserInfo = function(uri) {
  return goog.uri.utils.decodeIfPossible_(
      goog.uri.utils.getUserInfoEncoded(uri));
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The domain name still encoded, or null if none.
 */
goog.uri.utils.getDomainEncoded = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.DOMAIN, uri);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The decoded domain, or null if none.
 */
goog.uri.utils.getDomain = function(uri) {
  return goog.uri.utils.decodeIfPossible_(goog.uri.utils.getDomainEncoded(uri));
};


/**
 * @param {string} uri The URI to examine.
 * @return {?number} The port number, or null if none.
 */
goog.uri.utils.getPort = function(uri) {
  // Coerce to a number.  If the result of getComponentByIndex_ is null or
  // non-numeric, the number coersion yields NaN.  This will then return
  // null for all non-numeric cases (though also zero, which isn't a relevant
  // port number).
  return Number(goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.PORT, uri)) || null;
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The path still encoded, or null if none. Includes the
 *     leading slash, if any.
 */
goog.uri.utils.getPathEncoded = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.PATH, uri);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The decoded path, or null if none.  Includes the leading
 *     slash, if any.
 */
goog.uri.utils.getPath = function(uri) {
  return goog.uri.utils.decodeIfPossible_(goog.uri.utils.getPathEncoded(uri));
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The query data still encoded, or null if none.  Does not
 *     include the question mark itself.
 */
goog.uri.utils.getQueryData = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.QUERY_DATA, uri);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The fragment identifier, or null if none.  Does not
 *     include the hash mark itself.
 */
goog.uri.utils.getFragmentEncoded = function(uri) {
  // The hash mark may not appear in any other part of the URL.
  var hashIndex = uri.indexOf('#');
  return hashIndex < 0 ? null : uri.substr(hashIndex + 1);
};


/**
 * @param {string} uri The URI to examine.
 * @param {?string} fragment The encoded fragment identifier, or null if none.
 *     Does not include the hash mark itself.
 * @return {string} The URI with the fragment set.
 */
goog.uri.utils.setFragmentEncoded = function(uri, fragment) {
  return goog.uri.utils.removeFragment(uri) + (fragment ? '#' + fragment : '');
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The decoded fragment identifier, or null if none.  Does
 *     not include the hash mark.
 */
goog.uri.utils.getFragment = function(uri) {
  return goog.uri.utils.decodeIfPossible_(
      goog.uri.utils.getFragmentEncoded(uri));
};


/**
 * Extracts everything up to the port of the URI.
 * @param {string} uri The URI string.
 * @return {string} Everything up to and including the port.
 */
goog.uri.utils.getHost = function(uri) {
  var pieces = goog.uri.utils.split(uri);
  return goog.uri.utils.buildFromEncodedParts(
      pieces[goog.uri.utils.ComponentIndex.SCHEME],
      pieces[goog.uri.utils.ComponentIndex.USER_INFO],
      pieces[goog.uri.utils.ComponentIndex.DOMAIN],
      pieces[goog.uri.utils.ComponentIndex.PORT]);
};


/**
 * Extracts the path of the URL and everything after.
 * @param {string} uri The URI string.
 * @return {?string} The URI, starting at the path and including the query
 *     parameters and fragment identifier.
 */
goog.uri.utils.getPathAndAfter = function(uri) {
  var pieces = goog.uri.utils.split(uri);
  return goog.uri.utils.buildFromEncodedParts(null, null, null, null,
      pieces[goog.uri.utils.ComponentIndex.PATH],
      pieces[goog.uri.utils.ComponentIndex.QUERY_DATA],
      pieces[goog.uri.utils.ComponentIndex.FRAGMENT]);
};


/**
 * Gets the URI with the fragment identifier removed.
 * @param {string} uri The URI to examine.
 * @return {string} Everything preceding the hash mark.
 */
goog.uri.utils.removeFragment = function(uri) {
  // The hash mark may not appear in any other part of the URL.
  var hashIndex = uri.indexOf('#');
  return hashIndex < 0 ? uri : uri.substr(0, hashIndex);
};


/**
 * Ensures that two URI's have the exact same domain, scheme, and port.
 *
 * Unlike the version in goog.Uri, this checks protocol, and therefore is
 * suitable for checking against the browser's same-origin policy.
 *
 * @param {string} uri1 The first URI.
 * @param {string} uri2 The second URI.
 * @return {boolean} Whether they have the same domain and port.
 */
goog.uri.utils.haveSameDomain = function(uri1, uri2) {
  var pieces1 = goog.uri.utils.split(uri1);
  var pieces2 = goog.uri.utils.split(uri2);
  return pieces1[goog.uri.utils.ComponentIndex.DOMAIN] ==
             pieces2[goog.uri.utils.ComponentIndex.DOMAIN] &&
         pieces1[goog.uri.utils.ComponentIndex.SCHEME] ==
             pieces2[goog.uri.utils.ComponentIndex.SCHEME] &&
         pieces1[goog.uri.utils.ComponentIndex.PORT] ==
             pieces2[goog.uri.utils.ComponentIndex.PORT];
};


/**
 * Asserts that there are no fragment or query identifiers, only in uncompiled
 * mode.
 * @param {string} uri The URI to examine.
 * @private
 */
goog.uri.utils.assertNoFragmentsOrQueries_ = function(uri) {
  // NOTE: would use goog.asserts here, but jscompiler doesn't know that
  // indexOf has no side effects.
  if (goog.DEBUG && (uri.indexOf('#') >= 0 || uri.indexOf('?') >= 0)) {
    throw Error('goog.uri.utils: Fragment or query identifiers are not ' +
        'supported: [' + uri + ']');
  }
};


/**
 * Supported query parameter values by the parameter serializing utilities.
 *
 * If a value is null or undefined, the key-value pair is skipped, as an easy
 * way to omit parameters conditionally.  Non-array parameters are converted
 * to a string and URI encoded.  Array values are expanded into multiple
 * &key=value pairs, with each element stringized and URI-encoded.
 *
 * @typedef {*}
 */
goog.uri.utils.QueryValue;


/**
 * An array representing a set of query parameters with alternating keys
 * and values.
 *
 * Keys are assumed to be URI encoded already and live at even indices.  See
 * goog.uri.utils.QueryValue for details on how parameter values are encoded.
 *
 * Example:
 * <pre>
 * var data = [
 *   // Simple param: ?name=BobBarker
 *   'name', 'BobBarker',
 *   // Conditional param -- may be omitted entirely.
 *   'specialDietaryNeeds', hasDietaryNeeds() ? getDietaryNeeds() : null,
 *   // Multi-valued param: &house=LosAngeles&house=NewYork&house=null
 *   'house', ['LosAngeles', 'NewYork', null]
 * ];
 * </pre>
 *
 * @typedef {!Array.<string|goog.uri.utils.QueryValue>}
 */
goog.uri.utils.QueryArray;


/**
 * Appends a URI and query data in a string buffer with special preconditions.
 *
 * Internal implementation utility, performing very few object allocations.
 *
 * @param {!Array.<string|undefined>} buffer A string buffer.  The first element
 *     must be the base URI, and may have a fragment identifier.  If the array
 *     contains more than one element, the second element must be an ampersand,
 *     and may be overwritten, depending on the base URI.  Undefined elements
 *     are treated as empty-string.
 * @return {string} The concatenated URI and query data.
 * @private
 */
goog.uri.utils.appendQueryData_ = function(buffer) {
  if (buffer[1]) {
    // At least one query parameter was added.  We need to check the
    // punctuation mark, which is currently an ampersand, and also make sure
    // there aren't any interfering fragment identifiers.
    var baseUri = /** @type {string} */ (buffer[0]);
    var hashIndex = baseUri.indexOf('#');
    if (hashIndex >= 0) {
      // Move the fragment off the base part of the URI into the end.
      buffer.push(baseUri.substr(hashIndex));
      buffer[0] = baseUri = baseUri.substr(0, hashIndex);
    }
    var questionIndex = baseUri.indexOf('?');
    if (questionIndex < 0) {
      // No question mark, so we need a question mark instead of an ampersand.
      buffer[1] = '?';
    } else if (questionIndex == baseUri.length - 1) {
      // Question mark is the very last character of the existing URI, so don't
      // append an additional delimiter.
      buffer[1] = undefined;
    }
  }

  return buffer.join('');
};


/**
 * Appends key=value pairs to an array, supporting multi-valued objects.
 * @param {string} key The key prefix.
 * @param {goog.uri.utils.QueryValue} value The value to serialize.
 * @param {!Array.<string>} pairs The array to which the 'key=value' strings
 *     should be appended.
 * @private
 */
goog.uri.utils.appendKeyValuePairs_ = function(key, value, pairs) {
  if (goog.isArray(value)) {
    // It's an array, so append all elements.  Here, we must convince
    // jscompiler that it is, indeed, an array.
    value = /** @type {Array} */ (value);
    for (var j = 0; j < value.length; j++) {
      pairs.push('&', key);
      // Check for empty string, null and undefined get encoded
      // into the url as literal strings
      if (value[j] !== '') {
        pairs.push('=', goog.string.urlEncode(value[j]));
      }
    }
  } else if (value != null) {
    // Not null or undefined, so safe to append.
    pairs.push('&', key);
    // Check for empty string, null and undefined get encoded
    // into the url as literal strings
    if (value !== '') {
      pairs.push('=', goog.string.urlEncode(value));
    }
  }
};


/**
 * Builds a buffer of query data from a sequence of alternating keys and values.
 *
 * @param {!Array.<string|undefined>} buffer A string buffer to append to.  The
 *     first element appended will be an '&', and may be replaced by the caller.
 * @param {goog.uri.utils.QueryArray|Arguments} keysAndValues An array with
 *     alternating keys and values -- see the typedef.
 * @param {number=} opt_startIndex A start offset into the arary, defaults to 0.
 * @return {!Array.<string|undefined>} The buffer argument.
 * @private
 */
goog.uri.utils.buildQueryDataBuffer_ = function(
    buffer, keysAndValues, opt_startIndex) {
  goog.asserts.assert(Math.max(keysAndValues.length - (opt_startIndex || 0),
      0) % 2 == 0, 'goog.uri.utils: Key/value lists must be even in length.');

  for (var i = opt_startIndex || 0; i < keysAndValues.length; i += 2) {
    goog.uri.utils.appendKeyValuePairs_(
        keysAndValues[i], keysAndValues[i + 1], buffer);
  }

  return buffer;
};


/**
 * Builds a query data string from a sequence of alternating keys and values.
 * Currently generates "&key&" for empty args.
 *
 * @param {goog.uri.utils.QueryArray} keysAndValues Alternating keys and
 *     values.  See the typedef.
 * @param {number=} opt_startIndex A start offset into the arary, defaults to 0.
 * @return {string} The encoded query string, in the for 'a=1&b=2'.
 */
goog.uri.utils.buildQueryData = function(keysAndValues, opt_startIndex) {
  var buffer = goog.uri.utils.buildQueryDataBuffer_(
      [], keysAndValues, opt_startIndex);
  buffer[0] = ''; // Remove the leading ampersand.
  return buffer.join('');
};


/**
 * Builds a buffer of query data from a map.
 *
 * @param {!Array.<string|undefined>} buffer A string buffer to append to.  The
 *     first element appended will be an '&', and may be replaced by the caller.
 * @param {Object.<goog.uri.utils.QueryValue>} map An object where keys are
 *     URI-encoded parameter keys, and the values conform to the contract
 *     specified in the goog.uri.utils.QueryValue typedef.
 * @return {!Array.<string|undefined>} The buffer argument.
 * @private
 */
goog.uri.utils.buildQueryDataBufferFromMap_ = function(buffer, map) {
  for (var key in map) {
    goog.uri.utils.appendKeyValuePairs_(key, map[key], buffer);
  }

  return buffer;
};


/**
 * Builds a query data string from a map.
 * Currently generates "&key&" for empty args.
 *
 * @param {Object} map An object where keys are URI-encoded parameter keys,
 *     and the values are arbitrary types or arrays.  Keys with a null value
 *     are dropped.
 * @return {string} The encoded query string, in the for 'a=1&b=2'.
 */
goog.uri.utils.buildQueryDataFromMap = function(map) {
  var buffer = goog.uri.utils.buildQueryDataBufferFromMap_([], map);
  buffer[0] = '';
  return buffer.join('');
};


/**
 * Appends URI parameters to an existing URI.
 *
 * The variable arguments may contain alternating keys and values.  Keys are
 * assumed to be already URI encoded.  The values should not be URI-encoded,
 * and will instead be encoded by this function.
 * <pre>
 * appendParams('http://www.foo.com?existing=true',
 *     'key1', 'value1',
 *     'key2', 'value?willBeEncoded',
 *     'key3', ['valueA', 'valueB', 'valueC'],
 *     'key4', null);
 * result: 'http://www.foo.com?existing=true&' +
 *     'key1=value1&' +
 *     'key2=value%3FwillBeEncoded&' +
 *     'key3=valueA&key3=valueB&key3=valueC'
 * </pre>
 *
 * A single call to this function will not exhibit quadratic behavior in IE,
 * whereas multiple repeated calls may, although the effect is limited by
 * fact that URL's generally can't exceed 2kb.
 *
 * @param {string} uri The original URI, which may already have query data.
 * @param {...(goog.uri.utils.QueryArray|string|goog.uri.utils.QueryValue)} var_args
 *     An array or argument list conforming to goog.uri.utils.QueryArray.
 * @return {string} The URI with all query parameters added.
 */
goog.uri.utils.appendParams = function(uri, var_args) {
  return goog.uri.utils.appendQueryData_(
      arguments.length == 2 ?
      goog.uri.utils.buildQueryDataBuffer_([uri], arguments[1], 0) :
      goog.uri.utils.buildQueryDataBuffer_([uri], arguments, 1));
};


/**
 * Appends query parameters from a map.
 *
 * @param {string} uri The original URI, which may already have query data.
 * @param {Object} map An object where keys are URI-encoded parameter keys,
 *     and the values are arbitrary types or arrays.  Keys with a null value
 *     are dropped.
 * @return {string} The new parameters.
 */
goog.uri.utils.appendParamsFromMap = function(uri, map) {
  return goog.uri.utils.appendQueryData_(
      goog.uri.utils.buildQueryDataBufferFromMap_([uri], map));
};


/**
 * Appends a single URI parameter.
 *
 * Repeated calls to this can exhibit quadratic behavior in IE6 due to the
 * way string append works, though it should be limited given the 2kb limit.
 *
 * @param {string} uri The original URI, which may already have query data.
 * @param {string} key The key, which must already be URI encoded.
 * @param {*} value The value, which will be stringized and encoded (assumed
 *     not already to be encoded).
 * @return {string} The URI with the query parameter added.
 */
goog.uri.utils.appendParam = function(uri, key, value) {
  return goog.uri.utils.appendQueryData_(
      [uri, '&', key, '=', goog.string.urlEncode(value)]);
};


/**
 * Finds the next instance of a query parameter with the specified name.
 *
 * Does not instantiate any objects.
 *
 * @param {string} uri The URI to search.  May contain a fragment identifier
 *     if opt_hashIndex is specified.
 * @param {number} startIndex The index to begin searching for the key at.  A
 *     match may be found even if this is one character after the ampersand.
 * @param {string} keyEncoded The URI-encoded key.
 * @param {number} hashOrEndIndex Index to stop looking at.  If a hash
 *     mark is present, it should be its index, otherwise it should be the
 *     length of the string.
 * @return {number} The position of the first character in the key's name,
 *     immediately after either a question mark or a dot.
 * @private
 */
goog.uri.utils.findParam_ = function(
    uri, startIndex, keyEncoded, hashOrEndIndex) {
  var index = startIndex;
  var keyLength = keyEncoded.length;

  // Search for the key itself and post-filter for surronuding punctuation,
  // rather than expensively building a regexp.
  while ((index = uri.indexOf(keyEncoded, index)) >= 0 &&
      index < hashOrEndIndex) {
    var precedingChar = uri.charCodeAt(index - 1);
    // Ensure that the preceding character is '&' or '?'.
    if (precedingChar == goog.uri.utils.CharCode_.AMPERSAND ||
        precedingChar == goog.uri.utils.CharCode_.QUESTION) {
      // Ensure the following character is '&', '=', '#', or NaN
      // (end of string).
      var followingChar = uri.charCodeAt(index + keyLength);
      if (!followingChar ||
          followingChar == goog.uri.utils.CharCode_.EQUAL ||
          followingChar == goog.uri.utils.CharCode_.AMPERSAND ||
          followingChar == goog.uri.utils.CharCode_.HASH) {
        return index;
      }
    }
    index += keyLength + 1;
  }

  return -1;
};


/**
 * Regular expression for finding a hash mark or end of string.
 * @type {RegExp}
 * @private
 */
goog.uri.utils.hashOrEndRe_ = /#|$/;


/**
 * Determines if the URI contains a specific key.
 *
 * Performs no object instantiations.
 *
 * @param {string} uri The URI to process.  May contain a fragment
 *     identifier.
 * @param {string} keyEncoded The URI-encoded key.  Case-sensitive.
 * @return {boolean} Whether the key is present.
 */
goog.uri.utils.hasParam = function(uri, keyEncoded) {
  return goog.uri.utils.findParam_(uri, 0, keyEncoded,
      uri.search(goog.uri.utils.hashOrEndRe_)) >= 0;
};


/**
 * Gets the first value of a query parameter.
 * @param {string} uri The URI to process.  May contain a fragment.
 * @param {string} keyEncoded The URI-encoded key.  Case-sensitive.
 * @return {?string} The first value of the parameter (URI-decoded), or null
 *     if the parameter is not found.
 */
goog.uri.utils.getParamValue = function(uri, keyEncoded) {
  var hashOrEndIndex = uri.search(goog.uri.utils.hashOrEndRe_);
  var foundIndex = goog.uri.utils.findParam_(
      uri, 0, keyEncoded, hashOrEndIndex);

  if (foundIndex < 0) {
    return null;
  } else {
    var endPosition = uri.indexOf('&', foundIndex);
    if (endPosition < 0 || endPosition > hashOrEndIndex) {
      endPosition = hashOrEndIndex;
    }
    // Progress forth to the end of the "key=" or "key&" substring.
    foundIndex += keyEncoded.length + 1;
    // Use substr, because it (unlike substring) will return empty string
    // if foundIndex > endPosition.
    return goog.string.urlDecode(
        uri.substr(foundIndex, endPosition - foundIndex));
  }
};


/**
 * Gets all values of a query parameter.
 * @param {string} uri The URI to process.  May contain a framgnet.
 * @param {string} keyEncoded The URI-encoded key.  Case-snsitive.
 * @return {!Array.<string>} All URI-decoded values with the given key.
 *     If the key is not found, this will have length 0, but never be null.
 */
goog.uri.utils.getParamValues = function(uri, keyEncoded) {
  var hashOrEndIndex = uri.search(goog.uri.utils.hashOrEndRe_);
  var position = 0;
  var foundIndex;
  var result = [];

  while ((foundIndex = goog.uri.utils.findParam_(
      uri, position, keyEncoded, hashOrEndIndex)) >= 0) {
    // Find where this parameter ends, either the '&' or the end of the
    // query parameters.
    position = uri.indexOf('&', foundIndex);
    if (position < 0 || position > hashOrEndIndex) {
      position = hashOrEndIndex;
    }

    // Progress forth to the end of the "key=" or "key&" substring.
    foundIndex += keyEncoded.length + 1;
    // Use substr, because it (unlike substring) will return empty string
    // if foundIndex > position.
    result.push(goog.string.urlDecode(uri.substr(
        foundIndex, position - foundIndex)));
  }

  return result;
};


/**
 * Regexp to find trailing question marks and ampersands.
 * @type {RegExp}
 * @private
 */
goog.uri.utils.trailingQueryPunctuationRe_ = /[?&]($|#)/;


/**
 * Removes all instances of a query parameter.
 * @param {string} uri The URI to process.  Must not contain a fragment.
 * @param {string} keyEncoded The URI-encoded key.
 * @return {string} The URI with all instances of the parameter removed.
 */
goog.uri.utils.removeParam = function(uri, keyEncoded) {
  var hashOrEndIndex = uri.search(goog.uri.utils.hashOrEndRe_);
  var position = 0;
  var foundIndex;
  var buffer = [];

  // Look for a query parameter.
  while ((foundIndex = goog.uri.utils.findParam_(
      uri, position, keyEncoded, hashOrEndIndex)) >= 0) {
    // Get the portion of the query string up to, but not including, the ?
    // or & starting the parameter.
    buffer.push(uri.substring(position, foundIndex));
    // Progress to immediately after the '&'.  If not found, go to the end.
    // Avoid including the hash mark.
    position = Math.min((uri.indexOf('&', foundIndex) + 1) || hashOrEndIndex,
        hashOrEndIndex);
  }

  // Append everything that is remaining.
  buffer.push(uri.substr(position));

  // Join the buffer, and remove trailing punctuation that remains.
  return buffer.join('').replace(
      goog.uri.utils.trailingQueryPunctuationRe_, '$1');
};


/**
 * Replaces all existing definitions of a parameter with a single definition.
 *
 * Repeated calls to this can exhibit quadratic behavior in IE6 due to the
 * way string append works, though it should be limited given the 2kb limit.
 *
 * @param {string} uri The original URI, which may already have query data.
 * @param {string} keyEncoded The key, which must already be URI encoded.
 * @param {*} value The value, which will be stringized and encoded (assumed
 *     not already to be encoded).
 * @return {string} The URI with the query parameter added.
 */
goog.uri.utils.setParam = function(uri, keyEncoded, value) {
  return goog.uri.utils.appendParam(
      goog.uri.utils.removeParam(uri, keyEncoded), keyEncoded, value);
};


/**
 * Generates a URI path using a given URI and a path with checks to
 * prevent consecutive "//". The baseUri passed in must not contain
 * query or fragment identifiers. The path to append may not contain query or
 * fragment identifiers.
 *
 * @param {string} baseUri URI to use as the base.
 * @param {string} path Path to append.
 * @return {string} Updated URI.
 */
goog.uri.utils.appendPath = function(baseUri, path) {
  goog.uri.utils.assertNoFragmentsOrQueries_(baseUri);

  // Remove any trailing '/'
  if (goog.string.endsWith(baseUri, '/')) {
    baseUri = baseUri.substr(0, baseUri.length - 1);
  }
  // Remove any leading '/'
  if (goog.string.startsWith(path, '/')) {
    path = path.substr(1);
  }
  return goog.string.buildString(baseUri, '/', path);
};


/**
 * Standard supported query parameters.
 * @enum {string}
 */
goog.uri.utils.StandardQueryParam = {

  /** Unused parameter for unique-ifying. */
  RANDOM: 'zx'
};


/**
 * Sets the zx parameter of a URI to a random value.
 * @param {string} uri Any URI.
 * @return {string} That URI with the "zx" parameter added or replaced to
 *     contain a random string.
 */
goog.uri.utils.makeUnique = function(uri) {
  return goog.uri.utils.setParam(uri,
      goog.uri.utils.StandardQueryParam.RANDOM, goog.string.getRandomString());
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for manipulating objects/maps/hashes.
 */

goog.provide('goog.object');


/**
 * Calls a function for each element in an object/map/hash.
 *
 * @param {Object} obj The object over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object)
 *     and the return value is irrelevant.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 */
goog.object.forEach = function(obj, f, opt_obj) {
  for (var key in obj) {
    f.call(opt_obj, obj[key], key, obj);
  }
};


/**
 * Calls a function for each element in an object/map/hash. If that call returns
 * true, adds the element to a new object.
 *
 * @param {Object} obj The object over which to iterate.
 * @param {Function} f The function to call for every element. This
 *     function takes 3 arguments (the element, the index and the object)
 *     and should return a boolean. If the return value is true the
 *     element is added to the result object. If it is false the
 *     element is not included.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @return {!Object} a new object in which only elements that passed the test
 *     are present.
 */
goog.object.filter = function(obj, f, opt_obj) {
  var res = {};
  for (var key in obj) {
    if (f.call(opt_obj, obj[key], key, obj)) {
      res[key] = obj[key];
    }
  }
  return res;
};


/**
 * For every element in an object/map/hash calls a function and inserts the
 * result into a new object.
 *
 * @param {Object} obj The object over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object)
 *     and should return something. The result will be inserted
 *     into a new object.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @return {!Object} a new object with the results from f.
 */
goog.object.map = function(obj, f, opt_obj) {
  var res = {};
  for (var key in obj) {
    res[key] = f.call(opt_obj, obj[key], key, obj);
  }
  return res;
};


/**
 * Calls a function for each element in an object/map/hash. If any
 * call returns true, returns true (without checking the rest). If
 * all calls return false, returns false.
 *
 * @param {Object} obj The object to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object) and should
 *     return a boolean.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @return {boolean} true if any element passes the test.
 */
goog.object.some = function(obj, f, opt_obj) {
  for (var key in obj) {
    if (f.call(opt_obj, obj[key], key, obj)) {
      return true;
    }
  }
  return false;
};


/**
 * Calls a function for each element in an object/map/hash. If
 * all calls return true, returns true. If any call returns false, returns
 * false at this point and does not continue to check the remaining elements.
 *
 * @param {Object} obj The object to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object) and should
 *     return a boolean.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @return {boolean} false if any element fails the test.
 */
goog.object.every = function(obj, f, opt_obj) {
  for (var key in obj) {
    if (!f.call(opt_obj, obj[key], key, obj)) {
      return false;
    }
  }
  return true;
};


/**
 * Returns the number of key-value pairs in the object map.
 *
 * @param {Object} obj The object for which to get the number of key-value
 *     pairs.
 * @return {number} The number of key-value pairs in the object map.
 */
goog.object.getCount = function(obj) {
  // JS1.5 has __count__ but it has been deprecated so it raises a warning...
  // in other words do not use. Also __count__ only includes the fields on the
  // actual object and not in the prototype chain.
  var rv = 0;
  for (var key in obj) {
    rv++;
  }
  return rv;
};


/**
 * Returns one key from the object map, if any exists.
 * For map literals the returned key will be the first one in most of the
 * browsers (a know exception is Konqueror).
 *
 * @param {Object} obj The object to pick a key from.
 * @return {string|undefined} The key or undefined if the object is empty.
 */
goog.object.getAnyKey = function(obj) {
  for (var key in obj) {
    return key;
  }
};


/**
 * Returns one value from the object map, if any exists.
 * For map literals the returned value will be the first one in most of the
 * browsers (a know exception is Konqueror).
 *
 * @param {Object} obj The object to pick a value from.
 * @return {*} The value or undefined if the object is empty.
 */
goog.object.getAnyValue = function(obj) {
  for (var key in obj) {
    return obj[key];
  }
};


/**
 * Whether the object/hash/map contains the given object as a value.
 * An alias for goog.object.containsValue(obj, val).
 *
 * @param {Object} obj The object in which to look for val.
 * @param {*} val The object for which to check.
 * @return {boolean} true if val is present.
 */
goog.object.contains = function(obj, val) {
  return goog.object.containsValue(obj, val);
};


/**
 * Returns the values of the object/map/hash.
 *
 * @param {Object} obj The object from which to get the values.
 * @return {!Array} The values in the object/map/hash.
 */
goog.object.getValues = function(obj) {
  var res = [];
  var i = 0;
  for (var key in obj) {
    res[i++] = obj[key];
  }
  return res;
};


/**
 * Returns the keys of the object/map/hash.
 *
 * @param {Object} obj The object from which to get the keys.
 * @return {!Array.<string>} Array of property keys.
 */
goog.object.getKeys = function(obj) {
  var res = [];
  var i = 0;
  for (var key in obj) {
    res[i++] = key;
  }
  return res;
};


/**
 * Get a value from an object multiple levels deep.  This is useful for
 * pulling values from deeply nested objects, such as JSON responses.
 * Example usage: getValueByKeys(jsonObj, 'foo', 'entries', 3)
 *
 * @param {!Object} obj An object to get the value from.  Can be array-like.
 * @param {...(string|number|!Array.<number|string>)} var_args A number of keys
 *     (as strings, or nubmers, for array-like objects).  Can also be
 *     specified as a single array of keys.
 * @return {*} The resulting value.  If, at any point, the value for a key
 *     is undefined, returns undefined.
 */
goog.object.getValueByKeys = function(obj, var_args) {
  var isArrayLike = goog.isArrayLike(var_args);
  var keys = isArrayLike ? var_args : arguments;

  // Start with the 2nd parameter for the variable parameters syntax.
  for (var i = isArrayLike ? 0 : 1; i < keys.length; i++) {
    obj = obj[keys[i]];
    if (!goog.isDef(obj)) {
      break;
    }
  }

  return obj;
};


/**
 * Whether the object/map/hash contains the given key.
 *
 * @param {Object} obj The object in which to look for key.
 * @param {*} key The key for which to check.
 * @return {boolean} true If the map contains the key.
 */
goog.object.containsKey = function(obj, key) {
  return key in obj;
};


/**
 * Whether the object/map/hash contains the given value. This is O(n).
 *
 * @param {Object} obj The object in which to look for val.
 * @param {*} val The value for which to check.
 * @return {boolean} true If the map contains the value.
 */
goog.object.containsValue = function(obj, val) {
  for (var key in obj) {
    if (obj[key] == val) {
      return true;
    }
  }
  return false;
};


/**
 * Searches an object for an element that satisfies the given condition and
 * returns its key.
 * @param {Object} obj The object to search in.
 * @param {function(*, string, Object): boolean} f The function to call for
 *     every element. Takes 3 arguments (the value, the key and the object) and
 *     should return a boolean.
 * @param {Object=} opt_this An optional "this" context for the function.
 * @return {string|undefined} The key of an element for which the function
 *     returns true or undefined if no such element is found.
 */
goog.object.findKey = function(obj, f, opt_this) {
  for (var key in obj) {
    if (f.call(opt_this, obj[key], key, obj)) {
      return key;
    }
  }
  return undefined;
};


/**
 * Searches an object for an element that satisfies the given condition and
 * returns its value.
 * @param {Object} obj The object to search in.
 * @param {function(*, string, Object): boolean} f The function to call for
 *     every element. Takes 3 arguments (the value, the key and the object) and
 *     should return a boolean.
 * @param {Object=} opt_this An optional "this" context for the function.
 * @return {*} The value of an element for which the function returns true or
 *     undefined if no such element is found.
 */
goog.object.findValue = function(obj, f, opt_this) {
  var key = goog.object.findKey(obj, f, opt_this);
  return key && obj[key];
};


/**
 * Whether the object/map/hash is empty.
 *
 * @param {Object} obj The object to test.
 * @return {boolean} true if obj is empty.
 */
goog.object.isEmpty = function(obj) {
  for (var key in obj) {
    return false;
  }
  return true;
};


/**
 * Removes all key value pairs from the object/map/hash.
 *
 * @param {Object} obj The object to clear.
 */
goog.object.clear = function(obj) {
  for (var i in obj) {
    delete obj[i];
  }
};


/**
 * Removes a key-value pair based on the key.
 *
 * @param {Object} obj The object from which to remove the key.
 * @param {*} key The key to remove.
 * @return {boolean} Whether an element was removed.
 */
goog.object.remove = function(obj, key) {
  var rv;
  if ((rv = key in obj)) {
    delete obj[key];
  }
  return rv;
};


/**
 * Adds a key-value pair to the object. Throws an exception if the key is
 * already in use. Use set if you want to change an existing pair.
 *
 * @param {Object} obj The object to which to add the key-value pair.
 * @param {string} key The key to add.
 * @param {*} val The value to add.
 */
goog.object.add = function(obj, key, val) {
  if (key in obj) {
    throw Error('The object already contains the key "' + key + '"');
  }
  goog.object.set(obj, key, val);
};


/**
 * Returns the value for the given key.
 *
 * @param {Object} obj The object from which to get the value.
 * @param {string} key The key for which to get the value.
 * @param {*=} opt_val The value to return if no item is found for the given
 *     key (default is undefined).
 * @return {*} The value for the given key.
 */
goog.object.get = function(obj, key, opt_val) {
  if (key in obj) {
    return obj[key];
  }
  return opt_val;
};


/**
 * Adds a key-value pair to the object/map/hash.
 *
 * @param {Object} obj The object to which to add the key-value pair.
 * @param {string} key The key to add.
 * @param {*} value The value to add.
 */
goog.object.set = function(obj, key, value) {
  obj[key] = value;
};


/**
 * Adds a key-value pair to the object/map/hash if it doesn't exist yet.
 *
 * @param {Object} obj The object to which to add the key-value pair.
 * @param {string} key The key to add.
 * @param {*} value The value to add if the key wasn't present.
 * @return {*} The value of the entry at the end of the function.
 */
goog.object.setIfUndefined = function(obj, key, value) {
  return key in obj ? obj[key] : (obj[key] = value);
};


/**
 * Does a flat clone of the object.
 *
 * @param {Object} obj Object to clone.
 * @return {!Object} Clone of the input object.
 */
goog.object.clone = function(obj) {
  // We cannot use the prototype trick because a lot of methods depend on where
  // the actual key is set.

  var res = {};
  for (var key in obj) {
    res[key] = obj[key];
  }
  return res;
  // We could also use goog.mixin but I wanted this to be independent from that.
};


/**
 * Clones a value. The input may be an Object, Array, or basic type. Objects and
 * arrays will be cloned recursively.
 *
 * WARNINGS:
 * <code>goog.object.unsafeClone</code> does not detect reference loops. Objects
 * that refer to themselves will cause infinite recursion.
 *
 * <code>goog.object.unsafeClone</code> is unaware of unique identifiers, and
 * copies UIDs created by <code>getUid</code> into cloned results.
 *
 * @param {*} obj The value to clone.
 * @return {*} A clone of the input value.
 */
goog.object.unsafeClone = function(obj) {
  var type = goog.typeOf(obj);
  if (type == 'object' || type == 'array') {
    if (obj.clone) {
      return obj.clone();
    }
    var clone = type == 'array' ? [] : {};
    for (var key in obj) {
      clone[key] = goog.object.unsafeClone(obj[key]);
    }
    return clone;
  }

  return obj;
};


/**
 * Returns a new object in which all the keys and values are interchanged
 * (keys become values and values become keys). If multiple keys map to the
 * same value, the chosen transposed value is implementation-dependent.
 *
 * @param {Object} obj The object to transpose.
 * @return {!Object} The transposed object.
 */
goog.object.transpose = function(obj) {
  var transposed = {};
  for (var key in obj) {
    transposed[obj[key]] = key;
  }
  return transposed;
};


/**
 * The names of the fields that are defined on Object.prototype.
 * @type {Array.<string>}
 * @private
 */
goog.object.PROTOTYPE_FIELDS_ = [
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf'
];


/**
 * Extends an object with another object.
 * This operates 'in-place'; it does not create a new Object.
 *
 * Example:
 * var o = {};
 * goog.object.extend(o, {a: 0, b: 1});
 * o; // {a: 0, b: 1}
 * goog.object.extend(o, {c: 2});
 * o; // {a: 0, b: 1, c: 2}
 *
 * @param {Object} target  The object to modify.
 * @param {...Object} var_args The objects from which values will be copied.
 */
goog.object.extend = function(target, var_args) {
  var key, source;
  for (var i = 1; i < arguments.length; i++) {
    source = arguments[i];
    for (key in source) {
      target[key] = source[key];
    }

    // For IE the for-in-loop does not contain any properties that are not
    // enumerable on the prototype object (for example isPrototypeOf from
    // Object.prototype) and it will also not include 'replace' on objects that
    // extend String and change 'replace' (not that it is common for anyone to
    // extend anything except Object).

    for (var j = 0; j < goog.object.PROTOTYPE_FIELDS_.length; j++) {
      key = goog.object.PROTOTYPE_FIELDS_[j];
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
};


/**
 * Creates a new object built from the key-value pairs provided as arguments.
 * @param {...*} var_args If only one argument is provided and it is an array
 *     then this is used as the arguments,  otherwise even arguments are used as
 *     the property names and odd arguments are used as the property values.
 * @return {!Object} The new object.
 * @throws {Error} If there are uneven number of arguments or there is only one
 *     non array argument.
 */
goog.object.create = function(var_args) {
  var argLength = arguments.length;
  if (argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.create.apply(null, arguments[0]);
  }

  if (argLength % 2) {
    throw Error('Uneven number of arguments');
  }

  var rv = {};
  for (var i = 0; i < argLength; i += 2) {
    rv[arguments[i]] = arguments[i + 1];
  }
  return rv;
};


/**
 * Creates a new object where the property names come from the arguments but
 * the value is always set to true
 * @param {...*} var_args If only one argument is provided and it is an array
 *     then this is used as the arguments,  otherwise the arguments are used
 *     as the property names.
 * @return {!Object} The new object.
 */
goog.object.createSet = function(var_args) {
  var argLength = arguments.length;
  if (argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.createSet.apply(null, arguments[0]);
  }

  var rv = {};
  for (var i = 0; i < argLength; i++) {
    rv[arguments[i]] = true;
  }
  return rv;
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for manipulating arrays.
 *
 */


goog.provide('goog.array');
goog.provide('goog.array.ArrayLike');

goog.require('goog.asserts');


/**
 * @define {boolean} NATIVE_ARRAY_PROTOTYPES indicates whether the code should
 * rely on Array.prototype functions, if available.
 *
 * The Array.prototype functions can be defined by external libraries like
 * Prototype and setting this flag to false forces closure to use its own
 * goog.array implementation.
 *
 * If your javascript can be loaded by a third party site and you are wary about
 * relying on the prototype functions, specify
 * "--define goog.NATIVE_ARRAY_PROTOTYPES=false" to the JSCompiler.
 */
goog.NATIVE_ARRAY_PROTOTYPES = true;


/**
 * @typedef {Array|NodeList|Arguments|{length: number}}
 */
goog.array.ArrayLike;


/**
 * Returns the last element in an array without removing it.
 * @param {goog.array.ArrayLike} array The array.
 * @return {*} Last item in array.
 */
goog.array.peek = function(array) {
  return array[array.length - 1];
};


/**
 * Reference to the original {@code Array.prototype}.
 * @private
 */
goog.array.ARRAY_PROTOTYPE_ = Array.prototype;


// NOTE(user): Since most of the array functions are generic it allows you to
// pass an array-like object. Strings have a length and are considered array-
// like. However, the 'in' operator does not work on strings so we cannot just
// use the array path even if the browser supports indexing into strings. We
// therefore end up splitting the string.


/**
 * Returns the index of the first element of an array with a specified
 * value, or -1 if the element is not present in the array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-indexof}
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {*} obj The object for which we are searching.
 * @param {number=} opt_fromIndex The index at which to start the search. If
 *     omitted the search starts at index 0.
 * @return {number} The index of the first matching array element.
 */
goog.array.indexOf = goog.NATIVE_ARRAY_PROTOTYPES &&
                     goog.array.ARRAY_PROTOTYPE_.indexOf ?
    function(arr, obj, opt_fromIndex) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.indexOf.call(arr, obj, opt_fromIndex);
    } :
    function(arr, obj, opt_fromIndex) {
      var fromIndex = opt_fromIndex == null ?
          0 : (opt_fromIndex < 0 ?
               Math.max(0, arr.length + opt_fromIndex) : opt_fromIndex);

      if (goog.isString(arr)) {
        // Array.prototype.indexOf uses === so only strings should be found.
        if (!goog.isString(obj) || obj.length != 1) {
          return -1;
        }
        return arr.indexOf(obj, fromIndex);
      }

      for (var i = fromIndex; i < arr.length; i++) {
        if (i in arr && arr[i] === obj)
          return i;
      }
      return -1;
    };


/**
 * Returns the index of the last element of an array with a specified value, or
 * -1 if the element is not present in the array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-lastindexof}
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {*} obj The object for which we are searching.
 * @param {?number=} opt_fromIndex The index at which to start the search. If
 *     omitted the search starts at the end of the array.
 * @return {number} The index of the last matching array element.
 */
goog.array.lastIndexOf = goog.NATIVE_ARRAY_PROTOTYPES &&
                         goog.array.ARRAY_PROTOTYPE_.lastIndexOf ?
    function(arr, obj, opt_fromIndex) {
      goog.asserts.assert(arr.length != null);

      // Firefox treats undefined and null as 0 in the fromIndex argument which
      // leads it to always return -1
      var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
      return goog.array.ARRAY_PROTOTYPE_.lastIndexOf.call(arr, obj, fromIndex);
    } :
    function(arr, obj, opt_fromIndex) {
      var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;

      if (fromIndex < 0) {
        fromIndex = Math.max(0, arr.length + fromIndex);
      }

      if (goog.isString(arr)) {
        // Array.prototype.lastIndexOf uses === so only strings should be found.
        if (!goog.isString(obj) || obj.length != 1) {
          return -1;
        }
        return arr.lastIndexOf(obj, fromIndex);
      }

      for (var i = fromIndex; i >= 0; i--) {
        if (i in arr && arr[i] === obj)
          return i;
      }
      return -1;
    };


/**
 * Calls a function for each element in an array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-foreach}
 *
 * @param {goog.array.ArrayLike} arr Array or array like object over
 *     which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array). The return
 *     value is ignored. The function is called only for indexes of the array
 *     which have assigned values; it is not called for indexes which have
 *     been deleted or which have never been assigned values.
 *
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 */
goog.array.forEach = goog.NATIVE_ARRAY_PROTOTYPES &&
                     goog.array.ARRAY_PROTOTYPE_.forEach ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      goog.array.ARRAY_PROTOTYPE_.forEach.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2) {
          f.call(opt_obj, arr2[i], i, arr);
        }
      }
    };


/**
 * Calls a function for each element in an array, starting from the last
 * element rather than the first.
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array). The return
 *     value is ignored.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 */
goog.array.forEachRight = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = l - 1; i >= 0; --i) {
    if (i in arr2) {
      f.call(opt_obj, arr2[i], i, arr);
    }
  }
};


/**
 * Calls a function for each element in an array, and if the function returns
 * true adds the element to a new array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-filter}
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a Boolean. If the return value is true the element is added to the
 *     result array. If it is false the element is not included.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {!Array} a new array in which only elements that passed the test are
 *     present.
 */
goog.array.filter = goog.NATIVE_ARRAY_PROTOTYPES &&
                    goog.array.ARRAY_PROTOTYPE_.filter ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.filter.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var res = [];
      var resLength = 0;
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2) {
          var val = arr2[i];  // in case f mutates arr2
          if (f.call(opt_obj, val, i, arr)) {
            res[resLength++] = val;
          }
        }
      }
      return res;
    };


/**
 * Calls a function for each element in an array and inserts the result into a
 * new array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-map}
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return something. The result will be inserted into a new array.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {!Array} a new array with the results from f.
 */
goog.array.map = goog.NATIVE_ARRAY_PROTOTYPES &&
                 goog.array.ARRAY_PROTOTYPE_.map ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.map.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var res = new Array(l);
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2) {
          res[i] = f.call(opt_obj, arr2[i], i, arr);
        }
      }
      return res;
    };


/**
 * Passes every element of an array into a function and accumulates the result.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-reduce}
 *
 * For example:
 * var a = [1, 2, 3, 4];
 * goog.array.reduce(a, function(r, v, i, arr) {return r + v;}, 0);
 * returns 10
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 4 arguments (the function's previous result or the initial value,
 *     the value of the current array element, the current array index, and the
 *     array itself)
 *     function(previousValue, currentValue, index, array).
 * @param {*} val The initial value to pass into the function on the first call.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within f.
 * @return {*} Result of evaluating f repeatedly across the values of the array.
 */
goog.array.reduce = function(arr, f, val, opt_obj) {
  if (arr.reduce) {
    if (opt_obj) {
      return arr.reduce(goog.bind(f, opt_obj), val);
    } else {
      return arr.reduce(f, val);
    }
  }
  var rval = val;
  goog.array.forEach(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr);
  });
  return rval;
};


/**
 * Passes every element of an array into a function and accumulates the result,
 * starting from the last element and working towards the first.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-reduceright}
 *
 * For example:
 * var a = ['a', 'b', 'c'];
 * goog.array.reduceRight(a, function(r, v, i, arr) {return r + v;}, '');
 * returns 'cba'
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 4 arguments (the function's previous result or the initial value,
 *     the value of the current array element, the current array index, and the
 *     array itself)
 *     function(previousValue, currentValue, index, array).
 * @param {*} val The initial value to pass into the function on the first call.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {*} Object returned as a result of evaluating f repeatedly across the
 *     values of the array.
 */
goog.array.reduceRight = function(arr, f, val, opt_obj) {
  if (arr.reduceRight) {
    if (opt_obj) {
      return arr.reduceRight(goog.bind(f, opt_obj), val);
    } else {
      return arr.reduceRight(f, val);
    }
  }
  var rval = val;
  goog.array.forEachRight(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr);
  });
  return rval;
};


/**
 * Calls f for each element of an array. If any call returns true, some()
 * returns true (without checking the remaining elements). If all calls
 * return false, some() returns false.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-some}
 *
 * @param {goog.array.ArrayLike} arr The array to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a Boolean.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within f.
 * @return {boolean} true if any element passes the test.
 */
goog.array.some = goog.NATIVE_ARRAY_PROTOTYPES &&
                  goog.array.ARRAY_PROTOTYPE_.some ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.some.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
          return true;
        }
      }
      return false;
    };


/**
 * Call f for each element of an array. If all calls return true, every()
 * returns true. If any call returns false, every() returns false and
 * does not continue to check the remaining elements.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-every}
 *
 * @param {goog.array.ArrayLike} arr The array to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a Boolean.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {boolean} false if any element fails the test.
 */
goog.array.every = goog.NATIVE_ARRAY_PROTOTYPES &&
                   goog.array.ARRAY_PROTOTYPE_.every ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.every.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2 && !f.call(opt_obj, arr2[i], i, arr)) {
          return false;
        }
      }
      return true;
    };


/**
 * Search an array for the first element that satisfies a given condition and
 * return that element.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {*} The first array element that passes the test, or null if no
 *     element is found.
 */
goog.array.find = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};


/**
 * Search an array for the first element that satisfies a given condition and
 * return its index.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {number} The index of the first array element that passes the test,
 *     or -1 if no element is found.
 */
goog.array.findIndex = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = 0; i < l; i++) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i;
    }
  }
  return -1;
};


/**
 * Search an array (in reverse order) for the last element that satisfies a
 * given condition and return that element.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {*} The last array element that passes the test, or null if no
 *     element is found.
 */
goog.array.findRight = function(arr, f, opt_obj) {
  var i = goog.array.findIndexRight(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};


/**
 * Search an array (in reverse order) for the last element that satisfies a
 * given condition and return its index.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {number} The index of the last array element that passes the test,
 *     or -1 if no element is found.
 */
goog.array.findIndexRight = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = l - 1; i >= 0; i--) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i;
    }
  }
  return -1;
};


/**
 * Whether the array contains the given object.
 * @param {goog.array.ArrayLike} arr The array to test for the presence of the
 *     element.
 * @param {*} obj The object for which to test.
 * @return {boolean} true if obj is present.
 */
goog.array.contains = function(arr, obj) {
  return goog.array.indexOf(arr, obj) >= 0;
};


/**
 * Whether the array is empty.
 * @param {goog.array.ArrayLike} arr The array to test.
 * @return {boolean} true if empty.
 */
goog.array.isEmpty = function(arr) {
  return arr.length == 0;
};


/**
 * Clears the array.
 * @param {goog.array.ArrayLike} arr Array or array like object to clear.
 */
goog.array.clear = function(arr) {
  // For non real arrays we don't have the magic length so we delete the
  // indices.
  if (!goog.isArray(arr)) {
    for (var i = arr.length - 1; i >= 0; i--) {
      delete arr[i];
    }
  }
  arr.length = 0;
};


/**
 * Pushes an item into an array, if it's not already in the array.
 * @param {Array} arr Array into which to insert the item.
 * @param {*} obj Value to add.
 */
goog.array.insert = function(arr, obj) {
  if (!goog.array.contains(arr, obj)) {
    arr.push(obj);
  }
};


/**
 * Inserts an object at the given index of the array.
 * @param {goog.array.ArrayLike} arr The array to modify.
 * @param {*} obj The object to insert.
 * @param {number=} opt_i The index at which to insert the object. If omitted,
 *      treated as 0. A negative index is counted from the end of the array.
 */
goog.array.insertAt = function(arr, obj, opt_i) {
  goog.array.splice(arr, opt_i, 0, obj);
};


/**
 * Inserts at the given index of the array, all elements of another array.
 * @param {goog.array.ArrayLike} arr The array to modify.
 * @param {goog.array.ArrayLike} elementsToAdd The array of elements to add.
 * @param {number=} opt_i The index at which to insert the object. If omitted,
 *      treated as 0. A negative index is counted from the end of the array.
 */
goog.array.insertArrayAt = function(arr, elementsToAdd, opt_i) {
  goog.partial(goog.array.splice, arr, opt_i, 0).apply(null, elementsToAdd);
};


/**
 * Inserts an object into an array before a specified object.
 * @param {Array} arr The array to modify.
 * @param {*} obj The object to insert.
 * @param {*=} opt_obj2 The object before which obj should be inserted. If obj2
 *     is omitted or not found, obj is inserted at the end of the array.
 */
goog.array.insertBefore = function(arr, obj, opt_obj2) {
  var i;
  if (arguments.length == 2 || (i = goog.array.indexOf(arr, opt_obj2)) < 0) {
    arr.push(obj);
  } else {
    goog.array.insertAt(arr, obj, i);
  }
};


/**
 * Removes the first occurrence of a particular value from an array.
 * @param {goog.array.ArrayLike} arr Array from which to remove value.
 * @param {*} obj Object to remove.
 * @return {boolean} True if an element was removed.
 */
goog.array.remove = function(arr, obj) {
  var i = goog.array.indexOf(arr, obj);
  var rv;
  if ((rv = i >= 0)) {
    goog.array.removeAt(arr, i);
  }
  return rv;
};


/**
 * Removes from an array the element at index i
 * @param {goog.array.ArrayLike} arr Array or array like object from which to
 *     remove value.
 * @param {number} i The index to remove.
 * @return {boolean} True if an element was removed.
 */
goog.array.removeAt = function(arr, i) {
  goog.asserts.assert(arr.length != null);

  // use generic form of splice
  // splice returns the removed items and if successful the length of that
  // will be 1
  return goog.array.ARRAY_PROTOTYPE_.splice.call(arr, i, 1).length == 1;
};


/**
 * Removes the first value that satisfies the given condition.
 * @param {goog.array.ArrayLike} arr Array from which to remove value.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {boolean} True if an element was removed.
 */
goog.array.removeIf = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  if (i >= 0) {
    goog.array.removeAt(arr, i);
    return true;
  }
  return false;
};


/**
 * Returns a new array that is the result of joining the arguments.  If arrays
 * are passed then their items are added, however, if non-arrays are passed they
 * will be added to the return array as is.
 *
 * Note that ArrayLike objects will be added as is, rather than having their
 * items added.
 *
 * goog.array.concat([1, 2], [3, 4]) -> [1, 2, 3, 4]
 * goog.array.concat(0, [1, 2]) -> [0, 1, 2]
 * goog.array.concat([1, 2], null) -> [1, 2, null]
 *
 * There is bug in all current versions of IE (6, 7 and 8) where arrays created
 * in an iframe become corrupted soon (not immediately) after the iframe is
 * destroyed. This is common if loading data via goog.net.IframeIo, for example.
 * This corruption only affects the concat method which will start throwing
 * Catastrophic Errors (#-2147418113).
 *
 * See http://endoflow.com/scratch/corrupted-arrays.html for a test case.
 *
 * Internally goog.array should use this, so that all methods will continue to
 * work on these broken array objects.
 *
 * @param {...*} var_args Items to concatenate.  Arrays will have each item
 *     added, while primitives and objects will be added as is.
 * @return {!Array} The new resultant array.
 */
goog.array.concat = function(var_args) {
  return goog.array.ARRAY_PROTOTYPE_.concat.apply(
      goog.array.ARRAY_PROTOTYPE_, arguments);
};


/**
 * Does a shallow copy of an array.
 * @param {goog.array.ArrayLike} arr  Array or array-like object to clone.
 * @return {!Array} Clone of the input array.
 */
goog.array.clone = function(arr) {
  if (goog.isArray(arr)) {
    return goog.array.concat(/** @type {!Array} */ (arr));
  } else { // array like
    // Concat does not work with non arrays.
    var rv = [];
    for (var i = 0, len = arr.length; i < len; i++) {
      rv[i] = arr[i];
    }
    return rv;
  }
};


/**
 * Converts an object to an array.
 * @param {goog.array.ArrayLike} object  The object to convert to an array.
 * @return {!Array} The object converted into an array. If object has a
 *     length property, every property indexed with a non-negative number
 *     less than length will be included in the result. If object does not
 *     have a length property, an empty array will be returned.
 */
goog.array.toArray = function(object) {
  if (goog.isArray(object)) {
    // This fixes the JS compiler warning and forces the Object to an Array type
    return goog.array.concat(/** @type {!Array} */ (object));
  }
  // Clone what we hope to be an array-like object to an array.
  // We could check isArrayLike() first, but no check we perform would be as
  // reliable as simply making the call.
  return goog.array.clone(/** @type {Array} */ (object));
};


/**
 * Extends an array with another array, element, or "array like" object.
 * This function operates 'in-place', it does not create a new Array.
 *
 * Example:
 * var a = [];
 * goog.array.extend(a, [0, 1]);
 * a; // [0, 1]
 * goog.array.extend(a, 2);
 * a; // [0, 1, 2]
 *
 * @param {Array} arr1  The array to modify.
 * @param {...*} var_args The elements or arrays of elements to add to arr1.
 */
goog.array.extend = function(arr1, var_args) {
  for (var i = 1; i < arguments.length; i++) {
    var arr2 = arguments[i];
    // If we have an Array or an Arguments object we can just call push
    // directly.
    var isArrayLike;
    if (goog.isArray(arr2) ||
        // Detect Arguments. ES5 says that the [[Class]] of an Arguments object
        // is "Arguments" but only V8 and JSC/Safari gets this right. We instead
        // detect Arguments by checking for array like and presence of "callee".
        (isArrayLike = goog.isArrayLike(arr2)) &&
            // The getter for callee throws an exception in strict mode
            // according to section 10.6 in ES5 so check for presence instead.
            arr2.hasOwnProperty('callee')) {
      arr1.push.apply(arr1, arr2);

    } else if (isArrayLike) {
      // Otherwise loop over arr2 to prevent copying the object.
      var len1 = arr1.length;
      var len2 = arr2.length;
      for (var j = 0; j < len2; j++) {
        arr1[len1 + j] = arr2[j];
      }
    } else {
      arr1.push(arr2);
    }
  }
};


/**
 * Adds or removes elements from an array. This is a generic version of Array
 * splice. This means that it might work on other objects similar to arrays,
 * such as the arguments object.
 *
 * @param {goog.array.ArrayLike} arr The array to modify.
 * @param {number|undefined} index The index at which to start changing the
 *     array. If not defined, treated as 0.
 * @param {number} howMany How many elements to remove (0 means no removal. A
 *     value below 0 is treated as zero and so is any other non number. Numbers
 *     are floored).
 * @param {...*} var_args Optional, additional elements to insert into the
 *     array.
 * @return {!Array} the removed elements.
 */
goog.array.splice = function(arr, index, howMany, var_args) {
  goog.asserts.assert(arr.length != null);

  return goog.array.ARRAY_PROTOTYPE_.splice.apply(
      arr, goog.array.slice(arguments, 1));
};


/**
 * Returns a new array from a segment of an array. This is a generic version of
 * Array slice. This means that it might work on other objects similar to
 * arrays, such as the arguments object.
 *
 * @param {goog.array.ArrayLike} arr The array from which to copy a segment.
 * @param {number} start The index of the first element to copy.
 * @param {number=} opt_end The index after the last element to copy.
 * @return {!Array} A new array containing the specified segment of the original
 *     array.
 */
goog.array.slice = function(arr, start, opt_end) {
  goog.asserts.assert(arr.length != null);

  // passing 1 arg to slice is not the same as passing 2 where the second is
  // null or undefined (in that case the second argument is treated as 0).
  // we could use slice on the arguments object and then use apply instead of
  // testing the length
  if (arguments.length <= 2) {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start);
  } else {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start, opt_end);
  }
};


/**
 * Removes all duplicates from an array (retaining only the first
 * occurrence of each array element).  This function modifies the
 * array in place and doesn't change the order of the non-duplicate items.
 *
 * For objects, duplicates are identified as having the same unique ID as
 * defined by {@link goog.getUid}.
 *
 * Runtime: N,
 * Worstcase space: 2N (no dupes)
 *
 * @param {goog.array.ArrayLike} arr The array from which to remove duplicates.
 * @param {Array=} opt_rv An optional array in which to return the results,
 *     instead of performing the removal inplace.  If specified, the original
 *     array will remain unchanged.
 */
goog.array.removeDuplicates = function(arr, opt_rv) {
  var returnArray = opt_rv || arr;

  var seen = {}, cursorInsert = 0, cursorRead = 0;
  while (cursorRead < arr.length) {
    var current = arr[cursorRead++];

    // Prefix each type with a single character representing the type to
    // prevent conflicting keys (e.g. true and 'true').
    var key = goog.isObject(current) ?
        'o' + goog.getUid(current) :
        (typeof current).charAt(0) + current;

    if (!Object.prototype.hasOwnProperty.call(seen, key)) {
      seen[key] = true;
      returnArray[cursorInsert++] = current;
    }
  }
  returnArray.length = cursorInsert;
};


/**
 * Searches the specified array for the specified target using the binary
 * search algorithm.  If no opt_compareFn is specified, elements are compared
 * using <code>goog.array.defaultCompare</code>, which compares the elements
 * using the built in < and > operators.  This will produce the expected
 * behavior for homogeneous arrays of String(s) and Number(s). The array
 * specified <b>must</b> be sorted in ascending order (as defined by the
 * comparison function).  If the array is not sorted, results are undefined.
 * If the array contains multiple instances of the specified target value, any
 * of these instances may be found.
 *
 * Runtime: O(log n)
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {*} target The sought value.
 * @param {Function=} opt_compareFn Optional comparison function by which the
 *     array is ordered. Should take 2 arguments to compare, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 * @return {number} Lowest index of the target value if found, otherwise
 *     (-(insertion point) - 1). The insertion point is where the value should
 *     be inserted into arr to preserve the sorted property.  Return value >= 0
 *     iff target is found.
 */
goog.array.binarySearch = function(arr, target, opt_compareFn) {
  return goog.array.binarySearch_(arr,
      opt_compareFn || goog.array.defaultCompare, false /* isEvaluator */,
      target);
};


/**
 * Selects an index in the specified array using the binary search algorithm.
 * The evaluator receives an element and determines whether the desired index
 * is before, at, or after it.  The evaluator must be consistent (formally,
 * goog.array.map(goog.array.map(arr, evaluator, opt_obj), goog.math.sign)
 * must be monotonically non-increasing).
 *
 * Runtime: O(log n)
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {Function} evaluator Evaluator function that receives 3 arguments
 *     (the element, the index and the array). Should return a negative number,
 *     zero, or a positive number depending on whether the desired index is
 *     before, at, or after the element passed to it.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within evaluator.
 * @return {number} Index of the leftmost element matched by the evaluator, if
 *     such exists; otherwise (-(insertion point) - 1). The insertion point is
 *     the index of the first element for which the evaluator returns negative,
 *     or arr.length if no such element exists. The return value is non-negative
 *     iff a match is found.
 */
goog.array.binarySelect = function(arr, evaluator, opt_obj) {
  return goog.array.binarySearch_(arr, evaluator, true /* isEvaluator */,
      undefined /* opt_target */, opt_obj);
};


/**
 * Implementation of a binary search algorithm which knows how to use both
 * comparison functions and evaluators. If an evaluator is provided, will call
 * the evaluator with the given optional data object, conforming to the
 * interface defined in binarySelect. Otherwise, if a comparison function is
 * provided, will call the comparison function against the given data object.
 *
 * This implementation purposefully does not use goog.bind or goog.partial for
 * performance reasons.
 *
 * Runtime: O(log n)
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {Function} compareFn Either an evaluator or a comparison function,
 *     as defined by binarySearch and binarySelect above.
 * @param {boolean} isEvaluator Whether the function is an evaluator or a
 *     comparison function.
 * @param {*=} opt_target If the function is a comparison function, then this is
 *     the target to binary search for.
 * @param {Object=} opt_selfObj If the function is an evaluator, this is an
  *    optional this object for the evaluator.
 * @return {number} Lowest index of the target value if found, otherwise
 *     (-(insertion point) - 1). The insertion point is where the value should
 *     be inserted into arr to preserve the sorted property.  Return value >= 0
 *     iff target is found.
 * @private
 */
goog.array.binarySearch_ = function(arr, compareFn, isEvaluator, opt_target,
    opt_selfObj) {
  var left = 0;  // inclusive
  var right = arr.length;  // exclusive
  var found;
  while (left < right) {
    var middle = (left + right) >> 1;
    var compareResult;
    if (isEvaluator) {
      compareResult = compareFn.call(opt_selfObj, arr[middle], middle, arr);
    } else {
      compareResult = compareFn(opt_target, arr[middle]);
    }
    if (compareResult > 0) {
      left = middle + 1;
    } else {
      right = middle;
      // We are looking for the lowest index so we can't return immediately.
      found = !compareResult;
    }
  }
  // left is the index if found, or the insertion point otherwise.
  // ~left is a shorthand for -left - 1.
  return found ? left : ~left;
};


/**
 * Sorts the specified array into ascending order.  If no opt_compareFn is
 * specified, elements are compared using
 * <code>goog.array.defaultCompare</code>, which compares the elements using
 * the built in < and > operators.  This will produce the expected behavior
 * for homogeneous arrays of String(s) and Number(s), unlike the native sort,
 * but will give unpredictable results for heterogenous lists of strings and
 * numbers with different numbers of digits.
 *
 * This sort is not guaranteed to be stable.
 *
 * Runtime: Same as <code>Array.prototype.sort</code>
 *
 * @param {Array} arr The array to be sorted.
 * @param {Function=} opt_compareFn Optional comparison function by which the
 *     array is to be ordered. Should take 2 arguments to compare, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 */
goog.array.sort = function(arr, opt_compareFn) {
  // TODO(user): Update type annotation since null is not accepted.
  goog.asserts.assert(arr.length != null);

  goog.array.ARRAY_PROTOTYPE_.sort.call(
      arr, opt_compareFn || goog.array.defaultCompare);
};


/**
 * Sorts the specified array into ascending order in a stable way.  If no
 * opt_compareFn is specified, elements are compared using
 * <code>goog.array.defaultCompare</code>, which compares the elements using
 * the built in < and > operators.  This will produce the expected behavior
 * for homogeneous arrays of String(s) and Number(s).
 *
 * Runtime: Same as <code>Array.prototype.sort</code>, plus an additional
 * O(n) overhead of copying the array twice.
 *
 * @param {Array} arr The array to be sorted.
 * @param {function(*, *): number=} opt_compareFn Optional comparison function
 *     by which the array is to be ordered. Should take 2 arguments to compare,
 *     and return a negative number, zero, or a positive number depending on
 *     whether the first argument is less than, equal to, or greater than the
 *     second.
 */
goog.array.stableSort = function(arr, opt_compareFn) {
  for (var i = 0; i < arr.length; i++) {
    arr[i] = {index: i, value: arr[i]};
  }
  var valueCompareFn = opt_compareFn || goog.array.defaultCompare;
  function stableCompareFn(obj1, obj2) {
    return valueCompareFn(obj1.value, obj2.value) || obj1.index - obj2.index;
  };
  goog.array.sort(arr, stableCompareFn);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = arr[i].value;
  }
};


/**
 * Sorts an array of objects by the specified object key and compare
 * function. If no compare function is provided, the key values are
 * compared in ascending order using <code>goog.array.defaultCompare</code>.
 * This won't work for keys that get renamed by the compiler. So use
 * {'foo': 1, 'bar': 2} rather than {foo: 1, bar: 2}.
 * @param {Array.<Object>} arr An array of objects to sort.
 * @param {string} key The object key to sort by.
 * @param {Function=} opt_compareFn The function to use to compare key
 *     values.
 */
goog.array.sortObjectsByKey = function(arr, key, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  goog.array.sort(arr, function(a, b) {
    return compare(a[key], b[key]);
  });
};


/**
 * Tells if the array is sorted.
 * @param {!Array} arr The array.
 * @param {Function=} opt_compareFn Function to compare the array elements.
 *     Should take 2 arguments to compare, and return a negative number, zero,
 *     or a positive number depending on whether the first argument is less
 *     than, equal to, or greater than the second.
 * @param {boolean=} opt_strict If true no equal elements are allowed.
 * @return {boolean} Whether the array is sorted.
 */
goog.array.isSorted = function(arr, opt_compareFn, opt_strict) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  for (var i = 1; i < arr.length; i++) {
    var compareResult = compare(arr[i - 1], arr[i]);
    if (compareResult > 0 || compareResult == 0 && opt_strict) {
      return false;
    }
  }
  return true;
};


/**
 * Compares two arrays for equality. Two arrays are considered equal if they
 * have the same length and their corresponding elements are equal according to
 * the comparison function.
 *
 * @param {goog.array.ArrayLike} arr1 The first array to compare.
 * @param {goog.array.ArrayLike} arr2 The second array to compare.
 * @param {Function=} opt_equalsFn Optional comparison function.
 *     Should take 2 arguments to compare, and return true if the arguments
 *     are equal. Defaults to {@link goog.array.defaultCompareEquality} which
 *     compares the elements using the built-in '===' operator.
 * @return {boolean} Whether the two arrays are equal.
 */
goog.array.equals = function(arr1, arr2, opt_equalsFn) {
  if (!goog.isArrayLike(arr1) || !goog.isArrayLike(arr2) ||
      arr1.length != arr2.length) {
    return false;
  }
  var l = arr1.length;
  var equalsFn = opt_equalsFn || goog.array.defaultCompareEquality;
  for (var i = 0; i < l; i++) {
    if (!equalsFn(arr1[i], arr2[i])) {
      return false;
    }
  }
  return true;
};


/**
 * @deprecated Use {@link goog.array.equals}.
 * @param {goog.array.ArrayLike} arr1 See {@link goog.array.equals}.
 * @param {goog.array.ArrayLike} arr2 See {@link goog.array.equals}.
 * @param {Function=} opt_equalsFn See {@link goog.array.equals}.
 * @return {boolean} See {@link goog.array.equals}.
 */
goog.array.compare = function(arr1, arr2, opt_equalsFn) {
  return goog.array.equals(arr1, arr2, opt_equalsFn);
};


/**
 * Compares its two arguments for order, using the built in < and >
 * operators.
 * @param {*} a The first object to be compared.
 * @param {*} b The second object to be compared.
 * @return {number} A negative number, zero, or a positive number as the first
 *     argument is less than, equal to, or greater than the second.
 */
goog.array.defaultCompare = function(a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
};


/**
 * Compares its two arguments for equality, using the built in === operator.
 * @param {*} a The first object to compare.
 * @param {*} b The second object to compare.
 * @return {boolean} True if the two arguments are equal, false otherwise.
 */
goog.array.defaultCompareEquality = function(a, b) {
  return a === b;
};


/**
 * Inserts a value into a sorted array. The array is not modified if the
 * value is already present.
 * @param {Array} array The array to modify.
 * @param {*} value The object to insert.
 * @param {Function=} opt_compareFn Optional comparison function by which the
 *     array is ordered. Should take 2 arguments to compare, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 * @return {boolean} True if an element was inserted.
 */
goog.array.binaryInsert = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  if (index < 0) {
    goog.array.insertAt(array, value, -(index + 1));
    return true;
  }
  return false;
};


/**
 * Removes a value from a sorted array.
 * @param {Array} array The array to modify.
 * @param {*} value The object to remove.
 * @param {Function=} opt_compareFn Optional comparison function by which the
 *     array is ordered. Should take 2 arguments to compare, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 * @return {boolean} True if an element was removed.
 */
goog.array.binaryRemove = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  return (index >= 0) ? goog.array.removeAt(array, index) : false;
};


/**
 * Splits an array into disjoint buckets according to a splitting function.
 * @param {Array} array The array.
 * @param {Function} sorter Function to call for every element.  This
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a valid object key (a string, number, etc), or undefined, if
 *     that object should not be placed in a bucket.
 * @return {!Object} An object, with keys being all of the unique return values
 *     of sorter, and values being arrays containing the items for
 *     which the splitter returned that key.
 */
goog.array.bucket = function(array, sorter) {
  var buckets = {};

  for (var i = 0; i < array.length; i++) {
    var value = array[i];
    var key = sorter(value, i, array);
    if (goog.isDef(key)) {
      // Push the value to the right bucket, creating it if necessary.
      var bucket = buckets[key] || (buckets[key] = []);
      bucket.push(value);
    }
  }

  return buckets;
};


/**
 * Returns an array consisting of the given value repeated N times.
 *
 * @param {*} value The value to repeat.
 * @param {number} n The repeat count.
 * @return {!Array.<*>} An array with the repeated value.
 */
goog.array.repeat = function(value, n) {
  var array = [];
  for (var i = 0; i < n; i++) {
    array[i] = value;
  }
  return array;
};


/**
 * Returns an array consisting of every argument with all arrays
 * expanded in-place recursively.
 *
 * @param {...*} var_args The values to flatten.
 * @return {!Array.<*>} An array containing the flattened values.
 */
goog.array.flatten = function(var_args) {
  var result = [];
  for (var i = 0; i < arguments.length; i++) {
    var element = arguments[i];
    if (goog.isArray(element)) {
      result.push.apply(result, goog.array.flatten.apply(null, element));
    } else {
      result.push(element);
    }
  }
  return result;
};


/**
 * Rotates an array in-place. After calling this method, the element at
 * index i will be the element previously at index (i - n) %
 * array.length, for all values of i between 0 and array.length - 1,
 * inclusive.
 *
 * For example, suppose list comprises [t, a, n, k, s]. After invoking
 * rotate(array, 1) (or rotate(array, -4)), array will comprise [s, t, a, n, k].
 *
 * @param {!Array.<*>} array The array to rotate.
 * @param {number} n The amount to rotate.
 * @return {!Array.<*>} The array.
 */
goog.array.rotate = function(array, n) {
  goog.asserts.assert(array.length != null);

  if (array.length) {
    n %= array.length;
    if (n > 0) {
      goog.array.ARRAY_PROTOTYPE_.unshift.apply(array, array.splice(-n, n));
    } else if (n < 0) {
      goog.array.ARRAY_PROTOTYPE_.push.apply(array, array.splice(0, -n));
    }
  }
  return array;
};


/**
 * Creates a new array for which the element at position i is an array of the
 * ith element of the provided arrays.  The returned array will only be as long
 * as the shortest array provided; additional values are ignored.  For example,
 * the result of zipping [1, 2] and [3, 4, 5] is [[1,3], [2, 4]].
 *
 * This is similar to the zip() function in Python.  See {@link
 * http://docs.python.org/library/functions.html#zip}
 *
 * @param {...!goog.array.ArrayLike} var_args Arrays to be combined.
 * @return {!Array.<!Array>} A new array of arrays created from provided arrays.
 */
goog.array.zip = function(var_args) {
  if (!arguments.length) {
    return [];
  }
  var result = [];
  for (var i = 0; true; i++) {
    var value = [];
    for (var j = 0; j < arguments.length; j++) {
      var arr = arguments[j];
      // If i is larger than the array length, this is the shortest array.
      if (i >= arr.length) {
        return result;
      }
      value.push(arr[i]);
    }
    result.push(value);
  }
};


/**
 * Shuffles the values in the specified array using the Fisher-Yates in-place
 * shuffle (also known as the Knuth Shuffle). By default, calls Math.random()
 * and so resets the state of that random number generator. Similarly, may reset
 * the state of the any other specified random number generator.
 *
 * Runtime: O(n)
 *
 * @param {!Array} arr The array to be shuffled.
 * @param {Function=} opt_randFn Optional random function to use for shuffling.
 *     Takes no arguments, and returns a random number on the interval [0, 1).
 *     Defaults to Math.random() using JavaScript's built-in Math library.
 */
goog.array.shuffle = function(arr, opt_randFn) {
  var randFn = opt_randFn || Math.random;

  for (var i = arr.length - 1; i > 0; i--) {
    // Choose a random array index in [0, i] (inclusive with i).
    var j = Math.floor(randFn() * (i + 1));

    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
};
// Copyright 2007 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Python style iteration utilities.
 */


goog.provide('goog.iter');
goog.provide('goog.iter.Iterator');
goog.provide('goog.iter.StopIteration');

goog.require('goog.array');
goog.require('goog.asserts');


// TODO(user): Add more functions from Python's itertools.
// http://docs.python.org/library/itertools.html


/**
 * @typedef {goog.iter.Iterator|{length:number}|{__iterator__}}
 */
goog.iter.Iterable;


// For script engines that already support iterators.
if ('StopIteration' in goog.global) {
  /**
   * Singleton Error object that is used to terminate iterations.
   * @type {Error}
   */
  goog.iter.StopIteration = goog.global['StopIteration'];
} else {
  /**
   * Singleton Error object that is used to terminate iterations.
   * @type {Error}
   * @suppress {duplicate}
   */
  goog.iter.StopIteration = Error('StopIteration');
}



/**
 * Class/interface for iterators.  An iterator needs to implement a {@code next}
 * method and it needs to throw a {@code goog.iter.StopIteration} when the
 * iteration passes beyond the end.  Iterators have no {@code hasNext} method.
 * It is recommended to always use the helper functions to iterate over the
 * iterator or in case you are only targeting JavaScript 1.7 for in loops.
 * @constructor
 */
goog.iter.Iterator = function() {};


/**
 * Returns the next value of the iteration.  This will throw the object
 * {@see goog.iter#StopIteration} when the iteration passes the end.
 * @return {*} Any object or value.
 */
goog.iter.Iterator.prototype.next = function() {
  throw goog.iter.StopIteration;
};


/**
 * Returns the {@code Iterator} object itself.  This is used to implement
 * the iterator protocol in JavaScript 1.7
 * @param {boolean=} opt_keys  Whether to return the keys or values. Default is
 *     to only return the values.  This is being used by the for-in loop (true)
 *     and the for-each-in loop (false).  Even though the param gives a hint
 *     about what the iterator will return there is no guarantee that it will
 *     return the keys when true is passed.
 * @return {!goog.iter.Iterator} The object itself.
 */
goog.iter.Iterator.prototype.__iterator__ = function(opt_keys) {
  return this;
};


/**
 * Returns an iterator that knows how to iterate over the values in the object.
 * @param {goog.iter.Iterable} iterable  If the object is an iterator it
 *     will be returned as is.  If the object has a {@code __iterator__} method
 *     that will be called to get the value iterator.  If the object is an
 *     array-like object we create an iterator for that.
 * @return {!goog.iter.Iterator} An iterator that knows how to iterate over the
 *     values in {@code iterable}.
 */
goog.iter.toIterator = function(iterable) {
  if (iterable instanceof goog.iter.Iterator) {
    return iterable;
  }
  if (typeof iterable.__iterator__ == 'function') {
    return iterable.__iterator__(false);
  }
  if (goog.isArrayLike(iterable)) {
    var i = 0;
    var newIter = new goog.iter.Iterator;
    newIter.next = function() {
      while (true) {
        if (i >= iterable.length) {
          throw goog.iter.StopIteration;
        }
        // Don't include deleted elements.
        if (!(i in iterable)) {
          i++;
          continue;
        }
        return iterable[i++];
      }
    };
    return newIter;
  }


  // TODO(user): Should we fall back on goog.structs.getValues()?
  throw Error('Not implemented');
};


/**
 * Calls a function for each element in the iterator with the element of the
 * iterator passed as argument.
 *
 * @param {goog.iter.Iterable} iterable  The iterator to iterate
 *     over.  If the iterable is an object {@code toIterator} will be called on
 *     it.
 * @param {Function} f  The function to call for every element.  This function
 *     takes 3 arguments (the element, undefined, and the iterator) and the
 *     return value is irrelevant.  The reason for passing undefined as the
 *     second argument is so that the same function can be used in
 *     {@see goog.array#forEach} as well as others.
 * @param {Object=} opt_obj  The object to be used as the value of 'this' within
 *     {@code f}.
 */
goog.iter.forEach = function(iterable, f, opt_obj) {
  if (goog.isArrayLike(iterable)) {
    /** @preserveTry */
    try {
      goog.array.forEach((/** @type {goog.array.ArrayLike} */ iterable), f,
                         opt_obj);
    } catch (ex) {
      if (ex !== goog.iter.StopIteration) {
        throw ex;
      }
    }
  } else {
    iterable = goog.iter.toIterator(iterable);
    /** @preserveTry */
    try {
      while (true) {
        f.call(opt_obj, iterable.next(), undefined, iterable);
      }
    } catch (ex) {
      if (ex !== goog.iter.StopIteration) {
        throw ex;
      }
    }
  }
};


/**
 * Calls a function for every element in the iterator, and if the function
 * returns true adds the element to a new iterator.
 *
 * @param {goog.iter.Iterable} iterable The iterator to iterate over.
 * @param {Function} f The function to call for every element.  This function
 *     takes 3 arguments (the element, undefined, and the iterator) and should
 *     return a boolean.  If the return value is true the element will be
 *     included  in the returned iteror.  If it is false the element is not
 *     included.
 * @param {Object=} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {!goog.iter.Iterator} A new iterator in which only elements that
 *     passed the test are present.
 */
goog.iter.filter = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  var newIter = new goog.iter.Iterator;
  newIter.next = function() {
    while (true) {
      var val = iterable.next();
      if (f.call(opt_obj, val, undefined, iterable)) {
        return val;
      }
    }
  };
  return newIter;
};


/**
 * Creates a new iterator that returns the values in a range.  This function
 * can take 1, 2 or 3 arguments:
 * <pre>
 * range(5) same as range(0, 5, 1)
 * range(2, 5) same as range(2, 5, 1)
 * </pre>
 *
 * @param {number} startOrStop  The stop value if only one argument is provided.
 *     The start value if 2 or more arguments are provided.  If only one
 *     argument is used the start value is 0.
 * @param {number=} opt_stop  The stop value.  If left out then the first
 *     argument is used as the stop value.
 * @param {number=} opt_step  The number to increment with between each call to
 *     next.  This can be negative.
 * @return {!goog.iter.Iterator} A new iterator that returns the values in the
 *     range.
 */
goog.iter.range = function(startOrStop, opt_stop, opt_step) {
  var start = 0;
  var stop = startOrStop;
  var step = opt_step || 1;
  if (arguments.length > 1) {
    start = startOrStop;
    stop = opt_stop;
  }
  if (step == 0) {
    throw Error('Range step argument must not be zero');
  }

  var newIter = new goog.iter.Iterator;
  newIter.next = function() {
    if (step > 0 && start >= stop || step < 0 && start <= stop) {
      throw goog.iter.StopIteration;
    }
    var rv = start;
    start += step;
    return rv;
  };
  return newIter;
};


/**
 * Joins the values in a iterator with a delimiter.
 * @param {goog.iter.Iterable} iterable  The iterator to get the values from.
 * @param {string} deliminator  The text to put between the values.
 * @return {string} The joined value string.
 */
goog.iter.join = function(iterable, deliminator) {
  return goog.iter.toArray(iterable).join(deliminator);
};


/**
 * For every element in the iterator call a function and return a new iterator
 * with that value.
 *
 * @param {goog.iter.Iterable} iterable The iterator to iterate over.
 * @param {Function} f The function to call for every element.  This function
 *     takes 3 arguments (the element, undefined, and the iterator) and should
 *     return a new value.
 * @param {Object=} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {!goog.iter.Iterator} A new iterator that returns the results of
 *     applying the function to each element in the original iterator.
 */
goog.iter.map = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  var newIter = new goog.iter.Iterator;
  newIter.next = function() {
    while (true) {
      var val = iterable.next();
      return f.call(opt_obj, val, undefined, iterable);
    }
  };
  return newIter;
};


/**
 * Passes every element of an iterator into a function and accumulates the
 * result.
 *
 * @param {goog.iter.Iterable} iterable The iterator to iterate over.
 * @param {Function} f The function to call for every element. This function
 *     takes 2 arguments (the function's previous result or the initial value,
 *     and the value of the current element).
 *     function(previousValue, currentElement) : newValue.
 * @param {*} val The initial value to pass into the function on the first call.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within f.
 * @return {*} Result of evaluating f repeatedly across the values of
 *     the iterator.
 */
goog.iter.reduce = function(iterable, f, val, opt_obj) {
  var rval = val;
  goog.iter.forEach(iterable, function(val) {
    rval = f.call(opt_obj, rval, val);
  });
  return rval;
};


/**
 * Goes through the values in the iterator. Calls f for each these and if any of
 * them returns true, this returns true (without checking the rest). If all
 * return false this will return false.
 *
 * @param {goog.iter.Iterable} iterable  The iterator object.
 * @param {Function} f  The function to call for every value. This function
 *     takes 3 arguments (the value, undefined, and the iterator) and should
 *     return a boolean.
 * @param {Object=} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {boolean} true if any value passes the test.
 */
goog.iter.some = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  /** @preserveTry */
  try {
    while (true) {
      if (f.call(opt_obj, iterable.next(), undefined, iterable)) {
        return true;
      }
    }
  } catch (ex) {
    if (ex !== goog.iter.StopIteration) {
      throw ex;
    }
  }
  return false;
};


/**
 * Goes through the values in the iterator. Calls f for each these and if any of
 * them returns false this returns false (without checking the rest). If all
 * return true this will return true.
 *
 * @param {goog.iter.Iterable} iterable  The iterator object.
 * @param {Function} f  The function to call for every value. This function
 *     takes 3 arguments (the value, undefined, and the iterator) and should
 *     return a boolean.
 * @param {Object=} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {boolean} true if every value passes the test.
 */
goog.iter.every = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  /** @preserveTry */
  try {
    while (true) {
      if (!f.call(opt_obj, iterable.next(), undefined, iterable)) {
        return false;
      }
    }
  } catch (ex) {
    if (ex !== goog.iter.StopIteration) {
      throw ex;
    }
  }
  return true;
};


/**
 * Takes zero or more iterators and returns one iterator that will iterate over
 * them in the order chained.
 * @param {...goog.iter.Iterator} var_args  Any number of iterator objects.
 * @return {!goog.iter.Iterator} Returns a new iterator that will iterate over
 *     all the given iterators' contents.
 */
goog.iter.chain = function(var_args) {
  var args = arguments;
  var length = args.length;
  var i = 0;
  var newIter = new goog.iter.Iterator;

  /**
   * @return {*} The next item in the iteration.
   * @this {goog.iter.Iterator}
   */
  newIter.next = function() {
    /** @preserveTry */
    try {
      if (i >= length) {
        throw goog.iter.StopIteration;
      }
      var current = goog.iter.toIterator(args[i]);
      return current.next();
    } catch (ex) {
      if (ex !== goog.iter.StopIteration || i >= length) {
        throw ex;
      } else {
        // In case we got a StopIteration increment counter and try again.
        i++;
        return this.next();
      }
    }
  };

  return newIter;
};


/**
 * Builds a new iterator that iterates over the original, but skips elements as
 * long as a supplied function returns true.
 * @param {goog.iter.Iterable} iterable  The iterator object.
 * @param {Function} f  The function to call for every value. This function
 *     takes 3 arguments (the value, undefined, and the iterator) and should
 *     return a boolean.
 * @param {Object=} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {!goog.iter.Iterator} A new iterator that drops elements from the
 *     original iterator as long as {@code f} is true.
 */
goog.iter.dropWhile = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  var newIter = new goog.iter.Iterator;
  var dropping = true;
  newIter.next = function() {
    while (true) {
      var val = iterable.next();
      if (dropping && f.call(opt_obj, val, undefined, iterable)) {
        continue;
      } else {
        dropping = false;
      }
      return val;
    }
  };
  return newIter;
};


/**
 * Builds a new iterator that iterates over the original, but only as long as a
 * supplied function returns true.
 * @param {goog.iter.Iterable} iterable  The iterator object.
 * @param {Function} f  The function to call for every value. This function
 *     takes 3 arguments (the value, undefined, and the iterator) and should
 *     return a boolean.
 * @param {Object=} opt_obj This is used as the 'this' object in f when called.
 * @return {!goog.iter.Iterator} A new iterator that keeps elements in the
 *     original iterator as long as the function is true.
 */
goog.iter.takeWhile = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  var newIter = new goog.iter.Iterator;
  var taking = true;
  newIter.next = function() {
    while (true) {
      if (taking) {
        var val = iterable.next();
        if (f.call(opt_obj, val, undefined, iterable)) {
          return val;
        } else {
          taking = false;
        }
      } else {
        throw goog.iter.StopIteration;
      }
    }
  };
  return newIter;
};


/**
 * Converts the iterator to an array
 * @param {goog.iter.Iterable} iterable  The iterator to convert to an array.
 * @return {!Array} An array of the elements the iterator iterates over.
 */
goog.iter.toArray = function(iterable) {
  // Fast path for array-like.
  if (goog.isArrayLike(iterable)) {
    return goog.array.toArray((/** @type {!goog.array.ArrayLike} */ iterable));
  }
  iterable = goog.iter.toIterator(iterable);
  var array = [];
  goog.iter.forEach(iterable, function(val) {
    array.push(val);
  });
  return array;
};


/**
 * Iterates over 2 iterators and returns true if they contain the same sequence
 * of elements and have the same length.
 * @param {goog.iter.Iterable} iterable1  The first iterable object.
 * @param {goog.iter.Iterable} iterable2  The second iterable object.
 * @return {boolean} true if the iterators contain the same sequence of
 *     elements and have the same length.
 */
goog.iter.equals = function(iterable1, iterable2) {
  iterable1 = goog.iter.toIterator(iterable1);
  iterable2 = goog.iter.toIterator(iterable2);
  var b1, b2;
  /** @preserveTry */
  try {
    while (true) {
      b1 = b2 = false;
      var val1 = iterable1.next();
      b1 = true;
      var val2 = iterable2.next();
      b2 = true;
      if (val1 != val2) {
        return false;
      }
    }
  } catch (ex) {
    if (ex !== goog.iter.StopIteration) {
      throw ex;
    } else {
      if (b1 && !b2) {
        // iterable1 done but iterable2 is not done.
        return false;
      }
      if (!b2) {
        /** @preserveTry */
        try {
          // iterable2 not done?
          val2 = iterable2.next();
          // iterable2 not done but iterable1 is done
          return false;
        } catch (ex1) {
          if (ex1 !== goog.iter.StopIteration) {
            throw ex1;
          }
          // iterable2 done as well... They are equal
          return true;
        }
      }
    }
  }
  return false;
};


/**
 * Advances the iterator to the next position, returning the given default value
 * instead of throwing an exception if the iterator has no more entries.
 * @param {goog.iter.Iterable} iterable The iterable object.
 * @param {*} defaultValue The value to return if the iterator is empty.
 * @return {*} The next item in the iteration, or defaultValue if the iterator
 *     was empty.
 */
goog.iter.nextOrValue = function(iterable, defaultValue) {
  try {
    return goog.iter.toIterator(iterable).next();
  } catch (e) {
    if (e != goog.iter.StopIteration) {
      throw e;
    }
    return defaultValue;
  }
};


/**
 * Cartesian product of zero or more sets.  Gives an iterator that gives every
 * combination of one element chosen from each set.  For example,
 * ([1, 2], [3, 4]) gives ([1, 3], [1, 4], [2, 3], [2, 4]).
 * @see http://docs.python.org/library/itertools.html#itertools.product
 * @param {...!goog.array.ArrayLike.<*>} var_args Zero or more sets, as arrays.
 * @return {!goog.iter.Iterator} An iterator that gives each n-tuple (as an
 *     array).
 */
goog.iter.product = function(var_args) {
  var someArrayEmpty = goog.array.some(arguments, function(arr) {
    return !arr.length;
  });

  // An empty set in a cartesian product gives an empty set.
  if (someArrayEmpty || !arguments.length) {
    return new goog.iter.Iterator();
  }

  var iter = new goog.iter.Iterator();
  var arrays = arguments;

  // The first indicies are [0, 0, ...]
  var indicies = goog.array.repeat(0, arrays.length);

  iter.next = function() {

    if (indicies) {
      var retVal = goog.array.map(indicies, function(valueIndex, arrayIndex) {
        return arrays[arrayIndex][valueIndex];
      });

      // Generate the next-largest indicies for the next call.
      // Increase the rightmost index. If it goes over, increase the next
      // rightmost (like carry-over addition).
      for (var i = indicies.length - 1; i >= 0; i--) {
        // Assertion prevents compiler warning below.
        goog.asserts.assert(indicies);
        if (indicies[i] < arrays[i].length - 1) {
          indicies[i]++;
          break;
        }

        // We're at the last indicies (the last element of every array), so
        // the iteration is over on the next call.
        if (i == 0) {
          indicies = null;
          break;
        }
        // Reset the index in this column and loop back to increment the
        // next one.
        indicies[i] = 0;
      }
      return retVal;
    }

    throw goog.iter.StopIteration;
  };

  return iter;
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Generics method for collection-like classes and objects.
 *
 *
 * This file contains functions to work with collections. It supports using
 * Map, Set, Array and Object and other classes that implement collection-like
 * methods.
 */


goog.provide('goog.structs');

goog.require('goog.array');
goog.require('goog.object');


// We treat an object as a dictionary if it has getKeys or it is an object that
// isn't arrayLike.


/**
 * Returns the number of values in the collection-like object.
 * @param {Object} col The collection-like object.
 * @return {number} The number of values in the collection-like object.
 */
goog.structs.getCount = function(col) {
  if (typeof col.getCount == 'function') {
    return col.getCount();
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return col.length;
  }
  return goog.object.getCount(col);
};


/**
 * Returns the values of the collection-like object.
 * @param {Object} col The collection-like object.
 * @return {!Array} The values in the collection-like object.
 */
goog.structs.getValues = function(col) {
  if (typeof col.getValues == 'function') {
    return col.getValues();
  }
  if (goog.isString(col)) {
    return col.split('');
  }
  if (goog.isArrayLike(col)) {
    var rv = [];
    var l = col.length;
    for (var i = 0; i < l; i++) {
      rv.push(col[i]);
    }
    return rv;
  }
  return goog.object.getValues(col);
};


/**
 * Returns the keys of the collection. Some collections have no notion of
 * keys/indexes and this function will return undefined in those cases.
 * @param {Object} col The collection-like object.
 * @return {!Array|undefined} The keys in the collection.
 */
goog.structs.getKeys = function(col) {
  if (typeof col.getKeys == 'function') {
    return col.getKeys();
  }
  // if we have getValues but no getKeys we know this is a key-less collection
  if (typeof col.getValues == 'function') {
    return undefined;
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    var rv = [];
    var l = col.length;
    for (var i = 0; i < l; i++) {
      rv.push(i);
    }
    return rv;
  }

  return goog.object.getKeys(col);
};


/**
 * Whether the collection contains the given value. This is O(n) and uses
 * equals (==) to test the existence.
 * @param {Object} col The collection-like object.
 * @param {*} val The value to check for.
 * @return {boolean} True if the map contains the value.
 */
goog.structs.contains = function(col, val) {
  if (typeof col.contains == 'function') {
    return col.contains(val);
  }
  if (typeof col.containsValue == 'function') {
    return col.containsValue(val);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.contains(/** @type {Array} */ (col), val);
  }
  return goog.object.containsValue(col, val);
};


/**
 * Whether the collection is empty.
 * @param {Object} col The collection-like object.
 * @return {boolean} True if empty.
 */
goog.structs.isEmpty = function(col) {
  if (typeof col.isEmpty == 'function') {
    return col.isEmpty();
  }

  // We do not use goog.string.isEmpty because here we treat the string as
  // collection and as such even whitespace matters

  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.isEmpty(/** @type {Array} */ (col));
  }
  return goog.object.isEmpty(col);
};


/**
 * Removes all the elements from the collection.
 * @param {Object} col The collection-like object.
 */
goog.structs.clear = function(col) {
  // NOTE(user): This should not contain strings because strings are immutable
  if (typeof col.clear == 'function') {
    col.clear();
  } else if (goog.isArrayLike(col)) {
    goog.array.clear((/** @type {goog.array.ArrayLike} */ col));
  } else {
    goog.object.clear(col);
  }
};


/**
 * Calls a function for each value in a collection. The function takes
 * three arguments; the value, the key and the collection.
 *
 * @param {Object} col The collection-like object.
 * @param {Function} f The function to call for every value. This function takes
 *     3 arguments (the value, the key or undefined if the collection has no
 *     notion of keys, and the collection) and the return value is irrelevant.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within {@code f}.
 */
goog.structs.forEach = function(col, f, opt_obj) {
  if (typeof col.forEach == 'function') {
    col.forEach(f, opt_obj);
  } else if (goog.isArrayLike(col) || goog.isString(col)) {
    goog.array.forEach(/** @type {Array} */ (col), f, opt_obj);
  } else {
    var keys = goog.structs.getKeys(col);
    var values = goog.structs.getValues(col);
    var l = values.length;
    for (var i = 0; i < l; i++) {
      f.call(opt_obj, values[i], keys && keys[i], col);
    }
  }
};


/**
 * Calls a function for every value in the collection. When a call returns true,
 * adds the value to a new collection (Array is returned by default).
 *
 * @param {Object} col The collection-like object.
 * @param {Function} f The function to call for every value. This function takes
 *     3 arguments (the value, the key or undefined if the collection has no
 *     notion of keys, and the collection) and should return a Boolean. If the
 *     return value is true the value is added to the result collection. If it
 *     is false the value is not included.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within {@code f}.
 * @return {!Object|!Array} A new collection where the passed values are
 *     present. If col is a key-less collection an array is returned.  If col
 *     has keys and values a plain old JS object is returned.
 */
goog.structs.filter = function(col, f, opt_obj) {
  if (typeof col.filter == 'function') {
    return col.filter(f, opt_obj);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.filter(/** @type {!Array} */ (col), f, opt_obj);
  }

  var rv;
  var keys = goog.structs.getKeys(col);
  var values = goog.structs.getValues(col);
  var l = values.length;
  if (keys) {
    rv = {};
    for (var i = 0; i < l; i++) {
      if (f.call(opt_obj, values[i], keys[i], col)) {
        rv[keys[i]] = values[i];
      }
    }
  } else {
    // We should not use goog.array.filter here since we want to make sure that
    // the index is undefined as well as make sure that col is passed to the
    // function.
    rv = [];
    for (var i = 0; i < l; i++) {
      if (f.call(opt_obj, values[i], undefined, col)) {
        rv.push(values[i]);
      }
    }
  }
  return rv;
};


/**
 * Calls a function for every value in the collection and adds the result into a
 * new collection (defaults to creating a new Array).
 *
 * @param {Object} col The collection-like object.
 * @param {Function} f The function to call for every value. This function
 *     takes 3 arguments (the value, the key or undefined if the collection has
 *     no notion of keys, and the collection) and should return something. The
 *     result will be used as the value in the new collection.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within {@code f}.
 * @return {!Object|!Array} A new collection with the new values.  If col is a
 *     key-less collection an array is returned.  If col has keys and values a
 *     plain old JS object is returned.
 */
goog.structs.map = function(col, f, opt_obj) {
  if (typeof col.map == 'function') {
    return col.map(f, opt_obj);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.map(/** @type {!Array} */ (col), f, opt_obj);
  }

  var rv;
  var keys = goog.structs.getKeys(col);
  var values = goog.structs.getValues(col);
  var l = values.length;
  if (keys) {
    rv = {};
    for (var i = 0; i < l; i++) {
      rv[keys[i]] = f.call(opt_obj, values[i], keys[i], col);
    }
  } else {
    // We should not use goog.array.map here since we want to make sure that
    // the index is undefined as well as make sure that col is passed to the
    // function.
    rv = [];
    for (var i = 0; i < l; i++) {
      rv[i] = f.call(opt_obj, values[i], undefined, col);
    }
  }
  return rv;
};


/**
 * Calls f for each value in a collection. If any call returns true this returns
 * true (without checking the rest). If all returns false this returns false.
 *
 * @param {Object|Array|string} col The collection-like object.
 * @param {Function} f The function to call for every value. This function takes
 *     3 arguments (the value, the key or undefined if the collection has no
 *     notion of keys, and the collection) and should return a Boolean.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within {@code f}.
 * @return {boolean} True if any value passes the test.
 */
goog.structs.some = function(col, f, opt_obj) {
  if (typeof col.some == 'function') {
    return col.some(f, opt_obj);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.some(/** @type {!Array} */ (col), f, opt_obj);
  }
  var keys = goog.structs.getKeys(col);
  var values = goog.structs.getValues(col);
  var l = values.length;
  for (var i = 0; i < l; i++) {
    if (f.call(opt_obj, values[i], keys && keys[i], col)) {
      return true;
    }
  }
  return false;
};


/**
 * Calls f for each value in a collection. If all calls return true this return
 * true this returns true. If any returns false this returns false at this point
 *  and does not continue to check the remaining values.
 *
 * @param {Object} col The collection-like object.
 * @param {Function} f The function to call for every value. This function takes
 *     3 arguments (the value, the key or undefined if the collection has no
 *     notion of keys, and the collection) and should return a Boolean.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within {@code f}.
 * @return {boolean} True if all key-value pairs pass the test.
 */
goog.structs.every = function(col, f, opt_obj) {
  if (typeof col.every == 'function') {
    return col.every(f, opt_obj);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.every(/** @type {!Array} */ (col), f, opt_obj);
  }
  var keys = goog.structs.getKeys(col);
  var values = goog.structs.getValues(col);
  var l = values.length;
  for (var i = 0; i < l; i++) {
    if (!f.call(opt_obj, values[i], keys && keys[i], col)) {
      return false;
    }
  }
  return true;
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Datastructure: Hash Map.
 *
 *
 * This file contains an implementation of a Map structure. It implements a lot
 * of the methods used in goog.structs so those functions work on hashes.  For
 * convenience with common usage the methods accept any type for the key, though
 * internally they will be cast to strings.
 */


goog.provide('goog.structs.Map');

goog.require('goog.iter.Iterator');
goog.require('goog.iter.StopIteration');
goog.require('goog.object');
goog.require('goog.structs');



/**
 * Class for Hash Map datastructure.
 * @param {*=} opt_map Map or Object to initialize the map with.
 * @param {...*} var_args If 2 or more arguments are present then they
 *     will be used as key-value pairs.
 * @constructor
 */
goog.structs.Map = function(opt_map, var_args) {

  /**
   * Underlying JS object used to implement the map.
   * @type {!Object}
   * @private
   */
  this.map_ = {};

  /**
   * An array of keys. This is necessary for two reasons:
   *   1. Iterating the keys using for (var key in this.map_) allocates an
   *      object for every key in IE which is really bad for IE6 GC perf.
   *   2. Without a side data structure, we would need to escape all the keys
   *      as that would be the only way we could tell during iteration if the
   *      key was an internal key or a property of the object.
   *
   * This array can contain deleted keys so it's necessary to check the map
   * as well to see if the key is still in the map (this doesn't require a
   * memory allocation in IE).
   * @type {!Array.<string>}
   * @private
   */
  this.keys_ = [];

  var argLength = arguments.length;

  if (argLength > 1) {
    if (argLength % 2) {
      throw Error('Uneven number of arguments');
    }
    for (var i = 0; i < argLength; i += 2) {
      this.set(arguments[i], arguments[i + 1]);
    }
  } else if (opt_map) {
    this.addAll(/** @type {Object} */ (opt_map));
  }
};


/**
 * The number of key value pairs in the map.
 * @private
 * @type {number}
 */
goog.structs.Map.prototype.count_ = 0;


/**
 * Version used to detect changes while iterating.
 * @private
 * @type {number}
 */
goog.structs.Map.prototype.version_ = 0;


/**
 * @return {number} The number of key-value pairs in the map.
 */
goog.structs.Map.prototype.getCount = function() {
  return this.count_;
};


/**
 * Returns the values of the map.
 * @return {!Array} The values in the map.
 */
goog.structs.Map.prototype.getValues = function() {
  this.cleanupKeysArray_();

  var rv = [];
  for (var i = 0; i < this.keys_.length; i++) {
    var key = this.keys_[i];
    rv.push(this.map_[key]);
  }
  return rv;
};


/**
 * Returns the keys of the map.
 * @return {!Array.<string>} Array of string values.
 */
goog.structs.Map.prototype.getKeys = function() {
  this.cleanupKeysArray_();
  return /** @type {!Array.<string>} */ (this.keys_.concat());
};


/**
 * Whether the map contains the given key.
 * @param {*} key The key to check for.
 * @return {boolean} Whether the map contains the key.
 */
goog.structs.Map.prototype.containsKey = function(key) {
  return goog.structs.Map.hasKey_(this.map_, key);
};


/**
 * Whether the map contains the given value. This is O(n).
 * @param {*} val The value to check for.
 * @return {boolean} Whether the map contains the value.
 */
goog.structs.Map.prototype.containsValue = function(val) {
  for (var i = 0; i < this.keys_.length; i++) {
    var key = this.keys_[i];
    if (goog.structs.Map.hasKey_(this.map_, key) && this.map_[key] == val) {
      return true;
    }
  }
  return false;
};


/**
 * Whether this map is equal to the argument map.
 * @param {goog.structs.Map} otherMap The map against which to test equality.
 * @param {function(*, *) : boolean=} opt_equalityFn Optional equality function
 *     to test equality of values. If not specified, this will test whether
 *     the values contained in each map are identical objects.
 * @return {boolean} Whether the maps are equal.
 */
goog.structs.Map.prototype.equals = function(otherMap, opt_equalityFn) {
  if (this === otherMap) {
    return true;
  }

  if (this.count_ != otherMap.getCount()) {
    return false;
  }

  var equalityFn = opt_equalityFn || goog.structs.Map.defaultEquals;

  this.cleanupKeysArray_();
  for (var key, i = 0; key = this.keys_[i]; i++) {
    if (!equalityFn(this.get(key), otherMap.get(key))) {
      return false;
    }
  }

  return true;
};


/**
 * Default equality test for values.
 * @param {*} a The first value.
 * @param {*} b The second value.
 * @return {boolean} Whether a and b reference the same object.
 */
goog.structs.Map.defaultEquals = function(a, b) {
  return a === b;
};


/**
 * @return {boolean} Whether the map is empty.
 */
goog.structs.Map.prototype.isEmpty = function() {
  return this.count_ == 0;
};


/**
 * Removes all key-value pairs from the map.
 */
goog.structs.Map.prototype.clear = function() {
  this.map_ = {};
  this.keys_.length = 0;
  this.count_ = 0;
  this.version_ = 0;
};


/**
 * Removes a key-value pair based on the key. This is O(logN) amortized due to
 * updating the keys array whenever the count becomes half the size of the keys
 * in the keys array.
 * @param {*} key  The key to remove.
 * @return {boolean} Whether object was removed.
 */
goog.structs.Map.prototype.remove = function(key) {
  if (goog.structs.Map.hasKey_(this.map_, key)) {
    delete this.map_[key];
    this.count_--;
    this.version_++;

    // clean up the keys array if the threshhold is hit
    if (this.keys_.length > 2 * this.count_) {
      this.cleanupKeysArray_();
    }

    return true;
  }
  return false;
};


/**
 * Cleans up the temp keys array by removing entries that are no longer in the
 * map.
 * @private
 */
goog.structs.Map.prototype.cleanupKeysArray_ = function() {
  if (this.count_ != this.keys_.length) {
    // First remove keys that are no longer in the map.
    var srcIndex = 0;
    var destIndex = 0;
    while (srcIndex < this.keys_.length) {
      var key = this.keys_[srcIndex];
      if (goog.structs.Map.hasKey_(this.map_, key)) {
        this.keys_[destIndex++] = key;
      }
      srcIndex++;
    }
    this.keys_.length = destIndex;
  }

  if (this.count_ != this.keys_.length) {
    // If the count still isn't correct, that means we have duplicates. This can
    // happen when the same key is added and removed multiple times. Now we have
    // to allocate one extra Object to remove the duplicates. This could have
    // been done in the first pass, but in the common case, we can avoid
    // allocating an extra object by only doing this when necessary.
    var seen = {};
    var srcIndex = 0;
    var destIndex = 0;
    while (srcIndex < this.keys_.length) {
      var key = this.keys_[srcIndex];
      if (!(goog.structs.Map.hasKey_(seen, key))) {
        this.keys_[destIndex++] = key;
        seen[key] = 1;
      }
      srcIndex++;
    }
    this.keys_.length = destIndex;
  }
};


/**
 * Returns the value for the given key.  If the key is not found and the default
 * value is not given this will return {@code undefined}.
 * @param {*} key The key to get the value for.
 * @param {*=} opt_val The value to return if no item is found for the given
 *     key, defaults to undefined.
 * @return {*} The value for the given key.
 */
goog.structs.Map.prototype.get = function(key, opt_val) {
  if (goog.structs.Map.hasKey_(this.map_, key)) {
    return this.map_[key];
  }
  return opt_val;
};


/**
 * Adds a key-value pair to the map.
 * @param {*} key The key.
 * @param {*} value The value to add.
 */
goog.structs.Map.prototype.set = function(key, value) {
  if (!(goog.structs.Map.hasKey_(this.map_, key))) {
    this.count_++;
    this.keys_.push(key);
    // Only change the version if we add a new key.
    this.version_++;
  }
  this.map_[key] = value;
};


/**
 * Adds multiple key-value pairs from another goog.structs.Map or Object.
 * @param {Object} map  Object containing the data to add.
 */
goog.structs.Map.prototype.addAll = function(map) {
  var keys, values;
  if (map instanceof goog.structs.Map) {
    keys = map.getKeys();
    values = map.getValues();
  } else {
    keys = goog.object.getKeys(map);
    values = goog.object.getValues(map);
  }
  // we could use goog.array.forEach here but I don't want to introduce that
  // dependency just for this.
  for (var i = 0; i < keys.length; i++) {
    this.set(keys[i], values[i]);
  }
};


/**
 * Clones a map and returns a new map.
 * @return {!goog.structs.Map} A new map with the same key-value pairs.
 */
goog.structs.Map.prototype.clone = function() {
  return new goog.structs.Map(this);
};


/**
 * Returns a new map in which all the keys and values are interchanged
 * (keys become values and values become keys). If multiple keys map to the
 * same value, the chosen transposed value is implementation-dependent.
 *
 * It acts very similarly to {goog.object.transpose(Object)}.
 *
 * @return {!goog.structs.Map} The transposed map.
 */
goog.structs.Map.prototype.transpose = function() {
  var transposed = new goog.structs.Map();
  for (var i = 0; i < this.keys_.length; i++) {
    var key = this.keys_[i];
    var value = this.map_[key];
    transposed.set(value, key);
  }

  return transposed;
};


/**
 * @return {!Object} Object representation of the map.
 */
goog.structs.Map.prototype.toObject = function() {
  this.cleanupKeysArray_();
  var obj = {};
  for (var i = 0; i < this.keys_.length; i++) {
    var key = this.keys_[i];
    obj[key] = this.map_[key];
  }
  return obj;
};


/**
 * Returns an iterator that iterates over the keys in the map.  Removal of keys
 * while iterating might have undesired side effects.
 * @return {!goog.iter.Iterator} An iterator over the keys in the map.
 */
goog.structs.Map.prototype.getKeyIterator = function() {
  return this.__iterator__(true);
};


/**
 * Returns an iterator that iterates over the values in the map.  Removal of
 * keys while iterating might have undesired side effects.
 * @return {!goog.iter.Iterator} An iterator over the values in the map.
 */
goog.structs.Map.prototype.getValueIterator = function() {
  return this.__iterator__(false);
};


/**
 * Returns an iterator that iterates over the values or the keys in the map.
 * This throws an exception if the map was mutated since the iterator was
 * created.
 * @param {boolean=} opt_keys True to iterate over the keys. False to iterate
 *     over the values.  The default value is false.
 * @return {!goog.iter.Iterator} An iterator over the values or keys in the map.
 */
goog.structs.Map.prototype.__iterator__ = function(opt_keys) {
  // Clean up keys to minimize the risk of iterating over dead keys.
  this.cleanupKeysArray_();

  var i = 0;
  var keys = this.keys_;
  var map = this.map_;
  var version = this.version_;
  var selfObj = this;

  var newIter = new goog.iter.Iterator;
  newIter.next = function() {
    while (true) {
      if (version != selfObj.version_) {
        throw Error('The map has changed since the iterator was created');
      }
      if (i >= keys.length) {
        throw goog.iter.StopIteration;
      }
      var key = keys[i++];
      return opt_keys ? key : map[key];
    }
  };
  return newIter;
};


/**
 * Safe way to test for hasOwnProperty.  It even allows testing for
 * 'hasOwnProperty'.
 * @param {Object} obj The object to test for presence of the given key.
 * @param {*} key The key to check for.
 * @return {boolean} Whether the object has the key.
 * @private
 */
goog.structs.Map.hasKey_ = function(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Class for parsing and formatting URIs.
 *
 * Use goog.Uri(string) to parse a URI string.  Use goog.Uri.create(...) to
 * create a new instance of the goog.Uri object from Uri parts.
 *
 * e.g: <code>var myUri = new goog.Uri(window.location);</code>
 *
 * Implements RFC 3986 for parsing/formatting URIs.
 * http://gbiv.com/protocols/uri/rfc/rfc3986.html
 *
 * Some changes have been made to the interface (more like .NETs), though the
 * internal representation is now of un-encoded parts, this will change the
 * behavior slightly.
 *
 */

goog.provide('goog.Uri');
goog.provide('goog.Uri.QueryData');

goog.require('goog.array');
goog.require('goog.string');
goog.require('goog.structs');
goog.require('goog.structs.Map');
goog.require('goog.uri.utils');
goog.require('goog.uri.utils.ComponentIndex');



/**
 * This class contains setters and getters for the parts of the URI.
 * The <code>getXyz</code>/<code>setXyz</code> methods return the decoded part
 * -- so<code>goog.Uri.parse('/foo%20bar').getPath()</code> will return the
 * decoded path, <code>/foo bar</code>.
 *
 * The constructor accepts an optional unparsed, raw URI string.  The parser
 * is relaxed, so special characters that aren't escaped but don't cause
 * ambiguities will not cause parse failures.
 *
 * All setters return <code>this</code> and so may be chained, a la
 * <code>goog.Uri.parse('/foo').setFragment('part').toString()</code>.
 *
 * @param {*=} opt_uri Optional string URI to parse
 *        (use goog.Uri.create() to create a URI from parts), or if
 *        a goog.Uri is passed, a clone is created.
 * @param {boolean=} opt_ignoreCase If true, #getParameterValue will ignore
 * the case of the parameter name.
 *
 * @constructor
 */
goog.Uri = function(opt_uri, opt_ignoreCase) {
  // Parse in the uri string
  var m;
  if (opt_uri instanceof goog.Uri) {
    this.setIgnoreCase(opt_ignoreCase == null ?
        opt_uri.getIgnoreCase() : opt_ignoreCase);
    this.setScheme(opt_uri.getScheme());
    this.setUserInfo(opt_uri.getUserInfo());
    this.setDomain(opt_uri.getDomain());
    this.setPort(opt_uri.getPort());
    this.setPath(opt_uri.getPath());
    this.setQueryData(opt_uri.getQueryData().clone());
    this.setFragment(opt_uri.getFragment());
  } else if (opt_uri && (m = goog.uri.utils.split(String(opt_uri)))) {
    // Set the parts -- decoding as we do so.
    this.setIgnoreCase(!!opt_ignoreCase);
    // COMPATABILITY NOTE - In IE, unmatched fields may be empty strings,
    // whereas in other browsers they will be undefined.
    this.setScheme(m[goog.uri.utils.ComponentIndex.SCHEME] || '', true);
    this.setUserInfo(m[goog.uri.utils.ComponentIndex.USER_INFO] || '', true);
    this.setDomain(m[goog.uri.utils.ComponentIndex.DOMAIN] || '', true);
    this.setPort(m[goog.uri.utils.ComponentIndex.PORT]);
    this.setPath(m[goog.uri.utils.ComponentIndex.PATH] || '', true);

    this.setQuery(m[goog.uri.utils.ComponentIndex.QUERY_DATA] || '', true);

    this.setFragment(m[goog.uri.utils.ComponentIndex.FRAGMENT] || '', true);

  } else {
    this.setIgnoreCase(!!opt_ignoreCase);
    this.queryData_ = new goog.Uri.QueryData(null, this, this.ignoreCase_);
  }
};


/**
 * Parameter name added to stop caching.
 * @type {string}
 */
goog.Uri.RANDOM_PARAM = goog.uri.utils.StandardQueryParam.RANDOM;


/**
 * Scheme such as "http".
 * @type {string}
 * @private
 */
goog.Uri.prototype.scheme_ = '';


/**
 * User credentials in the form "username:password".
 * @type {string}
 * @private
 */
goog.Uri.prototype.userInfo_ = '';


/**
 * Domain part, e.g. "www.google.com".
 * @type {string}
 * @private
 */
goog.Uri.prototype.domain_ = '';


/**
 * Port, e.g. 8080.
 * @type {?number}
 * @private
 */
goog.Uri.prototype.port_ = null;


/**
 * Path, e.g. "/tests/img.png".
 * @type {string}
 * @private
 */
goog.Uri.prototype.path_ = '';


/**
 * Object representing query data.
 * @type {goog.Uri.QueryData}
 * @private
 */
goog.Uri.prototype.queryData_;


/**
 * The fragment without the #.
 * @type {string}
 * @private
 */
goog.Uri.prototype.fragment_ = '';


/**
 * Whether or not this Uri should be treated as Read Only.
 * @type {boolean}
 * @private
 */
goog.Uri.prototype.isReadOnly_ = false;


/**
 * Whether or not to ignore case when comparing query params.
 * @type {boolean}
 * @private
 */
goog.Uri.prototype.ignoreCase_ = false;


/**
 * @return {string} The string form of the url.
 */
goog.Uri.prototype.toString = function() {
  if (this.cachedToString_) {
    return this.cachedToString_;
  }

  var out = [];

  if (this.scheme_) {
    out.push(goog.Uri.encodeSpecialChars_(
        this.scheme_, goog.Uri.reDisallowedInSchemeOrUserInfo_), ':');
  }

  if (this.domain_) {
    out.push('//');

    if (this.userInfo_) {
      out.push(goog.Uri.encodeSpecialChars_(
          this.userInfo_, goog.Uri.reDisallowedInSchemeOrUserInfo_), '@');
    }

    out.push(goog.Uri.encodeString_(this.domain_));

    if (this.port_ != null) {
      out.push(':', String(this.getPort()));
    }
  }

  if (this.path_) {
    if (this.hasDomain() && this.path_.charAt(0) != '/') {
      out.push('/');
    }
    out.push(goog.Uri.encodeSpecialChars_(
        this.path_, goog.Uri.reDisallowedInPath_));
  }

  var query = String(this.queryData_);
  if (query) {
    out.push('?', query);
  }

  if (this.fragment_) {
    out.push('#', goog.Uri.encodeSpecialChars_(
        this.fragment_, goog.Uri.reDisallowedInFragment_));
  }
  return this.cachedToString_ = out.join('');
};


/**
 * Resolves a relative url string to a this base uri.
 *
 * There are several kinds of relative urls:<br>
 * 1. foo - replaces the last part of the path, the whole query and fragment<br>
 * 2. /foo - replaces the the path, the query and fragment<br>
 * 3. //foo - replaces everything from the domain on.  foo is a domain name<br>
 * 4. ?foo - replace the query and fragment<br>
 * 5. #foo - replace the fragment only
 *
 * Additionally, if relative url has a non-empty path, all ".." and "."
 * segments will be resolved, as described in RFC 3986.
 *
 * @param {goog.Uri} relativeUri The relative url to resolve.
 * @return {goog.Uri} The resolved URI.
 */
goog.Uri.prototype.resolve = function(relativeUri) {

  var absoluteUri = this.clone();

  // we satisfy these conditions by looking for the first part of relativeUri
  // that is not blank and applying defaults to the rest

  var overridden = relativeUri.hasScheme();

  if (overridden) {
    absoluteUri.setScheme(relativeUri.getScheme());
  } else {
    overridden = relativeUri.hasUserInfo();
  }

  if (overridden) {
    absoluteUri.setUserInfo(relativeUri.getUserInfo());
  } else {
    overridden = relativeUri.hasDomain();
  }

  if (overridden) {
    absoluteUri.setDomain(relativeUri.getDomain());
  } else {
    overridden = relativeUri.hasPort();
  }

  var path = relativeUri.getPath();
  if (overridden) {
    absoluteUri.setPort(relativeUri.getPort());
  } else {
    overridden = relativeUri.hasPath();
    if (overridden) {
      // resolve path properly
      if (path.charAt(0) != '/') {
        // path is relative
        if (this.hasDomain() && !this.hasPath()) {
          // RFC 3986, section 5.2.3, case 1
          path = '/' + path;
        } else {
          // RFC 3986, section 5.2.3, case 2
          var lastSlashIndex = absoluteUri.getPath().lastIndexOf('/');
          if (lastSlashIndex != -1) {
            path = absoluteUri.getPath().substr(0, lastSlashIndex + 1) + path;
          }
        }
      }
      path = goog.Uri.removeDotSegments(path);
    }
  }

  if (overridden) {
    absoluteUri.setPath(path);
  } else {
    overridden = relativeUri.hasQuery();
  }

  if (overridden) {
    absoluteUri.setQuery(relativeUri.getDecodedQuery());
  } else {
    overridden = relativeUri.hasFragment();
  }

  if (overridden) {
    absoluteUri.setFragment(relativeUri.getFragment());
  }

  return absoluteUri;
};


/**
 * Clones the URI instance.
 * @return {!goog.Uri} New instance of the URI objcet.
 */
goog.Uri.prototype.clone = function() {
  return goog.Uri.create(this.scheme_, this.userInfo_, this.domain_,
                         this.port_, this.path_, this.queryData_.clone(),
                         this.fragment_, this.ignoreCase_);
};


/**
 * @return {string} The encoded scheme/protocol for the URI.
 */
goog.Uri.prototype.getScheme = function() {
  return this.scheme_;
};


/**
 * Sets the scheme/protocol.
 * @param {string} newScheme New scheme value.
 * @param {boolean=} opt_decode Optional param for whether to decode new value.
 * @return {goog.Uri} Reference to this URI object.
 */
goog.Uri.prototype.setScheme = function(newScheme, opt_decode) {
  this.enforceReadOnly();
  delete this.cachedToString_;
  this.scheme_ = opt_decode ? goog.Uri.decodeOrEmpty_(newScheme) : newScheme;

  // remove an : at the end of the scheme so somebody can pass in
  // window.location.protocol
  if (this.scheme_) {
    this.scheme_ = this.scheme_.replace(/:$/, '');
  }
  return this;
};


/**
 * @return {boolean} Whether the scheme has been set.
 */
goog.Uri.prototype.hasScheme = function() {
  return !!this.scheme_;
};


/**
 * @return {string} The decoded user info.
 */
goog.Uri.prototype.getUserInfo = function() {
  return this.userInfo_;
};


/**
 * Sets the userInfo.
 * @param {string} newUserInfo New userInfo value.
 * @param {boolean=} opt_decode Optional param for whether to decode new value.
 * @return {goog.Uri} Reference to this URI object.
 */
goog.Uri.prototype.setUserInfo = function(newUserInfo, opt_decode) {
  this.enforceReadOnly();
  delete this.cachedToString_;
  this.userInfo_ = opt_decode ? goog.Uri.decodeOrEmpty_(newUserInfo) :
                   newUserInfo;
  return this;
};


/**
 * @return {boolean} Whether the user info has been set.
 */
goog.Uri.prototype.hasUserInfo = function() {
  return !!this.userInfo_;
};


/**
 * @return {string} The decoded domain.
 */
goog.Uri.prototype.getDomain = function() {
  return this.domain_;
};


/**
 * Sets the domain.
 * @param {string} newDomain New domain value.
 * @param {boolean=} opt_decode Optional param for whether to decode new value.
 * @return {goog.Uri} Reference to this URI object.
 */
goog.Uri.prototype.setDomain = function(newDomain, opt_decode) {
  this.enforceReadOnly();
  delete this.cachedToString_;
  this.domain_ = opt_decode ? goog.Uri.decodeOrEmpty_(newDomain) : newDomain;
  return this;
};


/**
 * @return {boolean} Whether the domain has been set.
 */
goog.Uri.prototype.hasDomain = function() {
  return !!this.domain_;
};


/**
 * @return {?number} The port number.
 */
goog.Uri.prototype.getPort = function() {
  return this.port_;
};


/**
 * Sets the port number.
 * @param {*} newPort Port number. Will be explicitly casted to a number.
 * @return {goog.Uri} Reference to this URI object.
 */
goog.Uri.prototype.setPort = function(newPort) {
  this.enforceReadOnly();
  delete this.cachedToString_;

  if (newPort) {
    newPort = Number(newPort);
    if (isNaN(newPort) || newPort < 0) {
      throw Error('Bad port number ' + newPort);
    }
    this.port_ = newPort;
  } else {
    this.port_ = null;
  }

  return this;
};


/**
 * @return {boolean} Whether the port has been set.
 */
goog.Uri.prototype.hasPort = function() {
  return this.port_ != null;
};


/**
  * @return {string} The decoded path.
 */
goog.Uri.prototype.getPath = function() {
  return this.path_;
};


/**
 * Sets the path.
 * @param {string} newPath New path value.
 * @param {boolean=} opt_decode Optional param for whether to decode new value.
 * @return {goog.Uri} Reference to this URI object.
 */
goog.Uri.prototype.setPath = function(newPath, opt_decode) {
  this.enforceReadOnly();
  delete this.cachedToString_;
  this.path_ = opt_decode ? goog.Uri.decodeOrEmpty_(newPath) : newPath;
  return this;
};


/**
 * @return {boolean} Whether the path has been set.
 */
goog.Uri.prototype.hasPath = function() {
  return !!this.path_;
};


/**
 * @return {boolean} Whether the query string has been set.
 */
goog.Uri.prototype.hasQuery = function() {
  return this.queryData_.toString() !== '';
};


/**
 * Sets the query data.
 * @param {goog.Uri.QueryData|string|undefined} queryData QueryData object.
 * @param {boolean=} opt_decode Optional param for whether to decode new value.
 *     Applies only if queryData is a string.
 * @return {goog.Uri} Reference to this URI object.
 */
goog.Uri.prototype.setQueryData = function(queryData, opt_decode) {
  this.enforceReadOnly();
  delete this.cachedToString_;

  if (queryData instanceof goog.Uri.QueryData) {
    this.queryData_ = queryData;
    this.queryData_.uri_ = this;
    this.queryData_.setIgnoreCase(this.ignoreCase_);
  } else {
    // QueryData accepts encoded query string,
    // so encode it if opt_decode flag is not true.
    if (!opt_decode) {
      queryData = goog.Uri.encodeSpecialChars_(queryData,
                                               goog.Uri.reDisallowedInQuery_);
    }
    this.queryData_ =
        new goog.Uri.QueryData(queryData, this, this.ignoreCase_);
  }

  return this;
};


/**
 * Sets the URI query.
 * @param {string} newQuery New query value.
 * @param {boolean=} opt_decode Optional param for whether to decode new value.
 * @return {goog.Uri} Reference to this URI object.
 */
goog.Uri.prototype.setQuery = function(newQuery, opt_decode) {
  return this.setQueryData(newQuery, opt_decode);
};


/**
 * @return {string} The encoded URI query, not including the ?.
 */
goog.Uri.prototype.getEncodedQuery = function() {
  return this.queryData_.toString();
};


/**
 * @return {string} The decoded URI query, not including the ?.
 */
goog.Uri.prototype.getDecodedQuery = function() {
  return this.queryData_.toDecodedString();
};


/**
 * Returns the query data.
 * @return {goog.Uri.QueryData} QueryData object.
 */
goog.Uri.prototype.getQueryData = function() {
  return this.queryData_;
};


/**
 * @return {string} The encoded URI query, not including the ?.
 *
 * Warning: This method, unlike other getter methods, returns encoded
 * value, instead of decoded one.
 */
goog.Uri.prototype.getQuery = function() {
  return this.getEncodedQuery();
};


/**
 * Sets the value of the named query parameters, clearing previous values for
 * that key.
 *
 * @param {string} key The parameter to set.
 * @param {*} value The new value.
 * @return {goog.Uri} Reference to this URI object.
 */
goog.Uri.prototype.setParameterValue = function(key, value) {
  this.enforceReadOnly();
  delete this.cachedToString_;

  this.queryData_.set(key, value);
  return this;
};


/**
 * Sets the values of the named query parameters, clearing previous values for
 * that key.  Not new values will currently be moved to the end of the query
 * string.
 *
 * So, <code>goog.Uri.parse('foo?a=b&c=d&e=f').setParameterValues('c', ['new'])
 * </code> yields <tt>foo?a=b&e=f&c=new</tt>.</p>
 *
 * @param {string} key The parameter to set.
 * @param {*} values The new values. If values is a single
 *     string then it will be treated as the sole value.
 * @return {goog.Uri} Reference to this URI object.
 */
goog.Uri.prototype.setParameterValues = function(key, values) {
  this.enforceReadOnly();
  delete this.cachedToString_;

  if (!goog.isArray(values)) {
    values = [String(values)];
  }

  // TODO(nicksantos): This cast shouldn't be necessary.
  this.queryData_.setValues(key, /** @type {Array} */ (values));

  return this;
};


/**
 * Returns the value<b>s</b> for a given cgi parameter as a list of decoded
 * query parameter values.
 * @param {string} name The parameter to get values for.
 * @return {Array} The values for a given cgi parameter as a list of
 *     decoded query parameter values.
 */
goog.Uri.prototype.getParameterValues = function(name) {
  return this.queryData_.getValues(name);
};


/**
 * Returns the first value for a given cgi parameter or undefined if the given
 * parameter name does not appear in the query string.
 * @param {string} paramName Unescaped parameter name.
 * @return {*} The first value for a given cgi parameter or
 *     undefined if the given parameter name does not appear in the query
 *     string.
 */
goog.Uri.prototype.getParameterValue = function(paramName) {
  return this.queryData_.get(paramName);
};


/**
 * @return {string} The URI fragment, not including the #.
 */
goog.Uri.prototype.getFragment = function() {
  return this.fragment_;
};


/**
 * Sets the URI fragment.
 * @param {string} newFragment New fragment value.
 * @param {boolean=} opt_decode Optional param for whether to decode new value.
 * @return {goog.Uri} Reference to this URI object.
 */
goog.Uri.prototype.setFragment = function(newFragment, opt_decode) {
  this.enforceReadOnly();
  delete this.cachedToString_;
  this.fragment_ = opt_decode ? goog.Uri.decodeOrEmpty_(newFragment) :
                   newFragment;
  return this;
};


/**
 * @return {boolean} Whether the URI has a fragment set.
 */
goog.Uri.prototype.hasFragment = function() {
  return !!this.fragment_;
};


/**
 * Returns true if this has the same domain as that of uri2.
 * @param {goog.Uri} uri2 The URI object to compare to.
 * @return {boolean} true if same domain; false otherwise.
 */
goog.Uri.prototype.hasSameDomainAs = function(uri2) {
  return ((!this.hasDomain() && !uri2.hasDomain()) ||
          this.getDomain() == uri2.getDomain()) &&
      ((!this.hasPort() && !uri2.hasPort()) ||
          this.getPort() == uri2.getPort());
};


/**
 * Adds a random parameter to the Uri.
 * @return {goog.Uri} Reference to this Uri object.
 */
goog.Uri.prototype.makeUnique = function() {
  this.enforceReadOnly();
  this.setParameterValue(goog.Uri.RANDOM_PARAM, goog.string.getRandomString());

  return this;
};


/**
 * Removes the named query parameter.
 *
 * @param {string} key The parameter to remove.
 * @return {goog.Uri} Reference to this URI object.
 */
goog.Uri.prototype.removeParameter = function(key) {
  this.enforceReadOnly();
  this.queryData_.remove(key);
  return this;
};


/**
 * Sets whether Uri is read only. If this goog.Uri is read-only,
 * enforceReadOnly_ will be called at the start of any function that may modify
 * this Uri.
 * @param {boolean} isReadOnly whether this goog.Uri should be read only.
 * @return {goog.Uri} Reference to this Uri object.
 */
goog.Uri.prototype.setReadOnly = function(isReadOnly) {
  this.isReadOnly_ = isReadOnly;
  return this;
};


/**
 * @return {boolean} Whether the URI is read only.
 */
goog.Uri.prototype.isReadOnly = function() {
  return this.isReadOnly_;
};


/**
 * Checks if this Uri has been marked as read only, and if so, throws an error.
 * This should be called whenever any modifying function is called.
 */
goog.Uri.prototype.enforceReadOnly = function() {
  if (this.isReadOnly_) {
    throw Error('Tried to modify a read-only Uri');
  }
};


/**
 * Sets whether to ignore case.
 * NOTE: If there are already key/value pairs in the QueryData, and
 * ignoreCase_ is set to false, the keys will all be lower-cased.
 * @param {boolean} ignoreCase whether this goog.Uri should ignore case.
 * @return {goog.Uri} Reference to this Uri object.
 */
goog.Uri.prototype.setIgnoreCase = function(ignoreCase) {
  this.ignoreCase_ = ignoreCase;
  if (this.queryData_) {
    this.queryData_.setIgnoreCase(ignoreCase);
  }
  return this;
};


/**
 * @return {boolean} Whether to ignore case.
 */
goog.Uri.prototype.getIgnoreCase = function() {
  return this.ignoreCase_;
};


//==============================================================================
// Static members
//==============================================================================


/**
 * Creates a uri from the string form.  Basically an alias of new goog.Uri().
 * If a Uri object is passed to parse then it will return a clone of the object.
 *
 * @param {*} uri Raw URI string or instance of Uri
 *     object.
 * @param {boolean=} opt_ignoreCase Whether to ignore the case of parameter
 * names in #getParameterValue.
 * @return {goog.Uri} The new URI object.
 */
goog.Uri.parse = function(uri, opt_ignoreCase) {
  return uri instanceof goog.Uri ?
         uri.clone() : new goog.Uri(uri, opt_ignoreCase);
};


/**
 * Creates a new goog.Uri object from unencoded parts.
 *
 * @param {?string=} opt_scheme Scheme/protocol or full URI to parse.
 * @param {?string=} opt_userInfo username:password.
 * @param {?string=} opt_domain www.google.com.
 * @param {?number=} opt_port 9830.
 * @param {?string=} opt_path /some/path/to/a/file.html.
 * @param {string|goog.Uri.QueryData=} opt_query a=1&b=2.
 * @param {?string=} opt_fragment The fragment without the #.
 * @param {boolean=} opt_ignoreCase Whether to ignore parameter name case in
 *     #getParameterValue.
 *
 * @return {!goog.Uri} The new URI object.
 */
goog.Uri.create = function(opt_scheme, opt_userInfo, opt_domain, opt_port,
                           opt_path, opt_query, opt_fragment, opt_ignoreCase) {

  var uri = new goog.Uri(null, opt_ignoreCase);

  // Only set the parts if they are defined and not empty strings.
  opt_scheme && uri.setScheme(opt_scheme);
  opt_userInfo && uri.setUserInfo(opt_userInfo);
  opt_domain && uri.setDomain(opt_domain);
  opt_port && uri.setPort(opt_port);
  opt_path && uri.setPath(opt_path);
  opt_query && uri.setQueryData(opt_query);
  opt_fragment && uri.setFragment(opt_fragment);

  return uri;
};


/**
 * Resolves a relative Uri against a base Uri, accepting both strings and
 * Uri objects.
 *
 * @param {*} base Base Uri.
 * @param {*} rel Relative Uri.
 * @return {goog.Uri} Resolved uri.
 */
goog.Uri.resolve = function(base, rel) {
  if (!(base instanceof goog.Uri)) {
    base = goog.Uri.parse(base);
  }

  if (!(rel instanceof goog.Uri)) {
    rel = goog.Uri.parse(rel);
  }

  return base.resolve(rel);
};


/**
 * Removes dot segments in given path component, as described in
 * RFC 3986, section 5.2.4.
 *
 * @param {string} path A non-empty path component.
 * @return {string} Path component with removed dot segments.
 */
goog.Uri.removeDotSegments = function(path) {
  if (path == '..' || path == '.') {
    return '';

  } else if (!goog.string.contains(path, './') &&
             !goog.string.contains(path, '/.')) {
    // This optimization detects uris which do not contain dot-segments,
    // and as a consequence do not require any processing.
    return path;

  } else {
    var leadingSlash = goog.string.startsWith(path, '/');
    var segments = path.split('/');
    var out = [];

    for (var pos = 0; pos < segments.length; ) {
      var segment = segments[pos++];

      if (segment == '.') {
        if (leadingSlash && pos == segments.length) {
          out.push('');
        }
      } else if (segment == '..') {
        if (out.length > 1 || out.length == 1 && out[0] != '') {
          out.pop();
        }
        if (leadingSlash && pos == segments.length) {
          out.push('');
        }
      } else {
        out.push(segment);
        leadingSlash = true;
      }
    }

    return out.join('/');
  }
};


/**
 * Decodes a value or returns the empty string if it isn't defined or empty.
 * @param {string|undefined} val Value to decode.
 * @return {string} Decoded value.
 * @private
 */
goog.Uri.decodeOrEmpty_ = function(val) {
  // Don't use UrlDecode() here because val is not a query parameter.
  return val ? decodeURIComponent(val) : '';
};


/**
 * URI encode a string, or return null if it's not a string.
 * @param {*} unescapedPart Unescaped string.
 * @return {?string} Escaped string.
 * @private
 */
goog.Uri.encodeString_ = function(unescapedPart) {
  if (goog.isString(unescapedPart)) {
    return encodeURIComponent(unescapedPart);
  }
  return null;
};


/**
 * Regular expression used for determining if a string needs to be encoded.
 * @type {RegExp}
 * @private
 */
goog.Uri.encodeSpecialRegExp_ = /^[a-zA-Z0-9\-_.!~*'():\/;?]*$/;


/**
 * If unescapedPart is non null, then escapes any characters in it that aren't
 * valid characters in a url and also escapes any special characters that
 * appear in extra.
 *
 * @param {*} unescapedPart The string to encode.
 * @param {RegExp} extra A character set of characters in [\01-\177].
 * @return {?string} null iff unescapedPart == null.
 * @private
 */
goog.Uri.encodeSpecialChars_ = function(unescapedPart, extra) {
  var ret = null;
  if (goog.isString(unescapedPart)) {
    ret = unescapedPart;
    // Checking if the search matches before calling encodeURI avoids an extra
    // allocation in IE6
    if (!goog.Uri.encodeSpecialRegExp_.test(ret)) {
      ret = encodeURI(unescapedPart);
    }
    // Checking if the search matches before calling replace avoids an extra
    // allocation in IE6
    if (ret.search(extra) >= 0) {
      ret = ret.replace(extra, goog.Uri.encodeChar_);
    }
  }
  return ret;
};


/**
 * Converts a character in [\01-\177] to its unicode character equivalent.
 * @param {string} ch One character string.
 * @return {string} Encoded string.
 * @private
 */
goog.Uri.encodeChar_ = function(ch) {
  var n = ch.charCodeAt(0);
  return '%' + ((n >> 4) & 0xf).toString(16) + (n & 0xf).toString(16);
};


/**
 * Regular expression for characters that are disallowed in the scheme or
 * userInfo part of the URI.
 * @type {RegExp}
 * @private
 */
goog.Uri.reDisallowedInSchemeOrUserInfo_ = /[#\/\?@]/g;


/**
 * Regular expression for characters that are disallowed in the path.
 * @type {RegExp}
 * @private
 */
goog.Uri.reDisallowedInPath_ = /[\#\?]/g;


/**
 * Regular expression for characters that are disallowed in the query.
 * @type {RegExp}
 * @private
 */
goog.Uri.reDisallowedInQuery_ = /[\#\?@]/g;


/**
 * Regular expression for characters that are disallowed in the fragment.
 * @type {RegExp}
 * @private
 */
goog.Uri.reDisallowedInFragment_ = /#/g;


/**
 * Checks whether two URIs have the same domain.
 * @param {string} uri1String First URI string.
 * @param {string} uri2String Second URI string.
 * @return {boolean} true if the two URIs have the same domain; false otherwise.
 */
goog.Uri.haveSameDomain = function(uri1String, uri2String) {
  // Differs from goog.uri.utils.haveSameDomain, since this ignores scheme.
  // TODO(user): Have this just call goog.uri.util.haveSameDomain.
  var pieces1 = goog.uri.utils.split(uri1String);
  var pieces2 = goog.uri.utils.split(uri2String);
  return pieces1[goog.uri.utils.ComponentIndex.DOMAIN] ==
             pieces2[goog.uri.utils.ComponentIndex.DOMAIN] &&
         pieces1[goog.uri.utils.ComponentIndex.PORT] ==
             pieces2[goog.uri.utils.ComponentIndex.PORT];
};



/**
 * Class used to represent URI query parameters.  It is essentially a hash of
 * name-value pairs, though a name can be present more than once.
 *
 * Has the same interface as the collections in goog.structs.
 *
 * @param {?string=} opt_query Optional encoded query string to parse into
 *     the object.
 * @param {goog.Uri=} opt_uri Optional uri object that should have its cache
 *     invalidated when this object updates.
 * @param {boolean=} opt_ignoreCase If true, ignore the case of the parameter
 *     name in #get.
 * @constructor
 */
goog.Uri.QueryData = function(opt_query, opt_uri, opt_ignoreCase) {
  /**
   * Encoded query string, or null if it requires computing from the key map.
   * @type {?string}
   * @private
   */
  this.encodedQuery_ = opt_query || null;

  /**
   * Reference to a uri object which uses the query data.  This allows the
   * QueryData object to invalidate the cache.
   * @type {goog.Uri}
   * @private
   */
  this.uri_ = opt_uri || null;

  /**
   * If true, ignore the case of the parameter name in #get.
   * @type {boolean}
   * @private
   */
  this.ignoreCase_ = !!opt_ignoreCase;
};


/**
 * If the underlying key map is not yet initialized, it parses the
 * query string and fills the map with parsed data.
 * @private
 */
goog.Uri.QueryData.prototype.ensureKeyMapInitialized_ = function() {
  if (!this.keyMap_) {
    this.keyMap_ = new goog.structs.Map();

    if (this.encodedQuery_) {
      var pairs = this.encodedQuery_.split('&');
      for (var i = 0; i < pairs.length; i++) {
        var indexOfEquals = pairs[i].indexOf('=');
        var name = null;
        var value = null;
        if (indexOfEquals >= 0) {
          name = pairs[i].substring(0, indexOfEquals);
          value = pairs[i].substring(indexOfEquals + 1);
        } else {
          name = pairs[i];
        }
        name = goog.string.urlDecode(name);
        name = this.getKeyName_(name);
        this.add(name, value ? goog.string.urlDecode(value) : '');
      }
    }
  }
};


/**
 * Creates a new query data instance from a map of names and values.
 *
 * @param {!goog.structs.Map|!Object} map Map of string parameter names to
 *     string parameter values.
 * @param {goog.Uri=} opt_uri URI object that should have its cache
 *     invalidated when this object updates.
 * @param {boolean=} opt_ignoreCase If true, ignore the case of the parameter
 *     name in #get.
 * @return {!goog.Uri.QueryData} The populated query data instance.
 */
goog.Uri.QueryData.createFromMap = function(map, opt_uri, opt_ignoreCase) {
  var keys = goog.structs.getKeys(map);
  if (typeof keys == 'undefined') {
    throw Error('Keys are undefined');
  }
  return goog.Uri.QueryData.createFromKeysValues(
      keys,
      goog.structs.getValues(map),
      opt_uri,
      opt_ignoreCase);
};


/**
 * Creates a new query data instance from parallel arrays of parameter names
 * and values. Allows for duplicate parameter names. Throws an error if the
 * lengths of the arrays differ.
 *
 * @param {Array.<string>} keys Parameter names.
 * @param {Array} values Parameter values.
 * @param {goog.Uri=} opt_uri URI object that should have its cache
 *     invalidated when this object updates.
 * @param {boolean=} opt_ignoreCase If true, ignore the case of the parameter
 *     name in #get.
 * @return {!goog.Uri.QueryData} The populated query data instance.
 */
goog.Uri.QueryData.createFromKeysValues = function(
    keys, values, opt_uri, opt_ignoreCase) {
  if (keys.length != values.length) {
    throw Error('Mismatched lengths for keys/values');
  }
  var queryData = new goog.Uri.QueryData(null, opt_uri, opt_ignoreCase);
  for (var i = 0; i < keys.length; i++) {
    queryData.add(keys[i], values[i]);
  }
  return queryData;
};


/**
 * The map containing name/value or name/array-of-values pairs.
 * May be null if it requires parsing from the query string.
 *
 * We need to use a Map because we cannot guarantee that the key names will
 * not be problematic for IE.
 *
 * @type {Object}
 * @private
 */
goog.Uri.QueryData.prototype.keyMap_ = null;


/**
 * The number of params, or null if it requires computing.
 * @type {?number}
 * @private
 */
goog.Uri.QueryData.prototype.count_ = null;


/**
 * Decoded query string, or null if it requires computing.
 * @type {?string}
 * @private
 */
goog.Uri.QueryData.decodedQuery_ = null;


/**
 * @return {?number} The number of parameters.
 */
goog.Uri.QueryData.prototype.getCount = function() {
  this.ensureKeyMapInitialized_();
  return this.count_;
};


/**
 * Adds a key value pair.
 * @param {string} key Name.
 * @param {*} value Value.
 * @return {goog.Uri.QueryData} Instance of this object.
 */
goog.Uri.QueryData.prototype.add = function(key, value) {
  this.ensureKeyMapInitialized_();
  this.invalidateCache_();

  key = this.getKeyName_(key);
  if (!this.containsKey(key)) {
    this.keyMap_.set(key, value);
  } else {
    var current = this.keyMap_.get(key);
    if (goog.isArray(current)) {
      current.push(value);
    } else {
      this.keyMap_.set(key, [current, value]);
    }
  }

  this.count_++;

  return this;
};


/**
 * Removes all the params with the given key.
 * @param {string} key Name.
 * @return {boolean} Whether any parameter was removed.
 */
goog.Uri.QueryData.prototype.remove = function(key) {
  this.ensureKeyMapInitialized_();

  key = this.getKeyName_(key);
  if (this.keyMap_.containsKey(key)) {
    this.invalidateCache_();

    // we need to get it to know how many to decrement the count with
    var old = this.keyMap_.get(key);
    if (goog.isArray(old)) {
      this.count_ -= old.length;
    } else {
      this.count_--;
    }
    return this.keyMap_.remove(key);
  }
  return false;
};


/**
 * Clears the parameters.
 */
goog.Uri.QueryData.prototype.clear = function() {
  this.invalidateCache_();
  if (this.keyMap_) {
    this.keyMap_.clear();
  }
  this.count_ = 0;
};


/**
 * @return {boolean} Whether we have any parameters.
 */
goog.Uri.QueryData.prototype.isEmpty = function() {
  this.ensureKeyMapInitialized_();
  return this.count_ == 0;
};


/**
 * Whether there is a parameter with the given name
 * @param {string} key The parameter name to check for.
 * @return {boolean} Whether there is a parameter with the given name.
 */
goog.Uri.QueryData.prototype.containsKey = function(key) {
  this.ensureKeyMapInitialized_();
  key = this.getKeyName_(key);
  return this.keyMap_.containsKey(key);
};


/**
 * Whether there is a parameter with the given value.
 * @param {*} value The value to check for.
 * @return {boolean} Whether there is a parameter with the given value.
 */
goog.Uri.QueryData.prototype.containsValue = function(value) {
  // NOTE(user): This solution goes through all the params even if it was the
  // first param. We can get around this by not reusing code or by switching to
  // iterators.
  var vals = this.getValues();
  return goog.array.contains(vals, value);
};


/**
 * Returns all the keys of the parameters. If a key is used multiple times
 * it will be included multiple times in the returned array
 * @return {Array} All the keys of the parameters.
 */
goog.Uri.QueryData.prototype.getKeys = function() {
  this.ensureKeyMapInitialized_();
  // We need to get the values to know how many keys to add.
  var vals = this.keyMap_.getValues(); // Array.<Array|String>
  var keys = this.keyMap_.getKeys(); // Array.<String>
  var rv = [];
  for (var i = 0; i < keys.length; i++) {
    var val = vals[i];
    if (goog.isArray(val)) {
      for (var j = 0; j < val.length; j++) {
        rv.push(keys[i]);
      }
    } else {
      rv.push(keys[i]);
    }
  }
  return rv;
};


/**
 * Returns all the values of the parameters with the given name. If the query
 * data has no such key this will return an empty array. If no key is given
 * all values wil be returned.
 * @param {string=} opt_key The name of the parameter to get the values for.
 * @return {Array} All the values of the parameters with the given name.
 */
goog.Uri.QueryData.prototype.getValues = function(opt_key) {
  this.ensureKeyMapInitialized_();
  var rv;
  if (opt_key) {
    var key = this.getKeyName_(opt_key);
    if (this.containsKey(key)) {
      var value = this.keyMap_.get(key);
      if (goog.isArray(value)) {
        return value;
      } else {
        rv = [];
        rv.push(value);
      }
    } else {
      rv = [];
    }
  } else {
    // return all values
    var vals = this.keyMap_.getValues(); // Array.<Array|String>
    rv = [];
    for (var i = 0; i < vals.length; i++) {
      var val = vals[i];
      if (goog.isArray(val)) {
        goog.array.extend(rv, val);
      } else {
        rv.push(val);
      }
    }
  }
  return rv;
};


/**
 * Sets a key value pair and removes all other keys with the same value.
 *
 * @param {string} key Name.
 * @param {*} value Value.
 * @return {goog.Uri.QueryData} Instance of this object.
 */
goog.Uri.QueryData.prototype.set = function(key, value) {
  this.ensureKeyMapInitialized_();
  this.invalidateCache_();

  key = this.getKeyName_(key);
  if (this.containsKey(key)) {
    var old = this.keyMap_.get(key);
    if (goog.isArray(old)) {
      this.count_ -= old.length;
    } else {
      this.count_--;
    }
  }

  this.keyMap_.set(key, value);
  this.count_++;
  return this;
};


/**
 * Returns the first value associated with the key. If the query data has no
 * such key this will return undefined or the optional default.
 * @param {string} key The name of the parameter to get the value for.
 * @param {*=} opt_default The default value to return if the query data
 *     has no such key.
 * @return {*} The first value associated with the key.
 */
goog.Uri.QueryData.prototype.get = function(key, opt_default) {
  this.ensureKeyMapInitialized_();
  key = this.getKeyName_(key);
  if (this.containsKey(key)) {
    var val = this.keyMap_.get(key);
    if (goog.isArray(val)) {
      return val[0];
    } else {
      return val;
    }
  } else {
    return opt_default;
  }
};


/**
 * Sets the values for a key, if the key has already got values defined, this
 * will override the existing values then remove any left over
 * @param {string} key The key to set values for.
 * @param {Array} values The values to set.
 */
goog.Uri.QueryData.prototype.setValues = function(key, values) {
  this.ensureKeyMapInitialized_();
  this.invalidateCache_();

  key = this.getKeyName_(key);
  if (this.containsKey(key)) {
    var old = this.keyMap_.get(key);
    if (goog.isArray(old)) {
      this.count_ -= old.length;
    } else {
      this.count_--;
    }
  }

  if (values.length > 0) {
    this.keyMap_.set(key, values);
    this.count_ += values.length;
  }
};


/**
 * @return {string} Encoded query string.
 */
goog.Uri.QueryData.prototype.toString = function() {
  if (this.encodedQuery_) {
    return this.encodedQuery_;
  }

  if (!this.keyMap_) {
    return '';
  }

  var sb = [];

  // this used to use this.getKeys and this.getVals but that generates a lot
  // allocations than just iterating over the keys
  var count = 0;
  var keys = this.keyMap_.getKeys();
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var encodedKey = goog.string.urlEncode(key);
    var val = this.keyMap_.get(key);
    if (goog.isArray(val)) {
      for (var j = 0; j < val.length; j++) {
        if (count > 0) {
          sb.push('&');
        }
        sb.push(encodedKey);
        // Check for empty string, null and undefined get encoded
        // into the url as literal strings
        if (val[j] !== '') {
          sb.push('=', goog.string.urlEncode(val[j]));
        }
        count++;
      }
    } else {
      if (count > 0) {
        sb.push('&');
      }
      sb.push(encodedKey);
      // Check for empty string, null and undefined get encoded
      // into the url as literal strings
      if (val !== '') {
        sb.push('=', goog.string.urlEncode(val));
      }
      count++;
    }
  }

  return this.encodedQuery_ = sb.join('');
};


/**
 * @return {string} Decoded query string.
 */
goog.Uri.QueryData.prototype.toDecodedString = function() {
  if (!this.decodedQuery_) {
    this.decodedQuery_ = goog.Uri.decodeOrEmpty_(this.toString());
  }

  return this.decodedQuery_;
};


/**
 * Invalidate the cache.
 * @private
 */
goog.Uri.QueryData.prototype.invalidateCache_ = function() {
  delete this.decodedQuery_;
  delete this.encodedQuery_;
  if (this.uri_) {
    delete this.uri_.cachedToString_;
  }
};


/**
 * Removes all keys that are not in the provided list. (Modifies this object.)
 * @param {Array.<string>} keys The desired keys.
 * @return {goog.Uri.QueryData} a reference to this object.
 */
goog.Uri.QueryData.prototype.filterKeys = function(keys) {
  this.ensureKeyMapInitialized_();
  goog.structs.forEach(this.keyMap_,
      /** @this {goog.Uri.QueryData} */
      function(value, key, map) {
        if (!goog.array.contains(keys, key)) {
          this.remove(key);
        }
      }, this);
  return this;
};


/**
 * Clone the query data instance.
 * @return {goog.Uri.QueryData} New instance of the QueryData object.
 */
goog.Uri.QueryData.prototype.clone = function() {
  var rv = new goog.Uri.QueryData();
  if (this.decodedQuery_) {
    rv.decodedQuery_ = this.decodedQuery_;
  }
  if (this.encodedQuery_) {
    rv.encodedQuery_ = this.encodedQuery_;
  }
  if (this.keyMap_) {
    rv.keyMap_ = this.keyMap_.clone();
  }
  return rv;
};


/**
 * Helper function to get the key name from a JavaScript object. Converts
 * the object to a string, and to lower case if necessary.
 * @private
 * @param {*} arg The object to get a key name from.
 * @return {string} valid key name which can be looked up in #keyMap_.
 */
goog.Uri.QueryData.prototype.getKeyName_ = function(arg) {
  var keyName = String(arg);
  if (this.ignoreCase_) {
    keyName = keyName.toLowerCase();
  }
  return keyName;
};


/**
 * Ignore case in parameter names.
 * NOTE: If there are already key/value pairs in the QueryData, and
 * ignoreCase_ is set to false, the keys will all be lower-cased.
 * @param {boolean} ignoreCase whether this goog.Uri should ignore case.
 */
goog.Uri.QueryData.prototype.setIgnoreCase = function(ignoreCase) {
  var resetKeys = ignoreCase && !this.ignoreCase_;
  if (resetKeys) {
    this.ensureKeyMapInitialized_();
    this.invalidateCache_();
    goog.structs.forEach(this.keyMap_,
        /** @this {goog.Uri.QueryData} */
        function(value, key, map) {
          var lowerCase = key.toLowerCase();
          if (key != lowerCase) {
            this.remove(key);
            this.add(lowerCase, value);
          }
        }, this);
  }
  this.ignoreCase_ = ignoreCase;
};


/**
 * Extends a query data object with another query data or map like object. This
 * operates 'in-place', it does not create a new QueryData object.
 *
 * @param {...(goog.Uri.QueryData|goog.structs.Map|Object)} var_args The object
 *     from which key value pairs will be copied.
 */
goog.Uri.QueryData.prototype.extend = function(var_args) {
  for (var i = 0; i < arguments.length; i++) {
    var data = arguments[i];
    goog.structs.forEach(data,
        /** @this {goog.Uri.QueryData} */
        function(value, key) {
          this.add(key, value);
        }, this);
  }
};
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview File which defines dummy object to work around undefined
 * properties compiler warning for weak dependencies on
 * {@link goog.debug.ErrorHandler#protectEntryPoint}.
 *
 */

goog.provide('goog.debug.errorHandlerWeakDep');


/**
 * Dummy object to work around undefined properties compiler warning.
 * @type {Object}
 */
goog.debug.errorHandlerWeakDep = {
  /**
   * @param {Function} fn An entry point function to be protected.
   * @param {boolean=} opt_tracers Whether to install tracers around the
   *     fn.
   * @return {Function} A protected wrapper function that calls the
   *     entry point function.
   */
  protectEntryPoint: function(fn, opt_tracers) { return fn; }
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Rendering engine detection.
 * @see <a href="http://www.useragentstring.com/">User agent strings</a>
 * For information on the browser brand (such as Safari versus Chrome), see
 * goog.userAgent.product.
 * @see ../demos/useragent.html
 */

goog.provide('goog.userAgent');

goog.require('goog.string');


/**
 * @define {boolean} Whether we know at compile-time that the browser is IE.
 */
goog.userAgent.ASSUME_IE = false;


/**
 * @define {boolean} Whether we know at compile-time that the browser is GECKO.
 */
goog.userAgent.ASSUME_GECKO = false;


/**
 * @define {boolean} Whether we know at compile-time that the browser is WEBKIT.
 */
goog.userAgent.ASSUME_WEBKIT = false;


/**
 * @define {boolean} Whether we know at compile-time that the browser is a
 *     mobile device running WebKit e.g. iPhone or Android.
 */
goog.userAgent.ASSUME_MOBILE_WEBKIT = false;


/**
 * @define {boolean} Whether we know at compile-time that the browser is OPERA.
 */
goog.userAgent.ASSUME_OPERA = false;


/**
 * Whether we know the browser engine at compile-time.
 * @type {boolean}
 * @private
 */
goog.userAgent.BROWSER_KNOWN_ =
    goog.userAgent.ASSUME_IE ||
    goog.userAgent.ASSUME_GECKO ||
    goog.userAgent.ASSUME_MOBILE_WEBKIT ||
    goog.userAgent.ASSUME_WEBKIT ||
    goog.userAgent.ASSUME_OPERA;


/**
 * Returns the userAgent string for the current browser.
 * Some user agents (I'm thinking of you, Gears WorkerPool) do not expose a
 * navigator object off the global scope.  In that case we return null.
 *
 * @return {?string} The userAgent string or null if there is none.
 */
goog.userAgent.getUserAgentString = function() {
  return goog.global['navigator'] ? goog.global['navigator'].userAgent : null;
};


/**
 * @return {Object} The native navigator object.
 */
goog.userAgent.getNavigator = function() {
  // Need a local navigator reference instead of using the global one,
  // to avoid the rare case where they reference different objects.
  // (goog.gears.FakeWorkerPool, for example).
  return goog.global['navigator'];
};


/**
 * Initializer for goog.userAgent.
 *
 * This is a named function so that it can be stripped via the jscompiler
 * option for stripping types.
 * @private
 */
goog.userAgent.init_ = function() {
  /**
   * Whether the user agent string denotes Opera.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedOpera_ = false;

  /**
   * Whether the user agent string denotes Internet Explorer. This includes
   * other browsers using Trident as its rendering engine. For example AOL
   * and Netscape 8
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedIe_ = false;

  /**
   * Whether the user agent string denotes WebKit. WebKit is the rendering
   * engine that Safari, Android and others use.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedWebkit_ = false;

  /**
   * Whether the user agent string denotes a mobile device.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedMobile_ = false;

  /**
   * Whether the user agent string denotes Gecko. Gecko is the rendering
   * engine used by Mozilla, Mozilla Firefox, Camino and many more.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedGecko_ = false;

  var ua;
  if (!goog.userAgent.BROWSER_KNOWN_ &&
      (ua = goog.userAgent.getUserAgentString())) {
    var navigator = goog.userAgent.getNavigator();
    goog.userAgent.detectedOpera_ = ua.indexOf('Opera') == 0;
    goog.userAgent.detectedIe_ = !goog.userAgent.detectedOpera_ &&
        ua.indexOf('MSIE') != -1;
    goog.userAgent.detectedWebkit_ = !goog.userAgent.detectedOpera_ &&
        ua.indexOf('WebKit') != -1;
    // WebKit also gives navigator.product string equal to 'Gecko'.
    goog.userAgent.detectedMobile_ = goog.userAgent.detectedWebkit_ &&
        ua.indexOf('Mobile') != -1;
    goog.userAgent.detectedGecko_ = !goog.userAgent.detectedOpera_ &&
        !goog.userAgent.detectedWebkit_ && navigator.product == 'Gecko';
  }
};


if (!goog.userAgent.BROWSER_KNOWN_) {
  goog.userAgent.init_();
}


/**
 * Whether the user agent is Opera.
 * @type {boolean}
 */
goog.userAgent.OPERA = goog.userAgent.BROWSER_KNOWN_ ?
    goog.userAgent.ASSUME_OPERA : goog.userAgent.detectedOpera_;


/**
 * Whether the user agent is Internet Explorer. This includes other browsers
 * using Trident as its rendering engine. For example AOL and Netscape 8
 * @type {boolean}
 */
goog.userAgent.IE = goog.userAgent.BROWSER_KNOWN_ ?
    goog.userAgent.ASSUME_IE : goog.userAgent.detectedIe_;


/**
 * Whether the user agent is Gecko. Gecko is the rendering engine used by
 * Mozilla, Mozilla Firefox, Camino and many more.
 * @type {boolean}
 */
goog.userAgent.GECKO = goog.userAgent.BROWSER_KNOWN_ ?
    goog.userAgent.ASSUME_GECKO :
    goog.userAgent.detectedGecko_;


/**
 * Whether the user agent is WebKit. WebKit is the rendering engine that
 * Safari, Android and others use.
 * @type {boolean}
 */
goog.userAgent.WEBKIT = goog.userAgent.BROWSER_KNOWN_ ?
    goog.userAgent.ASSUME_WEBKIT || goog.userAgent.ASSUME_MOBILE_WEBKIT :
    goog.userAgent.detectedWebkit_;


/**
 * Whether the user agent is running on a mobile device.
 * @type {boolean}
 */
goog.userAgent.MOBILE = goog.userAgent.ASSUME_MOBILE_WEBKIT ||
                        goog.userAgent.detectedMobile_;


/**
 * Used while transitioning code to use WEBKIT instead.
 * @type {boolean}
 * @deprecated Use {@link goog.userAgent.product.SAFARI} instead.
 * TODO(nicksantos): Delete this from goog.userAgent.
 */
goog.userAgent.SAFARI = goog.userAgent.WEBKIT;


/**
 * @return {string} the platform (operating system) the user agent is running
 *     on. Default to empty string because navigator.platform may not be defined
 *     (on Rhino, for example).
 * @private
 */
goog.userAgent.determinePlatform_ = function() {
  var navigator = goog.userAgent.getNavigator();
  return navigator && navigator.platform || '';
};


/**
 * The platform (operating system) the user agent is running on. Default to
 * empty string because navigator.platform may not be defined (on Rhino, for
 * example).
 * @type {string}
 */
goog.userAgent.PLATFORM = goog.userAgent.determinePlatform_();


/**
 * @define {boolean} Whether the user agent is running on a Macintosh operating
 *     system.
 */
goog.userAgent.ASSUME_MAC = false;


/**
 * @define {boolean} Whether the user agent is running on a Windows operating
 *     system.
 */
goog.userAgent.ASSUME_WINDOWS = false;


/**
 * @define {boolean} Whether the user agent is running on a Linux operating
 *     system.
 */
goog.userAgent.ASSUME_LINUX = false;


/**
 * @define {boolean} Whether the user agent is running on a X11 windowing
 *     system.
 */
goog.userAgent.ASSUME_X11 = false;


/**
 * @type {boolean}
 * @private
 */
goog.userAgent.PLATFORM_KNOWN_ =
    goog.userAgent.ASSUME_MAC ||
    goog.userAgent.ASSUME_WINDOWS ||
    goog.userAgent.ASSUME_LINUX ||
    goog.userAgent.ASSUME_X11;


/**
 * Initialize the goog.userAgent constants that define which platform the user
 * agent is running on.
 * @private
 */
goog.userAgent.initPlatform_ = function() {
  /**
   * Whether the user agent is running on a Macintosh operating system.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedMac_ = goog.string.contains(goog.userAgent.PLATFORM,
      'Mac');

  /**
   * Whether the user agent is running on a Windows operating system.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedWindows_ = goog.string.contains(
      goog.userAgent.PLATFORM, 'Win');

  /**
   * Whether the user agent is running on a Linux operating system.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedLinux_ = goog.string.contains(goog.userAgent.PLATFORM,
      'Linux');

  /**
   * Whether the user agent is running on a X11 windowing system.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedX11_ = !!goog.userAgent.getNavigator() &&
      goog.string.contains(goog.userAgent.getNavigator()['appVersion'] || '',
          'X11');
};


if (!goog.userAgent.PLATFORM_KNOWN_) {
  goog.userAgent.initPlatform_();
}


/**
 * Whether the user agent is running on a Macintosh operating system.
 * @type {boolean}
 */
goog.userAgent.MAC = goog.userAgent.PLATFORM_KNOWN_ ?
    goog.userAgent.ASSUME_MAC : goog.userAgent.detectedMac_;


/**
 * Whether the user agent is running on a Windows operating system.
 * @type {boolean}
 */
goog.userAgent.WINDOWS = goog.userAgent.PLATFORM_KNOWN_ ?
    goog.userAgent.ASSUME_WINDOWS : goog.userAgent.detectedWindows_;


/**
 * Whether the user agent is running on a Linux operating system.
 * @type {boolean}
 */
goog.userAgent.LINUX = goog.userAgent.PLATFORM_KNOWN_ ?
    goog.userAgent.ASSUME_LINUX : goog.userAgent.detectedLinux_;


/**
 * Whether the user agent is running on a X11 windowing system.
 * @type {boolean}
 */
goog.userAgent.X11 = goog.userAgent.PLATFORM_KNOWN_ ?
    goog.userAgent.ASSUME_X11 : goog.userAgent.detectedX11_;


/**
 * @return {string} The string that describes the version number of the user
 *     agent.
 * @private
 */
goog.userAgent.determineVersion_ = function() {
  // All browsers have different ways to detect the version and they all have
  // different naming schemes.

  // version is a string rather than a number because it may contain 'b', 'a',
  // and so on.
  var version = '', re;

  if (goog.userAgent.OPERA && goog.global['opera']) {
    var operaVersion = goog.global['opera'].version;
    version = typeof operaVersion == 'function' ? operaVersion() : operaVersion;
  } else {
    if (goog.userAgent.GECKO) {
      re = /rv\:([^\);]+)(\)|;)/;
    } else if (goog.userAgent.IE) {
      re = /MSIE\s+([^\);]+)(\)|;)/;
    } else if (goog.userAgent.WEBKIT) {
      // WebKit/125.4
      re = /WebKit\/(\S+)/;
    }
    if (re) {
      var arr = re.exec(goog.userAgent.getUserAgentString());
      version = arr ? arr[1] : '';
    }
  }
  if (goog.userAgent.IE) {
    // IE9 can be in document mode 9 but be reporting an inconsistent user agent
    // version.  If it is identifying as a version lower than 9 we take the
    // documentMode as the version instead.  IE8 has similar behavior.
    // It is recommended to set the X-UA-Compatible header to ensure that IE9
    // uses documentMode 9.
    var docMode = goog.userAgent.getDocumentMode_();
    if (docMode > parseFloat(version)) {
      return String(docMode);
    }
  }
  return version;
};


/**
 * @return {number|undefined} Returns the document mode (for testing).
 * @private
 */
goog.userAgent.getDocumentMode_ = function() {
  // NOTE(user): goog.userAgent may be used in context where there is no DOM.
  var doc = goog.global['document'];
  return doc ? doc['documentMode'] : undefined;
};


/**
 * The version of the user agent. This is a string because it might contain
 * 'b' (as in beta) as well as multiple dots.
 * @type {string}
 */
goog.userAgent.VERSION = goog.userAgent.determineVersion_();


/**
 * Compares two version numbers.
 *
 * @param {string} v1 Version of first item.
 * @param {string} v2 Version of second item.
 *
 * @return {number}  1 if first argument is higher
 *                   0 if arguments are equal
 *                  -1 if second argument is higher.
 * @deprecated Use goog.string.compareVersions.
 */
goog.userAgent.compare = function(v1, v2) {
  return goog.string.compareVersions(v1, v2);
};


/**
 * Cache for {@link goog.userAgent.isVersion}. Calls to compareVersions are
 * surprisingly expensive and as a browsers version number is unlikely to change
 * during a session we cache the results.
 * @type {Object}
 * @private
 */
goog.userAgent.isVersionCache_ = {};


/**
 * Whether the user agent version is higher or the same as the given version.
 * NOTE: When checking the version numbers for Firefox and Safari, be sure to
 * use the engine's version, not the browser's version number.  For example,
 * Firefox 3.0 corresponds to Gecko 1.9 and Safari 3.0 to Webkit 522.11.
 * Opera and Internet Explorer versions match the product release number.<br>
 * @see <a href="http://en.wikipedia.org/wiki/Safari_(web_browser)">Webkit</a>
 * @see <a href="http://en.wikipedia.org/wiki/Gecko_engine">Gecko</a>
 *
 * @param {string|number} version The version to check.
 * @return {boolean} Whether the user agent version is higher or the same as
 *     the given version.
 */
goog.userAgent.isVersion = function(version) {
  return goog.userAgent.isVersionCache_[version] ||
      (goog.userAgent.isVersionCache_[version] =
          goog.string.compareVersions(goog.userAgent.VERSION, version) >= 0);
};
// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A global registry for entry points into a program,
 * so that they can be instrumented. Each module should register their
 * entry points with this registry. Designed to be compiled out
 * if no instrumentation is requested.
 *
 * @author nicksantos@google.com (Nick Santos)
 */

goog.provide('goog.debug.EntryPointMonitor');
goog.provide('goog.debug.entryPointRegistry');



/**
 * @interface
 */
goog.debug.EntryPointMonitor = function() {};


/**
 * Instruments a function.
 * @param {!Function} fn A function to instrument.
 * @return {!Function} The instrumented function.
 */
goog.debug.EntryPointMonitor.prototype.wrap;


/**
 * Try to remove an instrumentation wrapper created by this monitor.
 * If the function passed to unwrap is not a wrapper created by this
 * monitor, then we will do nothing.
 *
 * Notice that some wrappers may not be unwrappable. For example, if other
 * monitors have applied their own wrappers, then it will be impossible to
 * unwrap them because their wrappers will have captured our wrapper.
 *
 * So it is important that entry points are unwrapped in the reverse
 * order that they were wrapped.
 *
 * @param {!Function} fn A function to unwrap.
 * @return {!Function} The unwrapped function, or {@code fn} if it was not
 *     a wrapped function created by this monitor.
 */
goog.debug.EntryPointMonitor.prototype.unwrap;


/**
 * An array of entry point callbacks.
 * @type {!Array.<function(!Function)>}
 * @private
 */
goog.debug.entryPointRegistry.refList_ = [];


/**
 * Register an entry point with this module.
 * @param {function(!Function)} callback A callback function.
 *     When a client requests instrumentation, this callback will be called
 *     with a trnasforming function. The callback is responsible for wrapping
 *     the relevant entry point with the transforming function.
 */
goog.debug.entryPointRegistry.register = function(callback) {
  // Don't use push(), so that this can be compiled out.
  goog.debug.entryPointRegistry.refList_[
      goog.debug.entryPointRegistry.refList_.length] = callback;
};


/**
 * Monitor all registered entry points.
 * @param {goog.debug.EntryPointMonitor} monitor An entry point monitor.
 */
goog.debug.entryPointRegistry.monitorAll = function(monitor) {
  var transformer = goog.bind(monitor.wrap, monitor);
  for (var i = 0; i < goog.debug.entryPointRegistry.refList_.length; i++) {
    goog.debug.entryPointRegistry.refList_[i](transformer);
  }
};


/**
 * Try to unmonitor all the registered entry points.
 *
 * Note that this may fail if the entry points have additional wrapping.
 * See the comment on {@code EntryPointMonitor}'s {@code setInvertedMode}
 * method.
 *
 * @param {goog.debug.EntryPointMonitor} monitor The last monitor to wrap
 *     the entry points.
 */
goog.debug.entryPointRegistry.unmonitorAllIfPossible = function(monitor) {
  var transformer = goog.bind(monitor.unwrap, monitor);
  for (var i = 0; i < goog.debug.entryPointRegistry.refList_.length; i++) {
    goog.debug.entryPointRegistry.refList_[i](transformer);
  }
};
// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Definition of the goog.events.EventWrapper interface.
 *
 */

goog.provide('goog.events.EventWrapper');



/**
 * Interface for event wrappers.
 * @interface
 */
goog.events.EventWrapper = function() {
};


/**
 * Adds an event listener using the wrapper on a DOM Node or an object that has
 * implemented {@link goog.events.EventTarget}. A listener can only be added
 * once to an object.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to listen to
 *     events on.
 * @param {Function|Object} listener Callback method, or an object with a
 *     handleEvent function.
 * @param {boolean=} opt_capt Whether to fire in capture phase (defaults to
 *     false).
 * @param {Object=} opt_scope Element in whose scope to call the listener.
 * @param {goog.events.EventHandler=} opt_eventHandler Event handler to add
 *     listener to.
 */
goog.events.EventWrapper.prototype.listen = function(src, listener, opt_capt,
    opt_scope, opt_eventHandler) {
};


/**
 * Removes an event listener added using goog.events.EventWrapper.listen.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to remove listener
 *    from.
 * @param {Function|Object} listener Callback method, or an object with a
 *     handleEvent function.
 * @param {boolean=} opt_capt Whether to fire in capture phase (defaults to
 *     false).
 * @param {Object=} opt_scope Element in whose scope to call the listener.
 * @param {goog.events.EventHandler=} opt_eventHandler Event handler to remove
 *     listener from.
 */
goog.events.EventWrapper.prototype.unlisten = function(src, listener, opt_capt,
    opt_scope, opt_eventHandler) {
};
// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Event Types.
 *
 */


goog.provide('goog.events.EventType');

goog.require('goog.userAgent');


/**
 * Constants for event names.
 * @enum {string}
 */
goog.events.EventType = {
  // Mouse events
  CLICK: 'click',
  DBLCLICK: 'dblclick',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  MOUSEOVER: 'mouseover',
  MOUSEOUT: 'mouseout',
  MOUSEMOVE: 'mousemove',
  SELECTSTART: 'selectstart', // IE, Safari, Chrome

  // Key events
  KEYPRESS: 'keypress',
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',

  // Focus
  BLUR: 'blur',
  FOCUS: 'focus',
  DEACTIVATE: 'deactivate', // IE only
  // NOTE: The following two events are not stable in cross-browser usage.
  //     WebKit and Opera implement DOMFocusIn/Out.
  //     IE implements focusin/out.
  //     Gecko implements neither see bug at
  //     https://bugzilla.mozilla.org/show_bug.cgi?id=396927.
  // The DOM Events Level 3 Draft deprecates DOMFocusIn in favor of focusin:
  //     http://dev.w3.org/2006/webapi/DOM-Level-3-Events/html/DOM3-Events.html
  // You can use FOCUS in Capture phase until implementations converge.
  FOCUSIN: goog.userAgent.IE ? 'focusin' : 'DOMFocusIn',
  FOCUSOUT: goog.userAgent.IE ? 'focusout' : 'DOMFocusOut',

  // Forms
  CHANGE: 'change',
  SELECT: 'select',
  SUBMIT: 'submit',
  INPUT: 'input',
  PROPERTYCHANGE: 'propertychange', // IE only

  // Drag and drop
  DRAGSTART: 'dragstart',
  DRAGENTER: 'dragenter',
  DRAGOVER: 'dragover',
  DRAGLEAVE: 'dragleave',
  DROP: 'drop',

  // WebKit touch events.
  TOUCHSTART: 'touchstart',
  TOUCHMOVE: 'touchmove',
  TOUCHEND: 'touchend',
  TOUCHCANCEL: 'touchcancel',

  // Misc
  CONTEXTMENU: 'contextmenu',
  ERROR: 'error',
  HELP: 'help',
  LOAD: 'load',
  LOSECAPTURE: 'losecapture',
  READYSTATECHANGE: 'readystatechange',
  RESIZE: 'resize',
  SCROLL: 'scroll',
  UNLOAD: 'unload',

  // HTML 5 History events
  // See http://www.w3.org/TR/html5/history.html#event-definitions
  HASHCHANGE: 'hashchange',
  PAGEHIDE: 'pagehide',
  PAGESHOW: 'pageshow',
  POPSTATE: 'popstate',

  // Copy and Paste
  COPY: 'copy',
  PASTE: 'paste',
  CUT: 'cut',

  // HTML 5 worker events
  MESSAGE: 'message',
  CONNECT: 'connect'
};
// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Browser capability checks for the events package.
 *
 */


goog.provide('goog.events.BrowserFeature');

goog.require('goog.userAgent');


/**
 * Enum of browser capabilities.
 * @enum {boolean}
 */
goog.events.BrowserFeature = {
  /**
   * Whether the button attribute of the event is W3C compliant.
   * False in Internet Explorer prior to version 9.
   */
  HAS_W3C_BUTTON: !goog.userAgent.IE || goog.userAgent.isVersion('9'),

  /**
   * To prevent default in IE7 for certain keydown events we need set the
   * keyCode to -1.
   */
  SET_KEY_CODE_TO_PREVENT_DEFAULT: goog.userAgent.IE &&
      !goog.userAgent.isVersion('8')
};
// Copyright 2011 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Definition of the disposable interface.  A disposable object
 * has a dispose method to to clean up references and resources.
 */


goog.provide('goog.disposable.IDisposable');



/**
 * Interface for a disposable object.  If a instance requires cleanup
 * (references COM objects, DOM notes, or other disposable objects), it should
 * implement this interface (it may subclass goog.Disposable).
 * @interface
 */
goog.disposable.IDisposable = function() {};


/**
 * Disposes of the object and its resources.
 * @return {void} Nothing.
 */
goog.disposable.IDisposable.prototype.dispose;


/**
 * @return {boolean} Whether the object has been disposed of.
 */
goog.disposable.IDisposable.prototype.isDisposed;
// Copyright 2005 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Implements the disposable interface. The dispose method is used
 * to clean up references and resources.
 */


goog.provide('goog.Disposable');
goog.provide('goog.dispose');

goog.require('goog.disposable.IDisposable');



/**
 * Class that provides the basic implementation for disposable objects. If your
 * class holds one or more references to COM objects, DOM nodes, or other
 * disposable objects, it should extend this class or implement the disposable
 * interface (defined in goog.disposable.IDisposable).
 * @constructor
 * @implements {goog.disposable.IDisposable}
 */
goog.Disposable = function() {
  if (goog.Disposable.ENABLE_MONITORING) {
    goog.Disposable.instances_[goog.getUid(this)] = this;
  }
};


/**
 * @define {boolean} Whether to enable the monitoring of the goog.Disposable
 *     instances. Switching on the monitoring is only recommended for debugging
 *     because it has a significant impact on performance and memory usage.
 *     If switched off, the monitoring code compiles down to 0 bytes.
 *     The monitoring expects that all disposable objects call the
 *     {@code goog.Disposable} base constructor.
 */
goog.Disposable.ENABLE_MONITORING = false;


/**
 * Maps the unique ID of every undisposed {@code goog.Disposable} object to
 * the object itself.
 * @type {!Object.<number, !goog.Disposable>}
 * @private
 */
goog.Disposable.instances_ = {};


/**
 * @return {!Array.<!goog.Disposable>} All {@code goog.Disposable} objects that
 *     haven't been disposed of.
 */
goog.Disposable.getUndisposedObjects = function() {
  var ret = [];
  for (var id in goog.Disposable.instances_) {
    if (goog.Disposable.instances_.hasOwnProperty(id)) {
      ret.push(goog.Disposable.instances_[Number(id)]);
    }
  }
  return ret;
};


/**
 * Clears the registry of undisposed objects but doesn't dispose of them.
 */
goog.Disposable.clearUndisposedObjects = function() {
  goog.Disposable.instances_ = {};
};


/**
 * Whether the object has been disposed of.
 * @type {boolean}
 * @private
 */
goog.Disposable.prototype.disposed_ = false;


/**
 * @return {boolean} Whether the object has been disposed of.
 */
goog.Disposable.prototype.isDisposed = function() {
  return this.disposed_;
};


/**
 * @return {boolean} Whether the object has been disposed of.
 * @deprecated Use {@link #isDisposed} instead.
 */
goog.Disposable.prototype.getDisposed = goog.Disposable.prototype.isDisposed;


/**
 * Disposes of the object. If the object hasn't already been disposed of, calls
 * {@link #disposeInternal}. Classes that extend {@code goog.Disposable} should
 * override {@link #disposeInternal} in order to delete references to COM
 * objects, DOM nodes, and other disposable objects.
 *
 * @return {void} Nothing.
 */
goog.Disposable.prototype.dispose = function() {
  if (!this.disposed_) {
    // Set disposed_ to true first, in case during the chain of disposal this
    // gets disposed recursively.
    this.disposed_ = true;
    this.disposeInternal();
    if (goog.Disposable.ENABLE_MONITORING) {
      var uid = goog.getUid(this);
      if (!goog.Disposable.instances_.hasOwnProperty(uid)) {
        throw Error(this + ' did not call the goog.Disposable base ' +
            'constructor or was disposed of after a clearUndisposedObjects ' +
            'call');
      }
      delete goog.Disposable.instances_[uid];
    }
  }
};


/**
 * Deletes or nulls out any references to COM objects, DOM nodes, or other
 * disposable objects. Classes that extend {@code goog.Disposable} should
 * override this method.  For example:
 * <pre>
 *   mypackage.MyClass = function() {
 *     goog.Disposable.call(this);
 *     // Constructor logic specific to MyClass.
 *     ...
 *   };
 *   goog.inherits(mypackage.MyClass, goog.Disposable);
 *
 *   mypackage.MyClass.prototype.disposeInternal = function() {
 *     mypackage.MyClass.superClass_.disposeInternal.call(this);
 *     // Dispose logic specific to MyClass.
 *     ...
 *   };
 * </pre>
 * @protected
 */
goog.Disposable.prototype.disposeInternal = function() {
  // No-op in the base class.
};


/**
 * Calls {@code dispose} on the argument if it supports it. If obj is not an
 *     object with a dispose() method, this is a no-op.
 * @param {*} obj The object to dispose of.
 */
goog.dispose = function(obj) {
  if (obj && typeof obj.dispose == 'function') {
    obj.dispose();
  }
};
// Copyright 2005 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A base class for event objects.
 *
 */


goog.provide('goog.events.Event');

goog.require('goog.Disposable');



/**
 * A base class for event objects, so that they can support preventDefault and
 * stopPropagation.
 *
 * @param {string} type Event Type.
 * @param {Object=} opt_target Reference to the object that is the target of
 *     this event. It has to implement the {@code EventTarget} interface
 *     declared at {@link http://developer.mozilla.org/en/DOM/EventTarget}.
 * @constructor
 * @extends {goog.Disposable}
 */
goog.events.Event = function(type, opt_target) {
  goog.Disposable.call(this);

  /**
   * Event type.
   * @type {string}
   */
  this.type = type;

  /**
   * Target of the event.
   * @type {Object|undefined}
   */
  this.target = opt_target;

  /**
   * Object that had the listener attached.
   * @type {Object|undefined}
   */
  this.currentTarget = this.target;
};
goog.inherits(goog.events.Event, goog.Disposable);


/** @inheritDoc */
goog.events.Event.prototype.disposeInternal = function() {
  delete this.type;
  delete this.target;
  delete this.currentTarget;
};


/**
 * Whether to cancel the event in internal capture/bubble processing for IE.
 * @type {boolean}
 * @suppress {underscore} Technically public, but referencing this outside
 *     this package is strongly discouraged.
 */
goog.events.Event.prototype.propagationStopped_ = false;


/**
 * Return value for in internal capture/bubble processing for IE.
 * @type {boolean}
 * @suppress {underscore} Technically public, but referencing this outside
 *     this package is strongly discouraged.
 */
goog.events.Event.prototype.returnValue_ = true;


/**
 * Stops event propagation.
 */
goog.events.Event.prototype.stopPropagation = function() {
  this.propagationStopped_ = true;
};


/**
 * Prevents the default action, for example a link redirecting to a url.
 */
goog.events.Event.prototype.preventDefault = function() {
  this.returnValue_ = false;
};


/**
 * Stops the propagation of the event. It is equivalent to
 * {@code e.stopPropagation()}, but can be used as the callback argument of
 * {@link goog.events.listen} without declaring another function.
 * @param {!goog.events.Event} e An event.
 */
goog.events.Event.stopPropagation = function(e) {
  e.stopPropagation();
};


/**
 * Prevents the default action. It is equivalent to
 * {@code e.preventDefault()}, but can be used as the callback argument of
 * {@link goog.events.listen} without declaring another function.
 * @param {!goog.events.Event} e An event.
 */
goog.events.Event.preventDefault = function(e) {
  e.preventDefault();
};
// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Useful compiler idioms.
 *
 */

goog.provide('goog.reflect');


/**
 * Syntax for object literal casts.
 * @see http://go/jscompiler-renaming
 * @see http://code.google.com/p/closure-compiler/wiki/
 *      ExperimentalTypeBasedPropertyRenaming
 *
 * Use this if you have an object literal whose keys need to have the same names
 * as the properties of some class even after they are renamed by the compiler.
 *
 * @param {!Function} type Type to cast to.
 * @param {Object} object Object literal to cast.
 * @return {Object} The object literal.
 */
goog.reflect.object = function(type, object) {
  return object;
};


/**
 * To assert to the compiler that an operation is needed when it would other
 * wise be stripped. For example:
 * <code>
 *     // Force a layout
 *     goog.reflect.sinkValue(dialog.offsetHeight);
 * </code>
 * @type {Function}
 */
goog.reflect.sinkValue = new Function('a', 'return a');
// Copyright 2005 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A patched, standardized event object for browser events.
 *
 * <pre>
 * The patched event object contains the following members:
 * - type           {string}    Event type, e.g. 'click'
 * - timestamp      {Date}      A date object for when the event was fired
 * - target         {Object}    The element that actually triggered the event
 * - currentTarget  {Object}    The element the listener is attached to
 * - relatedTarget  {Object}    For mouseover and mouseout, the previous object
 * - offsetX        {number}    X-coordinate relative to target
 * - offsetY        {number}    Y-coordinate relative to target
 * - clientX        {number}    X-coordinate relative to viewport
 * - clientY        {number}    Y-coordinate relative to viewport
 * - screenX        {number}    X-coordinate relative to the edge of the screen
 * - screenY        {number}    Y-coordinate relative to the edge of the screen
 * - button         {number}    Mouse button. Use isButton() to test.
 * - keyCode        {number}    Key-code
 * - ctrlKey        {boolean}   Was ctrl key depressed
 * - altKey         {boolean}   Was alt key depressed
 * - shiftKey       {boolean}   Was shift key depressed
 * - metaKey        {boolean}   Was meta key depressed
 * - state          {Object}    History state object
 *
 * NOTE: The keyCode member contains the raw browser keyCode. For normalized
 * key and character code use {@link goog.events.KeyHandler}.
 * </pre>
 *
 */

goog.provide('goog.events.BrowserEvent');
goog.provide('goog.events.BrowserEvent.MouseButton');

goog.require('goog.events.BrowserFeature');
goog.require('goog.events.Event');
goog.require('goog.events.EventType');
goog.require('goog.reflect');
goog.require('goog.userAgent');



/**
 * Accepts a browser event object and creates a patched, cross browser event
 * object.
 * The content of this object will not be initialized if no event object is
 * provided. If this is the case, init() needs to be invoked separately.
 * @param {Event=} opt_e Browser event object.
 * @param {Node=} opt_currentTarget Current target for event.
 * @constructor
 * @extends {goog.events.Event}
 */
goog.events.BrowserEvent = function(opt_e, opt_currentTarget) {
  if (opt_e) {
    this.init(opt_e, opt_currentTarget);
  }
};
goog.inherits(goog.events.BrowserEvent, goog.events.Event);


/**
 * Normalized button constants for the mouse.
 * @enum {number}
 */
goog.events.BrowserEvent.MouseButton = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2
};


/**
 * Static data for mapping mouse buttons.
 * @type {Array.<number>}
 */
goog.events.BrowserEvent.IEButtonMap = [
  1, // LEFT
  4, // MIDDLE
  2  // RIGHT
];


/**
 * Target that fired the event.
 * @override
 * @type {Node}
 */
goog.events.BrowserEvent.prototype.target = null;


/**
 * Node that had the listener attached.
 * @override
 * @type {Node|undefined}
 */
goog.events.BrowserEvent.prototype.currentTarget;


/**
 * For mouseover and mouseout events, the related object for the event.
 * @type {Node}
 */
goog.events.BrowserEvent.prototype.relatedTarget = null;


/**
 * X-coordinate relative to target.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.offsetX = 0;


/**
 * Y-coordinate relative to target.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.offsetY = 0;


/**
 * X-coordinate relative to the window.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.clientX = 0;


/**
 * Y-coordinate relative to the window.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.clientY = 0;


/**
 * X-coordinate relative to the monitor.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.screenX = 0;


/**
 * Y-coordinate relative to the monitor.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.screenY = 0;


/**
 * Which mouse button was pressed.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.button = 0;


/**
 * Keycode of key press.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.keyCode = 0;


/**
 * Keycode of key press.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.charCode = 0;


/**
 * Whether control was pressed at time of event.
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.ctrlKey = false;


/**
 * Whether alt was pressed at time of event.
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.altKey = false;


/**
 * Whether shift was pressed at time of event.
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.shiftKey = false;


/**
 * Whether the meta key was pressed at time of event.
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.metaKey = false;


/**
 * History state object, only set for PopState events where it's a copy of the
 * state object provided to pushState or replaceState.
 * @type {Object}
 */
goog.events.BrowserEvent.prototype.state;


/**
 * Whether the default platform modifier key was pressed at time of event.
 * (This is control for all platforms except Mac, where it's Meta.
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.platformModifierKey = false;


/**
 * The browser event object.
 * @type {Event}
 * @private
 */
goog.events.BrowserEvent.prototype.event_ = null;


/**
 * Accepts a browser event object and creates a patched, cross browser event
 * object.
 * @param {Event} e Browser event object.
 * @param {Node=} opt_currentTarget Current target for event.
 */
goog.events.BrowserEvent.prototype.init = function(e, opt_currentTarget) {
  var type = this.type = e.type;
  goog.events.Event.call(this, type);

  // TODO(nicksantos): Change this.target to type EventTarget.
  this.target = /** @type {Node} */ (e.target) || e.srcElement;

  this.currentTarget = opt_currentTarget;

  var relatedTarget = /** @type {Node} */ (e.relatedTarget);
  if (relatedTarget) {
    // There's a bug in FireFox where sometimes, relatedTarget will be a
    // chrome element, and accessing any property of it will get a permission
    // denied exception. See:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=497780
    if (goog.userAgent.GECKO) {
      /** @preserveTry */
      try {
        goog.reflect.sinkValue(relatedTarget.nodeName);
      } catch (err) {
        relatedTarget = null;
      }
    }
    // TODO(user): Use goog.events.EventType when it has been refactored into its
    // own file.
  } else if (type == goog.events.EventType.MOUSEOVER) {
    relatedTarget = e.fromElement;
  } else if (type == goog.events.EventType.MOUSEOUT) {
    relatedTarget = e.toElement;
  }

  this.relatedTarget = relatedTarget;

  this.offsetX = e.offsetX !== undefined ? e.offsetX : e.layerX;
  this.offsetY = e.offsetY !== undefined ? e.offsetY : e.layerY;
  this.clientX = e.clientX !== undefined ? e.clientX : e.pageX;
  this.clientY = e.clientY !== undefined ? e.clientY : e.pageY;
  this.screenX = e.screenX || 0;
  this.screenY = e.screenY || 0;

  this.button = e.button;

  this.keyCode = e.keyCode || 0;
  this.charCode = e.charCode || (type == 'keypress' ? e.keyCode : 0);
  this.ctrlKey = e.ctrlKey;
  this.altKey = e.altKey;
  this.shiftKey = e.shiftKey;
  this.metaKey = e.metaKey;
  this.platformModifierKey = goog.userAgent.MAC ? e.metaKey : e.ctrlKey;
  this.state = e.state;
  this.event_ = e;
  delete this.returnValue_;
  delete this.propagationStopped_;
};


/**
 * Tests to see which button was pressed during the event. This is really only
 * useful in IE and Gecko browsers. And in IE, it's only useful for
 * mousedown/mouseup events, because click only fires for the left mouse button.
 *
 * Safari 2 only reports the left button being clicked, and uses the value '1'
 * instead of 0. Opera only reports a mousedown event for the middle button, and
 * no mouse events for the right button. Opera has default behavior for left and
 * middle click that can only be overridden via a configuration setting.
 *
 * There's a nice table of this mess at http://www.unixpapa.com/js/mouse.html.
 *
 * @param {goog.events.BrowserEvent.MouseButton} button The button
 *     to test for.
 * @return {boolean} True if button was pressed.
 */
goog.events.BrowserEvent.prototype.isButton = function(button) {
  if (!goog.events.BrowserFeature.HAS_W3C_BUTTON) {
    if (this.type == 'click') {
      return button == goog.events.BrowserEvent.MouseButton.LEFT;
    } else {
      return !!(this.event_.button &
          goog.events.BrowserEvent.IEButtonMap[button]);
    }
  } else {
    return this.event_.button == button;
  }
};


/**
 * Whether this has an "action"-producing mouse button.
 *
 * By definition, this includes left-click on windows/linux, and left-click
 * without the ctrl key on Macs.
 *
 * @return {boolean} The result.
 */
goog.events.BrowserEvent.prototype.isMouseActionButton = function() {
  // Webkit does not ctrl+click to be a right-click, so we
  // normalize it to behave like Gecko and Opera.
  return this.isButton(goog.events.BrowserEvent.MouseButton.LEFT) &&
      !(goog.userAgent.WEBKIT && goog.userAgent.MAC && this.ctrlKey);
};


/**
 * @inheritDoc
 */
goog.events.BrowserEvent.prototype.stopPropagation = function() {
  goog.events.BrowserEvent.superClass_.stopPropagation.call(this);
  if (this.event_.stopPropagation) {
    this.event_.stopPropagation();
  } else {
    this.event_.cancelBubble = true;
  }
};


/**
 * @inheritDoc
 */
goog.events.BrowserEvent.prototype.preventDefault = function() {
  goog.events.BrowserEvent.superClass_.preventDefault.call(this);
  var be = this.event_;
  if (!be.preventDefault) {
    be.returnValue = false;
    if (goog.events.BrowserFeature.SET_KEY_CODE_TO_PREVENT_DEFAULT) {
      /** @preserveTry */
      try {
        // Most keys can be prevented using returnValue. Some special keys
        // require setting the keyCode to -1 as well:
        //
        // In IE7:
        // F3, F5, F10, F11, Ctrl+P, Crtl+O, Ctrl+F (these are taken from IE6)
        //
        // In IE8:
        // Ctrl+P, Crtl+O, Ctrl+F (F1-F12 cannot be stopped through the event)
        //
        // We therefore do this for all function keys as well as when Ctrl key
        // is pressed.
        var VK_F1 = 112;
        var VK_F12 = 123;
        if (be.ctrlKey || be.keyCode >= VK_F1 && be.keyCode <= VK_F12) {
          be.keyCode = -1;
        }
      } catch (ex) {
        // IE throws an 'access denied' exception when trying to change
        // keyCode in some situations (e.g. srcElement is input[type=file],
        // or srcElement is an anchor tag rewritten by parent's innerHTML).
        // Do nothing in this case.
      }
    }
  } else {
    be.preventDefault();
  }
};


/**
 * @return {Event} The underlying browser event object.
 */
goog.events.BrowserEvent.prototype.getBrowserEvent = function() {
  return this.event_;
};


/**
 * @inheritDoc
 */
goog.events.BrowserEvent.prototype.disposeInternal = function() {
  goog.events.BrowserEvent.superClass_.disposeInternal.call(this);
  this.event_ = null;
  this.target = null;
  this.currentTarget = null;
  this.relatedTarget = null;
};
// Copyright 2005 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Listener object.
 * @see ../demos/events.html
 */


/**
 * Namespace for events
 */
goog.provide('goog.events.Listener');



/**
 * Simple class that stores information about a listener
 * @constructor
 */
goog.events.Listener = function() {
};


/**
 * Counter used to create a unique key
 * @type {number}
 * @private
 */
goog.events.Listener.counter_ = 0;


/**
 * Whether the listener is a function or an object that implements handleEvent.
 * @type {boolean}
 * @private
 */
goog.events.Listener.prototype.isFunctionListener_;


/**
 * Call back function or an object with a handleEvent function.
 * @type {Function|Object|null}
 */
goog.events.Listener.prototype.listener;


/**
 * Proxy for callback that passes through {@link goog.events#HandleEvent_}
 * @type {Function}
 */
goog.events.Listener.prototype.proxy;


/**
 * Object or node that callback is listening to
 * @type {Object|goog.events.EventTarget}
 */
goog.events.Listener.prototype.src;


/**
 * Type of event
 * @type {string}
 */
goog.events.Listener.prototype.type;


/**
 * Whether the listener is being called in the capture or bubble phase
 * @type {boolean}
 */
goog.events.Listener.prototype.capture;


/**
 * Optional object whose context to execute the listener in
 * @type {Object|undefined}
 */
goog.events.Listener.prototype.handler;


/**
 * The key of the listener.
 * @type {number}
 */
goog.events.Listener.prototype.key = 0;


/**
 * Whether the listener has been removed.
 * @type {boolean}
 */
goog.events.Listener.prototype.removed = false;


/**
 * Whether to remove the listener after it has been called.
 * @type {boolean}
 */
goog.events.Listener.prototype.callOnce = false;


/**
 * Initializes the listener.
 * @param {Function|Object} listener Callback function, or an object with a
 *     handleEvent function.
 * @param {Function} proxy Wrapper for the listener that patches the event.
 * @param {Object} src Source object for the event.
 * @param {string} type Event type.
 * @param {boolean} capture Whether in capture or bubble phase.
 * @param {Object=} opt_handler Object in whose context to execute the callback.
 */
goog.events.Listener.prototype.init = function(listener, proxy, src, type,
                                               capture, opt_handler) {
  // we do the test of the listener here so that we do  not need to
  // continiously do this inside handleEvent
  if (goog.isFunction(listener)) {
    this.isFunctionListener_ = true;
  } else if (listener && listener.handleEvent &&
      goog.isFunction(listener.handleEvent)) {
    this.isFunctionListener_ = false;
  } else {
    throw Error('Invalid listener argument');
  }

  this.listener = listener;
  this.proxy = proxy;
  this.src = src;
  this.type = type;
  this.capture = !!capture;
  this.handler = opt_handler;
  this.callOnce = false;
  this.key = ++goog.events.Listener.counter_;
  this.removed = false;
};


/**
 * Calls the internal listener
 * @param {Object} eventObject Event object to be passed to listener.
 * @return {boolean} The result of the internal listener call.
 */
goog.events.Listener.prototype.handleEvent = function(eventObject) {
  if (this.isFunctionListener_) {
    return this.listener.call(this.handler || this.src, eventObject);
  }
  return this.listener.handleEvent.call(this.listener, eventObject);
};
// Copyright 2007 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Detection of JScript version.
 *
 */


goog.provide('goog.userAgent.jscript');

goog.require('goog.string');


/**
 * @define {boolean} True if it is known at compile time that the runtime
 *     environment will not be using JScript.
 */
goog.userAgent.jscript.ASSUME_NO_JSCRIPT = false;


/**
 * Initializer for goog.userAgent.jscript.  Detects if the user agent is using
 * Microsoft JScript and which version of it.
 *
 * This is a named function so that it can be stripped via the jscompiler
 * option for stripping types.
 * @private
 */
goog.userAgent.jscript.init_ = function() {
  var hasScriptEngine = 'ScriptEngine' in goog.global;

  /**
   * @type {boolean}
   * @private
   */
  goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_ =
      hasScriptEngine && goog.global['ScriptEngine']() == 'JScript';

  /**
   * @type {string}
   * @private
   */
  goog.userAgent.jscript.DETECTED_VERSION_ =
      goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_ ?
      (goog.global['ScriptEngineMajorVersion']() + '.' +
       goog.global['ScriptEngineMinorVersion']() + '.' +
       goog.global['ScriptEngineBuildVersion']()) :
      '0';
};

if (!goog.userAgent.jscript.ASSUME_NO_JSCRIPT) {
  goog.userAgent.jscript.init_();
}


/**
 * Whether we detect that the user agent is using Microsoft JScript.
 * @type {boolean}
 */
goog.userAgent.jscript.HAS_JSCRIPT = goog.userAgent.jscript.ASSUME_NO_JSCRIPT ?
    false : goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_;


/**
 * The installed version of JScript.
 * @type {string}
 */
goog.userAgent.jscript.VERSION = goog.userAgent.jscript.ASSUME_NO_JSCRIPT ?
    '0' : goog.userAgent.jscript.DETECTED_VERSION_;


/**
 * Whether the installed version of JScript is as new or newer than a given
 * version.
 * @param {string} version The version to check.
 * @return {boolean} Whether the installed version of JScript is as new or
 *     newer than the given version.
 */
goog.userAgent.jscript.isVersion = function(version) {
  return goog.string.compareVersions(goog.userAgent.jscript.VERSION,
                                     version) >= 0;
};
// Copyright 2007 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Datastructure: Pool.
 *
 *
 * A generic class for handling pools of objects that is more efficient than
 * goog.structs.Pool because it doesn't maintain a list of objects that are in
 * use. See constructor comment.
 */


goog.provide('goog.structs.SimplePool');

goog.require('goog.Disposable');



/**
 * A generic pool class. Simpler and more efficient than goog.structs.Pool
 * because it doesn't maintain a list of objects that are in use. This class
 * has constant overhead and doesn't create any additional objects as part of
 * the pool management after construction time.
 *
 * IMPORTANT: If the objects being pooled are arrays or maps that can have
 * unlimited number of properties, they need to be cleaned before being
 * returned to the pool.
 *
 * Also note that {@see goog.object.clean} actually allocates an array to clean
 * the object passed to it, so simply using this function would defy the
 * purpose of using the pool.
 *
 * @param {number} initialCount Initial number of objects to populate the
 *     free pool at construction time.
 * @param {number} maxCount Maximum number of objects to keep in the free pool.
 * @constructor
 * @extends {goog.Disposable}
 */
goog.structs.SimplePool = function(initialCount, maxCount) {
  goog.Disposable.call(this);

  /**
   * Maximum number of objects allowed
   * @type {number}
   * @private
   */
  this.maxCount_ = maxCount;

  /**
   * Queue used to store objects that are currently in the pool and available
   * to be used.
   * @type {Array}
   * @private
   */
  this.freeQueue_ = [];

  this.createInitial_(initialCount);
};
goog.inherits(goog.structs.SimplePool, goog.Disposable);


/**
 * Function for overriding createObject. The avoids a common case requiring
 * subclassing this class.
 * @type {Function}
 * @private
 */
goog.structs.SimplePool.prototype.createObjectFn_ = null;


/**
 * Function for overriding disposeObject. The avoids a common case requiring
 * subclassing this class.
 * @type {Function}
 * @private
 */
goog.structs.SimplePool.prototype.disposeObjectFn_ = null;


/**
 * Sets the {@code createObject} function which is used for creating a new
 * object in the pool.
 * @param {Function} createObjectFn Create object function which returns the
 *     newly createrd object.
 */
goog.structs.SimplePool.prototype.setCreateObjectFn = function(createObjectFn) {
  this.createObjectFn_ = createObjectFn;
};


/**
 * Sets the {@code disposeObject} function which is used for disposing of an
 * object in the pool.
 * @param {Function} disposeObjectFn Dispose object function which takes the
 *     object to dispose as a parameter.
 */
goog.structs.SimplePool.prototype.setDisposeObjectFn = function(
    disposeObjectFn) {
  this.disposeObjectFn_ = disposeObjectFn;
};


/**
 * Gets a new object from the the pool, if there is one available, otherwise
 * returns null.
 * @return {*} An object from the pool or a new one if necessary.
 */
goog.structs.SimplePool.prototype.getObject = function() {
  if (this.freeQueue_.length) {
    return this.freeQueue_.pop();
  }
  return this.createObject();
};


/**
 * Releases the space in the pool held by a given object -- i.e., remove it from
 * the pool and frees up its space.
 * @param {*} obj The object to release.
 */
goog.structs.SimplePool.prototype.releaseObject = function(obj) {
  if (this.freeQueue_.length < this.maxCount_) {
    this.freeQueue_.push(obj);
  } else {
    this.disposeObject(obj);
  }
};


/**
 * Populates the pool with initialCount objects.
 * @param {number} initialCount The number of objects to add to the pool.
 * @private
 */
goog.structs.SimplePool.prototype.createInitial_ = function(initialCount) {
  if (initialCount > this.maxCount_) {
    throw Error('[goog.structs.SimplePool] Initial cannot be greater than max');
  }
  for (var i = 0; i < initialCount; i++) {
    this.freeQueue_.push(this.createObject());
  }
};


/**
 * Should be overriden by sub-classes to return an instance of the object type
 * that is expected in the pool.
 * @return {*} The created object.
 */
goog.structs.SimplePool.prototype.createObject = function() {
  if (this.createObjectFn_) {
    return this.createObjectFn_();
  } else {
    return {};
  }
};


/**
 * Should be overriden to dispose of an object. Default implementation is to
 * remove all of the object's members, which should render it useless. Calls the
 *  object's dispose method, if available.
 * @param {*} obj The object to dispose.
 */
goog.structs.SimplePool.prototype.disposeObject = function(obj) {
  if (this.disposeObjectFn_) {
    this.disposeObjectFn_(obj);
  } else if (goog.isObject(obj)) {
    if (goog.isFunction(obj.dispose)) {
      obj.dispose();
    } else {
      for (var i in obj) {
        delete obj[i];
      }
    }
  }
};


/**
 * Disposes of the pool and all objects currently held in the pool.
 */
goog.structs.SimplePool.prototype.disposeInternal = function() {
  goog.structs.SimplePool.superClass_.disposeInternal.call(this);
  // Call disposeObject on each object held by the pool.
  var freeQueue = this.freeQueue_;
  while (freeQueue.length) {
    this.disposeObject(freeQueue.pop());
  }
  delete this.freeQueue_;
};
// Copyright 2005 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Helper object to manage the event system pools. This should not
 * be used by itself and there should be no reason for you to depend on this
 * library.
 *
 * JScript 5.6 has some serious issues with GC so we use object pools to reduce
 * the number of object allocations.
 *
 */

goog.provide('goog.events.pools');


goog.require('goog.events.BrowserEvent');
goog.require('goog.events.Listener');
goog.require('goog.structs.SimplePool');
goog.require('goog.userAgent.jscript');


/**
 * @define {boolean} Whether to always assume the garbage collector is good.
 */
goog.events.ASSUME_GOOD_GC = false;


/**
 * Helper function for returning an object that is used for the lookup trees.
 * This might use an object pool depending on the script engine.
 * @return { {count_: number, remaining_: number} } A new or reused object.
 */
goog.events.pools.getObject;


/**
 * Helper function for releasing an object that was returned by
 * {@code goog.events.pools.getObject}. In case an object pool was used the
 * object is returned to the pool.
 * @param { {count_: number, remaining_: number} } obj The object to release.
 */
goog.events.pools.releaseObject;


/**
 * Helper function for returning an array.
 * This might use an object pool depending on the script engine.
 * @return {Array} A new or reused array.
 */
goog.events.pools.getArray;


/**
 * Helper function for releasing an array that was returned by
 * {@code goog.events.pools.getArray}. In case an object pool was used the
 * array is returned to the pool.
 * @param {Array} arr The array to release.
 */
goog.events.pools.releaseArray;


/**
 * Helper function for returning a proxy function as needed by
 * {@code goog.events}. This might use an object pool depending on the script
 * engine.
 * @return {Function} A new or reused function object.
 */
goog.events.pools.getProxy;


/**
 * Sets the callback function to use in the proxy.
 * @param {Function} cb The callback function to use.
 */
goog.events.pools.setProxyCallbackFunction;


/**
 * Helper function for releasing a function that was returned by
 * {@code goog.events.pools.getProxy}. In case an object pool was used the
 * function is returned to the pool.
 * @param {Function} f The function to release.
 */
goog.events.pools.releaseProxy;


/**
 * Helper function for returning a listener object as needed by
 * {@code goog.events}. This might use an object pool depending on the script
 * engine.
 * @return {goog.events.Listener} A new or reused listener object.
 */
goog.events.pools.getListener;


/**
 * Helper function for releasing a listener object that was returned by
 * {@code goog.events.pools.getListener}. In case an object pool was used the
 * listener object is returned to the pool.
 * @param {goog.events.Listener} listener The listener object to release.
 */
goog.events.pools.releaseListener;


/**
 * Helper function for returning a {@code goog.events.BrowserEvent} object as
 * needed by {@code goog.events}. This might use an object pool depending on the
 * script engine.
 * @return {!goog.events.BrowserEvent} A new or reused event object.
 */
goog.events.pools.getEvent;


/**
 * Helper function for releasing a browser event object that was returned by
 * {@code goog.events.pools.getEvent}. In case an object pool was used the
 * browser event object is returned to the pool.
 * @param {goog.events.BrowserEvent} event The event object to release.
 */
goog.events.pools.releaseEvent;


(function() {
  var BAD_GC = !goog.events.ASSUME_GOOD_GC &&
      goog.userAgent.jscript.HAS_JSCRIPT &&
      !goog.userAgent.jscript.isVersion('5.7');

  // These functions are shared between the pools' createObject functions and
  // the non pooled versions.

  function getObject() {
    return {count_: 0, remaining_: 0};
  }

  function getArray() {
    return [];
  }

  /**
   * This gets set to {@code goog.events.handleBrowserEvent_} by events.js.
   * @type {function(string, (Event|undefined))}
   */
  var proxyCallbackFunction;

  goog.events.pools.setProxyCallbackFunction = function(cb) {
    proxyCallbackFunction = cb;
  };

  function getProxy() {
    // Use a local var f to prevent one allocation.
    var f = function(eventObject) {
      return proxyCallbackFunction.call(f.src, f.key, eventObject);
    };
    return f;
  }

  function getListener() {
    return new goog.events.Listener();
  }

  function getEvent() {
    return new goog.events.BrowserEvent();
  }

  if (!BAD_GC) {

    goog.events.pools.getObject = getObject;
    goog.events.pools.releaseObject = goog.nullFunction;

    goog.events.pools.getArray = getArray;
    goog.events.pools.releaseArray = goog.nullFunction;

    goog.events.pools.getProxy = getProxy;
    goog.events.pools.releaseProxy = goog.nullFunction;

    goog.events.pools.getListener = getListener;
    goog.events.pools.releaseListener = goog.nullFunction;

    goog.events.pools.getEvent = getEvent;
    goog.events.pools.releaseEvent = goog.nullFunction;

  } else {

    goog.events.pools.getObject = function() {
      return objectPool.getObject();
    };

    goog.events.pools.releaseObject = function(obj) {
      objectPool.releaseObject(obj);
    };

    goog.events.pools.getArray = function() {
      return /** @type {Array} */ (arrayPool.getObject());
    };

    goog.events.pools.releaseArray = function(obj) {
      arrayPool.releaseObject(obj);
    };

    goog.events.pools.getProxy = function() {
      return /** @type {Function} */ (proxyPool.getObject());
    };

    goog.events.pools.releaseProxy = function(obj) {
      proxyPool.releaseObject(getProxy());
    };

    goog.events.pools.getListener = function() {
      return /** @type {goog.events.Listener} */ (
          listenerPool.getObject());
    };

    goog.events.pools.releaseListener = function(obj) {
      listenerPool.releaseObject(obj);
    };

    goog.events.pools.getEvent = function() {
      return /** @type {goog.events.BrowserEvent} */ (eventPool.getObject());
    };

    goog.events.pools.releaseEvent = function(obj) {
      eventPool.releaseObject(obj);
    };

    /**
     * Initial count for the objectPool
     */
    var OBJECT_POOL_INITIAL_COUNT = 0;


    /**
     * Max count for the objectPool_
     */
    var OBJECT_POOL_MAX_COUNT = 600;


    /**
     * SimplePool to cache the lookup objects. This was implemented to make IE6
     * performance better and removed an object allocation in goog.events.listen
     * when in steady state.
     */
    var objectPool = new goog.structs.SimplePool(OBJECT_POOL_INITIAL_COUNT,
                                                 OBJECT_POOL_MAX_COUNT);
    objectPool.setCreateObjectFn(getObject);


    /**
     * Initial count for the arrayPool
     */
    var ARRAY_POOL_INITIAL_COUNT = 0;


    /**
     * Max count for the arrayPool
     */
    var ARRAY_POOL_MAX_COUNT = 600;


    /**
     * SimplePool to cache the type arrays. This was implemented to make IE6
     * performance better and removed an object allocation in goog.events.listen
     * when in steady state.
     * @type {goog.structs.SimplePool}
     */
    var arrayPool = new goog.structs.SimplePool(ARRAY_POOL_INITIAL_COUNT,
                                                ARRAY_POOL_MAX_COUNT);
    arrayPool.setCreateObjectFn(getArray);


    /**
     * Initial count for the proxyPool
     */
    var HANDLE_EVENT_PROXY_POOL_INITIAL_COUNT = 0;


    /**
     * Max count for the proxyPool
     */
    var HANDLE_EVENT_PROXY_POOL_MAX_COUNT = 600;


    /**
     * SimplePool to cache the handle event proxy. This was implemented to make
     * IE6 performance better and removed an object allocation in
     * goog.events.listen when in steady state.
     */
    var proxyPool = new goog.structs.SimplePool(
        HANDLE_EVENT_PROXY_POOL_INITIAL_COUNT,
        HANDLE_EVENT_PROXY_POOL_MAX_COUNT);
    proxyPool.setCreateObjectFn(getProxy);


    /**
     * Initial count for the listenerPool
     */
    var LISTENER_POOL_INITIAL_COUNT = 0;


    /**
     * Max count for the listenerPool
     */
    var LISTENER_POOL_MAX_COUNT = 600;


    /**
     * SimplePool to cache the listener objects. This was implemented to make
     * IE6 performance better and removed an object allocation in
     * goog.events.listen when in steady state.
     */
    var listenerPool = new goog.structs.SimplePool(LISTENER_POOL_INITIAL_COUNT,
                                                   LISTENER_POOL_MAX_COUNT);
    listenerPool.setCreateObjectFn(getListener);


    /**
     * Initial count for the eventPool
     */
    var EVENT_POOL_INITIAL_COUNT = 0;


    /**
     * Max count for the eventPool
     */
    var EVENT_POOL_MAX_COUNT = 600;


    /**
     * SimplePool to cache the event objects. This was implemented to make IE6
     * performance better and removed an object allocation in
     * goog.events.handleBrowserEvent_ when in steady state.
     * This pool is only used for IE events.
     */
    var eventPool = new goog.structs.SimplePool(EVENT_POOL_INITIAL_COUNT,
                                                EVENT_POOL_MAX_COUNT);
    eventPool.setCreateObjectFn(getEvent);
  }
})();
// Copyright 2005 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Event Manager.
 *
 * Provides an abstracted interface to the browsers' event
 * systems. This uses an indirect lookup of listener functions to avoid circular
 * references between DOM (in IE) or XPCOM (in Mozilla) objects which leak
 * memory. This makes it easier to write OO Javascript/DOM code.
 *
 * It simulates capture & bubble in Internet Explorer.
 *
 * The listeners will also automagically have their event objects patched, so
 * your handlers don't need to worry about the browser.
 *
 * Example usage:
 * <pre>
 * goog.events.listen(myNode, 'click', function(e) { alert('woo') });
 * goog.events.listen(myNode, 'mouseover', mouseHandler, true);
 * goog.events.unlisten(myNode, 'mouseover', mouseHandler, true);
 * goog.events.removeAll(myNode);
 * goog.events.removeAll();
 * </pre>
 *
 *                                            in IE and event object patching]
 *
 * @supported IE6+, FF1.5+, WebKit, Opera.
 * @see ../demos/events.html
 * @see ../demos/event-propagation.html
 * @see ../demos/stopevent.html
 */


// This uses 3 lookup tables/trees.
// listenerTree_ is a tree of type -> capture -> src uid -> [Listener]
// listeners_ is a map of key -> [Listener]
//
// The key is a field of the Listener. The Listener class also has the type,
// capture and the src so one can always trace back in the tree
//
// sources_: src uid -> [Listener]


goog.provide('goog.events');

goog.require('goog.array');
goog.require('goog.debug.entryPointRegistry');
goog.require('goog.debug.errorHandlerWeakDep');
goog.require('goog.events.BrowserEvent');
goog.require('goog.events.Event');
goog.require('goog.events.EventWrapper');
goog.require('goog.events.pools');
goog.require('goog.object');
goog.require('goog.userAgent');


/**
 * Container for storing event listeners and their proxies
 * @private
 * @type {Object.<goog.events.Listener>}
 */
goog.events.listeners_ = {};


/**
 * The root of the listener tree
 * @private
 * @type {Object}
 */
goog.events.listenerTree_ = {};


/**
 * Lookup for mapping source UIDs to listeners.
 * @private
 * @type {Object}
 */
goog.events.sources_ = {};


/**
 * String used to prepend to IE event types.  Not a constant so that it is not
 * inlined.
 * @type {string}
 * @private
 */
goog.events.onString_ = 'on';


/**
 * Map of computed on strings for IE event types. Caching this removes an extra
 * object allocation in goog.events.listen which improves IE6 performance.
 * @type {Object}
 * @private
 */
goog.events.onStringMap_ = {};


/**
 * Separator used to split up the various parts of an event key, to help avoid
 * the possibilities of collisions.
 * @type {string}
 * @private
 */
goog.events.keySeparator_ = '_';


/**
 * Whether the browser natively supports full W3C event propagation.
 * @type {boolean}
 * @private
 */
goog.events.requiresSyntheticEventPropagation_;


/**
 * Adds an event listener for a specific event on a DOM Node or an object that
 * has implemented {@link goog.events.EventTarget}. A listener can only be
 * added once to an object and if it is added again the key for the listener
 * is returned.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to listen to
 *     events on.
 * @param {string|Array.<string>} type Event type or array of event types.
 * @param {Function|Object} listener Callback method, or an object with a
 *     handleEvent function.
 * @param {boolean=} opt_capt Whether to fire in capture phase (defaults to
 *     false).
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 * @return {?number} Unique key for the listener.
 */
goog.events.listen = function(src, type, listener, opt_capt, opt_handler) {
  if (!type) {
    throw Error('Invalid event type');
  } else if (goog.isArray(type)) {
    for (var i = 0; i < type.length; i++) {
      goog.events.listen(src, type[i], listener, opt_capt, opt_handler);
    }
    return null;
  } else {
    var capture = !!opt_capt;
    var map = goog.events.listenerTree_;

    if (!(type in map)) {
      map[type] = goog.events.pools.getObject();
    }
    map = map[type];

    if (!(capture in map)) {
      map[capture] = goog.events.pools.getObject();
      map.count_++;
    }
    map = map[capture];

    var srcUid = goog.getUid(src);
    var listenerArray, listenerObj;

    // The remaining_ property is used to be able to short circuit the iteration
    // of the event listeners.
    //
    // Increment the remaining event listeners to call even if this event might
    // already have been fired. At this point we do not know if the event has
    // been fired and it is too expensive to find out. By incrementing it we are
    // guaranteed that we will not skip any event listeners.
    map.remaining_++;

    // Do not use srcUid in map here since that will cast the number to a
    // string which will allocate one string object.
    if (!map[srcUid]) {
      listenerArray = map[srcUid] = goog.events.pools.getArray();
      map.count_++;
    } else {
      listenerArray = map[srcUid];
      // Ensure that the listeners do not already contain the current listener
      for (var i = 0; i < listenerArray.length; i++) {
        listenerObj = listenerArray[i];
        if (listenerObj.listener == listener &&
            listenerObj.handler == opt_handler) {

          // If this listener has been removed we should not return its key. It
          // is OK that we create new listenerObj below since the removed one
          // will be cleaned up later.
          if (listenerObj.removed) {
            break;
          }

          // We already have this listener. Return its key.
          return listenerArray[i].key;
        }
      }
    }

    var proxy = goog.events.pools.getProxy();
    proxy.src = src;
    listenerObj = goog.events.pools.getListener();
    listenerObj.init(listener, proxy, src, type, capture, opt_handler);
    var key = listenerObj.key;
    proxy.key = key;

    listenerArray.push(listenerObj);
    goog.events.listeners_[key] = listenerObj;

    if (!goog.events.sources_[srcUid]) {
      goog.events.sources_[srcUid] = goog.events.pools.getArray();
    }
    goog.events.sources_[srcUid].push(listenerObj);


    // Attach the proxy through the browser's API
    if (src.addEventListener) {
      if (src == goog.global || !src.customEvent_) {
        src.addEventListener(type, proxy, capture);
      }
    } else {
      // The else above used to be else if (src.attachEvent) and then there was
      // another else statement that threw an exception warning the developer
      // they made a mistake. This resulted in an extra object allocation in IE6
      // due to a wrapper object that had to be implemented around the element
      // and so was removed.
      src.attachEvent(goog.events.getOnString_(type), proxy);
    }

    return key;
  }
};


/**
 * Adds an event listener for a specific event on a DomNode or an object that
 * has implemented {@link goog.events.EventTarget}. After the event has fired
 * the event listener is removed from the target.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to listen to
 *     events on.
 * @param {string|Array.<string>} type Event type or array of event types.
 * @param {Function|Object} listener Callback method.
 * @param {boolean=} opt_capt Fire in capture phase?.
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 * @return {?number} Unique key for the listener.
 */
goog.events.listenOnce = function(src, type, listener, opt_capt, opt_handler) {
  if (goog.isArray(type)) {
    for (var i = 0; i < type.length; i++) {
      goog.events.listenOnce(src, type[i], listener, opt_capt, opt_handler);
    }
    return null;
  }

  var key = goog.events.listen(src, type, listener, opt_capt, opt_handler);
  var listenerObj = goog.events.listeners_[key];
  listenerObj.callOnce = true;
  return key;
};


/**
 * Adds an event listener with a specific event wrapper on a DOM Node or an
 * object that has implemented {@link goog.events.EventTarget}. A listener can
 * only be added once to an object.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to listen to
 *     events on.
 * @param {goog.events.EventWrapper} wrapper Event wrapper to use.
 * @param {Function|Object} listener Callback method, or an object with a
 *     handleEvent function.
 * @param {boolean=} opt_capt Whether to fire in capture phase (defaults to
 *     false).
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 */
goog.events.listenWithWrapper = function(src, wrapper, listener, opt_capt,
    opt_handler) {
  wrapper.listen(src, listener, opt_capt, opt_handler);
};


/**
 * Removes an event listener which was added with listen().
 *
 * @param {EventTarget|goog.events.EventTarget} src The target to stop
 *     listening to events on.
 * @param {string|Array.<string>} type The name of the event without the 'on'
 *     prefix.
 * @param {Function|Object} listener The listener function to remove.
 * @param {boolean=} opt_capt In DOM-compliant browsers, this determines
 *     whether the listener is fired during the capture or bubble phase of the
 *     event.
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 * @return {?boolean} indicating whether the listener was there to remove.
 */
goog.events.unlisten = function(src, type, listener, opt_capt, opt_handler) {
  if (goog.isArray(type)) {
    for (var i = 0; i < type.length; i++) {
      goog.events.unlisten(src, type[i], listener, opt_capt, opt_handler);
    }
    return null;
  }

  var capture = !!opt_capt;

  var listenerArray = goog.events.getListeners_(src, type, capture);
  if (!listenerArray) {
    return false;
  }

  for (var i = 0; i < listenerArray.length; i++) {
    if (listenerArray[i].listener == listener &&
        listenerArray[i].capture == capture &&
        listenerArray[i].handler == opt_handler) {
      return goog.events.unlistenByKey(listenerArray[i].key);
    }
  }

  return false;
};


/**
 * Removes an event listener which was added with listen() by the key
 * returned by listen().
 *
 * @param {?number} key The key returned by listen() for this event listener.
 * @return {boolean} indicating whether the listener was there to remove.
 */
goog.events.unlistenByKey = function(key) {
  // Do not use key in listeners here since that will cast the number to a
  // string which will allocate one string object.
  if (!goog.events.listeners_[key]) {
    return false;
  }
  var listener = goog.events.listeners_[key];

  if (listener.removed) {
    return false;
  }

  var src = listener.src;
  var type = listener.type;
  var proxy = listener.proxy;
  var capture = listener.capture;

  if (src.removeEventListener) {
    // EventTarget calls unlisten so we need to ensure that the source is not
    // an event target to prevent re-entry.
    // TODO(user): What is this goog.global for? Why would anyone listen to
    // events on the [[Global]] object? Is it supposed to be window? Why would
    // we not want to allow removing event listeners on the window?
    if (src == goog.global || !src.customEvent_) {
      src.removeEventListener(type, proxy, capture);
    }
  } else if (src.detachEvent) {
    src.detachEvent(goog.events.getOnString_(type), proxy);
  }

  var srcUid = goog.getUid(src);
  var listenerArray = goog.events.listenerTree_[type][capture][srcUid];

  // In a perfect implementation we would decrement the remaining_ field here
  // but then we would need to know if the listener has already been fired or
  // not. We therefore skip doing this and in this uncommon case the entire
  // ancestor chain will need to be traversed as before.

  // Remove from sources_
  if (goog.events.sources_[srcUid]) {
    var sourcesArray = goog.events.sources_[srcUid];
    goog.array.remove(sourcesArray, listener);
    if (sourcesArray.length == 0) {
      delete goog.events.sources_[srcUid];
    }
  }

  listener.removed = true;
  listenerArray.needsCleanup_ = true;
  goog.events.cleanUp_(type, capture, srcUid, listenerArray);

  delete goog.events.listeners_[key];

  return true;
};


/**
 * Removes an event listener which was added with listenWithWrapper().
 *
 * @param {EventTarget|goog.events.EventTarget} src The target to stop
 *     listening to events on.
 * @param {goog.events.EventWrapper} wrapper Event wrapper to use.
 * @param {Function|Object} listener The listener function to remove.
 * @param {boolean=} opt_capt In DOM-compliant browsers, this determines
 *     whether the listener is fired during the capture or bubble phase of the
 *     event.
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 */
goog.events.unlistenWithWrapper = function(src, wrapper, listener, opt_capt,
    opt_handler) {
  wrapper.unlisten(src, listener, opt_capt, opt_handler);
};


/**
 * Cleans up the listener array as well as the listener tree
 * @param {string} type  The type of the event.
 * @param {boolean} capture Whether to clean up capture phase listeners instead
 *     bubble phase listeners.
 * @param {number} srcUid  The unique ID of the source.
 * @param {Array.<goog.events.Listener>} listenerArray The array being cleaned.
 * @private
 */
goog.events.cleanUp_ = function(type, capture, srcUid, listenerArray) {
  // The listener array gets locked during the dispatch phase so that removals
  // of listeners during this phase does not screw up the indeces. This method
  // is called after we have removed a listener as well as after the dispatch
  // phase in case any listeners were removed.
  if (!listenerArray.locked_) { // catches both 0 and not set
    if (listenerArray.needsCleanup_) {
      // Loop over the listener array and remove listeners that have removed set
      // to true. This could have been done with filter or something similar but
      // we want to change the array in place and we want to minimize
      // allocations. Adding a listener during this phase adds to the end of the
      // array so that works fine as long as the length is rechecked every in
      // iteration.
      for (var oldIndex = 0, newIndex = 0;
           oldIndex < listenerArray.length;
           oldIndex++) {
        if (listenerArray[oldIndex].removed) {
          var proxy = listenerArray[oldIndex].proxy;
          proxy.src = null;
          goog.events.pools.releaseProxy(proxy);
          goog.events.pools.releaseListener(listenerArray[oldIndex]);
          continue;
        }
        if (oldIndex != newIndex) {
          listenerArray[newIndex] = listenerArray[oldIndex];
        }
        newIndex++;
      }
      listenerArray.length = newIndex;

      listenerArray.needsCleanup_ = false;

      // In case the length is now zero we release the object.
      if (newIndex == 0) {
        goog.events.pools.releaseArray(listenerArray);
        delete goog.events.listenerTree_[type][capture][srcUid];
        goog.events.listenerTree_[type][capture].count_--;

        if (goog.events.listenerTree_[type][capture].count_ == 0) {
          goog.events.pools.releaseObject(
              goog.events.listenerTree_[type][capture]);
          delete goog.events.listenerTree_[type][capture];
          goog.events.listenerTree_[type].count_--;
        }

        if (goog.events.listenerTree_[type].count_ == 0) {
          goog.events.pools.releaseObject(goog.events.listenerTree_[type]);
          delete goog.events.listenerTree_[type];
        }
      }

    }
  }
};


/**
 * Removes all listeners from an object, if no object is specified it will
 * remove all listeners that have been registered.  You can also optionally
 * remove listeners of a particular type or capture phase.
 *
 * @param {Object=} opt_obj Object to remove listeners from.
 * @param {string=} opt_type Type of event to, default is all types.
 * @param {boolean=} opt_capt Whether to remove the listeners from the capture
 *     or bubble phase.  If unspecified, will remove both.
 * @return {number} Number of listeners removed.
 */
goog.events.removeAll = function(opt_obj, opt_type, opt_capt) {
  var count = 0;

  var noObj = opt_obj == null;
  var noType = opt_type == null;
  var noCapt = opt_capt == null;
  opt_capt = !!opt_capt;

  if (!noObj) {
    var srcUid = goog.getUid(/** @type {Object} */ (opt_obj));
    if (goog.events.sources_[srcUid]) {
      var sourcesArray = goog.events.sources_[srcUid];
      for (var i = sourcesArray.length - 1; i >= 0; i--) {
        var listener = sourcesArray[i];
        if ((noType || opt_type == listener.type) &&
            (noCapt || opt_capt == listener.capture)) {
          goog.events.unlistenByKey(listener.key);
          count++;
        }
      }
    }
  } else {
    // Loop over the sources_ map instead of over the listeners_ since it is
    // smaller which results in fewer allocations.
    goog.object.forEach(goog.events.sources_, function(listeners) {
      for (var i = listeners.length - 1; i >= 0; i--) {
        var listener = listeners[i];
        if ((noType || opt_type == listener.type) &&
            (noCapt || opt_capt == listener.capture)) {
          goog.events.unlistenByKey(listener.key);
          count++;
        }
      }
    });
  }

  return count;
};


/**
 * Gets the listeners for a given object, type and capture phase.
 *
 * @param {Object} obj Object to get listeners for.
 * @param {string} type Event type.
 * @param {boolean} capture Capture phase?.
 * @return {Array.<goog.events.Listener>} Array of listener objects.
 */
goog.events.getListeners = function(obj, type, capture) {
  return goog.events.getListeners_(obj, type, capture) || [];
};


/**
 * Gets the listeners for a given object, type and capture phase.
 *
 * @param {Object} obj Object to get listeners for.
 * @param {?string} type Event type.
 * @param {boolean} capture Capture phase?.
 * @return {Array.<goog.events.Listener>?} Array of listener objects.
 *     Returns null if object has no listeners of that type.
 * @private
 */
goog.events.getListeners_ = function(obj, type, capture) {
  var map = goog.events.listenerTree_;
  if (type in map) {
    map = map[type];
    if (capture in map) {
      map = map[capture];
      var objUid = goog.getUid(obj);
      if (map[objUid]) {
        return map[objUid];
      }
    }
  }

  return null;
};


/**
 * Gets the goog.events.Listener for the event or null if no such listener is
 * in use.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node from which to get
 *     listeners.
 * @param {?string} type The name of the event without the 'on' prefix.
 * @param {Function|Object} listener The listener function to get.
 * @param {boolean=} opt_capt In DOM-compliant browsers, this determines
 *                            whether the listener is fired during the
 *                            capture or bubble phase of the event.
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 * @return {goog.events.Listener?} the found listener or null if not found.
 */
goog.events.getListener = function(src, type, listener, opt_capt, opt_handler) {
  var capture = !!opt_capt;
  var listenerArray = goog.events.getListeners_(src, type, capture);
  if (listenerArray) {
    for (var i = 0; i < listenerArray.length; i++) {
      if (listenerArray[i].listener == listener &&
          listenerArray[i].capture == capture &&
          listenerArray[i].handler == opt_handler) {
        // We already have this listener. Return its key.
        return listenerArray[i];
      }
    }
  }
  return null;
};


/**
 * Returns whether an event target has any active listeners matching the
 * specified signature. If either the type or capture parameters are
 * unspecified, the function will match on the remaining criteria.
 *
 * @param {EventTarget|goog.events.EventTarget} obj Target to get listeners for.
 * @param {string=} opt_type Event type.
 * @param {boolean=} opt_capture Whether to check for capture or bubble-phase
 *     listeners.
 * @return {boolean} Whether an event target has one or more listeners matching
 *     the requested type and/or capture phase.
 */
goog.events.hasListener = function(obj, opt_type, opt_capture) {
  var objUid = goog.getUid(obj);
  var listeners = goog.events.sources_[objUid];

  if (listeners) {
    var hasType = goog.isDef(opt_type);
    var hasCapture = goog.isDef(opt_capture);

    if (hasType && hasCapture) {
      // Lookup in the listener tree whether the specified listener exists.
      var map = goog.events.listenerTree_[opt_type];
      return !!map && !!map[opt_capture] && objUid in map[opt_capture];

    } else if (!(hasType || hasCapture)) {
      // Simple check for whether the event target has any listeners at all.
      return true;

    } else {
      // Iterate through the listeners for the event target to find a match.
      return goog.array.some(listeners, function(listener) {
        return (hasType && listener.type == opt_type) ||
               (hasCapture && listener.capture == opt_capture);
      });
    }
  }

  return false;
};


/**
 * Provides a nice string showing the normalized event objects public members
 * @param {Object} e Event Object.
 * @return {string} String of the public members of the normalized event object.
 */
goog.events.expose = function(e) {
  var str = [];
  for (var key in e) {
    if (e[key] && e[key].id) {
      str.push(key + ' = ' + e[key] + ' (' + e[key].id + ')');
    } else {
      str.push(key + ' = ' + e[key]);
    }
  }
  return str.join('\n');
};


/**
 * Returns a string wth on prepended to the specified type. This is used for IE
 * which expects "on" to be prepended. This function caches the string in order
 * to avoid extra allocations in steady state.
 * @param {string} type Event type strng.
 * @return {string} The type string with 'on' prepended.
 * @private
 */
goog.events.getOnString_ = function(type) {
  if (type in goog.events.onStringMap_) {
    return goog.events.onStringMap_[type];
  }
  return goog.events.onStringMap_[type] = goog.events.onString_ + type;
};


/**
 * Fires an object's listeners of a particular type and phase
 *
 * @param {Object} obj Object whose listeners to call.
 * @param {string} type Event type.
 * @param {boolean} capture Which event phase.
 * @param {Object} eventObject Event object to be passed to listener.
 * @return {boolean} True if all listeners returned true else false.
 */
goog.events.fireListeners = function(obj, type, capture, eventObject) {
  var map = goog.events.listenerTree_;
  if (type in map) {
    map = map[type];
    if (capture in map) {
      return goog.events.fireListeners_(map[capture], obj, type,
                                        capture, eventObject);
    }
  }
  return true;
};


/**
 * Fires an object's listeners of a particular type and phase.
 *
 * @param {Object} map Object with listeners in it.
 * @param {Object} obj Object whose listeners to call.
 * @param {string} type Event type.
 * @param {boolean} capture Which event phase.
 * @param {Object} eventObject Event object to be passed to listener.
 * @return {boolean} True if all listeners returned true else false.
 * @private
 */
goog.events.fireListeners_ = function(map, obj, type, capture, eventObject) {
  var retval = 1;

  var objUid = goog.getUid(obj);
  if (map[objUid]) {
    map.remaining_--;
    var listenerArray = map[objUid];

    // If locked_ is not set (and if already 0) initialize it to 1.
    if (!listenerArray.locked_) {
      listenerArray.locked_ = 1;
    } else {
      listenerArray.locked_++;
    }

    try {
      // Events added in the dispatch phase should not be dispatched in
      // the current dispatch phase. They will be included in the next
      // dispatch phase though.
      var length = listenerArray.length;
      for (var i = 0; i < length; i++) {
        var listener = listenerArray[i];
        // We might not have a listener if the listener was removed.
        if (listener && !listener.removed) {
          retval &=
              goog.events.fireListener(listener, eventObject) !== false;
        }
      }
    } finally {
      listenerArray.locked_--;
      goog.events.cleanUp_(type, capture, objUid, listenerArray);
    }
  }

  return Boolean(retval);
};


/**
 * Fires a listener with a set of arguments
 *
 * @param {goog.events.Listener} listener The listener object to call.
 * @param {Object} eventObject The event object to pass to the listener.
 * @return {boolean} Result of listener.
 */
goog.events.fireListener = function(listener, eventObject) {
  var rv = listener.handleEvent(eventObject);
  if (listener.callOnce) {
    goog.events.unlistenByKey(listener.key);
  }
  return rv;
};


/**
 * Gets the total number of listeners currently in the system.
 * @return {number} Number of listeners.
 */
goog.events.getTotalListenerCount = function() {
  return goog.object.getCount(goog.events.listeners_);
};


/**
 * Dispatches an event (or event like object) and calls all listeners
 * listening for events of this type. The type of the event is decided by the
 * type property on the event object.
 *
 * If any of the listeners returns false OR calls preventDefault then this
 * function will return false.  If one of the capture listeners calls
 * stopPropagation, then the bubble listeners won't fire.
 *
 * @param {goog.events.EventTarget} src  The event target.
 * @param {string|Object|goog.events.Event} e Event object.
 * @return {boolean} If anyone called preventDefault on the event object (or
 *     if any of the handlers returns false) this will also return false.
 *     If there are no handlers, or if all handlers return true, this returns
 *     true.
 */
goog.events.dispatchEvent = function(src, e) {
  var type = e.type || e;
  var map = goog.events.listenerTree_;
  if (!(type in map)) {
    return true;
  }

  // If accepting a string or object, create a custom event object so that
  // preventDefault and stopPropagation work with the event.
  if (goog.isString(e)) {
    e = new goog.events.Event(e, src);
  } else if (!(e instanceof goog.events.Event)) {
    var oldEvent = e;
    e = new goog.events.Event(type, src);
    goog.object.extend(e, oldEvent);
  } else {
    e.target = e.target || src;
  }

  var rv = 1, ancestors;

  map = map[type];
  var hasCapture = true in map;
  var targetsMap;

  if (hasCapture) {
    // Build ancestors now
    ancestors = [];
    for (var parent = src; parent; parent = parent.getParentEventTarget()) {
      ancestors.push(parent);
    }

    targetsMap = map[true];
    targetsMap.remaining_ = targetsMap.count_;

    // Call capture listeners
    for (var i = ancestors.length - 1;
         !e.propagationStopped_ && i >= 0 && targetsMap.remaining_;
         i--) {
      e.currentTarget = ancestors[i];
      rv &= goog.events.fireListeners_(targetsMap, ancestors[i], e.type,
                                       true, e) &&
            e.returnValue_ != false;
    }
  }

  var hasBubble = false in map;
  if (hasBubble) {
    targetsMap = map[false];
    targetsMap.remaining_ = targetsMap.count_;

    if (hasCapture) { // We have the ancestors.

      // Call bubble listeners
      for (var i = 0; !e.propagationStopped_ && i < ancestors.length &&
           targetsMap.remaining_;
           i++) {
        e.currentTarget = ancestors[i];
        rv &= goog.events.fireListeners_(targetsMap, ancestors[i], e.type,
                                         false, e) &&
              e.returnValue_ != false;
      }
    } else {
      // In case we don't have capture we don't have to build up the
      // ancestors array.

      for (var current = src;
           !e.propagationStopped_ && current && targetsMap.remaining_;
           current = current.getParentEventTarget()) {
        e.currentTarget = current;
        rv &= goog.events.fireListeners_(targetsMap, current, e.type,
                                         false, e) &&
              e.returnValue_ != false;
      }
    }
  }

  return Boolean(rv);
};


/**
 * Installs exception protection for the browser event entry point using the
 * given error handler.
 *
 * @param {goog.debug.ErrorHandler} errorHandler Error handler with which to
 *     protect the entry point.
 */
goog.events.protectBrowserEventEntryPoint = function(errorHandler) {
  goog.events.handleBrowserEvent_ = errorHandler.protectEntryPoint(
      goog.events.handleBrowserEvent_);
  goog.events.pools.setProxyCallbackFunction(goog.events.handleBrowserEvent_);
};


/**
 * Handles an event and dispatches it to the correct listeners. This
 * function is a proxy for the real listener the user specified.
 *
 * @param {string} key Unique key for the listener.
 * @param {Event=} opt_evt Optional event object that gets passed in via the
 *     native event handlers.
 * @return {boolean} Result of the event handler.
 * @this {goog.events.EventTarget|Object} The object or Element that
 *     fired the event.
 * @private
 */
goog.events.handleBrowserEvent_ = function(key, opt_evt) {
  // If the listener isn't there it was probably removed when processing
  // another listener on the same event (e.g. the later listener is
  // not managed by closure so that they are both fired under IE)
  if (!goog.events.listeners_[key]) {
    return true;
  }

  var listener = goog.events.listeners_[key];
  var type = listener.type;
  var map = goog.events.listenerTree_;

  if (!(type in map)) {
    return true;
  }
  map = map[type];
  var retval, targetsMap;
  if (goog.events.synthesizeEventPropagation_()) {
    var ieEvent = opt_evt ||
        /** @type {Event} */ (goog.getObjectByName('window.event'));

    // Check if we have any capturing event listeners for this type.
    var hasCapture = true in map;
    var hasBubble = false in map;

    if (hasCapture) {
      if (goog.events.isMarkedIeEvent_(ieEvent)) {
        return true;
      }

      goog.events.markIeEvent_(ieEvent);
    }

    var evt = goog.events.pools.getEvent();
    evt.init(ieEvent, this);

    retval = true;
    try {
      if (hasCapture) {
        var ancestors = goog.events.pools.getArray();

        for (var parent = evt.currentTarget;
             parent;
             parent = parent.parentNode) {
          ancestors.push(parent);
        }

        targetsMap = map[true];
        targetsMap.remaining_ = targetsMap.count_;

        // Call capture listeners
        for (var i = ancestors.length - 1;
             !evt.propagationStopped_ && i >= 0 && targetsMap.remaining_;
             i--) {
          evt.currentTarget = ancestors[i];
          retval &= goog.events.fireListeners_(targetsMap, ancestors[i], type,
                                               true, evt);
        }

        if (hasBubble) {
          targetsMap = map[false];
          targetsMap.remaining_ = targetsMap.count_;

          // Call bubble listeners
          for (var i = 0;
               !evt.propagationStopped_ && i < ancestors.length &&
               targetsMap.remaining_;
               i++) {
            evt.currentTarget = ancestors[i];
            retval &= goog.events.fireListeners_(targetsMap, ancestors[i], type,
                                                 false, evt);
          }
        }

      } else {
        // Bubbling, let IE handle the propagation.
        retval = goog.events.fireListener(listener, evt);
      }

    } finally {
      if (ancestors) {
        ancestors.length = 0;
        goog.events.pools.releaseArray(ancestors);
      }
      evt.dispose();
      goog.events.pools.releaseEvent(evt);
    }
    return retval;
  } // IE

  // Caught a non-IE DOM event. 1 additional argument which is the event object
  var be = new goog.events.BrowserEvent(opt_evt, this);
  try {
    retval = goog.events.fireListener(listener, be);
  } finally {
    be.dispose();
  }
  return retval;
};


// Set the callback for the proxy pool. This is done here to prevent circular
// dependencies.
goog.events.pools.setProxyCallbackFunction(goog.events.handleBrowserEvent_);


/**
 * This is used to mark the IE event object so we do not do the Closure pass
 * twice for a bubbling event.
 * @param {Event} e The IE browser event.
 * @private
 */
goog.events.markIeEvent_ = function(e) {
  // Only the keyCode and the returnValue can be changed. We use keyCode for
  // non keyboard events.
  // event.returnValue is a bit more tricky. It is undefined by default. A
  // boolean false prevents the default action. In a window.onbeforeunload and
  // the returnValue is non undefined it will be alerted. However, we will only
  // modify the returnValue for keyboard events. We can get a problem if non
  // closure events sets the keyCode or the returnValue

  var useReturnValue = false;

  if (e.keyCode == 0) {
    // We cannot change the keyCode in case that srcElement is input[type=file].
    // We could test that that is the case but that would allocate 3 objects.
    // If we use try/catch we will only allocate extra objects in the case of a
    // failure.
    /** @preserveTry */
    try {
      e.keyCode = -1;
      return;
    } catch (ex) {
      useReturnValue = true;
    }
  }

  if (useReturnValue ||
      /** @type {boolean|undefined} */ (e.returnValue) == undefined) {
    e.returnValue = true;
  }
};


/**
 * This is used to check if an IE event has already been handled by the Closure
 * system so we do not do the Closure pass twice for a bubbling event.
 * @param {Event} e  The IE browser event.
 * @return {boolean} True if the event object has been marked.
 * @private
 * @notypecheck TODO(nicksantos): Fix this.
 */
goog.events.isMarkedIeEvent_ = function(e) {
  return e.keyCode < 0 || e.returnValue != undefined;
};


/**
 * Counter to create unique event ids.
 * @type {number}
 * @private
 */
goog.events.uniqueIdCounter_ = 0;


/**
 * Creates a unique event id.
 *
 * @param {string} identifier The identifier.
 * @return {string} A unique identifier.
 */
goog.events.getUniqueId = function(identifier) {
  return identifier + '_' + goog.events.uniqueIdCounter_++;
};


/**
 * Returns whether we should synthesize the W3C event propagation.  Versions of
 * IE, up to IE9, don't support addEventListener or the capture phase.
 * @return {boolean} Whether to use IE's proprietary event model.
 * @private
 */
goog.events.synthesizeEventPropagation_ = function() {
  if (goog.events.requiresSyntheticEventPropagation_ === undefined) {
    // TODO(user): goog.events is used in a non DOM context, even though it
    // couldn't be used with DOM events.  We therefore assume that if we
    // got here that goog.global===window to keep the compiler happy.  We can't
    // use navigator.userAgent yet because the IE9 platform preview still
    // reports as MSIE 8.0.
    goog.events.requiresSyntheticEventPropagation_ =
        goog.userAgent.IE && !goog.global['addEventListener'];
  }
  return goog.events.requiresSyntheticEventPropagation_;
};


// Register the browser event handler as an entry point, so that
// it can be monitored for exception handling, etc.
goog.debug.entryPointRegistry.register(
    /**
     * @param {function(!Function): !Function} transformer The transforming
     *     function.
     */
    function(transformer) {
      goog.events.handleBrowserEvent_ = transformer(
          goog.events.handleBrowserEvent_);
      goog.events.pools.setProxyCallbackFunction(
          goog.events.handleBrowserEvent_);
    });
// Copyright 2005 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Class to create objects which want to handle multiple events
 * and have their listeners easily cleaned up via a dispose method.
 *
 * Example:
 * <pre>
 * function Something() {
 *   goog.events.EventHandler.call(this);
 *
 *   ... set up object ...
 *
 *   // Add event listeners
 *   this.listen(this.starEl, 'click', this.handleStar);
 *   this.listen(this.headerEl, 'click', this.expand);
 *   this.listen(this.collapseEl, 'click', this.collapse);
 *   this.listen(this.infoEl, 'mouseover', this.showHover);
 *   this.listen(this.infoEl, 'mouseout', this.hideHover);
 * }
 * goog.inherits(Something, goog.events.EventHandler);
 *
 * Something.prototype.disposeInternal = function() {
 *   Something.superClass_.disposeInternal.call(this);
 *   goog.dom.removeNode(this.container);
 * };
 *
 *
 * // Then elsewhere:
 *
 * var activeSomething = null;
 * function openSomething() {
 *   activeSomething = new Something();
 * }
 *
 * function closeSomething() {
 *   if (activeSomething) {
 *     activeSomething.dispose();  // Remove event listeners
 *     activeSomething = null;
 *   }
 * }
 * </pre>
 *
 */

goog.provide('goog.events.EventHandler');

goog.require('goog.Disposable');
goog.require('goog.events');
goog.require('goog.events.EventWrapper');
goog.require('goog.object');
goog.require('goog.structs.SimplePool');



/**
 * Super class for objects that want to easily manage a number of event
 * listeners.  It allows a short cut to listen and also provides a quick way
 * to remove all events listeners belonging to this object. It is optimized to
 * use less objects if only one event is being listened to, but if that's the
 * case, it may not be worth using the EventHandler anyway.
 * @param {Object=} opt_handler Object in whose scope to call the listeners.
 * @constructor
 * @extends {goog.Disposable}
 */
goog.events.EventHandler = function(opt_handler) {
  goog.Disposable.call(this);
  this.handler_ = opt_handler;
};
goog.inherits(goog.events.EventHandler, goog.Disposable);


/**
 * Initial count for the keyPool_
 * @type {number}
 */
goog.events.EventHandler.KEY_POOL_INITIAL_COUNT = 0;


/**
 * Max count for the keyPool_
 * @type {number}
 */
goog.events.EventHandler.KEY_POOL_MAX_COUNT = 100;


/**
 * SimplePool to cache the key object. This was implemented to make IE6
 * performance better and removed an object allocation in the listen method
 * when in steady state.
 * @type {goog.structs.SimplePool}
 * @private
 */
goog.events.EventHandler.keyPool_ = new goog.structs.SimplePool(
    goog.events.EventHandler.KEY_POOL_INITIAL_COUNT,
    goog.events.EventHandler.KEY_POOL_MAX_COUNT);


/**
 * Keys for events that are being listened to. This is used once there are more
 * than one event to listen to. If there is only one event to listen to, key_
 * is used.
 * @type {Object}
 * @private
 */
goog.events.EventHandler.keys_ = null;


/**
 * Keys for event that is being listened to if only one event is being listened
 * to. This is a performance optimization to avoid creating an extra object
 * if not necessary.
 * @type {?string}
 * @private
 */
goog.events.EventHandler.key_ = null;


/**
 * Utility array used to unify the cases of listening for an array of types
 * and listening for a single event, without using recursion or allocating
 * an array each time.
 * @type {Array.<string>}
 * @private
 */
goog.events.EventHandler.typeArray_ = [];


/**
 * Listen to an event on a DOM node or EventTarget.  If the function is omitted
 * then the EventHandler's handleEvent method will be used.
 * @param {goog.events.EventTarget|EventTarget} src Event source.
 * @param {string|Array.<string>} type Event type to listen for or array of
 *     event types.
 * @param {Function|Object=} opt_fn Optional callback function to be used as the
 *    listener or an object with handleEvent function.
 * @param {boolean=} opt_capture Optional whether to use capture phase.
 * @param {Object=} opt_handler Object in whose scope to call the listener.
 * @return {goog.events.EventHandler} This object, allowing for chaining of
 *     calls.
 */
goog.events.EventHandler.prototype.listen = function(src, type, opt_fn,
                                                     opt_capture,
                                                     opt_handler) {
  if (!goog.isArray(type)) {
    goog.events.EventHandler.typeArray_[0] = /** @type {string} */(type);
    type = goog.events.EventHandler.typeArray_;
  }
  for (var i = 0; i < type.length; i++) {
    var key = (/** @type {number} */
        goog.events.listen(src, type[i], opt_fn || this,
                           opt_capture || false,
                           opt_handler || this.handler_ || this));
    this.recordListenerKey_(key);
  }

  return this;
};


/**
 * Listen to an event on a DOM node or EventTarget.  If the function is omitted
 * then the EventHandler's handleEvent method will be used. After the event has
 * fired the event listener is removed from the target. If an array of event
 * types is provided, each event type will be listened to once.
 * @param {goog.events.EventTarget|EventTarget} src Event source.
 * @param {string|Array.<string>} type Event type to listen for or array of
 *     event types.
 * @param {Function|Object=} opt_fn Optional callback function to be used as the
 *    listener or an object with handleEvent function.
 * @param {boolean=} opt_capture Optional whether to use capture phase.
 * @param {Object=} opt_handler Object in whose scope to call the listener.
 * @return {goog.events.EventHandler} This object, allowing for chaining of
 *     calls.
 */
goog.events.EventHandler.prototype.listenOnce = function(src, type, opt_fn,
                                                         opt_capture,
                                                         opt_handler) {
  if (goog.isArray(type)) {
    for (var i = 0; i < type.length; i++) {
      this.listenOnce(src, type[i], opt_fn, opt_capture, opt_handler);
    }
  } else {
    var key = (/** @type {number} */
        goog.events.listenOnce(src, type, opt_fn || this,
                               opt_capture || false,
                               opt_handler || this.handler_ || this));
    this.recordListenerKey_(key);
  }

  return this;
};


/**
 * Adds an event listener with a specific event wrapper on a DOM Node or an
 * object that has implemented {@link goog.events.EventTarget}. A listener can
 * only be added once to an object.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to listen to
 *     events on.
 * @param {goog.events.EventWrapper} wrapper Event wrapper to use.
 * @param {Function|Object} listener Callback method, or an object with a
 *     handleEvent function.
 * @param {boolean=} opt_capt Whether to fire in capture phase (defaults to
 *     false).
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 * @return {goog.events.EventHandler} This object, allowing for chaining of
 *     calls.
 */
goog.events.EventHandler.prototype.listenWithWrapper = function(src, wrapper,
    listener, opt_capt, opt_handler) {
  wrapper.listen(src, listener, opt_capt, opt_handler || this.handler_, this);
  return this;
};


/**
 * Record the key returned for the listener so that it can be user later
 * to remove the listener.
 * @param {number} key Unique key for the listener.
 * @private
 */
goog.events.EventHandler.prototype.recordListenerKey_ = function(key) {
  if (this.keys_) {
    // already have multiple keys
    this.keys_[key] = true;
  } else if (this.key_) {
    // going from one key to multiple - must now use object as map
    this.keys_ = goog.events.EventHandler.keyPool_.getObject();
    this.keys_[this.key_] = true;
    this.key_ = null;
    this.keys_[key] = true;
  } else {
    // first key - can use single key
    this.key_ = key;
  }
};


/**
 * Unlistens on an event.
 * @param {goog.events.EventTarget|EventTarget} src Event source.
 * @param {string|Array.<string>} type Event type to listen for.
 * @param {Function|Object=} opt_fn Optional callback function to be used as the
 *    listener or an object with handleEvent function.
 * @param {boolean=} opt_capture Optional whether to use capture phase.
 * @param {Object=} opt_handler Object in whose scope to call the listener.
 * @return {goog.events.EventHandler} This object, allowing for chaining of
 *     calls.
 */
goog.events.EventHandler.prototype.unlisten = function(src, type, opt_fn,
                                                       opt_capture,
                                                       opt_handler) {
  if (this.key_ || this.keys_) {
    if (goog.isArray(type)) {
      for (var i = 0; i < type.length; i++) {
        this.unlisten(src, type[i], opt_fn, opt_capture, opt_handler);
      }
    } else {
      var listener = goog.events.getListener(src, type, opt_fn || this,
          opt_capture || false, opt_handler || this.handler_ || this);

      if (listener) {
        var key = listener.key;
        goog.events.unlistenByKey(key);

        if (this.keys_) {
          goog.object.remove(this.keys_, key);
        } else if (this.key_ == key) {
          this.key_ = null;
        }
      }
    }
  }

  return this;
};


/**
 * Removes an event listener which was added with listenWithWrapper().
 *
 * @param {EventTarget|goog.events.EventTarget} src The target to stop
 *     listening to events on.
 * @param {goog.events.EventWrapper} wrapper Event wrapper to use.
 * @param {Function|Object} listener The listener function to remove.
 * @param {boolean=} opt_capt In DOM-compliant browsers, this determines
 *     whether the listener is fired during the capture or bubble phase of the
 *     event.
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 * @return {goog.events.EventHandler} This object, allowing for chaining of
 *     calls.
 */
goog.events.EventHandler.prototype.unlistenWithWrapper = function(src, wrapper,
    listener, opt_capt, opt_handler) {
  wrapper.unlisten(src, listener, opt_capt, opt_handler || this.handler_, this);
  return this;
};


/**
 * Unlistens to all events.
 */
goog.events.EventHandler.prototype.removeAll = function() {
  if (this.keys_) {
    for (var key in this.keys_) {
      goog.events.unlistenByKey((/** @type {number} */ key));
      // Clean the keys before returning object to the pool.
      delete this.keys_[key];
    }
    goog.events.EventHandler.keyPool_.releaseObject(this.keys_);
    this.keys_ = null;

  } else if (this.key_) {
    goog.events.unlistenByKey(this.key_);
  }
};


/**
 * Disposes of this EventHandler and remove all listeners that it registered.
 */
goog.events.EventHandler.prototype.disposeInternal = function() {
  goog.events.EventHandler.superClass_.disposeInternal.call(this);
  this.removeAll();
};


/**
 * Default event handler
 * @param {goog.events.Event} e Event object.
 */
goog.events.EventHandler.prototype.handleEvent = function(e) {
  throw Error('EventHandler.handleEvent not implemented');
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview JSON utility functions.
 */


goog.provide('goog.json');
goog.provide('goog.json.Serializer');


/**
 * Tests if a string is an invalid JSON string. This only ensures that we are
 * not using any invalid characters
 * @param {string} s The string to test.
 * @return {boolean} True if the input is a valid JSON string.
 * @private
 */
goog.json.isValid_ = function(s) {
  // All empty whitespace is not valid.
  if (/^\s*$/.test(s)) {
    return false;
  }

  // This is taken from http://www.json.org/json2.js which is released to the
  // public domain.
  // Changes: We dissallow \u2028 Line separator and \u2029 Paragraph separator
  // inside strings.  We also treat \u2028 and \u2029 as whitespace which they
  // are in the RFC but IE and Safari does not match \s to these so we need to
  // include them in the reg exps in all places where whitespace is allowed.
  // We allowed \x7f inside strings because some tools don't escape it,
  // e.g. http://www.json.org/java/org/json/JSONObject.java

  // Parsing happens in three stages. In the first stage, we run the text
  // against regular expressions that look for non-JSON patterns. We are
  // especially concerned with '()' and 'new' because they can cause invocation,
  // and '=' because it can cause mutation. But just to be safe, we want to
  // reject all unexpected forms.

  // We split the first stage into 4 regexp operations in order to work around
  // crippling inefficiencies in IE's and Safari's regexp engines. First we
  // replace all backslash pairs with '@' (a non-JSON character). Second, we
  // replace all simple value tokens with ']' characters. Third, we delete all
  // open brackets that follow a colon or comma or that begin the text. Finally,
  // we look to see that the remaining characters are only whitespace or ']' or
  // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

  // Don't make these static since they have the global flag.
  var backslashesRe = /\\["\\\/bfnrtu]/g;
  var simpleValuesRe =
      /"[^"\\\n\r\u2028\u2029\x00-\x08\x10-\x1f\x80-\x9f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
  var openBracketsRe = /(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g;
  var remainderRe = /^[\],:{}\s\u2028\u2029]*$/;

  return remainderRe.test(s.replace(backslashesRe, '@').
      replace(simpleValuesRe, ']').
      replace(openBracketsRe, ''));
};


/**
 * Parses a JSON string and returns the result. This throws an exception if
 * the string is an invalid JSON string.
 *
 * Note that this is very slow on large strings. If you trust the source of
 * the string then you should use unsafeParse instead.
 *
 * @param {*} s The JSON string to parse.
 * @return {Object} The object generated from the JSON string.
 */
goog.json.parse = function(s) {
  var o = String(s);
  if (goog.json.isValid_(o)) {
    /** @preserveTry */
    try {
      return eval('(' + o + ')');
    } catch (ex) {
    }
  }
  throw Error('Invalid JSON string: ' + o);
};


/**
 * Parses a JSON string and returns the result. This uses eval so it is open
 * to security issues and it should only be used if you trust the source.
 *
 * @param {string} s The JSON string to parse.
 * @return {Object} The object generated from the JSON string.
 */
goog.json.unsafeParse = function(s) {
  return eval('(' + s + ')');
};


/**
 * Serializes an object or a value to a JSON string.
 *
 * @param {*} object The object to serialize.
 * @throws Error if there are loops in the object graph.
 * @return {string} A JSON string representation of the input.
 */
goog.json.serialize = function(object) {
  return new goog.json.Serializer().serialize(object);
};



/**
 * Class that is used to serialize JSON objects to a string.
 * @constructor
 */
goog.json.Serializer = function() {
};


/**
 * Serializes an object or a value to a JSON string.
 *
 * @param {*} object The object to serialize.
 * @throws Error if there are loops in the object graph.
 * @return {string} A JSON string representation of the input.
 */
goog.json.Serializer.prototype.serialize = function(object) {
  var sb = [];
  this.serialize_(object, sb);
  return sb.join('');
};


/**
 * Serializes a generic value to a JSON string
 * @private
 * @param {*} object The object to serialize.
 * @param {Array} sb Array used as a string builder.
 * @throws Error if there are loops in the object graph.
 */
goog.json.Serializer.prototype.serialize_ = function(object, sb) {
  switch (typeof object) {
    case 'string':
      this.serializeString_((/** @type {string} */ object), sb);
      break;
    case 'number':
      this.serializeNumber_((/** @type {number} */ object), sb);
      break;
    case 'boolean':
      sb.push(object);
      break;
    case 'undefined':
      sb.push('null');
      break;
    case 'object':
      if (object == null) {
        sb.push('null');
        break;
      }
      if (goog.isArray(object)) {
        this.serializeArray_((/** @type {!Array} */ object), sb);
        break;
      }
      // should we allow new String, new Number and new Boolean to be treated
      // as string, number and boolean? Most implementations do not and the
      // need is not very big
      this.serializeObject_((/** @type {Object} */ object), sb);
      break;
    case 'function':
      // Skip functions.
      // TODO(user) Should we return something here?
      break;
    default:
      throw Error('Unknown type: ' + typeof object);
  }
};


/**
 * Character mappings used internally for goog.string.quote
 * @private
 * @type {Object}
 */
goog.json.Serializer.charToJsonCharCache_ = {
  '\"': '\\"',
  '\\': '\\\\',
  '/': '\\/',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',

  '\x0B': '\\u000b' // '\v' is not supported in JScript
};


/**
 * Regular expression used to match characters that need to be replaced.
 * The S60 browser has a bug where unicode characters are not matched by
 * regular expressions. The condition below detects such behaviour and
 * adjusts the regular expression accordingly.
 * @private
 * @type {RegExp}
 */
goog.json.Serializer.charsToReplace_ = /\uffff/.test('\uffff') ?
    /[\\\"\x00-\x1f\x7f-\uffff]/g : /[\\\"\x00-\x1f\x7f-\xff]/g;


/**
 * Serializes a string to a JSON string
 * @private
 * @param {string} s The string to serialize.
 * @param {Array} sb Array used as a string builder.
 */
goog.json.Serializer.prototype.serializeString_ = function(s, sb) {
  // The official JSON implementation does not work with international
  // characters.
  sb.push('"', s.replace(goog.json.Serializer.charsToReplace_, function(c) {
    // caching the result improves performance by a factor 2-3
    if (c in goog.json.Serializer.charToJsonCharCache_) {
      return goog.json.Serializer.charToJsonCharCache_[c];
    }

    var cc = c.charCodeAt(0);
    var rv = '\\u';
    if (cc < 16) {
      rv += '000';
    } else if (cc < 256) {
      rv += '00';
    } else if (cc < 4096) { // \u1000
      rv += '0';
    }
    return goog.json.Serializer.charToJsonCharCache_[c] = rv + cc.toString(16);
  }), '"');
};


/**
 * Serializes a number to a JSON string
 * @private
 * @param {number} n The number to serialize.
 * @param {Array} sb Array used as a string builder.
 */
goog.json.Serializer.prototype.serializeNumber_ = function(n, sb) {
  sb.push(isFinite(n) && !isNaN(n) ? n : 'null');
};


/**
 * Serializes an array to a JSON string
 * @private
 * @param {Array} arr The array to serialize.
 * @param {Array} sb Array used as a string builder.
 */
goog.json.Serializer.prototype.serializeArray_ = function(arr, sb) {
  var l = arr.length;
  sb.push('[');
  var sep = '';
  for (var i = 0; i < l; i++) {
    sb.push(sep);
    this.serialize_(arr[i], sb);
    sep = ',';
  }
  sb.push(']');
};


/**
 * Serializes an object to a JSON string
 * @private
 * @param {Object} obj The object to serialize.
 * @param {Array} sb Array used as a string builder.
 */
goog.json.Serializer.prototype.serializeObject_ = function(obj, sb) {
  sb.push('{');
  var sep = '';
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      var value = obj[key];
      // Skip functions.
      // TODO(ptucker) Should we return something for function properties?
      if (typeof value != 'function') {
        sb.push(sep);
        this.serializeString_(key, sb);
        sb.push(':');
        this.serialize_(value, sb);
        sep = ',';
      }
    }
  }
  sb.push('}');
};
goog.provide('linktweak.globals');
goog.require('goog.json');

/**
 * Platform identifier.
 * @define {string}
 */
linktweak.globals.PLATFORM = 'unknown';

/**
 * True if the browser is Opera.
 * @type {boolean}
 * @const
 */
linktweak.globals.IS_OPERA =
  linktweak.globals.PLATFORM == 'opera' ||
  (linktweak.globals.PLATFORM == 'unknown' && !!goog.global.opera);

/**
 * True if the browser is Google Chrome.
 * @type {boolean}
 * @const
 */
linktweak.globals.IS_CHROME =
  linktweak.globals.PLATFORM == 'chrome' ||
  (linktweak.globals.PLATFORM == 'unknown' && !goog.global.opera);

/**
 * Version number of setting data.
 * @type {number}
 * @const
 */
linktweak.globals.SETTINGS_VERSION = 1;

/**
 * Local storage name to store settings.
 * @type {string}
 * @const
 */
linktweak.globals.SETTINGS_STORAGE_NAME = 'linktweak_settings';

/**
 * Condition type.
 * @enum {number}
 */
linktweak.globals.ConditionType = {
  LINK_URL_IS_MATCHED_WITH:     0,
  LINK_URL_IS_NOT_MATCHED_WITH: 1,
  PAGE_URL_IS_MATCHED_WITH:     2,
  PAGE_URL_IS_NOT_MATCHED_WITH: 3
};

/**
 * Preset rules.
 * @type {Object.<string, *>}
 * @const
 */
linktweak.globals.Preset = {
  DOCUMENTS: [{
	'pattern': '[^#]+',
	'subst':   'http://docs.google.com/viewer?url=$0',
	'conditions': [{
	  'type':   linktweak.globals.ConditionType.LINK_URL_IS_MATCHED_WITH,
	  'regexp': '^https?://'
	}, {
	  'type':   linktweak.globals.ConditionType.LINK_URL_IS_MATCHED_WITH,
	  'regexp': '\\.(?:pdf|docx?|xlsx?|pptx?|pages|eps|ps|xps)(?:[?#]|$)'
	}]
  }],
  IMAGES: [{
	'pattern': '[^#]+',
	'subst':   'http://docs.google.com/viewer?url=$0',
	'conditions': [{
	  'type':   linktweak.globals.ConditionType.LINK_URL_IS_MATCHED_WITH,
	  'regexp': '^https?://'
	}, {
	  'type':   linktweak.globals.ConditionType.LINK_URL_IS_MATCHED_WITH,
	  'regexp': '\\.(?:ai|psd|tiff?|dxf|ttf)(?:[?#]|$)'
	}]
  }],
  MAPS: [{
	'pattern': '([\\?&])hl=\\w+',
	'subst':   '$1hl={lang}',
	'conditions': [{
	  'type':   linktweak.globals.ConditionType.LINK_URL_IS_MATCHED_WITH,
	  'regexp': '^https?://maps\.google\.[^/]+/maps'
	}, {
	  'type':   linktweak.globals.ConditionType.PAGE_URL_IS_MATCHED_WITH,
	  'regexp': '^https?://www\.google\.com/calendar'
	}]
  }]
};

/**
 * Generates rewrite rules from preset flags.
 * @param {Object} presets Preset flags.
 * @return {Array.<Object>} Rewrite rules.
 */
linktweak.globals.generatePresetRules = function(presets) {
  var rules = [];
  if(presets['documents']) {
	rules = rules.concat(linktweak.globals.Preset.DOCUMENTS);
  }
  if(presets['images']) {
	rules = rules.concat(linktweak.globals.Preset.IMAGES);
  }
  if(presets['maps']) {
	var tmpl = linktweak.globals.Preset.MAPS[0];
	rules.push({
	  'pattern':    tmpl['pattern'],
	  'subst':      tmpl['subst'].replace('{lang}', presets['maps_lang']||''),
	  'conditions': tmpl['conditions']
	});
  }
  return rules;
};

/**
 * Load settings from local storage.
 * @return {Object} A JSON form object that contains settings.
 */
linktweak.globals.loadSettings = function() {
  var settings = null;
  try {
	settings = goog.json.parse(localStorage[linktweak.globals.SETTINGS_STORAGE_NAME]);
  }catch(e) {}
  if(!settings) {
	try{
	  settings = linktweak.globals.convertSettingsV0(
		goog.json.parse(localStorage['rewriterules'] || ''));
	}catch(e) {}
  }

  return settings || {};
};

/**
 * Convert settings to recent version from version 0.
 * @param {Object} oldData A older setting data.
 * @return {Object} A setting data in recent format.
 */
linktweak.globals.convertSettingsV0 = function(oldData) {
  var rules = [], rule;
  if(goog.isArrayLike(oldData)) {
	for(var i = 0 ; i < oldData.length ; ++i) {
	  rule = oldData[i];
	  if(rule && rule['cond'] && rule['from']) {
		rules[rules.length] = {
		  'pattern': rule['from'],
		  'subst':   rule['to'] || '',
		  'conditions':[{
			'type':   linktweak.globals.ConditionType.LINK_URL_IS_MATCHED_WITH,
			'regexp': rule['cond']
		  }]
		};
	  }
	}
  }
  return {
	'version': linktweak.globals.SETTINGS_VERSION,
	'presets': {},
	'rules':   rules
  };
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for adding, removing and setting classes.
 *
 */


goog.provide('goog.dom.classes');

goog.require('goog.array');


/**
 * Sets the entire class name of an element.
 * @param {Node} element DOM node to set class of.
 * @param {string} className Class name(s) to apply to element.
 */
goog.dom.classes.set = function(element, className) {
  element.className = className;
};


/**
 * Gets an array of class names on an element
 * @param {Node} element DOM node to get class of.
 * @return {Array} Class names on {@code element}.
 */
goog.dom.classes.get = function(element) {
  var className = element.className;
  // Some types of elements don't have a className in IE (e.g. iframes).
  // Furthermore, in Firefox, className is not a string when the element is
  // an SVG element.
  return className && typeof className.split == 'function' ?
      className.split(/\s+/) : [];
};


/**
 * Adds a class or classes to an element. Does not add multiples of class names.
 * @param {Node} element DOM node to add class to.
 * @param {...string} var_args Class names to add.
 * @return {boolean} Whether class was added (or all classes were added).
 */
goog.dom.classes.add = function(element, var_args) {
  var classes = goog.dom.classes.get(element);
  var args = goog.array.slice(arguments, 1);

  var b = goog.dom.classes.add_(classes, args);
  element.className = classes.join(' ');

  return b;
};


/**
 * Removes a class or classes from an element.
 * @param {Node} element DOM node to remove class from.
 * @param {...string} var_args Class name(s) to remove.
 * @return {boolean} Whether all classes in {@code var_args} were found and
 *     removed.
 */
goog.dom.classes.remove = function(element, var_args) {
  var classes = goog.dom.classes.get(element);
  var args = goog.array.slice(arguments, 1);

  var b = goog.dom.classes.remove_(classes, args);
  element.className = classes.join(' ');

  return b;
};


/**
 * Helper method for {@link goog.dom.classes.add} and
 * {@link goog.dom.classes.addRemove}. Adds one or more classes to the supplied
 * classes array.
 * @param {Array.<string>} classes All class names for the element, will be
 *     updated to have the classes supplied in {@code args} added.
 * @param {Array.<string>} args Class names to add.
 * @return {boolean} Whether all classes in were added.
 * @private
 */
goog.dom.classes.add_ = function(classes, args) {
  var rv = 0;
  for (var i = 0; i < args.length; i++) {
    if (!goog.array.contains(classes, args[i])) {
      classes.push(args[i]);
      rv++;
    }
  }
  return rv == args.length;
};


/**
 * Helper method for {@link goog.dom.classes.remove} and
 * {@link goog.dom.classes.addRemove}. Removes one or more classes from the
 * supplied classes array.
 * @param {Array.<string>} classes All class names for the element, will be
 *     updated to have the classes supplied in {@code args} removed.
 * @param {Array.<string>} args Class names to remove.
 * @return {boolean} Whether all classes in were found and removed.
 * @private
 */
goog.dom.classes.remove_ = function(classes, args) {
  var rv = 0;
  for (var i = 0; i < classes.length; i++) {
    if (goog.array.contains(args, classes[i])) {
      goog.array.splice(classes, i--, 1);
      rv++;
    }
  }
  return rv == args.length;
};


/**
 * Switches a class on an element from one to another without disturbing other
 * classes. If the fromClass isn't removed, the toClass won't be added.
 * @param {Node} element DOM node to swap classes on.
 * @param {string} fromClass Class to remove.
 * @param {string} toClass Class to add.
 * @return {boolean} Whether classes were switched.
 */
goog.dom.classes.swap = function(element, fromClass, toClass) {
  var classes = goog.dom.classes.get(element);

  var removed = false;
  for (var i = 0; i < classes.length; i++) {
    if (classes[i] == fromClass) {
      goog.array.splice(classes, i--, 1);
      removed = true;
    }
  }

  if (removed) {
    classes.push(toClass);
    element.className = classes.join(' ');
  }

  return removed;
};


/**
 * Adds zero or more classes to an element and removes zero or more as a single
 * operation. Unlike calling {@link goog.dom.classes.add} and
 * {@link goog.dom.classes.remove} separately, this is more efficient as it only
 * parses the class property once.
 *
 * If a class is in both the remove and add lists, it will be added. Thus,
 * you can use this instead of {@link goog.dom.classes.swap} when you have
 * more than two class names that you want to swap.
 *
 * @param {Node} element DOM node to swap classes on.
 * @param {string|Array.<string>|null} classesToRemove Class or classes to
 *     remove, if null no classes are removed.
 * @param {string|Array.<string>|null} classesToAdd Class or classes to add, if
 *     null no classes are added.
 */
goog.dom.classes.addRemove = function(element, classesToRemove, classesToAdd) {
  var classes = goog.dom.classes.get(element);
  if (goog.isString(classesToRemove)) {
    goog.array.remove(classes, classesToRemove);
  } else if (goog.isArray(classesToRemove)) {
    goog.dom.classes.remove_(classes, classesToRemove);
  }

  if (goog.isString(classesToAdd) &&
      !goog.array.contains(classes, classesToAdd)) {
    classes.push(classesToAdd);
  } else if (goog.isArray(classesToAdd)) {
    goog.dom.classes.add_(classes, classesToAdd);
  }

  element.className = classes.join(' ');
};


/**
 * Returns true if an element has a class.
 * @param {Node} element DOM node to test.
 * @param {string} className Class name to test for.
 * @return {boolean} Whether element has the class.
 */
goog.dom.classes.has = function(element, className) {
  return goog.array.contains(goog.dom.classes.get(element), className);
};


/**
 * Adds or removes a class depending on the enabled argument.
 * @param {Node} element DOM node to add or remove the class on.
 * @param {string} className Class name to add or remove.
 * @param {boolean} enabled Whether to add or remove the class (true adds,
 *     false removes).
 */
goog.dom.classes.enable = function(element, className, enabled) {
  if (enabled) {
    goog.dom.classes.add(element, className);
  } else {
    goog.dom.classes.remove(element, className);
  }
};


/**
 * Removes a class if an element has it, and adds it the element doesn't have
 * it.  Won't affect other classes on the node.
 * @param {Node} element DOM node to toggle class on.
 * @param {string} className Class to toggle.
 * @return {boolean} True if class was added, false if it was removed
 *     (in other words, whether element has the class after this function has
 *     been called).
 */
goog.dom.classes.toggle = function(element, className) {
  var add = !goog.dom.classes.has(element, className);
  goog.dom.classes.enable(element, className, add);
  return add;
};
// Copyright 2007 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines the goog.dom.TagName enum.  This enumerates
 * all html tag names specified by the W3C HTML 4.01 Specification.
 * Reference http://www.w3.org/TR/html401/index/elements.html.
 */
goog.provide('goog.dom.TagName');


/**
 * Enum of all html tag names specified by the W3C HTML 4.01 Specification.
 * Reference http://www.w3.org/TR/html401/index/elements.html
 * @enum {string}
 */
goog.dom.TagName = {
  A: 'A',
  ABBR: 'ABBR',
  ACRONYM: 'ACRONYM',
  ADDRESS: 'ADDRESS',
  APPLET: 'APPLET',
  AREA: 'AREA',
  B: 'B',
  BASE: 'BASE',
  BASEFONT: 'BASEFONT',
  BDO: 'BDO',
  BIG: 'BIG',
  BLOCKQUOTE: 'BLOCKQUOTE',
  BODY: 'BODY',
  BR: 'BR',
  BUTTON: 'BUTTON',
  CANVAS: 'CANVAS',
  CAPTION: 'CAPTION',
  CENTER: 'CENTER',
  CITE: 'CITE',
  CODE: 'CODE',
  COL: 'COL',
  COLGROUP: 'COLGROUP',
  DD: 'DD',
  DEL: 'DEL',
  DFN: 'DFN',
  DIR: 'DIR',
  DIV: 'DIV',
  DL: 'DL',
  DT: 'DT',
  EM: 'EM',
  FIELDSET: 'FIELDSET',
  FONT: 'FONT',
  FORM: 'FORM',
  FRAME: 'FRAME',
  FRAMESET: 'FRAMESET',
  H1: 'H1',
  H2: 'H2',
  H3: 'H3',
  H4: 'H4',
  H5: 'H5',
  H6: 'H6',
  HEAD: 'HEAD',
  HR: 'HR',
  HTML: 'HTML',
  I: 'I',
  IFRAME: 'IFRAME',
  IMG: 'IMG',
  INPUT: 'INPUT',
  INS: 'INS',
  ISINDEX: 'ISINDEX',
  KBD: 'KBD',
  LABEL: 'LABEL',
  LEGEND: 'LEGEND',
  LI: 'LI',
  LINK: 'LINK',
  MAP: 'MAP',
  MENU: 'MENU',
  META: 'META',
  NOFRAMES: 'NOFRAMES',
  NOSCRIPT: 'NOSCRIPT',
  OBJECT: 'OBJECT',
  OL: 'OL',
  OPTGROUP: 'OPTGROUP',
  OPTION: 'OPTION',
  P: 'P',
  PARAM: 'PARAM',
  PRE: 'PRE',
  Q: 'Q',
  S: 'S',
  SAMP: 'SAMP',
  SCRIPT: 'SCRIPT',
  SELECT: 'SELECT',
  SMALL: 'SMALL',
  SPAN: 'SPAN',
  STRIKE: 'STRIKE',
  STRONG: 'STRONG',
  STYLE: 'STYLE',
  SUB: 'SUB',
  SUP: 'SUP',
  TABLE: 'TABLE',
  TBODY: 'TBODY',
  TD: 'TD',
  TEXTAREA: 'TEXTAREA',
  TFOOT: 'TFOOT',
  TH: 'TH',
  THEAD: 'THEAD',
  TITLE: 'TITLE',
  TR: 'TR',
  TT: 'TT',
  U: 'U',
  UL: 'UL',
  VAR: 'VAR'
};
// Copyright 2007 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A utility class for representing two-dimensional sizes.
 */


goog.provide('goog.math.Size');



/**
 * Class for representing sizes consisting of a width and height. Undefined
 * width and height support is deprecated and results in compiler warning.
 * @param {number} width Width.
 * @param {number} height Height.
 * @constructor
 */
goog.math.Size = function(width, height) {
  /**
   * Width
   * @type {number}
   */
  this.width = width;

  /**
   * Height
   * @type {number}
   */
  this.height = height;
};


/**
 * Compares sizes for equality.
 * @param {goog.math.Size} a A Size.
 * @param {goog.math.Size} b A Size.
 * @return {boolean} True iff the sizes have equal widths and equal
 *     heights, or if both are null.
 */
goog.math.Size.equals = function(a, b) {
  if (a == b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.width == b.width && a.height == b.height;
};


/**
 * @return {!goog.math.Size} A new copy of the Size.
 */
goog.math.Size.prototype.clone = function() {
  return new goog.math.Size(this.width, this.height);
};


if (goog.DEBUG) {
  /**
   * Returns a nice string representing size.
   * @return {string} In the form (50 x 73).
   */
  goog.math.Size.prototype.toString = function() {
    return '(' + this.width + ' x ' + this.height + ')';
  };
}


/**
 * @return {number} The longer of the two dimensions in the size.
 */
goog.math.Size.prototype.getLongest = function() {
  return Math.max(this.width, this.height);
};


/**
 * @return {number} The shorter of the two dimensions in the size.
 */
goog.math.Size.prototype.getShortest = function() {
  return Math.min(this.width, this.height);
};


/**
 * @return {number} The area of the size (width * height).
 */
goog.math.Size.prototype.area = function() {
  return this.width * this.height;
};


/**
 * @return {number} The perimeter of the size (width + height) * 2.
 */
goog.math.Size.prototype.perimeter = function() {
  return (this.width + this.height) * 2;
};


/**
 * @return {number} The ratio of the size's width to its height.
 */
goog.math.Size.prototype.aspectRatio = function() {
  return this.width / this.height;
};


/**
 * @return {boolean} True if the size has zero area, false if both dimensions
 *     are non-zero numbers.
 */
goog.math.Size.prototype.isEmpty = function() {
  return !this.area();
};


/**
 * Clamps the width and height parameters upward to integer values.
 * @return {!goog.math.Size} This size with ceil'd components.
 */
goog.math.Size.prototype.ceil = function() {
  this.width = Math.ceil(this.width);
  this.height = Math.ceil(this.height);
  return this;
};


/**
 * @param {!goog.math.Size} target The target size.
 * @return {boolean} True if this Size is the same size or smaller than the
 *     target size in both dimensions.
 */
goog.math.Size.prototype.fitsInside = function(target) {
  return this.width <= target.width && this.height <= target.height;
};


/**
 * Clamps the width and height parameters downward to integer values.
 * @return {!goog.math.Size} This size with floored components.
 */
goog.math.Size.prototype.floor = function() {
  this.width = Math.floor(this.width);
  this.height = Math.floor(this.height);
  return this;
};


/**
 * Rounds the width and height parameters to integer values.
 * @return {!goog.math.Size} This size with rounded components.
 */
goog.math.Size.prototype.round = function() {
  this.width = Math.round(this.width);
  this.height = Math.round(this.height);
  return this;
};


/**
 * Scales the size uniformly by a factor.
 * @param {number} s The scale factor.
 * @return {!goog.math.Size} This Size object after scaling.
 */
goog.math.Size.prototype.scale = function(s) {
  this.width *= s;
  this.height *= s;
  return this;
};


/**
 * Uniformly scales the size to fit inside the dimensions of a given size. The
 * original aspect ratio will be preserved.
 *
 * This function assumes that both Sizes contain strictly positive dimensions.
 * @param {!goog.math.Size} target The target size.
 * @return {!goog.math.Size} This Size object, after optional scaling.
 */
goog.math.Size.prototype.scaleToFit = function(target) {
  var s = this.aspectRatio() > target.aspectRatio() ?
      target.width / this.width :
      target.height / this.height;

  return this.scale(s);
};
// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Browser capability checks for the dom package.
 *
 */


goog.provide('goog.dom.BrowserFeature');

goog.require('goog.userAgent');


/**
 * Enum of browser capabilities.
 * @enum {boolean}
 */
goog.dom.BrowserFeature = {
  /**
   * Whether attributes 'name' and 'type' can be added to an element after it's
   * created. False in Internet Explorer prior to version 9.
   */
  CAN_ADD_NAME_OR_TYPE_ATTRIBUTES: !goog.userAgent.IE ||
      goog.userAgent.isVersion('9'),

  /**
   * Whether we can use element.children to access an element's Element
   * children. Available since Gecko 1.9.1, IE 9. (IE<9 also includes comment
   * nodes in the collection.)
   */
  CAN_USE_CHILDREN_ATTRIBUTE: !goog.userAgent.GECKO && !goog.userAgent.IE ||
      goog.userAgent.IE && goog.userAgent.isVersion('9') ||
      goog.userAgent.GECKO && goog.userAgent.isVersion('1.9.1'),

  /**
   * Opera, Safari 3, and Internet Explorer 9 all support innerText but they
   * include text nodes in script and style tags.
   */
  CAN_USE_INNER_TEXT: goog.userAgent.IE && !goog.userAgent.isVersion('9'),

  /**
   * Whether NoScope elements need a scoped element written before them in
   * innerHTML.
   * MSDN: http://msdn.microsoft.com/en-us/library/ms533897(VS.85).aspx#1
   */
  INNER_HTML_NEEDS_SCOPED_ELEMENT: goog.userAgent.IE
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A utility class for representing two-dimensional positions.
 */


goog.provide('goog.math.Coordinate');



/**
 * Class for representing coordinates and positions.
 * @param {number=} opt_x Left, defaults to 0.
 * @param {number=} opt_y Top, defaults to 0.
 * @constructor
 */
goog.math.Coordinate = function(opt_x, opt_y) {
  /**
   * X-value
   * @type {number}
   */
  this.x = goog.isDef(opt_x) ? opt_x : 0;

  /**
   * Y-value
   * @type {number}
   */
  this.y = goog.isDef(opt_y) ? opt_y : 0;
};


/**
 * Returns a new copy of the coordinate.
 * @return {!goog.math.Coordinate} A clone of this coordinate.
 */
goog.math.Coordinate.prototype.clone = function() {
  return new goog.math.Coordinate(this.x, this.y);
};


if (goog.DEBUG) {
  /**
   * Returns a nice string representing the coordinate.
   * @return {string} In the form (50, 73).
   */
  goog.math.Coordinate.prototype.toString = function() {
    return '(' + this.x + ', ' + this.y + ')';
  };
}


/**
 * Compares coordinates for equality.
 * @param {goog.math.Coordinate} a A Coordinate.
 * @param {goog.math.Coordinate} b A Coordinate.
 * @return {boolean} True iff the coordinates are equal, or if both are null.
 */
goog.math.Coordinate.equals = function(a, b) {
  if (a == b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.x == b.x && a.y == b.y;
};


/**
 * Returns the distance between two coordinates.
 * @param {!goog.math.Coordinate} a A Coordinate.
 * @param {!goog.math.Coordinate} b A Coordinate.
 * @return {number} The distance between {@code a} and {@code b}.
 */
goog.math.Coordinate.distance = function(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};


/**
 * Returns the squared distance between two coordinates. Squared distances can
 * be used for comparisons when the actual value is not required.
 *
 * Performance note: eliminating the square root is an optimization often used
 * in lower-level languages, but the speed difference is not nearly as
 * pronounced in JavaScript (only a few percent.)
 *
 * @param {!goog.math.Coordinate} a A Coordinate.
 * @param {!goog.math.Coordinate} b A Coordinate.
 * @return {number} The squared distance between {@code a} and {@code b}.
 */
goog.math.Coordinate.squaredDistance = function(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return dx * dx + dy * dy;
};


/**
 * Returns the difference between two coordinates as a new
 * goog.math.Coordinate.
 * @param {!goog.math.Coordinate} a A Coordinate.
 * @param {!goog.math.Coordinate} b A Coordinate.
 * @return {!goog.math.Coordinate} A Coordinate representing the difference
 *     between {@code a} and {@code b}.
 */
goog.math.Coordinate.difference = function(a, b) {
  return new goog.math.Coordinate(a.x - b.x, a.y - b.y);
};


/**
 * Returns the sum of two coordinates as a new goog.math.Coordinate.
 * @param {!goog.math.Coordinate} a A Coordinate.
 * @param {!goog.math.Coordinate} b A Coordinate.
 * @return {!goog.math.Coordinate} A Coordinate representing the sum of the two
 *     coordinates.
 */
goog.math.Coordinate.sum = function(a, b) {
  return new goog.math.Coordinate(a.x + b.x, a.y + b.y);
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for manipulating the browser's Document Object Model
 * Inspiration taken *heavily* from mochikit (http://mochikit.com/).
 *
 * You can use {@link goog.dom.DomHelper} to create new dom helpers that refer
 * to a different document object.  This is useful if you are working with
 * frames or multiple windows.
 *
 */


// TODO(user): Rename/refactor getTextContent and getRawTextContent. The problem
// is that getTextContent should mimic the DOM3 textContent. We should add a
// getInnerText (or getText) which tries to return the visible text, innerText.


goog.provide('goog.dom');
goog.provide('goog.dom.DomHelper');
goog.provide('goog.dom.NodeType');

goog.require('goog.array');
goog.require('goog.dom.BrowserFeature');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classes');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.userAgent');


/**
 * @define {boolean} Whether we know at compile time that the browser is in
 * quirks mode.
 */
goog.dom.ASSUME_QUIRKS_MODE = false;


/**
 * @define {boolean} Whether we know at compile time that the browser is in
 * standards compliance mode.
 */
goog.dom.ASSUME_STANDARDS_MODE = false;


/**
 * Whether we know the compatibility mode at compile time.
 * @type {boolean}
 * @private
 */
goog.dom.COMPAT_MODE_KNOWN_ =
    goog.dom.ASSUME_QUIRKS_MODE || goog.dom.ASSUME_STANDARDS_MODE;


/**
 * Enumeration for DOM node types (for reference)
 * @enum {number}
 */
goog.dom.NodeType = {
  ELEMENT: 1,
  ATTRIBUTE: 2,
  TEXT: 3,
  CDATA_SECTION: 4,
  ENTITY_REFERENCE: 5,
  ENTITY: 6,
  PROCESSING_INSTRUCTION: 7,
  COMMENT: 8,
  DOCUMENT: 9,
  DOCUMENT_TYPE: 10,
  DOCUMENT_FRAGMENT: 11,
  NOTATION: 12
};


/**
 * Gets the DomHelper object for the document where the element resides.
 * @param {Node|Window=} opt_element If present, gets the DomHelper for this
 *     element.
 * @return {!goog.dom.DomHelper} The DomHelper.
 */
goog.dom.getDomHelper = function(opt_element) {
  return opt_element ?
      new goog.dom.DomHelper(goog.dom.getOwnerDocument(opt_element)) :
      (goog.dom.defaultDomHelper_ ||
          (goog.dom.defaultDomHelper_ = new goog.dom.DomHelper()));
};


/**
 * Cached default DOM helper.
 * @type {goog.dom.DomHelper}
 * @private
 */
goog.dom.defaultDomHelper_;


/**
 * Gets the document object being used by the dom library.
 * @return {!Document} Document object.
 */
goog.dom.getDocument = function() {
  return document;
};


/**
 * Alias for getElementById. If a DOM node is passed in then we just return
 * that.
 * @param {string|Element} element Element ID or a DOM node.
 * @return {Element} The element with the given ID, or the node passed in.
 */
goog.dom.getElement = function(element) {
  return goog.isString(element) ?
      document.getElementById(element) : element;
};


/**
 * Alias for getElement.
 * @param {string|Element} element Element ID or a DOM node.
 * @return {Element} The element with the given ID, or the node passed in.
 * @deprecated Use {@link goog.dom.getElement} instead.
 */
goog.dom.$ = goog.dom.getElement;


/**
 * Looks up elements by both tag and class name, using browser native functions
 * ({@code querySelectorAll}, {@code getElementsByTagName} or
 * {@code getElementsByClassName}) where possible. This function
 * is a useful, if limited, way of collecting a list of DOM elements
 * with certain characteristics.  {@code goog.dom.query} offers a
 * more powerful and general solution which allows matching on CSS3
 * selector expressions, but at increased cost in code size. If all you
 * need is particular tags belonging to a single class, this function
 * is fast and sleek.
 *
 * @see {goog.dom.query}
 *
 * @param {?string=} opt_tag Element tag name.
 * @param {?string=} opt_class Optional class name.
 * @param {Document|Element=} opt_el Optional element to look in.
 * @return { {length: number} } Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 */
goog.dom.getElementsByTagNameAndClass = function(opt_tag, opt_class, opt_el) {
  return goog.dom.getElementsByTagNameAndClass_(document, opt_tag, opt_class,
                                                opt_el);
};


/**
 * Returns an array of all the elements with the provided className.
 * @see {goog.dom.query}
 * @param {!string} className the name of the class to look for.
 * @param {Document|Element=} opt_el Optional element to look in.
 * @return { {length: number} } The items found with the class name provided.
 */
goog.dom.getElementsByClass = function(className, opt_el) {
  var parent = opt_el || document;
  if (goog.dom.canUseQuerySelector_(parent)) {
    return parent.querySelectorAll('.' + className);
  } else if (parent.getElementsByClassName) {
    return parent.getElementsByClassName(className);
  }
  return goog.dom.getElementsByTagNameAndClass_(
      document, '*', className, opt_el);
};


/**
 * Returns the first element with the provided className.
 * @see {goog.dom.query}
 * @param {!string} className the name of the class to look for.
 * @param {Element|Document=} opt_el Optional element to look in.
 * @return {Element} The first item with the class name provided.
 */
goog.dom.getElementByClass = function(className, opt_el) {
  var parent = opt_el || document;
  var retVal = null;
  if (goog.dom.canUseQuerySelector_(parent)) {
    retVal = parent.querySelector('.' + className);
  } else {
    retVal = goog.dom.getElementsByClass(className, opt_el)[0];
  }
  return retVal || null;
};


/**
 * Prefer the standardized (http://www.w3.org/TR/selectors-api/), native and
 * fast W3C Selectors API. However, the version of WebKit that shipped with
 * Safari 3.1 and Chrome has a bug where it will not correctly match mixed-
 * case class name selectors in quirks mode.
 * @param {!Element|Document} parent The parent document object.
 * @return {boolean} whether or not we can use parent.querySelector* APIs.
 * @private
 */
goog.dom.canUseQuerySelector_ = function(parent) {
  return parent.querySelectorAll &&
         parent.querySelector &&
         (!goog.userAgent.WEBKIT || goog.dom.isCss1CompatMode_(document) ||
          goog.userAgent.isVersion('528'));
};


/**
 * Helper for {@code getElementsByTagNameAndClass}.
 * @param {!Document} doc The document to get the elements in.
 * @param {?string=} opt_tag Element tag name.
 * @param {?string=} opt_class Optional class name.
 * @param {Document|Element=} opt_el Optional element to look in.
 * @return { {length: number} } Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 * @private
 */
goog.dom.getElementsByTagNameAndClass_ = function(doc, opt_tag, opt_class,
                                                  opt_el) {
  var parent = opt_el || doc;
  var tagName = (opt_tag && opt_tag != '*') ? opt_tag.toUpperCase() : '';

  if (goog.dom.canUseQuerySelector_(parent) &&
      (tagName || opt_class)) {
    var query = tagName + (opt_class ? '.' + opt_class : '');
    return parent.querySelectorAll(query);
  }

  // Use the native getElementsByClassName if available, under the assumption
  // that even when the tag name is specified, there will be fewer elements to
  // filter through when going by class than by tag name
  if (opt_class && parent.getElementsByClassName) {
    var els = parent.getElementsByClassName(opt_class);

    if (tagName) {
      var arrayLike = {};
      var len = 0;

      // Filter for specific tags if requested.
      for (var i = 0, el; el = els[i]; i++) {
        if (tagName == el.nodeName) {
          arrayLike[len++] = el;
        }
      }
      arrayLike.length = len;

      return arrayLike;
    } else {
      return els;
    }
  }

  var els = parent.getElementsByTagName(tagName || '*');

  if (opt_class) {
    var arrayLike = {};
    var len = 0;
    for (var i = 0, el; el = els[i]; i++) {
      var className = el.className;
      // Check if className has a split function since SVG className does not.
      if (typeof className.split == 'function' &&
          goog.array.contains(className.split(/\s+/), opt_class)) {
        arrayLike[len++] = el;
      }
    }
    arrayLike.length = len;
    return arrayLike;
  } else {
    return els;
  }
};


/**
 * Alias for {@code getElementsByTagNameAndClass}.
 * @param {?string=} opt_tag Element tag name.
 * @param {?string=} opt_class Optional class name.
 * @param {Element=} opt_el Optional element to look in.
 * @return { {length: number} } Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 * @deprecated Use {@link goog.dom.getElementsByTagNameAndClass} instead.
 */
goog.dom.$$ = goog.dom.getElementsByTagNameAndClass;


/**
 * Sets multiple properties on a node.
 * @param {Element} element DOM node to set properties on.
 * @param {Object} properties Hash of property:value pairs.
 */
goog.dom.setProperties = function(element, properties) {
  goog.object.forEach(properties, function(val, key) {
    if (key == 'style') {
      element.style.cssText = val;
    } else if (key == 'class') {
      element.className = val;
    } else if (key == 'for') {
      element.htmlFor = val;
    } else if (key in goog.dom.DIRECT_ATTRIBUTE_MAP_) {
      element.setAttribute(goog.dom.DIRECT_ATTRIBUTE_MAP_[key], val);
    } else {
      element[key] = val;
    }
  });
};


/**
 * Map of attributes that should be set using
 * element.setAttribute(key, val) instead of element[key] = val.  Used
 * by goog.dom.setProperties.
 *
 * @type {Object}
 * @private
 */
goog.dom.DIRECT_ATTRIBUTE_MAP_ = {
  'cellpadding': 'cellPadding',
  'cellspacing': 'cellSpacing',
  'colspan': 'colSpan',
  'rowspan': 'rowSpan',
  'valign': 'vAlign',
  'height': 'height',
  'width': 'width',
  'usemap': 'useMap',
  'frameborder': 'frameBorder',
  'maxlength': 'maxLength',
  'type': 'type'
};


/**
 * Gets the dimensions of the viewport.
 *
 * Gecko Standards mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Width of viewport including scrollbar.
 * body.clientWidth   Width of body element.
 *
 * docEl.clientHeight Height of viewport excluding scrollbar.
 * win.innerHeight    Height of viewport including scrollbar.
 * body.clientHeight  Height of document.
 *
 * Gecko Backwards compatible mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Width of viewport including scrollbar.
 * body.clientWidth   Width of viewport excluding scrollbar.
 *
 * docEl.clientHeight Height of document.
 * win.innerHeight    Height of viewport including scrollbar.
 * body.clientHeight  Height of viewport excluding scrollbar.
 *
 * IE6/7 Standards mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Undefined.
 * body.clientWidth   Width of body element.
 *
 * docEl.clientHeight Height of viewport excluding scrollbar.
 * win.innerHeight    Undefined.
 * body.clientHeight  Height of document element.
 *
 * IE5 + IE6/7 Backwards compatible mode:
 * docEl.clientWidth  0.
 * win.innerWidth     Undefined.
 * body.clientWidth   Width of viewport excluding scrollbar.
 *
 * docEl.clientHeight 0.
 * win.innerHeight    Undefined.
 * body.clientHeight  Height of viewport excluding scrollbar.
 *
 * Opera 9 Standards and backwards compatible mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Width of viewport including scrollbar.
 * body.clientWidth   Width of viewport excluding scrollbar.
 *
 * docEl.clientHeight Height of document.
 * win.innerHeight    Height of viewport including scrollbar.
 * body.clientHeight  Height of viewport excluding scrollbar.
 *
 * WebKit:
 * Safari 2
 * docEl.clientHeight Same as scrollHeight.
 * docEl.clientWidth  Same as innerWidth.
 * win.innerWidth     Width of viewport excluding scrollbar.
 * win.innerHeight    Height of the viewport including scrollbar.
 * frame.innerHeight  Height of the viewport exluding scrollbar.
 *
 * Safari 3 (tested in 522)
 *
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * docEl.clientHeight Height of viewport excluding scrollbar in strict mode.
 * body.clientHeight  Height of viewport excluding scrollbar in quirks mode.
 *
 * @param {Window=} opt_window Optional window element to test.
 * @return {!goog.math.Size} Object with values 'width' and 'height'.
 */
goog.dom.getViewportSize = function(opt_window) {
  // TODO(user): This should not take an argument
  return goog.dom.getViewportSize_(opt_window || window);
};


/**
 * Helper for {@code getViewportSize}.
 * @param {Window} win The window to get the view port size for.
 * @return {!goog.math.Size} Object with values 'width' and 'height'.
 * @private
 */
goog.dom.getViewportSize_ = function(win) {
  var doc = win.document;

  if (goog.userAgent.WEBKIT && !goog.userAgent.isVersion('500') &&
      !goog.userAgent.MOBILE) {
    // TODO(user): Sometimes we get something that isn't a valid window
    // object. In this case we just revert to the current window. We need to
    // figure out when this happens and find a real fix for it.
    // See the comments on goog.dom.getWindow.
    if (typeof win.innerHeight == 'undefined') {
      win = window;
    }
    var innerHeight = win.innerHeight;
    var scrollHeight = win.document.documentElement.scrollHeight;

    if (win == win.top) {
      if (scrollHeight < innerHeight) {
        innerHeight -= 15; // Scrollbars are 15px wide on Mac
      }
    }
    return new goog.math.Size(win.innerWidth, innerHeight);
  }

  var el = goog.dom.isCss1CompatMode_(doc) ? doc.documentElement : doc.body;

  return new goog.math.Size(el.clientWidth, el.clientHeight);
};


/**
 * Calculates the height of the document.
 *
 * @return {number} The height of the current document.
 */
goog.dom.getDocumentHeight = function() {
  return goog.dom.getDocumentHeight_(window);
};


/**
 * Calculates the height of the document of the given window.
 *
 * Function code copied from the opensocial gadget api:
 *   gadgets.window.adjustHeight(opt_height)
 *
 * @private
 * @param {Window} win The window whose document height to retrieve.
 * @return {number} The height of the document of the given window.
 */
goog.dom.getDocumentHeight_ = function(win) {
  // NOTE(user): This method will return the window size rather than the document
  // size in webkit quirks mode.
  var doc = win.document;
  var height = 0;

  if (doc) {
    // Calculating inner content height is hard and different between
    // browsers rendering in Strict vs. Quirks mode.  We use a combination of
    // three properties within document.body and document.documentElement:
    // - scrollHeight
    // - offsetHeight
    // - clientHeight
    // These values differ significantly between browsers and rendering modes.
    // But there are patterns.  It just takes a lot of time and persistence
    // to figure out.

    // Get the height of the viewport
    var vh = goog.dom.getViewportSize_(win).height;
    var body = doc.body;
    var docEl = doc.documentElement;
    if (goog.dom.isCss1CompatMode_(doc) && docEl.scrollHeight) {
      // In Strict mode:
      // The inner content height is contained in either:
      //    document.documentElement.scrollHeight
      //    document.documentElement.offsetHeight
      // Based on studying the values output by different browsers,
      // use the value that's NOT equal to the viewport height found above.
      height = docEl.scrollHeight != vh ?
          docEl.scrollHeight : docEl.offsetHeight;
    } else {
      // In Quirks mode:
      // documentElement.clientHeight is equal to documentElement.offsetHeight
      // except in IE.  In most browsers, document.documentElement can be used
      // to calculate the inner content height.
      // However, in other browsers (e.g. IE), document.body must be used
      // instead.  How do we know which one to use?
      // If document.documentElement.clientHeight does NOT equal
      // document.documentElement.offsetHeight, then use document.body.
      var sh = docEl.scrollHeight;
      var oh = docEl.offsetHeight;
      if (docEl.clientHeight != oh) {
        sh = body.scrollHeight;
        oh = body.offsetHeight;
      }

      // Detect whether the inner content height is bigger or smaller
      // than the bounding box (viewport).  If bigger, take the larger
      // value.  If smaller, take the smaller value.
      if (sh > vh) {
        // Content is larger
        height = sh > oh ? sh : oh;
      } else {
        // Content is smaller
        height = sh < oh ? sh : oh;
      }
    }
  }

  return height;
};


/**
 * Gets the page scroll distance as a coordinate object.
 *
 * @param {Window=} opt_window Optional window element to test.
 * @return {!goog.math.Coordinate} Object with values 'x' and 'y'.
 * @deprecated Use {@link goog.dom.getDocumentScroll} instead.
 */
goog.dom.getPageScroll = function(opt_window) {
  var win = opt_window || goog.global || window;
  return goog.dom.getDomHelper(win.document).getDocumentScroll();
};


/**
 * Gets the document scroll distance as a coordinate object.
 *
 * @return {!goog.math.Coordinate} Object with values 'x' and 'y'.
 */
goog.dom.getDocumentScroll = function() {
  return goog.dom.getDocumentScroll_(document);
};


/**
 * Helper for {@code getDocumentScroll}.
 *
 * @param {!Document} doc The document to get the scroll for.
 * @return {!goog.math.Coordinate} Object with values 'x' and 'y'.
 * @private
 */
goog.dom.getDocumentScroll_ = function(doc) {
  var el = goog.dom.getDocumentScrollElement_(doc);
  var win = goog.dom.getWindow_(doc);
  return new goog.math.Coordinate(win.pageXOffset || el.scrollLeft,
      win.pageYOffset || el.scrollTop);
};


/**
 * Gets the document scroll element.
 * @return {Element} Scrolling element.
 */
goog.dom.getDocumentScrollElement = function() {
  return goog.dom.getDocumentScrollElement_(document);
};


/**
 * Helper for {@code getDocumentScrollElement}.
 * @param {!Document} doc The document to get the scroll element for.
 * @return {Element} Scrolling element.
 * @private
 */
goog.dom.getDocumentScrollElement_ = function(doc) {
  // Safari (2 and 3) needs body.scrollLeft in both quirks mode and strict mode.
  return !goog.userAgent.WEBKIT && goog.dom.isCss1CompatMode_(doc) ?
      doc.documentElement : doc.body;
};


/**
 * Gets the window object associated with the given document.
 *
 * @param {Document=} opt_doc  Document object to get window for.
 * @return {Window} The window associated with the given document.
 */
goog.dom.getWindow = function(opt_doc) {
  // TODO(user): This should not take an argument.
  return opt_doc ? goog.dom.getWindow_(opt_doc) : window;
};


/**
 * Helper for {@code getWindow}.
 *
 * @param {!Document} doc  Document object to get window for.
 * @return {!Window} The window associated with the given document.
 * @private
 */
goog.dom.getWindow_ = function(doc) {
  return doc.parentWindow || doc.defaultView;
};


/**
 * Returns a dom node with a set of attributes.  This function accepts varargs
 * for subsequent nodes to be added.  Subsequent nodes will be added to the
 * first node as childNodes.
 *
 * So:
 * <code>createDom('div', null, createDom('p'), createDom('p'));</code>
 * would return a div with two child paragraphs
 *
 * @param {string} tagName Tag to create.
 * @param {Object|Array.<string>|string=} opt_attributes If object, then a map
 *     of name-value pairs for attributes. If a string, then this is the
 *     className of the new element. If an array, the elements will be joined
 *     together as the className of the new element.
 * @param {...Object|string|Array|NodeList} var_args Further DOM nodes or
 *     strings for text nodes. If one of the var_args is an array or NodeList,i
 *     its elements will be added as childNodes instead.
 * @return {!Element} Reference to a DOM node.
 */
goog.dom.createDom = function(tagName, opt_attributes, var_args) {
  return goog.dom.createDom_(document, arguments);
};


/**
 * Helper for {@code createDom}.
 * @param {!Document} doc The document to create the DOM in.
 * @param {!Arguments} args Argument object passed from the callers. See
 *     {@code goog.dom.createDom} for details.
 * @return {!Element} Reference to a DOM node.
 * @private
 */
goog.dom.createDom_ = function(doc, args) {
  var tagName = args[0];
  var attributes = args[1];

  // Internet Explorer is dumb: http://msdn.microsoft.com/workshop/author/
  //                            dhtml/reference/properties/name_2.asp
  // Also does not allow setting of 'type' attribute on 'input' or 'button'.
  if (!goog.dom.BrowserFeature.CAN_ADD_NAME_OR_TYPE_ATTRIBUTES && attributes &&
      (attributes.name || attributes.type)) {
    var tagNameArr = ['<', tagName];
    if (attributes.name) {
      tagNameArr.push(' name="', goog.string.htmlEscape(attributes.name),
                      '"');
    }
    if (attributes.type) {
      tagNameArr.push(' type="', goog.string.htmlEscape(attributes.type),
                      '"');

      // Clone attributes map to remove 'type' without mutating the input.
      var clone = {};
      goog.object.extend(clone, attributes);
      attributes = clone;
      delete attributes.type;
    }
    tagNameArr.push('>');
    tagName = tagNameArr.join('');
  }

  var element = doc.createElement(tagName);

  if (attributes) {
    if (goog.isString(attributes)) {
      element.className = attributes;
    } else if (goog.isArray(attributes)) {
      goog.dom.classes.add.apply(null, [element].concat(attributes));
    } else {
      goog.dom.setProperties(element, attributes);
    }
  }

  if (args.length > 2) {
    goog.dom.append_(doc, element, args, 2);
  }

  return element;
};


/**
 * Appends a node with text or other nodes.
 * @param {!Document} doc The document to create new nodes in.
 * @param {!Node} parent The node to append nodes to.
 * @param {!Arguments} args The values to add. See {@code goog.dom.append}.
 * @param {number} startIndex The index of the array to start from.
 * @private
 */
goog.dom.append_ = function(doc, parent, args, startIndex) {
  function childHandler(child) {
    // TODO(user): More coercion, ala MochiKit?
    if (child) {
      parent.appendChild(goog.isString(child) ?
          doc.createTextNode(child) : child);
    }
  }

  for (var i = startIndex; i < args.length; i++) {
    var arg = args[i];
    // TODO(user): Fix isArrayLike to return false for a text node.
    if (goog.isArrayLike(arg) && !goog.dom.isNodeLike(arg)) {
      // If the argument is a node list, not a real array, use a clone,
      // because forEach can't be used to mutate a NodeList.
      goog.array.forEach(goog.dom.isNodeList(arg) ?
          goog.array.clone(arg) : arg,
          childHandler);
    } else {
      childHandler(arg);
    }
  }
};


/**
 * Alias for {@code createDom}.
 * @param {string} tagName Tag to create.
 * @param {string|Object=} opt_attributes If object, then a map of name-value
 *     pairs for attributes. If a string, then this is the className of the new
 *     element.
 * @param {...Object|string|Array|NodeList} var_args Further DOM nodes or
 *     strings for text nodes. If one of the var_args is an array, its
 *     children will be added as childNodes instead.
 * @return {!Element} Reference to a DOM node.
 * @deprecated Use {@link goog.dom.createDom} instead.
 */
goog.dom.$dom = goog.dom.createDom;


/**
 * Creates a new element.
 * @param {string} name Tag name.
 * @return {!Element} The new element.
 */
goog.dom.createElement = function(name) {
  return document.createElement(name);
};


/**
 * Creates a new text node.
 * @param {string} content Content.
 * @return {!Text} The new text node.
 */
goog.dom.createTextNode = function(content) {
  return document.createTextNode(content);
};


/**
 * Create a table.
 * @param {number} rows The number of rows in the table.  Must be >= 1.
 * @param {number} columns The number of columns in the table.  Must be >= 1.
 * @param {boolean=} opt_fillWithNbsp If true, fills table entries with nsbps.
 * @return {!Element} The created table.
 */
goog.dom.createTable = function(rows, columns, opt_fillWithNbsp) {
  return goog.dom.createTable_(document, rows, columns, !!opt_fillWithNbsp);
};


/**
 * Create a table.
 * @param {!Document} doc Document object to use to create the table.
 * @param {number} rows The number of rows in the table.  Must be >= 1.
 * @param {number} columns The number of columns in the table.  Must be >= 1.
 * @param {boolean} fillWithNbsp If true, fills table entries with nsbps.
 * @return {!Element} The created table.
 * @private
 */
goog.dom.createTable_ = function(doc, rows, columns, fillWithNbsp) {
  var rowHtml = ['<tr>'];
  for (var i = 0; i < columns; i++) {
    rowHtml.push(fillWithNbsp ? '<td>&nbsp;</td>' : '<td></td>');
  }
  rowHtml.push('</tr>');
  rowHtml = rowHtml.join('');
  var totalHtml = ['<table>'];
  for (i = 0; i < rows; i++) {
    totalHtml.push(rowHtml);
  }
  totalHtml.push('</table>');

  var elem = doc.createElement(goog.dom.TagName.DIV);
  elem.innerHTML = totalHtml.join('');
  return /** @type {!Element} */ (elem.removeChild(elem.firstChild));
};


/**
 * Converts an HTML string into a document fragment.
 *
 * @param {string} htmlString The HTML string to convert.
 * @return {!Node} The resulting document fragment.
 */
goog.dom.htmlToDocumentFragment = function(htmlString) {
  return goog.dom.htmlToDocumentFragment_(document, htmlString);
};


/**
 * Helper for {@code htmlToDocumentFragment}.
 *
 * @param {!Document} doc The document.
 * @param {string} htmlString The HTML string to convert.
 * @return {!Node} The resulting document fragment.
 * @private
 */
goog.dom.htmlToDocumentFragment_ = function(doc, htmlString) {
  var tempDiv = doc.createElement('div');
  if (goog.dom.BrowserFeature.INNER_HTML_NEEDS_SCOPED_ELEMENT) {
    tempDiv.innerHTML = '<br>' + htmlString;
    tempDiv.removeChild(tempDiv.firstChild);
  } else {
    tempDiv.innerHTML = htmlString;
  }
  if (tempDiv.childNodes.length == 1) {
    return /** @type {!Node} */ (tempDiv.removeChild(tempDiv.firstChild));
  } else {
    var fragment = doc.createDocumentFragment();
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    return fragment;
  }
};


/**
 * Returns the compatMode of the document.
 * @return {string} The result is either CSS1Compat or BackCompat.
 * @deprecated use goog.dom.isCss1CompatMode instead.
 */
goog.dom.getCompatMode = function() {
  return goog.dom.isCss1CompatMode() ? 'CSS1Compat' : 'BackCompat';
};


/**
 * Returns true if the browser is in "CSS1-compatible" (standards-compliant)
 * mode, false otherwise.
 * @return {boolean} True if in CSS1-compatible mode.
 */
goog.dom.isCss1CompatMode = function() {
  return goog.dom.isCss1CompatMode_(document);
};


/**
 * Returns true if the browser is in "CSS1-compatible" (standards-compliant)
 * mode, false otherwise.
 * @param {Document} doc The document to check.
 * @return {boolean} True if in CSS1-compatible mode.
 * @private
 */
goog.dom.isCss1CompatMode_ = function(doc) {
  if (goog.dom.COMPAT_MODE_KNOWN_) {
    return goog.dom.ASSUME_STANDARDS_MODE;
  }

  return doc.compatMode == 'CSS1Compat';
};


/**
 * Determines if the given node can contain children, intended to be used for
 * HTML generation.
 *
 * IE natively supports node.canHaveChildren but has inconsistent behavior.
 * Prior to IE8 the base tag allows children and in IE9 all nodes return true
 * for canHaveChildren.
 *
 * In practice all non-IE browsers allow you to add children to any node, but
 * the behavior is inconsistent:
 *
 * <pre>
 *   var a = document.createElement('br');
 *   a.appendChild(document.createTextNode('foo'));
 *   a.appendChild(document.createTextNode('bar'));
 *   console.log(a.childNodes.length);  // 2
 *   console.log(a.innerHTML);  // Chrome: "", IE9: "foobar", FF3.5: "foobar"
 * </pre>
 *
 * TODO(user): Rename shouldAllowChildren() ?
 *
 * @param {Node} node The node to check.
 * @return {boolean} Whether the node can contain children.
 */
goog.dom.canHaveChildren = function(node) {
  if (node.nodeType != goog.dom.NodeType.ELEMENT) {
    return false;
  }
  switch (node.tagName) {
    case goog.dom.TagName.APPLET:
    case goog.dom.TagName.AREA:
    case goog.dom.TagName.BASE:
    case goog.dom.TagName.BR:
    case goog.dom.TagName.COL:
    case goog.dom.TagName.FRAME:
    case goog.dom.TagName.HR:
    case goog.dom.TagName.IMG:
    case goog.dom.TagName.INPUT:
    case goog.dom.TagName.IFRAME:
    case goog.dom.TagName.ISINDEX:
    case goog.dom.TagName.LINK:
    case goog.dom.TagName.NOFRAMES:
    case goog.dom.TagName.NOSCRIPT:
    case goog.dom.TagName.META:
    case goog.dom.TagName.OBJECT:
    case goog.dom.TagName.PARAM:
    case goog.dom.TagName.SCRIPT:
    case goog.dom.TagName.STYLE:
      return false;
  }
  return true;
};


/**
 * Appends a child to a node.
 * @param {Node} parent Parent.
 * @param {Node} child Child.
 */
goog.dom.appendChild = function(parent, child) {
  parent.appendChild(child);
};


/**
 * Appends a node with text or other nodes.
 * @param {!Node} parent The node to append nodes to.
 * @param {...goog.dom.Appendable} var_args The things to append to the node.
 *     If this is a Node it is appended as is.
 *     If this is a string then a text node is appended.
 *     If this is an array like object then fields 0 to length - 1 are appended.
 */
goog.dom.append = function(parent, var_args) {
  goog.dom.append_(goog.dom.getOwnerDocument(parent), parent, arguments, 1);
};


/**
 * Removes all the child nodes on a DOM node.
 * @param {Node} node Node to remove children from.
 */
goog.dom.removeChildren = function(node) {
  // Note: Iterations over live collections can be slow, this is the fastest
  // we could find. The double parenthesis are used to prevent JsCompiler and
  // strict warnings.
  var child;
  while ((child = node.firstChild)) {
    node.removeChild(child);
  }
};


/**
 * Inserts a new node before an existing reference node (i.e. as the previous
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert before.
 */
goog.dom.insertSiblingBefore = function(newNode, refNode) {
  if (refNode.parentNode) {
    refNode.parentNode.insertBefore(newNode, refNode);
  }
};


/**
 * Inserts a new node after an existing reference node (i.e. as the next
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert after.
 */
goog.dom.insertSiblingAfter = function(newNode, refNode) {
  if (refNode.parentNode) {
    refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
  }
};


/**
 * Insert a child at a given index. If index is larger than the number of child
 * nodes that the parent currently has, the node is inserted as the last child
 * node.
 * @param {Element} parent The element into which to insert the child.
 * @param {Node} child The element to insert.
 * @param {number} index The index at which to insert the new child node. Must
 *     not be negative.
 */
goog.dom.insertChildAt = function(parent, child, index) {
  // Note that if the second argument is null, insertBefore
  // will append the child at the end of the list of children.
  parent.insertBefore(child, parent.childNodes[index] || null);
};


/**
 * Removes a node from its parent.
 * @param {Node} node The node to remove.
 * @return {Node} The node removed if removed; else, null.
 */
goog.dom.removeNode = function(node) {
  return node && node.parentNode ? node.parentNode.removeChild(node) : null;
};


/**
 * Replaces a node in the DOM tree. Will do nothing if {@code oldNode} has no
 * parent.
 * @param {Node} newNode Node to insert.
 * @param {Node} oldNode Node to replace.
 */
goog.dom.replaceNode = function(newNode, oldNode) {
  var parent = oldNode.parentNode;
  if (parent) {
    parent.replaceChild(newNode, oldNode);
  }
};


/**
 * Flattens an element. That is, removes it and replace it with its children.
 * Does nothing if the element is not in the document.
 * @param {Element} element The element to flatten.
 * @return {Element|undefined} The original element, detached from the document
 *     tree, sans children; or undefined, if the element was not in the
 *     document to begin with.
 */
goog.dom.flattenElement = function(element) {
  var child, parent = element.parentNode;
  if (parent && parent.nodeType != goog.dom.NodeType.DOCUMENT_FRAGMENT) {
    // Use IE DOM method (supported by Opera too) if available
    if (element.removeNode) {
      return /** @type {Element} */ (element.removeNode(false));
    } else {
      // Move all children of the original node up one level.
      while ((child = element.firstChild)) {
        parent.insertBefore(child, element);
      }

      // Detach the original element.
      return /** @type {Element} */ (goog.dom.removeNode(element));
    }
  }
};


/**
 * Returns an array containing just the element children of the given element.
 * @param {Element} element The element whose element children we want.
 * @return {Array|NodeList} An array or array-like list of just the element
 *     children of the given element.
 */
goog.dom.getChildren = function(element) {
  // We check if the children attribute is supported for child elements
  // since IE8 misuses the attribute by also including comments.
  if (goog.dom.BrowserFeature.CAN_USE_CHILDREN_ATTRIBUTE &&
      element.children != undefined) {
    return element.children;
  }
  // Fall back to manually filtering the element's child nodes.
  return goog.array.filter(element.childNodes, function(node) {
    return node.nodeType == goog.dom.NodeType.ELEMENT;
  });
};


/**
 * Returns the first child node that is an element.
 * @param {Node} node The node to get the first child element of.
 * @return {Element} The first child node of {@code node} that is an element.
 */
goog.dom.getFirstElementChild = function(node) {
  if (node.firstElementChild != undefined) {
    return /** @type {Element} */(node).firstElementChild;
  }
  return goog.dom.getNextElementNode_(node.firstChild, true);
};


/**
 * Returns the last child node that is an element.
 * @param {Node} node The node to get the last child element of.
 * @return {Element} The last child node of {@code node} that is an element.
 */
goog.dom.getLastElementChild = function(node) {
  if (node.lastElementChild != undefined) {
    return /** @type {Element} */(node).lastElementChild;
  }
  return goog.dom.getNextElementNode_(node.lastChild, false);
};


/**
 * Returns the first next sibling that is an element.
 * @param {Node} node The node to get the next sibling element of.
 * @return {Element} The next sibling of {@code node} that is an element.
 */
goog.dom.getNextElementSibling = function(node) {
  if (node.nextElementSibling != undefined) {
    return /** @type {Element} */(node).nextElementSibling;
  }
  return goog.dom.getNextElementNode_(node.nextSibling, true);
};


/**
 * Returns the first previous sibling that is an element.
 * @param {Node} node The node to get the previous sibling element of.
 * @return {Element} The first previous sibling of {@code node} that is
 *     an element.
 */
goog.dom.getPreviousElementSibling = function(node) {
  if (node.previousElementSibling != undefined) {
    return /** @type {Element} */(node).previousElementSibling;
  }
  return goog.dom.getNextElementNode_(node.previousSibling, false);
};


/**
 * Returns the first node that is an element in the specified direction,
 * starting with {@code node}.
 * @param {Node} node The node to get the next element from.
 * @param {boolean} forward Whether to look forwards or backwards.
 * @return {Element} The first element.
 * @private
 */
goog.dom.getNextElementNode_ = function(node, forward) {
  while (node && node.nodeType != goog.dom.NodeType.ELEMENT) {
    node = forward ? node.nextSibling : node.previousSibling;
  }

  return /** @type {Element} */ (node);
};


/**
 * Returns the next node in source order from the given node.
 * @param {Node} node The node.
 * @return {Node} The next node in the DOM tree, or null if this was the last
 *     node.
 */
goog.dom.getNextNode = function(node) {
  if (!node) {
    return null;
  }

  if (node.firstChild) {
    return node.firstChild;
  }

  while (node && !node.nextSibling) {
    node = node.parentNode;
  }

  return node ? node.nextSibling : null;
};


/**
 * Returns the previous node in source order from the given node.
 * @param {Node} node The node.
 * @return {Node} The previous node in the DOM tree, or null if this was the
 *     first node.
 */
goog.dom.getPreviousNode = function(node) {
  if (!node) {
    return null;
  }

  if (!node.previousSibling) {
    return node.parentNode;
  }

  node = node.previousSibling;
  while (node && node.lastChild) {
    node = node.lastChild;
  }

  return node;
};


/**
 * Whether the object looks like a DOM node.
 * @param {*} obj The object being tested for node likeness.
 * @return {boolean} Whether the object looks like a DOM node.
 */
goog.dom.isNodeLike = function(obj) {
  return goog.isObject(obj) && obj.nodeType > 0;
};


/**
 * Returns true if the specified value is a Window object. This includes the
 * global window for HTML pages, and iframe windows.
 * @param {*} obj Variable to test.
 * @return {boolean} Whether the variable is a window.
 */
goog.dom.isWindow = function(obj) {
  return goog.isObject(obj) && obj['window'] == obj;
};


/**
 * Whether a node contains another node.
 * @param {Node} parent The node that should contain the other node.
 * @param {Node} descendant The node to test presence of.
 * @return {boolean} Whether the parent node contains the descendent node.
 */
goog.dom.contains = function(parent, descendant) {
  // We use browser specific methods for this if available since it is faster
  // that way.

  // IE DOM
  if (parent.contains && descendant.nodeType == goog.dom.NodeType.ELEMENT) {
    return parent == descendant || parent.contains(descendant);
  }

  // W3C DOM Level 3
  if (typeof parent.compareDocumentPosition != 'undefined') {
    return parent == descendant ||
        Boolean(parent.compareDocumentPosition(descendant) & 16);
  }

  // W3C DOM Level 1
  while (descendant && parent != descendant) {
    descendant = descendant.parentNode;
  }
  return descendant == parent;
};


/**
 * Compares the document order of two nodes, returning 0 if they are the same
 * node, a negative number if node1 is before node2, and a positive number if
 * node2 is before node1.  Note that we compare the order the tags appear in the
 * document so in the tree <b><i>text</i></b> the B node is considered to be
 * before the I node.
 *
 * @param {Node} node1 The first node to compare.
 * @param {Node} node2 The second node to compare.
 * @return {number} 0 if the nodes are the same node, a negative number if node1
 *     is before node2, and a positive number if node2 is before node1.
 */
goog.dom.compareNodeOrder = function(node1, node2) {
  // Fall out quickly for equality.
  if (node1 == node2) {
    return 0;
  }

  // Use compareDocumentPosition where available
  if (node1.compareDocumentPosition) {
    // 4 is the bitmask for FOLLOWS.
    return node1.compareDocumentPosition(node2) & 2 ? 1 : -1;
  }

  // Process in IE using sourceIndex - we check to see if the first node has
  // a source index or if its parent has one.
  if ('sourceIndex' in node1 ||
      (node1.parentNode && 'sourceIndex' in node1.parentNode)) {
    var isElement1 = node1.nodeType == goog.dom.NodeType.ELEMENT;
    var isElement2 = node2.nodeType == goog.dom.NodeType.ELEMENT;

    if (isElement1 && isElement2) {
      return node1.sourceIndex - node2.sourceIndex;
    } else {
      var parent1 = node1.parentNode;
      var parent2 = node2.parentNode;

      if (parent1 == parent2) {
        return goog.dom.compareSiblingOrder_(node1, node2);
      }

      if (!isElement1 && goog.dom.contains(parent1, node2)) {
        return -1 * goog.dom.compareParentsDescendantNodeIe_(node1, node2);
      }


      if (!isElement2 && goog.dom.contains(parent2, node1)) {
        return goog.dom.compareParentsDescendantNodeIe_(node2, node1);
      }

      return (isElement1 ? node1.sourceIndex : parent1.sourceIndex) -
             (isElement2 ? node2.sourceIndex : parent2.sourceIndex);
    }
  }

  // For Safari, we compare ranges.
  var doc = goog.dom.getOwnerDocument(node1);

  var range1, range2;
  range1 = doc.createRange();
  range1.selectNode(node1);
  range1.collapse(true);

  range2 = doc.createRange();
  range2.selectNode(node2);
  range2.collapse(true);

  return range1.compareBoundaryPoints(goog.global['Range'].START_TO_END,
      range2);
};


/**
 * Utility function to compare the position of two nodes, when
 * {@code textNode}'s parent is an ancestor of {@code node}.  If this entry
 * condition is not met, this function will attempt to reference a null object.
 * @param {Node} textNode The textNode to compare.
 * @param {Node} node The node to compare.
 * @return {number} -1 if node is before textNode, +1 otherwise.
 * @private
 */
goog.dom.compareParentsDescendantNodeIe_ = function(textNode, node) {
  var parent = textNode.parentNode;
  if (parent == node) {
    // If textNode is a child of node, then node comes first.
    return -1;
  }
  var sibling = node;
  while (sibling.parentNode != parent) {
    sibling = sibling.parentNode;
  }
  return goog.dom.compareSiblingOrder_(sibling, textNode);
};


/**
 * Utility function to compare the position of two nodes known to be non-equal
 * siblings.
 * @param {Node} node1 The first node to compare.
 * @param {Node} node2 The second node to compare.
 * @return {number} -1 if node1 is before node2, +1 otherwise.
 * @private
 */
goog.dom.compareSiblingOrder_ = function(node1, node2) {
  var s = node2;
  while ((s = s.previousSibling)) {
    if (s == node1) {
      // We just found node1 before node2.
      return -1;
    }
  }

  // Since we didn't find it, node1 must be after node2.
  return 1;
};


/**
 * Find the deepest common ancestor of the given nodes.
 * @param {...Node} var_args The nodes to find a common ancestor of.
 * @return {Node} The common ancestor of the nodes, or null if there is none.
 *     null will only be returned if two or more of the nodes are from different
 *     documents.
 */
goog.dom.findCommonAncestor = function(var_args) {
  var i, count = arguments.length;
  if (!count) {
    return null;
  } else if (count == 1) {
    return arguments[0];
  }

  var paths = [];
  var minLength = Infinity;
  for (i = 0; i < count; i++) {
    // Compute the list of ancestors.
    var ancestors = [];
    var node = arguments[i];
    while (node) {
      ancestors.unshift(node);
      node = node.parentNode;
    }

    // Save the list for comparison.
    paths.push(ancestors);
    minLength = Math.min(minLength, ancestors.length);
  }
  var output = null;
  for (i = 0; i < minLength; i++) {
    var first = paths[0][i];
    for (var j = 1; j < count; j++) {
      if (first != paths[j][i]) {
        return output;
      }
    }
    output = first;
  }
  return output;
};


/**
 * Returns the owner document for a node.
 * @param {Node|Window} node The node to get the document for.
 * @return {!Document} The document owning the node.
 */
goog.dom.getOwnerDocument = function(node) {
  // TODO(user): Remove IE5 code.
  // IE5 uses document instead of ownerDocument
  return /** @type {!Document} */ (
      node.nodeType == goog.dom.NodeType.DOCUMENT ? node :
      node.ownerDocument || node.document);
};


/**
 * Cross-browser function for getting the document element of a frame or iframe.
 * @param {Element} frame Frame element.
 * @return {!Document} The frame content document.
 */
goog.dom.getFrameContentDocument = function(frame) {
  var doc;
  if (goog.userAgent.WEBKIT) {
    doc = (frame.document || frame.contentWindow.document);
  } else {
    doc = (frame.contentDocument || frame.contentWindow.document);
  }
  return doc;
};


/**
 * Cross-browser function for getting the window of a frame or iframe.
 * @param {HTMLIFrameElement|HTMLFrameElement} frame Frame element.
 * @return {Window} The window associated with the given frame.
 */
goog.dom.getFrameContentWindow = function(frame) {
  return frame.contentWindow ||
      goog.dom.getWindow_(goog.dom.getFrameContentDocument(frame));
};


/**
 * Cross-browser function for setting the text content of an element.
 * @param {Element} element The element to change the text content of.
 * @param {string} text The string that should replace the current element
 *     content.
 */
goog.dom.setTextContent = function(element, text) {
  if ('textContent' in element) {
    element.textContent = text;
  } else if (element.firstChild &&
             element.firstChild.nodeType == goog.dom.NodeType.TEXT) {
    // If the first child is a text node we just change its data and remove the
    // rest of the children.
    while (element.lastChild != element.firstChild) {
      element.removeChild(element.lastChild);
    }
    element.firstChild.data = text;
  } else {
    goog.dom.removeChildren(element);
    var doc = goog.dom.getOwnerDocument(element);
    element.appendChild(doc.createTextNode(text));
  }
};


/**
 * Gets the outerHTML of a node, which islike innerHTML, except that it
 * actually contains the HTML of the node itself.
 * @param {Element} element The element to get the HTML of.
 * @return {string} The outerHTML of the given element.
 */
goog.dom.getOuterHtml = function(element) {
  // IE, Opera and WebKit all have outerHTML.
  if ('outerHTML' in element) {
    return element.outerHTML;
  } else {
    var doc = goog.dom.getOwnerDocument(element);
    var div = doc.createElement('div');
    div.appendChild(element.cloneNode(true));
    return div.innerHTML;
  }
};


/**
 * Finds the first descendant node that matches the filter function, using
 * a depth first search. This function offers the most general purpose way
 * of finding a matching element. You may also wish to consider
 * {@code goog.dom.query} which can express many matching criteria using
 * CSS selector expressions. These expressions often result in a more
 * compact representation of the desired result.
 * @see goog.dom.query
 *
 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @return {Node|undefined} The found node or undefined if none is found.
 */
goog.dom.findNode = function(root, p) {
  var rv = [];
  var found = goog.dom.findNodes_(root, p, rv, true);
  return found ? rv[0] : undefined;
};


/**
 * Finds all the descendant nodes that match the filter function, using a
 * a depth first search. This function offers the most general-purpose way
 * of finding a set of matching elements. You may also wish to consider
 * {@code goog.dom.query} which can express many matching criteria using
 * CSS selector expressions. These expressions often result in a more
 * compact representation of the desired result.

 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @return {Array.<Node>} The found nodes or an empty array if none are found.
 */
goog.dom.findNodes = function(root, p) {
  var rv = [];
  goog.dom.findNodes_(root, p, rv, false);
  return rv;
};


/**
 * Finds the first or all the descendant nodes that match the filter function,
 * using a depth first search.
 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @param {Array.<Node>} rv The found nodes are added to this array.
 * @param {boolean} findOne If true we exit after the first found node.
 * @return {boolean} Whether the search is complete or not. True in case findOne
 *     is true and the node is found. False otherwise.
 * @private
 */
goog.dom.findNodes_ = function(root, p, rv, findOne) {
  if (root != null) {
    for (var i = 0, child; child = root.childNodes[i]; i++) {
      if (p(child)) {
        rv.push(child);
        if (findOne) {
          return true;
        }
      }
      if (goog.dom.findNodes_(child, p, rv, findOne)) {
        return true;
      }
    }
  }
  return false;
};


/**
 * Map of tags whose content to ignore when calculating text length.
 * @type {Object}
 * @private
 */
goog.dom.TAGS_TO_IGNORE_ = {
  'SCRIPT': 1,
  'STYLE': 1,
  'HEAD': 1,
  'IFRAME': 1,
  'OBJECT': 1
};


/**
 * Map of tags which have predefined values with regard to whitespace.
 * @type {Object}
 * @private
 */
goog.dom.PREDEFINED_TAG_VALUES_ = {'IMG': ' ', 'BR': '\n'};


/**
 * Returns true if the element has a tab index that allows it to receive
 * keyboard focus (tabIndex >= 0), false otherwise.  Note that form elements
 * natively support keyboard focus, even if they have no tab index.
 * @param {Element} element Element to check.
 * @return {boolean} Whether the element has a tab index that allows keyboard
 *     focus.
 * @see http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
 */
goog.dom.isFocusableTabIndex = function(element) {
  // IE returns 0 for an unset tabIndex, so we must use getAttributeNode(),
  // which returns an object with a 'specified' property if tabIndex is
  // specified.  This works on other browsers, too.
  var attrNode = element.getAttributeNode('tabindex'); // Must be lowercase!
  if (attrNode && attrNode.specified) {
    var index = element.tabIndex;
    return goog.isNumber(index) && index >= 0;
  }
  return false;
};


/**
 * Enables or disables keyboard focus support on the element via its tab index.
 * Only elements for which {@link goog.dom.isFocusableTabIndex} returns true
 * (or elements that natively support keyboard focus, like form elements) can
 * receive keyboard focus.  See http://go/tabindex for more info.
 * @param {Element} element Element whose tab index is to be changed.
 * @param {boolean} enable Whether to set or remove a tab index on the element
 *     that supports keyboard focus.
 */
goog.dom.setFocusableTabIndex = function(element, enable) {
  if (enable) {
    element.tabIndex = 0;
  } else {
    element.removeAttribute('tabIndex'); // Must be camelCase!
  }
};


/**
 * Returns the text content of the current node, without markup and invisible
 * symbols. New lines are stripped and whitespace is collapsed,
 * such that each character would be visible.
 *
 * In browsers that support it, innerText is used.  Other browsers attempt to
 * simulate it via node traversal.  Line breaks are canonicalized in IE.
 *
 * @param {Node} node The node from which we are getting content.
 * @return {string} The text content.
 */
goog.dom.getTextContent = function(node) {
  var textContent;
  // Note(user): IE9, Opera, and Safara 3 support innerText but they include
  // text nodes in script tags. So we revert to use a user agent test here.
  if (goog.dom.BrowserFeature.CAN_USE_INNER_TEXT && ('innerText' in node)) {
    textContent = goog.string.canonicalizeNewlines(node.innerText);
    // Unfortunately .innerText() returns text with &shy; symbols
    // We need to filter it out and then remove duplicate whitespaces
  } else {
    var buf = [];
    goog.dom.getTextContent_(node, buf, true);
    textContent = buf.join('');
  }

  // Strip &shy; entities. goog.format.insertWordBreaks inserts them in Opera.
  textContent = textContent.replace(/ \xAD /g, ' ').replace(/\xAD/g, '');
  // Strip &#8203; entities. goog.format.insertWordBreaks inserts them in IE8.
  textContent = textContent.replace(/\u200B/g, '');

  // Skip this replacement on IE, which automatically turns &nbsp; into ' '
  // and / +/ into ' ' when reading innerText.
  if (!goog.userAgent.IE) {
    textContent = textContent.replace(/ +/g, ' ');
  }
  if (textContent != ' ') {
    textContent = textContent.replace(/^\s*/, '');
  }

  return textContent;
};


/**
 * Returns the text content of the current node, without markup.
 *
 * Unlike {@code getTextContent} this method does not collapse whitespaces
 * or normalize lines breaks.
 *
 * @param {Node} node The node from which we are getting content.
 * @return {string} The raw text content.
 */
goog.dom.getRawTextContent = function(node) {
  var buf = [];
  goog.dom.getTextContent_(node, buf, false);

  return buf.join('');
};


/**
 * Recursive support function for text content retrieval.
 *
 * @param {Node} node The node from which we are getting content.
 * @param {Array} buf string buffer.
 * @param {boolean} normalizeWhitespace Whether to normalize whitespace.
 * @private
 */
goog.dom.getTextContent_ = function(node, buf, normalizeWhitespace) {
  if (node.nodeName in goog.dom.TAGS_TO_IGNORE_) {
    // ignore certain tags
  } else if (node.nodeType == goog.dom.NodeType.TEXT) {
    if (normalizeWhitespace) {
      buf.push(String(node.nodeValue).replace(/(\r\n|\r|\n)/g, ''));
    } else {
      buf.push(node.nodeValue);
    }
  } else if (node.nodeName in goog.dom.PREDEFINED_TAG_VALUES_) {
    buf.push(goog.dom.PREDEFINED_TAG_VALUES_[node.nodeName]);
  } else {
    var child = node.firstChild;
    while (child) {
      goog.dom.getTextContent_(child, buf, normalizeWhitespace);
      child = child.nextSibling;
    }
  }
};


/**
 * Returns the text length of the text contained in a node, without markup. This
 * is equivalent to the selection length if the node was selected, or the number
 * of cursor movements to traverse the node. Images & BRs take one space.  New
 * lines are ignored.
 *
 * @param {Node} node The node whose text content length is being calculated.
 * @return {number} The length of {@code node}'s text content.
 */
goog.dom.getNodeTextLength = function(node) {
  return goog.dom.getTextContent(node).length;
};


/**
 * Returns the text offset of a node relative to one of its ancestors. The text
 * length is the same as the length calculated by goog.dom.getNodeTextLength.
 *
 * @param {Node} node The node whose offset is being calculated.
 * @param {Node=} opt_offsetParent The node relative to which the offset will
 *     be calculated. Defaults to the node's owner document's body.
 * @return {number} The text offset.
 */
goog.dom.getNodeTextOffset = function(node, opt_offsetParent) {
  var root = opt_offsetParent || goog.dom.getOwnerDocument(node).body;
  var buf = [];
  while (node && node != root) {
    var cur = node;
    while ((cur = cur.previousSibling)) {
      buf.unshift(goog.dom.getTextContent(cur));
    }
    node = node.parentNode;
  }
  // Trim left to deal with FF cases when there might be line breaks and empty
  // nodes at the front of the text
  return goog.string.trimLeft(buf.join('')).replace(/ +/g, ' ').length;
};


/**
 * Returns the node at a given offset in a parent node.  If an object is
 * provided for the optional third parameter, the node and the remainder of the
 * offset will stored as properties of this object.
 * @param {Node} parent The parent node.
 * @param {number} offset The offset into the parent node.
 * @param {Object=} opt_result Object to be used to store the return value. The
 *     return value will be stored in the form {node: Node, remainder: number}
 *     if this object is provided.
 * @return {Node} The node at the given offset.
 */
goog.dom.getNodeAtOffset = function(parent, offset, opt_result) {
  var stack = [parent], pos = 0, cur;
  while (stack.length > 0 && pos < offset) {
    cur = stack.pop();
    if (cur.nodeName in goog.dom.TAGS_TO_IGNORE_) {
      // ignore certain tags
    } else if (cur.nodeType == goog.dom.NodeType.TEXT) {
      var text = cur.nodeValue.replace(/(\r\n|\r|\n)/g, '').replace(/ +/g, ' ');
      pos += text.length;
    } else if (cur.nodeName in goog.dom.PREDEFINED_TAG_VALUES_) {
      pos += goog.dom.PREDEFINED_TAG_VALUES_[cur.nodeName].length;
    } else {
      for (var i = cur.childNodes.length - 1; i >= 0; i--) {
        stack.push(cur.childNodes[i]);
      }
    }
  }
  if (goog.isObject(opt_result)) {
    opt_result.remainder = cur ? cur.nodeValue.length + offset - pos - 1 : 0;
    opt_result.node = cur;
  }

  return cur;
};


/**
 * Returns true if the object is a {@code NodeList}.  To qualify as a NodeList,
 * the object must have a numeric length property and an item function (which
 * has type 'string' on IE for some reason).
 * @param {Object} val Object to test.
 * @return {boolean} Whether the object is a NodeList.
 */
goog.dom.isNodeList = function(val) {
  // TODO(user): Now the isNodeList is part of goog.dom we can use
  // goog.userAgent to make this simpler.
  // A NodeList must have a length property of type 'number' on all platforms.
  if (val && typeof val.length == 'number') {
    // A NodeList is an object everywhere except Safari, where it's a function.
    if (goog.isObject(val)) {
      // A NodeList must have an item function (on non-IE platforms) or an item
      // property of type 'string' (on IE).
      return typeof val.item == 'function' || typeof val.item == 'string';
    } else if (goog.isFunction(val)) {
      // On Safari, a NodeList is a function with an item property that is also
      // a function.
      return typeof val.item == 'function';
    }
  }

  // Not a NodeList.
  return false;
};


/**
 * Walks up the DOM hierarchy returning the first ancestor that has the passed
 * tag name and/or class name. If the passed element matches the specified
 * criteria, the element itself is returned.
 * @param {Node} element The DOM node to start with.
 * @param {?string=} opt_tag The tag name to match (or null/undefined to match
 *     any node regardless of tag name). Must be uppercase (goog.dom.TagName).
 * @param {?string=} opt_class The class name to match (or null/undefined to
 *     match any node regardless of class name).
 * @return {Node} The first ancestor that matches the passed criteria, or
 *     null if none match.
 */
goog.dom.getAncestorByTagNameAndClass = function(element, opt_tag, opt_class) {
  var tagName = opt_tag ? opt_tag.toUpperCase() : null;
  return goog.dom.getAncestor(element,
      function(node) {
        return (!tagName || node.nodeName == tagName) &&
               (!opt_class || goog.dom.classes.has(node, opt_class));
      }, true);
};


/**
 * Walks up the DOM hierarchy returning the first ancestor that has the passed
 * class name. If the passed element matches the specified criteria, the
 * element itself is returned.
 * @param {Node} element The DOM node to start with.
 * @param {?string=} opt_class The class name to match (or null/undefined to
 *     match any node regardless of class name).
 * @return {Node} The first ancestor that matches the passed criteria, or
 *     null if none match.
 */
goog.dom.getAncestorByClass = function(element, opt_class) {
  return goog.dom.getAncestorByTagNameAndClass(element, null, opt_class);
};


/**
 * Walks up the DOM hierarchy returning the first ancestor that passes the
 * matcher function.
 * @param {Node} element The DOM node to start with.
 * @param {function(Node) : boolean} matcher A function that returns true if the
 *     passed node matches the desired criteria.
 * @param {boolean=} opt_includeNode If true, the node itself is included in
 *     the search (the first call to the matcher will pass startElement as
 *     the node to test).
 * @param {number=} opt_maxSearchSteps Maximum number of levels to search up the
 *     dom.
 * @return {Node} DOM node that matched the matcher, or null if there was
 *     no match.
 */
goog.dom.getAncestor = function(
    element, matcher, opt_includeNode, opt_maxSearchSteps) {
  if (!opt_includeNode) {
    element = element.parentNode;
  }
  var ignoreSearchSteps = opt_maxSearchSteps == null;
  var steps = 0;
  while (element && (ignoreSearchSteps || steps <= opt_maxSearchSteps)) {
    if (matcher(element)) {
      return element;
    }
    element = element.parentNode;
    steps++;
  }
  // Reached the root of the DOM without a match
  return null;
};



/**
 * Create an instance of a DOM helper with a new document object.
 * @param {Document=} opt_document Document object to associate with this
 *     DOM helper.
 * @constructor
 */
goog.dom.DomHelper = function(opt_document) {
  /**
   * Reference to the document object to use
   * @type {!Document}
   * @private
   */
  this.document_ = opt_document || goog.global.document || document;
};


/**
 * Gets the dom helper object for the document where the element resides.
 * @param {Node=} opt_node If present, gets the DomHelper for this node.
 * @return {!goog.dom.DomHelper} The DomHelper.
 */
goog.dom.DomHelper.prototype.getDomHelper = goog.dom.getDomHelper;


/**
 * Sets the document object.
 * @param {!Document} document Document object.
 */
goog.dom.DomHelper.prototype.setDocument = function(document) {
  this.document_ = document;
};


/**
 * Gets the document object being used by the dom library.
 * @return {!Document} Document object.
 */
goog.dom.DomHelper.prototype.getDocument = function() {
  return this.document_;
};


/**
 * Alias for {@code getElementById}. If a DOM node is passed in then we just
 * return that.
 * @param {string|Element} element Element ID or a DOM node.
 * @return {Element} The element with the given ID, or the node passed in.
 */
goog.dom.DomHelper.prototype.getElement = function(element) {
  if (goog.isString(element)) {
    return this.document_.getElementById(element);
  } else {
    return element;
  }
};


/**
 * Alias for {@code getElement}.
 * @param {string|Element} element Element ID or a DOM node.
 * @return {Element} The element with the given ID, or the node passed in.
 * @deprecated Use {@link goog.dom.DomHelper.prototype.getElement} instead.
 */
goog.dom.DomHelper.prototype.$ = goog.dom.DomHelper.prototype.getElement;


/**
 * Looks up elements by both tag and class name, using browser native functions
 * ({@code querySelectorAll}, {@code getElementsByTagName} or
 * {@code getElementsByClassName}) where possible. The returned array is a live
 * NodeList or a static list depending on the code path taken.
 *
 * @see goog.dom.query
 *
 * @param {?string=} opt_tag Element tag name or * for all tags.
 * @param {?string=} opt_class Optional class name.
 * @param {Document|Element=} opt_el Optional element to look in.
 * @return { {length: number} } Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 */
goog.dom.DomHelper.prototype.getElementsByTagNameAndClass = function(opt_tag,
                                                                     opt_class,
                                                                     opt_el) {
  return goog.dom.getElementsByTagNameAndClass_(this.document_, opt_tag,
                                                opt_class, opt_el);
};


/**
 * Returns an array of all the elements with the provided className.
 * @see {goog.dom.query}
 * @param {!string} className the name of the class to look for.
 * @param {Element|Document=} opt_el Optional element to look in.
 * @return { {length: number} } The items found with the class name provided.
 */
goog.dom.DomHelper.prototype.getElementsByClass = function(className, opt_el) {
  var doc = opt_el || this.document_;
  return goog.dom.getElementsByClass(className, doc);
};


/**
 * Returns the first element we find matching the provided class name.
 * @see {goog.dom.query}
 * @param {!string} className the name of the class to look for.
 * @param {Element|Document=} opt_el Optional element to look in.
 * @return {Element} The first item found with the class name provided.
 */
goog.dom.DomHelper.prototype.getElementByClass = function(className, opt_el) {
  var doc = opt_el || this.document_;
  return goog.dom.getElementByClass(className, doc);
};


/**
 * Alias for {@code getElementsByTagNameAndClass}.
 * @deprecated Use DomHelper getElementsByTagNameAndClass.
 * @see goog.dom.query
 *
 * @param {?string=} opt_tag Element tag name.
 * @param {?string=} opt_class Optional class name.
 * @param {Element=} opt_el Optional element to look in.
 * @return { {length: number} } Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 */
goog.dom.DomHelper.prototype.$$ =
    goog.dom.DomHelper.prototype.getElementsByTagNameAndClass;


/**
 * Sets a number of properties on a node.
 * @param {Element} element DOM node to set properties on.
 * @param {Object} properties Hash of property:value pairs.
 */
goog.dom.DomHelper.prototype.setProperties = goog.dom.setProperties;


/**
 * Gets the dimensions of the viewport.
 * @param {Window=} opt_window Optional window element to test. Defaults to
 *     the window of the Dom Helper.
 * @return {!goog.math.Size} Object with values 'width' and 'height'.
 */
goog.dom.DomHelper.prototype.getViewportSize = function(opt_window) {
  // TODO(user): This should not take an argument. That breaks the rule of a
  // a DomHelper representing a single frame/window/document.
  return goog.dom.getViewportSize(opt_window || this.getWindow());
};


/**
 * Calculates the height of the document.
 *
 * @return {number} The height of the document.
 */
goog.dom.DomHelper.prototype.getDocumentHeight = function() {
  return goog.dom.getDocumentHeight_(this.getWindow());
};


/**
 * Typedef for use with goog.dom.createDom and goog.dom.append.
 * @typedef {Object|string|Array|NodeList}
 */
goog.dom.Appendable;


/**
 * Returns a dom node with a set of attributes.  This function accepts varargs
 * for subsequent nodes to be added.  Subsequent nodes will be added to the
 * first node as childNodes.
 *
 * So:
 * <code>createDom('div', null, createDom('p'), createDom('p'));</code>
 * would return a div with two child paragraphs
 *
 * An easy way to move all child nodes of an existing element to a new parent
 * element is:
 * <code>createDom('div', null, oldElement.childNodes);</code>
 * which will remove all child nodes from the old element and add them as
 * child nodes of the new DIV.
 *
 * @param {string} tagName Tag to create.
 * @param {Object|string=} opt_attributes If object, then a map of name-value
 *     pairs for attributes. If a string, then this is the className of the new
 *     element.
 * @param {...goog.dom.Appendable} var_args Further DOM nodes or
 *     strings for text nodes. If one of the var_args is an array or
 *     NodeList, its elements will be added as childNodes instead.
 * @return {!Element} Reference to a DOM node.
 */
goog.dom.DomHelper.prototype.createDom = function(tagName,
                                                  opt_attributes,
                                                  var_args) {
  return goog.dom.createDom_(this.document_, arguments);
};


/**
 * Alias for {@code createDom}.
 * @param {string} tagName Tag to create.
 * @param {Object|string=} opt_attributes If object, then a map of name-value
 *     pairs for attributes. If a string, then this is the className of the new
 *     element.
 * @param {...goog.dom.Appendable} var_args Further DOM nodes or strings for
 *     text nodes.  If one of the var_args is an array, its children will be
 *     added as childNodes instead.
 * @return {!Element} Reference to a DOM node.
 * @deprecated Use {@link goog.dom.DomHelper.prototype.createDom} instead.
 */
goog.dom.DomHelper.prototype.$dom = goog.dom.DomHelper.prototype.createDom;


/**
 * Creates a new element.
 * @param {string} name Tag name.
 * @return {!Element} The new element.
 */
goog.dom.DomHelper.prototype.createElement = function(name) {
  return this.document_.createElement(name);
};


/**
 * Creates a new text node.
 * @param {string} content Content.
 * @return {!Text} The new text node.
 */
goog.dom.DomHelper.prototype.createTextNode = function(content) {
  return this.document_.createTextNode(content);
};


/**
 * Create a table.
 * @param {number} rows The number of rows in the table.  Must be >= 1.
 * @param {number} columns The number of columns in the table.  Must be >= 1.
 * @param {boolean=} opt_fillWithNbsp If true, fills table entries with nsbps.
 * @return {!Element} The created table.
 */
goog.dom.DomHelper.prototype.createTable = function(rows, columns,
    opt_fillWithNbsp) {
  return goog.dom.createTable_(this.document_, rows, columns,
      !!opt_fillWithNbsp);
};


/**
 * Converts an HTML string into a node or a document fragment.  A single Node
 * is used if the {@code htmlString} only generates a single node.  If the
 * {@code htmlString} generates multiple nodes then these are put inside a
 * {@code DocumentFragment}.
 *
 * @param {string} htmlString The HTML string to convert.
 * @return {!Node} The resulting node.
 */
goog.dom.DomHelper.prototype.htmlToDocumentFragment = function(htmlString) {
  return goog.dom.htmlToDocumentFragment_(this.document_, htmlString);
};


/**
 * Returns the compatMode of the document.
 * @return {string} The result is either CSS1Compat or BackCompat.
 * @deprecated use goog.dom.DomHelper.prototype.isCss1CompatMode instead.
 */
goog.dom.DomHelper.prototype.getCompatMode = function() {
  return this.isCss1CompatMode() ? 'CSS1Compat' : 'BackCompat';
};


/**
 * Returns true if the browser is in "CSS1-compatible" (standards-compliant)
 * mode, false otherwise.
 * @return {boolean} True if in CSS1-compatible mode.
 */
goog.dom.DomHelper.prototype.isCss1CompatMode = function() {
  return goog.dom.isCss1CompatMode_(this.document_);
};


/**
 * Gets the window object associated with the document.
 * @return {!Window} The window associated with the given document.
 */
goog.dom.DomHelper.prototype.getWindow = function() {
  return goog.dom.getWindow_(this.document_);
};


/**
 * Gets the document scroll element.
 * @return {Element} Scrolling element.
 */
goog.dom.DomHelper.prototype.getDocumentScrollElement = function() {
  return goog.dom.getDocumentScrollElement_(this.document_);
};


/**
 * Gets the document scroll distance as a coordinate object.
 * @return {!goog.math.Coordinate} Object with properties 'x' and 'y'.
 */
goog.dom.DomHelper.prototype.getDocumentScroll = function() {
  return goog.dom.getDocumentScroll_(this.document_);
};


/**
 * Appends a child to a node.
 * @param {Node} parent Parent.
 * @param {Node} child Child.
 */
goog.dom.DomHelper.prototype.appendChild = goog.dom.appendChild;


/**
 * Appends a node with text or other nodes.
 * @param {!Node} parent The node to append nodes to.
 * @param {...goog.dom.Appendable} var_args The things to append to the node.
 *     If this is a Node it is appended as is.
 *     If this is a string then a text node is appended.
 *     If this is an array like object then fields 0 to length - 1 are appended.
 */
goog.dom.DomHelper.prototype.append = goog.dom.append;


/**
 * Removes all the child nodes on a DOM node.
 * @param {Node} node Node to remove children from.
 */
goog.dom.DomHelper.prototype.removeChildren = goog.dom.removeChildren;


/**
 * Inserts a new node before an existing reference node (i.e., as the previous
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert before.
 */
goog.dom.DomHelper.prototype.insertSiblingBefore = goog.dom.insertSiblingBefore;


/**
 * Inserts a new node after an existing reference node (i.e., as the next
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert after.
 */
goog.dom.DomHelper.prototype.insertSiblingAfter = goog.dom.insertSiblingAfter;


/**
 * Removes a node from its parent.
 * @param {Node} node The node to remove.
 * @return {Node} The node removed if removed; else, null.
 */
goog.dom.DomHelper.prototype.removeNode = goog.dom.removeNode;


/**
 * Replaces a node in the DOM tree. Will do nothing if {@code oldNode} has no
 * parent.
 * @param {Node} newNode Node to insert.
 * @param {Node} oldNode Node to replace.
 */
goog.dom.DomHelper.prototype.replaceNode = goog.dom.replaceNode;


/**
 * Flattens an element. That is, removes it and replace it with its children.
 * @param {Element} element The element to flatten.
 * @return {Element|undefined} The original element, detached from the document
 *     tree, sans children, or undefined if the element was already not in the
 *     document.
 */
goog.dom.DomHelper.prototype.flattenElement = goog.dom.flattenElement;


/**
 * Returns the first child node that is an element.
 * @param {Node} node The node to get the first child element of.
 * @return {Element} The first child node of {@code node} that is an element.
 */
goog.dom.DomHelper.prototype.getFirstElementChild =
    goog.dom.getFirstElementChild;


/**
 * Returns the last child node that is an element.
 * @param {Node} node The node to get the last child element of.
 * @return {Element} The last child node of {@code node} that is an element.
 */
goog.dom.DomHelper.prototype.getLastElementChild = goog.dom.getLastElementChild;


/**
 * Returns the first next sibling that is an element.
 * @param {Node} node The node to get the next sibling element of.
 * @return {Element} The next sibling of {@code node} that is an element.
 */
goog.dom.DomHelper.prototype.getNextElementSibling =
    goog.dom.getNextElementSibling;


/**
 * Returns the first previous sibling that is an element.
 * @param {Node} node The node to get the previous sibling element of.
 * @return {Element} The first previous sibling of {@code node} that is
 *     an element.
 */
goog.dom.DomHelper.prototype.getPreviousElementSibling =
    goog.dom.getPreviousElementSibling;


/**
 * Returns the next node in source order from the given node.
 * @param {Node} node The node.
 * @return {Node} The next node in the DOM tree, or null if this was the last
 *     node.
 */
goog.dom.DomHelper.prototype.getNextNode =
    goog.dom.getNextNode;


/**
 * Returns the previous node in source order from the given node.
 * @param {Node} node The node.
 * @return {Node} The previous node in the DOM tree, or null if this was the
 *     first node.
 */
goog.dom.DomHelper.prototype.getPreviousNode =
    goog.dom.getPreviousNode;


/**
 * Whether the object looks like a DOM node.
 * @param {*} obj The object being tested for node likeness.
 * @return {boolean} Whether the object looks like a DOM node.
 */
goog.dom.DomHelper.prototype.isNodeLike = goog.dom.isNodeLike;


/**
 * Whether a node contains another node.
 * @param {Node} parent The node that should contain the other node.
 * @param {Node} descendant The node to test presence of.
 * @return {boolean} Whether the parent node contains the descendent node.
 */
goog.dom.DomHelper.prototype.contains = goog.dom.contains;


/**
 * Returns the owner document for a node.
 * @param {Node} node The node to get the document for.
 * @return {!Document} The document owning the node.
 */
goog.dom.DomHelper.prototype.getOwnerDocument = goog.dom.getOwnerDocument;


/**
 * Cross browser function for getting the document element of an iframe.
 * @param {HTMLIFrameElement|HTMLFrameElement} iframe Iframe element.
 * @return {!HTMLDocument} The frame content document.
 */
goog.dom.DomHelper.prototype.getFrameContentDocument =
    goog.dom.getFrameContentDocument;


/**
 * Cross browser function for getting the window of a frame or iframe.
 * @param {HTMLIFrameElement|HTMLFrameElement} frame Frame element.
 * @return {Window} The window associated with the given frame.
 */
goog.dom.DomHelper.prototype.getFrameContentWindow =
    goog.dom.getFrameContentWindow;


/**
 * Cross browser function for setting the text content of an element.
 * @param {Element} element The element to change the text content of.
 * @param {string} text The string that should replace the current element
 *     content with.
 */
goog.dom.DomHelper.prototype.setTextContent = goog.dom.setTextContent;


/**
 * Finds the first descendant node that matches the filter function. This does
 * a depth first search.
 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @return {(Node, undefined)} The found node or undefined if none is found.
 */
goog.dom.DomHelper.prototype.findNode = goog.dom.findNode;


/**
 * Finds all the descendant nodes that matches the filter function. This does a
 * depth first search.
 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @return {Array.<Node>} The found nodes or an empty array if none are found.
 */
goog.dom.DomHelper.prototype.findNodes = goog.dom.findNodes;


/**
 * Returns the text contents of the current node, without markup. New lines are
 * stripped and whitespace is collapsed, such that each character would be
 * visible.
 *
 * In browsers that support it, innerText is used.  Other browsers attempt to
 * simulate it via node traversal.  Line breaks are canonicalized in IE.
 *
 * @param {Node} node The node from which we are getting content.
 * @return {string} The text content.
 */
goog.dom.DomHelper.prototype.getTextContent = goog.dom.getTextContent;


/**
 * Returns the text length of the text contained in a node, without markup. This
 * is equivalent to the selection length if the node was selected, or the number
 * of cursor movements to traverse the node. Images & BRs take one space.  New
 * lines are ignored.
 *
 * @param {Node} node The node whose text content length is being calculated.
 * @return {number} The length of {@code node}'s text content.
 */
goog.dom.DomHelper.prototype.getNodeTextLength = goog.dom.getNodeTextLength;


/**
 * Returns the text offset of a node relative to one of its ancestors. The text
 * length is the same as the length calculated by
 * {@code goog.dom.getNodeTextLength}.
 *
 * @param {Node} node The node whose offset is being calculated.
 * @param {Node=} opt_offsetParent Defaults to the node's owner document's body.
 * @return {number} The text offset.
 */
goog.dom.DomHelper.prototype.getNodeTextOffset = goog.dom.getNodeTextOffset;


/**
 * Walks up the DOM hierarchy returning the first ancestor that has the passed
 * tag name and/or class name. If the passed element matches the specified
 * criteria, the element itself is returned.
 * @param {Node} element The DOM node to start with.
 * @param {?string=} opt_tag The tag name to match (or null/undefined to match
 *     any node regardless of tag name). Must be uppercase (goog.dom.TagName).
 * @param {?string=} opt_class The class name to match (or null/undefined to
 *     match any node regardless of class name).
 * @return {Node} The first ancestor that matches the passed criteria, or
 *     null if none match.
 */
goog.dom.DomHelper.prototype.getAncestorByTagNameAndClass =
    goog.dom.getAncestorByTagNameAndClass;


/**
 * Walks up the DOM hierarchy returning the first ancestor that passes the
 * matcher function.
 * @param {Node} element The DOM node to start with.
 * @param {function(Node) : boolean} matcher A function that returns true if the
 *     passed node matches the desired criteria.
 * @param {boolean=} opt_includeNode If true, the node itself is included in
 *     the search (the first call to the matcher will pass startElement as
 *     the node to test).
 * @param {number=} opt_maxSearchSteps Maximum number of levels to search up the
 *     dom.
 * @return {Node} DOM node that matched the matcher, or null if there was
 *     no match.
 */
goog.dom.DomHelper.prototype.getAncestor = goog.dom.getAncestor;
goog.provide('linktweak.Content');
goog.require('goog.Uri');
goog.require('goog.dom');
goog.require('goog.events.EventHandler');
goog.require('linktweak.globals');

/**
 * Content script.
 * @param {Object} settings A object that contains setting data.
 * @constructor
 */
linktweak.Content = function(settings) {
  this.eh_ = new goog.events.EventHandler(this);
  this.eh_.listen(window, goog.events.EventType.MOUSEDOWN, this.onMouseDown);

  this.rules_ = [];
  try {
	var presets = linktweak.globals.generatePresetRules(settings['presets'] || {});
	var rules   = presets.concat(settings['rules'] || []), rule;
	for(var i = 0, l = rules.length ; i < l ; ++i) {
	  rule = this.prepareRule_(rules[i]);
	  if(rule) {
		this.rules_[this.rules_.length] = rule;
	  }
	}
  } catch(e) {}
};

/**
 * An object to hold all event handlers.
 * @type {goog.events.EventHandler}
 * @private
 */
linktweak.Content.prototype.eh_;

/**
 * Rewrite rules.
 * @type {Array.<Object>}
 * @private
 */
linktweak.Content.prototype.rules_;

/**
 * Receives a message from the background page.
 * @param {Object} data The message data.
 */
linktweak.Content.receiveMessage = function(data) {
  if(data['command'] == 'setup') {
	new linktweak.Content(data['settings']);
  }
};

/**
 * Prepare a rewrite rule.
 * @param {Object} rule A rule setting.
 * @return {Object} A rewrite rule.
 * @private
 */
linktweak.Content.prototype.prepareRule_ = function(rule) {
  var result = null;
  if(rule['pattern']) {
	result = {
	  pattern:    new RegExp(rule['pattern']),
	  subst:      '' + rule['subst'],
	  conditions: []
	};
	var conditions = rule['conditions'], condition;
	if(goog.isArrayLike(conditions)) {
	  for(var i = 0, l = conditions.length ; i < l ; ++i) {
		condition = this.prepareCondition_(conditions[i]);
		if(condition) {
		  result.conditions[result.conditions.length] = condition;
		}
	  }
	}
	if(result.conditions.length <= 0)
	  result = null;
  }
  return result;
};

/**
 * Prepare a rewrite condition.
 * @param {Object} rule A condition setting.
 * @return {Object} A rewrite condition.
 * @private
 */
linktweak.Content.prototype.prepareCondition_ = function(condition) {
  var result = null;
  if(condition['regexp']) {
	result = {
	  type:   condition['type'],
	  regexp: new RegExp(condition['regexp'])
	};
  }
  return result;
}

/**
 * This method is called when the user is clicked anywhere in the page.
 * @param {goog.events.Event} e The event object.
 */
linktweak.Content.prototype.onMouseDown = function(e) {
  if(!e.isMouseActionButton())
	return;

  var el = goog.dom.getAncestorByTagNameAndClass(e.target, 'a');
  if(el) {
	if(/^https?:\/\/(?:www|encrypted)\.google\.(?:com|com?\.\w\w|\w\w)\/url\?/.test(el.href)) {
	  var href   = goog.Uri.parse(el.href)
	  var target = href.getParameterValue('url');
	  if(target) {
		href.setParameterValue('url', this.rewriteUrl_(window.location.href, target));
		el.href = href.toString();
	  }
	} else {
	  el.href = this.rewriteUrl_(window.location.href, el.href);
	}
  }
};

/**
 * Test rewrite conditions.
 * @param {Array.<Object>} conditions Rewrite conditions.
 * @param {string} pageUrl The url of the host page.
 * @param {string} linkUrl A url to rewrite.
 * @return {boolean} True if all conditions are matched. False otherwise.
 * @private
 */
linktweak.Content.prototype.testConditions_ = function(conditions, pageUrl, linkUrl) {
  for(var i = 0, l = conditions.length ; i < l ; ++i) {
	var type   = conditions[i].type;
	var regexp = conditions[i].regexp;
	if(type == linktweak.globals.ConditionType.PAGE_URL_IS_MATCHED_WITH) {
	  if(!regexp.test(pageUrl))
		return false;
	} else if(type == linktweak.globals.ConditionType.PAGE_URL_IS_NOT_MATCHED_WITH) {
	  if(regexp.test(pageUrl))
		return false;
	} else if(type == linktweak.globals.ConditionType.LINK_URL_IS_MATCHED_WITH) {
	  if(!regexp.test(linkUrl))
		return false;
	} else if(type == linktweak.globals.ConditionType.LINK_URL_IS_NOT_MATCHED_WITH) {
	  if(regexp.test(linkUrl))
		return false;
	}
  }
  return true;
};

/**
 * Rewrite the url.
 * @param {string} pageUrl The url of the host page.
 * @param {string} linkUrl A url to rewrite.
 * @return {string} The new url.
 * @private
 */
linktweak.Content.prototype.rewriteUrl_ = function(pageUrl, linkUrl) {
  var rules = this.rules_;
  for(var i = 0, l = rules.length ; i < l ; ++i) {
	if(this.testConditions_(rules[i].conditions, pageUrl, linkUrl)) {
	  return linkUrl.replace(rules[i].pattern, function() {
		var args = arguments;
		return rules[i].subst.replace(/\$([0-9\$])/g, function(str, cmd) {
		  if(cmd == '$') {
			return '$';
		  } else if(cmd == '0') {
			return encodeURIComponent(args[0]);
		  } else {
			return args[cmd - 0] || '';
		  }
		});
	  });
	}
  }
  return linkUrl;
};

if(linktweak.globals.IS_OPERA) {
  opera.extension.onmessage = function(e) {
	linktweak.Content.receiveMessage(e.data);
  }
} else if(linktweak.globals.IS_CHROME) {
  chrome.extension.sendRequest(
	{'command':'connect'},
	function(response) {
	  linktweak.Content.receiveMessage(response);
	});
}
