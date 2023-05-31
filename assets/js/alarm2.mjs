class BaseNotification {
	static askPermission (callback = null) {
		// function to actually ask the permissions
		function handleCallback (permission) {
			// set the button to shown or hidden, depending on what the user answers
			// notificationBtn.style.display = Notification.permission === "granted" ? "none" : "block";
			try {
				(callback !== null) ? callback(permission) : null;
			} catch(e) {
				return e;
			}
		}
	
		// Let's check if the browser supports notifications
		if (!("Notification" in window)) {
			console.log("This browser does not support notifications.");
		} else if ( this.isPromiseCapable() ) {
			Notification.requestPermission().then( perm => handleCallback(perm) );
		} else {
			Notification.requestPermission( perm => handleCallback(perm) );
		}
	}

	static isPromiseCapable () {
		try {
			Notification.requestPermission().then();
			return true;
		} catch (e) {
			return false;
		}
	}

	static notify (title, obj) {
		try {
			if (Notification.permission === 'granted') {
				new Notification(title, obj);
				return true;
			}
		} catch(e) {
			return e;
		}
	}
}

class TickerNotification extends BaseNotification {
	#notifications = {};
	#allowedKeys = ['bids', 'asks', 'lasts'];

	constructor (dataObj) {
		super();
		this.tickerData = dataObj;
	}

	static getInstance (dataObj) {
		if (!this.instance) {
			this.instance = new TickerNotification(dataObj);
		}
		return this.instance;
	}

	create (name, ticker, key, condition, interval = -1, callback = null) {
		if ( !this.#allowedKeys.includes(key) || !(ticker in this.tickerData) || !(key in this.tickerData[ticker].data) ) {
			return key + ' not allowed or does not exist in data object';
		}
		this.#notifications[name] = {
			check: key,
			condition: condition,
			interval: interval,
			func: ()=>{
				try {
					let notie = this.#notifications[name];
					let val = this.tickerData[ticker].data[key].slice(-1)[0];
					let cond = val + ' ' + condition;
					if ( eval(cond) ) {
						(callback === null) ? this.cb(key, val, name) : callback(key, val, name);
					}
					notie.lastChecked = Date.now();
				} catch (e) {
					console.log(e);
				}
			},
			lastChecked: null,
			lastNotified: null,
		};
		return 'notification "'+ name +'" created';
	}

	cb (key, val, name) {
		let notie = this.#notifications[name];
		var text = key + ' met:  ' + val + ' ' + notie.condition;
		let tmp = TickerNotification.notify(name + " Alarm", { body: text });
		if ( tmp === true ) {
			notie.lastNotified = Date.now();
		} else {
			console.log(tmp);
		}
	}

	checkAndNotify () {
		this.getNames().forEach(e => {
			let notie = this.#notifications[e];
			notie.func();
			if ( notie.interval === -1 && notie.lastNotified !== null ) {
				this.delete(e)
			}
		})
	}

	delete (name) {
		try {
			if ( name in this.#notifications )  {
				delete this.#notifications[name];
				return true;
			}
		} catch(e) {
			return e;
		}
	}
	
	
	deleteAll () {
		this.#notifications = {};
	}

	getNames () {
		return Object.keys(this.#notifications);
	}
}

// const TickerNotie = TickerNotification.getInstance(['bid'], {bids:[5]});

export {BaseNotification, TickerNotification};