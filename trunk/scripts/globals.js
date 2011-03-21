goog.provide('linktweak.globals');

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
