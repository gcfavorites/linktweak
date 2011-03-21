goog.provide('linktweak.Options');
goog.require('goog.dom');
goog.require('goog.json');
goog.require('goog.events.EventHandler');
goog.require('linktweak.globals');

/**
 * Options page.
 * @constructor
 */
linktweak.Options = function() {
  try {
	this.initialValues_ = goog.json.parse(localStorage['rewriterules']||'[]');
  } catch(e) {}
  if(!goog.isArrayLike(this.initialValues_))
	this.initialValues_ = [];

  var table    = goog.dom.getElement('rules');
  var addBtn   = goog.dom.getElement('add-row');
  var saveBtn  = goog.dom.getElement('save');
  var resetBtn = goog.dom.getElement('reset');
  this.eh_ = new goog.events.EventHandler(this);
  this.eh_.
    listen(table,    goog.events.EventType.CLICK,  this.onClickTable_).
    listen(table,    goog.events.EventType.CHANGE, this.onChangeTable_).
    listen(addBtn,   goog.events.EventType.CLICK,  this.onClickAddRow_).
    listen(saveBtn,  goog.events.EventType.CLICK,  this.onClickSave_).
    listen(resetBtn, goog.events.EventType.CLICK,  this.onClickReset_);
  this.resetValues_();
};

/**
 * An object to hold all event handlers.
 * @type {goog.events.EventHandler}
 * @private
 */
linktweak.Options.prototype.eh_;

/**
 * Initial values of rewrite rules.
 * @type {Array.<Object>}
 * @private
 */
linktweak.Options.prototype.initialValues_;

/**
 * This method is called when the parameter table is clicked.
 * @param {goog.events.Event} e The event object.
 * @private
 */
linktweak.Options.prototype.onClickTable_ = function(e) {
  if(goog.dom.getAncestorByTagNameAndClass(e.target, 'a', 'delete')) {
	var tr = goog.dom.getAncestorByTagNameAndClass(e.target, 'tr');
	if(tr) {
	  goog.dom.removeNode(tr);
	  this.enableSave(true);
	}
  }
};

/**
 * This method is called when any text box is changed.
 * @param {goog.events.Event} e The event object.
 * @private
 */
linktweak.Options.prototype.onChangeTable_ = function(e) {
  this.enableSave(true);
};

/**
 * This method is called when "Add row" button is clicked.
 * @param {goog.events.Event} e The event object.
 * @private
 */
linktweak.Options.prototype.onClickAddRow_ = function(e) {
  e.preventDefault();
  this.addRow_();
};

/**
 * This method is called when the Save button is clicked.
 * @param {goog.events.Event} e The event object.
 * @private
 */
linktweak.Options.prototype.onClickSave_ = function(e) {
  var rules = this.getRewriteRules_();
  localStorage['rewriterules'] = goog.json.serialize(rules);
  this.initialValues_ = rules;
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
 * Adds a row into the table.
 * @param {Object=} values Values of the row.
 * @private
 */
linktweak.Options.prototype.addRow_ = function(values) {
  values   = values || {};
  var keys = ['cond', 'from', 'to'];
  var tr   = goog.dom.createElement('tr');
  for(var i = 0, l = keys.length ; i < l ; ++i) {
	tr.appendChild(goog.dom.createDom(
	  'td', keys[i],goog.dom.createDom(
		'input', { 'type':'text', 'value':values[keys[i]] || '' })));
  }
  var a       = goog.dom.createDom('a', 'delete');
  a.innerHTML = '&times;';
  tr.appendChild(goog.dom.createDom('td', 'button', a));
  goog.dom.getElement('rules').appendChild(tr);
};

/**
 * Reset values.
 * @private
 */
linktweak.Options.prototype.resetValues_ = function() {
  var table = goog.dom.getElement('rules');
  goog.dom.removeChildren(table);
  for(var i = 0, l = this.initialValues_.length ; i < l ; ++i) {
	this.addRow_(this.initialValues_[i]);
  }
  this.addRow_();
  this.enableSave(false);
};

/**
 * Returns an object containing rewrite rules.
 * @return {Object} An object containing rewrite rules.
 * @private
 */
linktweak.Options.prototype.getRewriteRules_ = function() {
  var table = goog.dom.getElement('rules');
  var rules = [];
  for(var j = 0, rl = table.childNodes.length ; j < rl ; j++) {
	var tr = table.childNodes[j];
	if(tr.nodeName.toUpperCase() == 'TR') {
	  var rule = {}, exist = false;
	  for(var i = 0, cl = tr.childNodes.length ; i < cl ; ++i) {
		var klass = tr.childNodes[i].className;
		var input = tr.childNodes[i].getElementsByTagName('input')[0];
		if(input && klass) {
		  if(rule[klass] = input.value)
			exist = true;
		}
	  }
	  if(exist)
		rules.push(rule);
	}
  }
  return rules;
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

new linktweak.Options();
