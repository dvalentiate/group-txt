'use strict';

var lib = exports;

lib.db = null;
lib.plivoApi = null;

lib.options = {
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

function getFriendlyTime(date, relative) {
	if (typeof date === 'number') {
		date = new Date(date);
	}
	
	if (relative === undefined) {
		relative = new Date();
	} else if (typeof relative === 'number') {
		relative = new Date(relative);
	}
	
	var diff = Math.floor((relative.getTime() - date.getTime()) / 1000 / 60);
	
	var day = Math.floor(diff / 24 / 60);
	var hour = Math.floor(diff / 60) % 24;
	var min = diff % 60;
	
	return ''
		+ (day ? day + 'd' : '')
		+ (hour ? hour + 'h' : '')
		+ (min && !day ? min + 'm' : '')
	;
}

lib.action = function (initiatorTel, txt) {
	var action = txt.substr(0, (txt + ' ').indexOf(' '));
	if (typeof lib.actionMap[action] === 'function') {
		var param = txt.substr(action.length).trim();
		console.log(action, initiatorTel, param);
		lib.actionMap[action](initiatorTel, param);
	} else {
		console.log('message', initiatorTel, txt.trim());
		lib.message(initiatorTel, txt.trim());
	}
};

lib.attendance = function (initiatorTel, param) {
	var txt = lib.db.getList('recipient').map(function (x) {
		return x.alias || x.id;
	}).sort().join(', ');
	
	lib.sysMsg(initiatorTel, txt);
};

lib.help = function (initiatorTel, param) {
	var txt = Object.keys(lib.actionMap).join(', ');
	lib.sysMsg(initiatorTel, txt);
};

lib.history = function (initiatorTel, param) {
	if (param && (parseInt(param, 10) + '' !== param || parseInt(param, 10) <= 0)) {
		lib.sysMsg(initiatorTel, 'history failed, limit must be a positive integer number');
		return;
	}
	
	var timeLimit = (new Date()).getTime() - (parseInt(param, 10) || lib.options.history.defaultLimit) * 60 * 1000;
	
	var msgList = [];
	lib.db.getList('history')
		.filter(function (item) {
			return item.time > timeLimit;
		})
		.sort(function (a, b) {
			return a.time - b.time;
		})
		.forEach(function (x) {
			msgList.push(x.msg.replace('::', ': ' + getFriendlyTime(x.time) + ' :'));
		})
	;
	
	lib.plivoApi.send_message({
		dst: initiatorTel,
		src: process.env.HOST_NUMBER,
		text: msgList.join('\n\n')
	});
};

lib.join = function (initiatorTel, param) {
	lib.db.delete('recipient', initiatorTel);
	
	if (param.length > lib.options.alias.maxLength) {
		lib.sysMsg(initiatorTel, 'join failed, alias must be ' + lib.options.alias.maxLength + ' characters or less');
		return;
	}
	
	if (param.indexOf(':') !== -1 || param.indexOf(',') !== -1) {
		lib.sysMsg(initiatorTel, 'join failed, alias must not contain colon (:), nor comma (,) characters');
		return;
	}
	
	// normalize whitespace to 1 space
	param = param.replace(/[\t\n\r]/g, ' ').split(' ').filter(function (x) {return x !== '';}).join(' ');
	
	if (lib.db.get('recipient', param) !== null || lib.db.getList('recipient', {alias: param}).length) {
		lib.sysMsg(initiatorTel, 'join failed, alias already in use');
		return;
	}
	
	lib.db.put('recipient', initiatorTel, param ? {alias: param} : {});
	
	var initiator = lib.db.get('recipient', initiatorTel);
	
	lib.sysMsg(initiatorTel, 'joined as ' + (initiator.alias || initiator.id));
};

lib.leave = function (initiatorTel) {
	var initiator = lib.db.get('recipient', initiatorTel);
	
	lib.db.delete('recipient', initiatorTel);
	
	lib.sysMsg(initiatorTel, 'bye' + (initiator.alias ? (' ' + initiator.alias) : ''));
};

lib.message = function (initiatorTel, param) {
	var initiator = lib.db.get('recipient', initiatorTel);
	if (initiator === null) {
		return;
	}
	
	var msg = (initiator.alias || initiator.id) + ' :: ' + param;
	
	lib.db.post('history', {msg: msg, time: (new Date()).getTime(), initiator: initiator});
	
	var recipientSet = lib.db.getList('recipient');
	
	for (var recipient of recipientSet) {
		if (!lib.message.selfEcho && recipient.id === initiatorTel) {
			continue;
		}
		
		lib.plivoApi.send_message({
			dst: initiatorTel,
			src: process.env.HOST_NUMBER,
			text: msg
		});
	}
};

lib.sysMsg = function (initiatorTel, txt) {
	lib.plivoApi.send_message({
		dst: initiatorTel,
		src: process.env.HOST_NUMBER,
		text: 'system : ' + txt + ' :'
	});
};

lib.whois = function (initiatorTel, param) {
	var recipientSet = lib.db.getList('recipient');
	
	var found = null;
	for (var recipient of recipientSet) {
		if (recipient.alias === param || recipient.id === param) {
			found = recipient;
			break;
		}
	}
	
	if (found) {
		lib.sysMsg(initiatorTel, param + ' is ' + found.id);
	} else {
		lib.sysMsg(initiatorTel, 'alias was not found');
	}
};

lib.actionMap = {
	'.attendance': lib.attendance,
	'.help': lib.help,
	'.history': lib.history,
	'.join': lib.join,
	'.leave': lib.leave,
	'.msg': lib.message,
	'.whois': lib.whois
};
