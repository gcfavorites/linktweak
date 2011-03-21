var opera = {};
opera.extension = {};

/**
 * This event listener is invoked when an injected script, popup, or
 * options environment is created that enables communication. The event's
 * source is a messagePort to the connecting environment.
 * @type {Function}
 */
opera.extension.onconnect;

/**
 * This event listener is invoked when an injected script, popup or
 * options environment is destroyed and communication is disabled.
 * The source is a messagePort to the disconnecting environment, used
 * only for comparative purposes. The port itself may be closed.
 * @type {Function}
 */
opera.extension.ondisconnect;

/**
 * This event listener is invoked when a message is received from
 * injected script, popup or options page. The source is a messagePort
 * to the connecting environment.
 * @type {Function}
 */
opera.extension.onmessage;

/**
 * This method is used to listen for events being dispatched. For
 * opera.extension, this inlcudes 'connect', 'message', and 'disconnect'.
 * @param {string} type Type of event; allowed values are: "message",
 *     "disconnect", and "connect".
 * @param {boolean} useCapture Keep false for now; note: this value
 *     currently has no purpose.
 * @param {Function} eventListener The function to be executed when the
 *     event occurs.
 */
opera.extension.addEventListener = function(type, useCapture, eventListener) {};

/**
 * This method removes a listener from receiving an event.
 * @param {string} type This is the type of event; allowed values are:
 *     'message', 'disconnect', and 'connect'.
 * @param {boolean} useCapture Keep false for now; note, this value
 *     currently has no purpose.
 * @param {Function} eventListener This is the function to be removed.
 */
opera.extension.removeEventListener = function(type, userCapture, eventListener) {};

/**
 * This method is used to broadcast data to all connected injected script
 * and popup environments associated with the extension.
 * @param {string|Object} data Data to be broadcasted.
 */
opera.extension.broadcastMessage = function(data) {};
