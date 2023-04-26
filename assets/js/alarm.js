var WHAT = ['bid', 'ask', 'last'];
var notifications = {};


var createNotification = (name, what, condition, callback, interval) => {
	if (!WHAT.includes(what)) return what + ' not allowed';
	notifications[name] = {
		interval: interval,
		func: ()=>{
			try {
				let arrName = what+'s';
				let price = dataObj[arrName][dataObj[arrName].length - 1];
				let cond = price + ' ' + condition;
				if ( eval(cond) ) {
					callback(what, price, condition);
				}
			} catch (e) {
				console.log(e);
			}
		},
		lastChecked: null,
	};
	return 'notification created';
};


var notify = (what, price, condition) => {
	var text = what + ' met:  ' + price + ' ' + condition;
	var notification = new Notification("WAL Alarm", { body: text });
};


var doNotify = () => {
	Object.keys(notifications).forEach(e => {
		notifications[e].func();
	})
};


var deleteNotification = (name) => {
	delete notifications[name];
};


var deleteAllNotifications = () => {
	notifications = {};
};