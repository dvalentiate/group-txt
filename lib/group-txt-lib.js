'use strict';

var _ = require('lodash');
var friendlyTime = require('./friendly-time.js');

module.exports = function (plivoApi, db, options) {
	var self = this;
	
	self.defaultOptions = {
		alias: {
			maxLength: 15
		},
		message: {
			selfEcho: false
		},
		history: {
			defaultLimit: 120 // in minutes
		}
	};
	
	self.options = _.assign(this.defaultOptions, options);
	
	self.act = function (initiatorTel, txt) {
		var action = txt.substr(0, (txt + ' ').indexOf(' '));
		if (typeof self.getActionMap()[action] === 'function') {
			var param = txt.substr(action.length).trim();
			console.log(action, initiatorTel, param);
			self.getActionMap()[action](initiatorTel, param);
		} else {
			console.log('message', initiatorTel, txt.trim());
			self.message(initiatorTel, txt.trim());
		}
	};
	
	self.getActionMap = function () {
		return {
			'.attendance': self.attendance,
			'.help': self.help,
			'.history': self.history,
			'.join': self.join,
			'.leave': self.leave,
			'.msg': self.message,
			'.whois': self.whois
		};
	};
	
	self.attendance = function (initiatorTel, param) {
		var txt = db.getList('recipient').map(function (x) {
			return x.alias || x.id;
		}).sort().join(', ');
		
		self.sysMsg(initiatorTel, txt);
	};
	
	self.help = function (initiatorTel, param) {
		var txt = Object.keys(self.getActionMap()).join(', ');
		self.sysMsg(initiatorTel, txt);
	};
	
	self.history = function (initiatorTel, param) {
		if (param && (parseInt(param, 10) + '' !== param || parseInt(param, 10) <= 0)) {
			self.sysMsg(initiatorTel, 'history failed, limit must be a positive integer number');
			return;
		}
		
		var timeLimit = (new Date()).getTime() - (parseInt(param, 10) || self.options.history.defaultLimit) * 60 * 1000;
		
		var msgList = [];
		db.getList('history')
			.filter(function (item) {
				return item.time > timeLimit;
			})
			.sort(function (a, b) {
				return a.time - b.time;
			})
			.forEach(function (x) {
				msgList.push(x.msg.replace('::', ': ' + friendlyTime.format(x.time) + ' :'));
			})
		;
		
		plivoApi.send_message({
			dst: initiatorTel,
			src: process.env.HOST_NUMBER,
			text: msgList.join('\n\n')
		});
	};
	
	self.join = function (initiatorTel, param) {
		if (param.length > self.options.alias.maxLength) {
			self.sysMsg(initiatorTel, 'join failed, alias must be ' + self.options.alias.maxLength + ' characters or less');
			return;
		}
		
		if (param.indexOf(':') !== -1 || param.indexOf(',') !== -1) {
			self.sysMsg(initiatorTel, 'join failed, alias must not contain colon (:), nor comma (,) characters');
			return;
		}
		
		// normalize whitespace to 1 space
		param = param.replace(/[\t\n\r]/g, ' ').split(' ').filter(function (x) {return x !== '';}).join(' ');
		
		if (param === 'system') {
			self.sysMsg(initiatorTel, 'join failed, alias can not be system');
			return;
		}
		
		if (param.match(/\d{11}/)) {
			self.sysMsg(initiatorTel, 'join failed, alias can not look like a phone number');
			return;
		}
		
		var existingRecipient = db.getList('recipient').filter(function (x) {
			return x.alias === param;
		})[0] || null;
		
		if (existingRecipient && existingRecipient.id !== initiatorTel) {
			self.sysMsg(initiatorTel, 'join failed, alias already in use');
			return;
		}
		
		db.put('recipient', initiatorTel, param ? {alias: param} : {});
		
		var initiator = db.get('recipient', initiatorTel);
		
		self.sysMsg(initiatorTel, 'joined as ' + (initiator.alias || initiator.id));
	};
	
	self.leave = function (initiatorTel) {
		var initiator = db.get('recipient', initiatorTel);
		
		db.delete('recipient', initiatorTel);
		
		self.sysMsg(initiatorTel, 'bye' + (initiator.alias ? (' ' + initiator.alias) : ''));
	};
	
	self.message = function (initiatorTel, param) {
		var initiator = db.get('recipient', initiatorTel);
		if (initiator === null) {
			return;
		}
		
		var msg = (initiator.alias || initiator.id) + ' :: ' + param;
		
		db.post('history', {msg: msg, time: (new Date()).getTime(), initiator: initiator});
		
		var recipientSet = db.getList('recipient');
		
		for (var recipient of recipientSet) {
			if (!self.message.selfEcho && recipient.id === initiatorTel) {
				continue;
			}
			
			plivoApi.send_message({
				dst: recipient.id,
				src: process.env.HOST_NUMBER,
				text: msg
			});
		}
	};
	
	self.sysMsg = function (initiatorTel, txt) {
		plivoApi.send_message({
			dst: initiatorTel,
			src: process.env.HOST_NUMBER,
			text: 'system : ' + txt + ' :'
		});
	};
	
	self.whois = function (initiatorTel, param) {
		var recipientSet = db.getList('recipient');
		
		var found = null;
		for (var recipient of recipientSet) {
			if (recipient.alias === param || recipient.id === param) {
				found = recipient;
				break;
			}
		}
		
		if (found) {
			self.sysMsg(initiatorTel, param + ' is ' + found.id);
		} else {
			self.sysMsg(initiatorTel, 'alias was not found');
		}
	};
};
