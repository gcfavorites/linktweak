goog.provide('linktweak.Background');
goog.require('linktweak.globals');

/**
 * Background script.
 * @constructor
 */
linktweak.Background = function() {
  if(linktweak.globals.IS_OPERA) {
	opera.extension.onconnect = goog.bind(this.onConnectOpera_, this);
  } else if(linktweak.globals.IS_CHROME) {
	chrome.extension.onRequest.addListener(goog.bind(this.onRequestChrome_, this));
  }
}

/**
 * Fired when a new content script is executed on Opera.
 * @type {Event} event An event object.
 * @private
 */
linktweak.Background.prototype.onConnectOpera_ = function(event) {
  var settings = linktweak.globals.loadSettings();
  event.source.postMessage({ 'command': 'setup', 'settings': settings });
};

/**
 * Fired when a request is sent from either an extension process or a
 * content script on Chrome.
 * @param {*} request The request sent by the calling script.
 * @param {Object} sender The sender information.
 * @param {Function} sendResponse Function to call when you have a response.
 *     The argument should be any JSON-ifiable object, or undefined if there
 *     is no response.
 * @private
 */
linktweak.Background.prototype.onRequestChrome_ = function(request, sender, sendResponse) {
  if(request['command'] == 'connect') {
	var settings = linktweak.globals.loadSettings();
	sendResponse({ 'command':'setup', 'settings':settings });
  }
};

new linktweak.Background();
