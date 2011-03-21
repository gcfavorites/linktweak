goog.provide('linktweak.Content');
goog.require('goog.json');
goog.require('goog.Uri');
goog.require('goog.dom');
goog.require('goog.events.EventHandler');
goog.require('linktweak.globals');

/**
 * Content script.
 * @param {string} rewriteRules The rewrite rules in JSON format.
 * @constructor
 */
linktweak.Content = function(rewriteRules) {
  this.eh_ = new goog.events.EventHandler(this);
  this.eh_.listen(window, goog.events.EventType.MOUSEDOWN, this.onMouseDown);

  var rules = null;
  try {
	rules = goog.json.parse(rewriteRules || '[]');
  } catch(e) {}
  if(!goog.isArrayLike(rules))
	rules = [];

  this.map_ = [];
  for(var i = 0, l = rules.length ; i < l ; ++i) {
	var rule = rules[i];
	if(rule['cond'] && rule['from']) {
	  this.map_[this.map_.length] = {
		cond: new RegExp(rule['cond']),
		from: new RegExp(rule['from']),
		to:   rule['to']
	  };
	}
  }

/*
  [
	{
	  cond: /^https?:\/\/code\.google\.com\/apis\//,
	  from: /\/apis\//,
	  to:   '/intl/en/apis/'
	},
	{ cond: /^https?:\/\/maps\.google\.co\.jp\/maps/,
	  from: /([?&])hl=en/,
	  to:   '$1hl=ja'
	}
  ];
*/
};

/**
 * An object to hold all event handlers.
 * @type {goog.events.EventHandler}
 * @private
 */
linktweak.Content.prototype.eh_;

/**
 * Rewrite map.
 * @type {Object}
 * @private
 */
linktweak.Content.prototype.map_;

/**
 * Receives a message from the background page.
 * @param {Object} data The message data.
 */
linktweak.Content.receiveMessage = function(data) {
  if(data['command'] == 'setup') {
	new linktweak.Content(data['rewriterules']);
  }
};

/**
 * This method is called when the user is clicked anywhere in the page.
 * @param {goog.events.Event} e The event object.
 */
linktweak.Content.prototype.onMouseDown = function(e) {
  var el = goog.dom.getAncestorByTagNameAndClass(e.target, 'a');
  if(el) {
	if(/^https?:\/\/(?:www|encrypted)\.google\.(?:com|com?\.\w\w|\w\w)\/url\?/.test(el.href)) {
	  var href   = goog.Uri.parse(el.href)
	  var target = href.getParameterValue('url');
	  if(target) {
		href.setParameterValue('url', this.rewriteUrl_(target));
		el.href = href.toString();
	  }
	} else {
	  el.href = this.rewriteUrl_(el.href);
	}
  }
};

/**
 * Rewrite the url.
 * @param {string} url A url to rewrite.
 * @return {string} The new url.
 * @private
 */
linktweak.Content.prototype.rewriteUrl_ = function(url) {
  var map = this.map_;
  for(var i = 0, l = map.length ; i < l ; ++i) {
	if(map[i].cond.test(url)) {
	  return url.replace(map[i].from, map[i].to);
	}
  }
  return url;
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
