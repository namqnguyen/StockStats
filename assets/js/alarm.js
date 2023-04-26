let alarms = {};

let createAlarm = (id, conditions) => {
	alarms[id] = (dataObj) => {
		let bid = dataObj.bids[dataObj.bids.length - 1]
		let ask = dataObj.asks[dataObj.asks.length - 1]
		let last = dataObj.lasts[dataObj.lasts.length - 1]
		if ( conditions.match('last') ) {
			if ( eval(conditions) ) {
				console.log('met: ' + conditions);
			}
		}
	};
};