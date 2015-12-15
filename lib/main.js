'use strict';

var db = require('./db.js');
var dotenv = require('dotenv');
var lib = require('./lib.js');
var plivo = require('plivo');

dotenv.config({silent: true});

if (!process.env.PLIVO_AUTH_ID || !process.env.PLIVO_AUTH_TOKEN || !process.env.HOST_NUMBER || !process.env.HOST_PLIVO_ENDPOINT) {
	console.error('must provide PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, HOST_NUMBER, and HOST_PLIVO_ENDPOINT as environment variables');
	process.exit(1);
}

if (!process.argv[2]) {
	console.error('must provide initiator phone number');
	process.exit(1);
}
var initiator = process.argv[2];

if (!process.argv[3]) {
	console.error('must provide the txt message');
	process.exit(1);
}
var txt = process.argv.slice(3).join(' ');

var plivoApi = plivo.RestAPI({
	authId: process.env.PLIVO_AUTH_ID,
	authToken: process.env.PLIVO_AUTH_TOKEN
});

db.createTable('recipient');
db.createTable('history');

lib.db = db;
lib.plivoApi = plivoApi;

lib.action(initiator, txt);
