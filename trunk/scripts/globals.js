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
	settings = JSON.parse(localStorage[linktweak.globals.SETTINGS_STORAGE_NAME]);
  }catch(e) {}
  if(!settings) {
	try{
	  settings = linktweak.globals.convertSettingsV0(
		JSON.parse(localStorage['rewriterules'] || ''));
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
