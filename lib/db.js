'use strict';

var uuid = require('node-uuid');

var db = {};

var getTable = function (table) {
	if (typeof table !== 'string') {
		throw new Error('table param must be a string');
	}
	if (db[table] === undefined) {
		throw new Error('table is not defined: ' + JSON.stringify(table));
	}
	
	return db[table];
}

exports.createTable = function (table) {
	db[table] = {};
};

exports.importTable = function (table, tableData) {
	if (!Array.isArray(tableData) && typeof tableData !== 'object') {
		throw new Error('tableData param must be either an array or an object');
	}
	
	if (Array.isArray(tableData)) {
		for (var rowData of tableData) {
			if (rowData.id) {
				exports.put(table, rowData.id, rowData);
			} else {
				exports.post(table, rowData);
			}
		}
	} else {
		var idSet = Object.keys(tableData);
		for (var id of idSet) {
			exports.put(table, id, tableData[id]);
		}
	}
};

exports.getList = function (table, where) {
	var dbTable = getTable(table);
	
	var list = [];
	var idSet = Object.keys(dbTable);
	for (var id of idSet) {
		if (Array.isArray(where)) {
			if (where.indexOf(id) === -1) {
				continue;
			}
		} else if (typeof where === 'object') {
			var propSet = Object.keys(where);
			for (var prop of propSet) {
				if (where[prop] !== dbTable[id][prop]) {
					continue;
				}
			}
		}
		list.push(dbTable[id]);
	}
	
	return list;
};

exports.get = function (table, id) {
	var dbTable = getTable(table);
	
	if (typeof id !== 'string') {
		throw new Error('id param must be a string');
	}
	
	return dbTable[id] || null;
};

exports.post = function (table, rowData) {
	var dbTable = getTable(table);
	
	if (typeof rowData !== 'object') {
		throw new Error('rowData param must be an object');
	}
	if (rowData.id !== undefined) {
		throw new Error('rowData must not define an id property');
	}
	
	var id = uuid.v4();
	
	dbTable[id] = JSON.parse(JSON.stringify(rowData));
	dbTable[id].id = id;
	
	return id;
};

exports.put = function (table, id, rowData) {
	var dbTable = getTable(table);
	
	if (typeof id !== 'string') {
		throw new Error('id param must be a string');
	}
	if (typeof rowData !== 'object') {
		throw new Error('rowData param must be an object');
	}
	if (rowData.id !== undefined && rowData.id !== id) {
		throw new Error('rowData id property must match id param');
	}
	
	dbTable[id] = JSON.parse(JSON.stringify(rowData));
	dbTable[id].id = id;
	
	return true;
};

exports.delete = function (table, id) {
	var dbTable = getTable(table);
	
	if (typeof id !== 'string') {
		throw new Error('id param must be a string');
	}
	
	if (dbTable[id] === undefined) {
		return false;
	}
	
	delete dbTable[id];
	
	return true;
};
