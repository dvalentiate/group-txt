'use strict';

var bodyParser = require('body-parser');
var db = require('./db.js');
var express = require('express');
var lib = require('./lib.js');
var plivo = require('plivo');

var app = express();

if (!process.env.PLIVO_AUTH_ID || !process.env.PLIVO_AUTH_TOKEN || !process.env.HOST_NUMBER || !process.env.HOST_PLIVO_ENDPOINT) {
	console.error('must provide PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, HOST_NUMBER, and HOST_PLIVO_ENDPOINT as environment variables');
	process.exit(1);
}

var port = process.env.PLIVO_ENDPOINT_PORT || process.env.PORT || 80;

var plivoApi = plivo.RestAPI({
	authId: process.env.PLIVO_AUTH_ID,
	authToken: process.env.PLIVO_AUTH_TOKEN
});

db.createTable('recipient');
db.createTable('history');

app.use(bodyParser.urlencoded({extended: true}));
	
app.post('/plivo-endpoint/message', function(req, res) {
	console.log('message');
	console.log('Content-Type', req.get('Content-Type'));
	console.log('req.query', req.query);
	console.log('req.body', req.body);
	
	var initiator = req.body.From;
	
	lib.action(plivoApi, db, initiator, req.body.Text);
	
	var plivoResponse = plivo.Response();
	res.set('Content-Type', 'text/xml');
	res.send(plivoResponse.toXML());
});

app.post('/plivo-endpoint/answer', function(req, res) {
	console.log('answer');
	console.log('Content-Type', req.get('Content-Type'));
	console.log('req.query', req.query);
	console.log('req.body', req.body);
	
	var plivoResponse = plivo.Response();
	
	if (req.query.participant === 'initiator') {
		plivoResponse.addHangup({reason: 'rejected', schedule: 20});
		plivoResponse.addSpeak('Group Text');
	}
	
	res.set('Content-Type', 'text/xml');
	res.send(plivoResponse.toXML());
});

app.post('/plivo-endpoint/hangup', function(req, res) {
	console.log('hangup');
	console.log('Content-Type', req.get('Content-Type'));
	console.log('req.query', req.query);
	console.log('req.body', req.body);
	
	var plivoResponse = plivo.Response();
	res.set('Content-Type', 'text/xml');
	res.send(plivoResponse.toXML());
});


app.listen(port);
