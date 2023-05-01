class BasicNotification {
	static askPermission(callback = null) {
		// function to actually ask the permissions
		function handleCallback(permission) {
			// set the button to shown or hidden, depending on what the user answers
			// notificationBtn.style.display = Notification.permission === "granted" ? "none" : "block";
			try {
				if (callback !== null) {
					callback(permission);
				}
			} catch(e) {
				return e;
			}
		}
	
		// Let's check if the browser supports notifications
		if (!("Notification" in window)) {
			console.log("This browser does not support notifications.");
		} else if ( this.isPromiseCapable() ) {
			Notification.requestPermission().then((permission) => {
				handleCallback(permission);
			});
		} else {
			Notification.requestPermission((permission) => {
				handleCallback(permission);
			});
		}
	}

	static isPromiseCapable() {
		try {
			Notification.requestPermission().then();
			return true;
		} catch (e) {
			return false;
		}
	}

	static notify(title, obj) {
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

class TickerNotification extends BasicNotification {
	#notifications = {};

	constructor (allowedArr, dataObj) {
		super();
		this.allowed = allowedArr;
		this.data = dataObj;
	}

	static getInstance(allowedArr, dataObj) {
		if (!this.instance) {
			this.instance = new BasicNotification(allowedArr, dataObj);
		}
		return this.instance;
	}

	create = (name, key, condition, interval = -1, callback = this.cb)=>{
		if ( !this.allowed.includes(key) || !(key in this.data) ) {
			return key + ' not allowed or does not exist in data object';
		}
		this.#notifications[name] = {
			check: key,
			condition: condition,
			interval: interval,
			func: ()=>{
				try {
					let notie = this.#notifications[name];
					let val = this.data[key][this.data[key].length - 1];
					let cond = val + ' ' + condition;
					if ( eval(cond) ) {
						callback(key, val, name);
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

	cb = (key, val, name)=>{
		let alarm = this.#notifications[name];
		var text = key + ' met:  ' + val + ' ' + alarm.condition;
		let tmp = TickerNotification.notify(name + " Alarm", { body: text });
		if ( tmp === true ) {
			alarm.lastNotified = Date.now();
		} else {
			console.log(tmp);
		}
	}

	check = ()=>{
		this.getNames().forEach(e => {
			let notie = this.#notifications[e];
			notie.func();
			if ( notie.interval === -1 && !notie.lastNotified !== null ) {
				this.delete(e)
			}
		})
	}

	delete = (name)=>{
		try {
			if ( name in this.#notifications )  {
				delete this.#notifications[name];
				return true;
			}
		} catch(e) {
			return e;
		}
	}
	
	
	deleteAll = ()=>{
		this.#notifications = {};
	}

	getNames = ()=>{
		return Object.keys(this.#notifications);
	}
}

// const TickerNotie = TickerNotification.getInstance(['bid'], {bids:[5]});

export {BasicNotification, TickerNotification};