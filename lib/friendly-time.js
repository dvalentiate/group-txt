'use strict';

module.exports = {
	format: function (date, relative) {
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
			+ (!day && (min || !hour) ? min + 'm' : '')
		;
	}
};
