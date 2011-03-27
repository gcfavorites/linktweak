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
