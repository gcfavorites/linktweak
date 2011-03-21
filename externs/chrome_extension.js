var chrome = {};
chrome.extension = {};
chrome.onRequest = {};

/**
 * Sends a single request to other listeners within the extension.
 * Similar to chrome.extension.connect, but only sends a single request
 * with an optional response. The chrome.extension.onRequest event is
 * fired in each page of the extension.
 * @param {string} extensionId The extension ID of the extension you
 *     want to connect to. If omitted, default is your own extension.
 * @param {*} request An object to send.
 * @param {Function} responseCallback A function to receive a response.
 */
chrome.extension.sendRequest = function(extensionId, request, responseCallback) {};

/**
 * Fired when a request is sent from either an extension process or a
 * content script.
 * @param {Function} handler Function to receive a message.
 */
chrome.onRequest.addListener = function(handler) {};
