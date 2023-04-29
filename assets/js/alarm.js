var WHAT = ['bid', 'ask', 'last'];
var notifications = {};


// TODO: make promise
var createNotification = (name, check, condition, callback, interval) => {
	if (!WHAT.includes(check)) return check + ' not allowed';
	notifications[name] = {
		check: check,
		condition: condition,
		interval: interval,
		func: ()=>{
			try {
				let arrName = check+'s';
				let price = dataObj[arrName][dataObj[arrName].length - 1];
				let cond = price + ' ' + condition;
				if ( eval(cond) ) {
					callback(check, price, name);
				}
				notifications[name].lastChecked = Date.now();
			} catch (e) {
				console.log(e);
			}
		},
		lastChecked: null,
		lastNotified: null,
	};
	return 'notification "'+ name +'" created';
};


// callback for alarms
var notify = (check, price, name) => {
	let alarm = notifications[name];
	var text = check + ' met:  ' + price + ' ' + alarm.condition;
	new Notification("WAL Alarm", { body: text });
	alarm.lastNotified = Date.now();
};


var doNotify = () => {
	Object.keys(notifications).forEach(e => {
		notifications[e].func();
	})
};


var deleteNotification = (name) => {
	if ( Object.keys(notifications).includes(name) ) {
		delete notifications[name];
	}
};


var deleteAllNotifications = () => {
	notifications = {};
};