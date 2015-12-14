'use strict';

var lib = exports;

lib.action = function (plivoApi, db, initiatorTel, txt) {
	var action = txt.substr(0, (txt + ' ').indexOf(' '));
	if (typeof lib.actionMap[action] === 'function') {
		var param = txt.substr(action.length).trim();
		console.log(action, initiatorTel, param);
		lib.actionMap[action](plivoApi, db, initiatorTel, param);
	} else {
		console.log('message', initiatorTel, txt.trim());
		lib.message(plivoApi, db, initiatorTel, txt.trim());
	}
	console.log(db.getList('recipient'));
};

lib.join = function (plivoApi, db, initiatorTel, param) {
	db.delete('recipient', initiatorTel);
	
	if (db.get('recipient', param) !== null || db.getList('recipient', {alias: param}).length) {
		plivoApi.send_message({
			dst: initiatorTel,
			src: process.env.HOST_NUMBER,
			text: 'system : join failed, alias already in use :'
		});
		return;
	}
	
	db.put('recipient', initiatorTel, param ? {alias: param} : {});
	
	var initiator = db.get('recipient', initiatorTel);
	
	plivoApi.send_message({
		dst: initiatorTel,
		src: process.env.HOST_NUMBER,
		text: 'system : joined as ' + (initiator.alias || initiator.id) + ' :'
	});
};

lib.leave = function (plivoApi, db, initiatorTel) {
	var initiator = db.get('recipient', initiatorTel);
	
	db.delete('recipient', initiatorTel);
	
	plivoApi.send_message({
		dst: initiatorTel,
		src: process.env.HOST_NUMBER,
		text: 'system : bye ' + (initiator.alias ? (initiator.alias + ' ') : '') + ':'
	});
};

lib.message = function (plivoApi, db, initiatorTel, param) {
	var initiator = db.get('recipient', initiatorTel);
	if (initiator === null) {
		return;
	}
	
	var recipientSet = db.getList('recipient');
	
	for (var recipient of recipientSet) {
		plivoApi.send_message({
			dst: initiatorTel,
			src: process.env.HOST_NUMBER,
			text: (initiator.alias || initiator.id) + ' :: ' + param
		});
	}
};

lib.whois = function (plivoApi, db, initiatorTel, param) {
	var recipientSet = db.getList('recipient');
	
	var found = null;
	for (var recipient of recipientSet) {
		if (recipient.alias === param || recipient.id === param) {
			found = recipient;
		}
	}
	
	if (found) {
		plivoApi.send_message({
			dst: initiatorTel,
			src: process.env.HOST_NUMBER,
			text: 'system : ' + param + ' is ' + found.id + ' :'
		});
	} else {
		plivoApi.send_message({
			dst: initiatorTel,
			src: process.env.HOST_NUMBER,
			text: 'system : alias was not found :'
		});
	}
};

lib.actionMap = {
	'.join': lib.join,
	'.leave': lib.leave,
	'.msg': lib.message,
	'.whois': lib.whois
};
