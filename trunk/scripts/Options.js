goog.provide('linktweak.Options');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events.EventHandler');
goog.require('linktweak.globals');

goog.scope(function() {
var ConditionType = linktweak.globals.ConditionType;

/**
 * Options page.
 * @constructor
 */
linktweak.Options = function() {
  this.initialValues_ = linktweak.globals.loadSettings();

  var presets  = goog.dom.getElement('presets');
  var rules    = goog.dom.getElement('rewrite-rules');
  var addBtn   = goog.dom.getElement('add-rule');
  var saveBtn  = goog.dom.getElement('save');
  var resetBtn = goog.dom.getElement('reset');

  this.eh_ = new goog.events.EventHandler(this);
  this.eh_.
    listen(presets,  goog.events.EventType.CHANGE, this.onChangePreset_).
    listen(rules,    goog.events.EventType.CLICK,  this.onClickRule_).
    listen(rules,    goog.events.EventType.CHANGE, this.onChangeRule_).
    listen(addBtn,   goog.events.EventType.CLICK,  this.onClickAddRule_).
    listen(saveBtn,  goog.events.EventType.CLICK,  this.onClickSave_).
    listen(resetBtn, goog.events.EventType.CLICK,  this.onClickReset_);

  this.resetValues_();
};

/**
 * A css class for rewrite rules.
 * @type {string}
 * @const
 */
linktweak.Options.RULE_CLASS = goog.getCssName('rule');

/**
 * A template for condition type selector.
 * @type {Array.<{label:string, number:value}>}
 * @const
 */
linktweak.Options.CONDITION_TYPES = [
  { label:'Link url is matched with',     value:ConditionType.LINK_URL_IS_MATCHED_WITH     },
  { label:'Link url is not matched with', value:ConditionType.LINK_URL_IS_NOT_MATCHED_WITH },
  { label:'Page url is matched with',     value:ConditionType.PAGE_URL_IS_MATCHED_WITH     },
  { label:'Page url is not matched with', value:ConditionType.PAGE_URL_IS_NOT_MATCHED_WITH }];

/**
 * An object to hold all event handlers.
 * @type {goog.events.EventHandler}
 * @private
 */
linktweak.Options.prototype.eh_;

/**
 * Initial values of rewrite rules.
 * @type {Object}
 * @private
 */
linktweak.Options.prototype.initialValues_;

/**
 * This method is called when preset rules are changed.
 * @param {goog.events.Event} e The event object.
 * @private
 */
linktweak.Options.prototype.onChangePreset_ = function(e) {
  this.updatePresetRules_();
  this.enableSave(true);
};

/**
 * This method is called when anywhere in rewrite rules are clicked.
 * @param {goog.events.Event} e The event object.
 * @private
 */
linktweak.Options.prototype.onClickRule_ = function(e) {
  var rule   = goog.dom.getAncestorByTagNameAndClass(e.target, null, linktweak.Options.RULE_CLASS);
  var anchor = goog.dom.getAncestorByTagNameAndClass(e.target, 'a');
  if(anchor) {
	var what = (/#(.+)/.exec(anchor) || [])[1];
	if(what == 'add-condition') {
	  var conditions = goog.dom.getElementByClass(
		goog.getCssName(linktweak.Options.RULE_CLASS, 'conditions'), rule);
	  conditions.appendChild(this.buildConditionForm_(false));
	  e.preventDefault();
	} else if(what == 'delete-condition') {
	  var condition = goog.dom.getAncestorByTagNameAndClass(
		anchor, null, goog.getCssName(linktweak.Options.RULE_CLASS, 'condition'));
	  goog.dom.removeNode(condition);
	  this.enableSave(true);
	  e.preventDefault();
	} else if(what == 'delete-rule') {
	  goog.dom.removeNode(rule);
	  this.enableSave(true);
	  e.preventDefault();
	}
  }
};

/**
 * This method is called when any text box is changed.
 * @param {goog.events.Event} e The event object.
 * @private
 */
linktweak.Options.prototype.onChangeRule_ = function(e) {
  this.enableSave(true);
};

/**
 * This method is called when "Add row" button is clicked.
 * @param {goog.events.Event} e The event object.
 * @private
 */
linktweak.Options.prototype.onClickAddRule_ = function(e) {
  e.preventDefault();
  goog.dom.getElement('rewrite-rules').appendChild(this.buildRewriteRuleForm_(false));
};

/**
 * This method is called when the Save button is clicked.
 * @param {goog.events.Event} e The event object.
 * @private
 */
linktweak.Options.prototype.onClickSave_ = function(e) {
  var settings = {
	'version': linktweak.globals.SETTINGS_VERSION,
	'presets': this.getPresetFlags_(),
	'rules':   this.getRewriteRules_()
  };
  localStorage[linktweak.globals.SETTINGS_STORAGE_NAME] = goog.json.serialize(settings);
  this.initialValues_ = settings;
  this.enableSave(false);
};

/**
 * This method is called when the Reset button is clicked.
 * @param {goog.events.Event} e The event object.
 * @private
 */
linktweak.Options.prototype.onClickReset_ = function(e) {
  this.resetValues_();
};

/**
 * Create elements for a rewrite rule form.
 * @param {boolean} isPreset True if the rule is a preset rule. False otherwise.
 * @param {Object=} opt_values Default values.
 * @return {Element} A root element of a rewrite rule form.
 * @private
 */
linktweak.Options.prototype.buildRewriteRuleForm_ = function(isPreset, opt_values) {
  var rootEl = goog.dom.createDom('div', linktweak.Options.RULE_CLASS);
  opt_values = opt_values || {};

  if(isPreset) {
	rootEl.className += ' ' + goog.getCssName(linktweak.Options.RULE_CLASS, 'preset');
  } else {
	rootEl.appendChild(goog.dom.createDom(
	  'div', goog.getCssName(linktweak.Options.RULE_CLASS, 'delete'),
	  goog.dom.createDom('a', { 'href':'#delete-rule' }, 'Delete this rule')));
  }

  var patternEl = goog.dom.createDom('input', {
	'class': goog.getCssName(linktweak.Options.RULE_CLASS, 'pattern'),
	'value': opt_values['pattern'] || '' });
  var substEl = goog.dom.createDom('input', {
	'class': goog.getCssName(linktweak.Options.RULE_CLASS, 'substitution'),
	'value': opt_values['subst']   || '' });

  rootEl.appendChild(goog.dom.createDom(
	'div', goog.getCssName(linktweak.Options.RULE_CLASS, 'replacement'),
	goog.dom.createDom(
	  'div', goog.getCssName(linktweak.Options.RULE_CLASS, 'label'), 'Rewrite pattern:'),
	goog.dom.createDom(
	  'div', goog.getCssName(linktweak.Options.RULE_CLASS, 'value'), patternEl),
	goog.dom.createDom(
	  'div', goog.getCssName(linktweak.Options.RULE_CLASS, 'label'), 'Substitution:'),
	goog.dom.createDom(
	  'div', goog.getCssName(linktweak.Options.RULE_CLASS, 'value'), substEl)));

  rootEl.appendChild(goog.dom.createDom(
	'div', goog.getCssName(linktweak.Options.RULE_CLASS, 'conditions-label'), 'Conditions:'));

  var conditionsEl = goog.dom.createDom(
	'div', goog.getCssName(linktweak.Options.RULE_CLASS, 'conditions'));
  goog.array.forEach(opt_values['conditions'] || [], function(value) {
	conditionsEl.appendChild(this.buildConditionForm_(isPreset, value));
  }, this);
  if(!isPreset && conditionsEl.childNodes.length <= 0) {
	conditionsEl.appendChild(this.buildConditionForm_(false));
  }
  rootEl.appendChild(conditionsEl);

  if(!isPreset) {
	rootEl.appendChild(goog.dom.createDom(
	  'div', goog.getCssName(linktweak.Options.RULE_CLASS, 'add-condition'),
	  goog.dom.createDom('a', { 'href':'#add-condition' }, 'Add condition')));
  } else {
	patternEl.disabled = 'disabled';
	substEl.disabled   = 'disabled';
  }

  return rootEl;
};

/**
 * Create elements for a condition form.
 * @param {boolean} isPreset True if the rule is a preset rule. False otherwise.
 * @param {Object=} opt_values Default values.
 * @return {Element} A root element of a condition form.
 * @private
 */
linktweak.Options.prototype.buildConditionForm_ = function(isPreset, opt_values) {
  var types = goog.array.map(linktweak.Options.CONDITION_TYPES, function(entry) {
	return goog.dom.createDom('option', { 'value':entry.value }, entry.label);
  }, this);
  var typeEl = goog.dom.createDom(
	'select', goog.getCssName(linktweak.Options.RULE_CLASS, 'condition-type'), types);
  var regexpEl = goog.dom.createDom('input', {
	'type':  'text',
	'class': goog.getCssName(linktweak.Options.RULE_CLASS, 'condition-regexp') });

  if(opt_values) {
	typeEl.value   = opt_values['type']   || 0;
	regexpEl.value = opt_values['regexp'] || '';
  }

  var rootEl = goog.dom.createDom(
	'div', goog.getCssName(linktweak.Options.RULE_CLASS, 'condition'), typeEl, regexpEl);

  if(!isPreset) {
	rootEl.appendChild(goog.dom.createDom('a', {
	  'href':  '#delete-condition',
	  'class': goog.getCssName(linktweak.Options.RULE_CLASS, 'condition-delete') }, '×'));
  } else {
	typeEl.disabled = 'disabled';
	regexpEl.disabled = 'disabled';
  }

  return rootEl;
};

/**
 * Update preset rules.
 * @private
 */
linktweak.Options.prototype.updatePresetRules_ = function() {
  var els = goog.dom.getElementsByTagNameAndClass(
	'div', goog.getCssName(linktweak.Options.RULE_CLASS, 'preset'),
	goog.dom.getElement('rewrite-rules'));
  goog.array.forEach(els, function(el) { goog.dom.removeNode(el); }, this);

  var rules = linktweak.globals.generatePresetRules(this.getPresetFlags_());
  var fg    = document.createDocumentFragment();
  goog.array.forEach(rules, function(rule) {
	fg.appendChild(this.buildRewriteRuleForm_(true, rule));
  }, this);

  var rulesEl = goog.dom.getElement('rewrite-rules');
  rulesEl.insertBefore(fg, rulesEl.firstChild);
};

/**
 * Reset values.
 * @private
 */
linktweak.Options.prototype.resetValues_ = function() {
  var rulesEl  = goog.dom.getElement('rewrite-rules');
  goog.dom.removeChildren(rulesEl);

  var presets = this.initialValues_['presets'] || {};
  goog.dom.getElement('preset-documents').checked = !!presets['documents'];
  goog.dom.getElement('preset-images').checked    = !!presets['images'];
  goog.dom.getElement('preset-maps').checked      = !!presets['maps'];
  goog.dom.getElement('preset-maps-lang').value   = presets['maps_lang']||'';
  this.updatePresetRules_();

  var rules = this.initialValues_['rules'] || [];
  if(rules.length <= 0) {
	rulesEl.appendChild(this.buildRewriteRuleForm_(false));
  } else {
	var fg = document.createDocumentFragment();
	goog.array.forEach(rules, function(rule) {
	  fg.appendChild(this.buildRewriteRuleForm_(false, rule));
	}, this);
	rulesEl.appendChild(fg);
  }

  this.enableSave(false);
};

/**
 * Extract preset flags from the document.
 * @return {Object} A object contains preset flags.
 * @private
 */
linktweak.Options.prototype.getPresetFlags_ = function() {
  var flags = {
	'documents': !!goog.dom.getElement('preset-documents').checked,
	'images':    !!goog.dom.getElement('preset-images').checked,
	'maps':      !!goog.dom.getElement('preset-maps').checked,
	'maps_lang': goog.dom.getElement('preset-maps-lang').value
  };
  return flags;
};

/**
 * Extract all rewrite rules from the document.
 * @return {Object} An array of rewrite rules.
 * @private
 */
linktweak.Options.prototype.getRewriteRules_ = function() {
  var els = goog.dom.getElementsByTagNameAndClass(
	'div', linktweak.Options.RULE_CLASS, goog.dom.getElement('rewrite-rules'));
  var rules = [];
  goog.array.forEach(els, function(el) {
	if(el.className.indexOf(goog.getCssName(linktweak.Options.RULE_CLASS, 'preset')) < 0) {
	  var rule = this.getRewriteRule_(el);
	  if(rule) {
		rules.push(rule);
	  }
	}
  }, this);
  return rules;
};

/**
 * Extract a rewrite rule from the specified form.
 * @param {Element} formEl A root element of the form.
 * @return {Object} A object containing a rewrite rule.
 * @private
 */
linktweak.Options.prototype.getRewriteRule_ = function(formEl) {
  var pattern = goog.dom.getElementByClass(
	goog.getCssName(linktweak.Options.RULE_CLASS, 'pattern'), formEl);
  var subst = goog.dom.getElementByClass(
	goog.getCssName(linktweak.Options.RULE_CLASS, 'substitution'), formEl);
  if(pattern && pattern.value && subst && subst.value) {
	var rule = {};
	rule['pattern']    = pattern.value;
	rule['subst']      = subst.value;
	rule['conditions'] = this.getRewriteConditions_(formEl);
	return rule;
  } else {
	return null;
  }
};

/**
 * Extract rewrite conditions from the specified form.
 * @param {Element} formEl A root element of the form.
 * @return {Object} An array of rewrite conditions.
 * @private
 */
linktweak.Options.prototype.getRewriteConditions_ = function(formEl) {
  var els = goog.dom.getElementsByTagNameAndClass(
	'div', goog.getCssName(linktweak.Options.RULE_CLASS, 'condition'), formEl);
  var conditions = [];
  goog.array.forEach(els, function(el) {
	var type = goog.dom.getElementByClass(
	  goog.getCssName(linktweak.Options.RULE_CLASS, 'condition-type'), el);
	var regexp = goog.dom.getElementByClass(
	  goog.getCssName(linktweak.Options.RULE_CLASS, 'condition-regexp'), el);
	if(type && regexp) {
	  conditions.push({ 'type':type.value, 'regexp':regexp.value });
	}
  }, this);
  return conditions;
};

/**
 * Enable or disable Save and Reset buttons.
 * @param {boolean} enable If true, enable buttons. Otherwise disable.
 * @private
 */
linktweak.Options.prototype.enableSave = function(enable) {
  var value = enable ? '' : 'disabled';
  goog.dom.getElement('save').disabled  = value;
  goog.dom.getElement('reset').disabled = value;
};

});

new linktweak.Options();
