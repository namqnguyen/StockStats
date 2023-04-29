class BasicNotification {

	constructor (allowedArr, dataObj) {
		this.allowed = allowedArr;
		this.data = dataObj;
		this.notifications = {};
	}

	static getInstance(allowedArr, dataObj) {
		if (!this.instance) {
			this.instance = new BasicNotification(allowedArr, dataObj);
		}
		return this.instance;
	}

	create = (name, check, condition, interval = -1, callback = this.cb)=>{
		let key = check+'s';
		if ( !this.allowed.includes(check) || !Object.keys(this.data).includes(key) ) {
			return check + ' not allowed or does not exist';
		}
		this.notifications[name] = {
			check: check,
			condition: condition,
			interval: interval,
			func: ()=>{
				try {
					let notie = this.notifications[name];
					let val = this.data[key][this.data[key].length - 1];
					let cond = val + ' ' + condition;
					if ( eval(cond) ) {
						callback(check, val, name);
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
		let alarm = this.notifications[name];
		var text = key + ' met:  ' + val + ' ' + alarm.condition;
		new Notification(name + " Alarm", { body: text });
		alarm.lastNotified = Date.now();
	}

	check = ()=>{
		this.getNames().forEach(e => {
			let notie = this.notifications[e];
			notie.func();
			if ( notie.interval === -1 && !notie.lastNotified !== null ) {
				this.delete(e)
			}
		})
	}

	delete = (name)=>{
		if ( this.getNames().includes(name) ) {
			delete this.notifications[name];
			return true;
		}
		return false;
	}
	
	
	deleteAll = ()=>{
		this.notifications = {};
	}

	getNames = ()=>{
		return Object.keys(this.notifications);
	}
}

const StockNotification = BasicNotification.getInstance(['bid'], {bids:[5]});

export default StockNotification;