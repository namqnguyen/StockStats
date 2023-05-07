var INTERVALS = {};

// var is to make it accessible (parent window object) from child iframe
var callFunc = (id) => {
	if (typeof INTERVALS[id] !== 'undefined' && INTERVALS[id] !== null) {
		INTERVALS[id]();
	}
};


var createIframe = (id, secs) => {
	const iframe = document.createElement('iframe');
	const html = '<html><head><meta http-equiv="refresh" content="' + secs + '"><script>parent.callFunc("'+id+'");</script></head></html>';
	iframe.srcdoc = html;
	iframe.sandbox = 'allow-same-origin allow-scripts';
	iframe.id = id;
	iframe.style.display = 'none';
	return iframe;
};


var setInterval2 = (func, ms, ...args) => {
	let secs = Math.floor(ms/1000);
	if (secs <= 0) {
		return null;
	}
	let id = 'f' + Date.now();
	INTERVALS[id] = ()=>{
		func(...args);
	};
	let iframe = createIframe(id, secs);
	document.body.appendChild(iframe);
	return id;
};


var clearInterval2 = (id) => {
	if ( typeof document.getElementById(id) !== 'undefined' ) {
		document.body.removeChild( document.getElementById(id) );
	}
};


var clearAllIntervals = () => {
	Object.keys(INTERVALS).forEach(id => {
		if (typeof INTERVALS[id] !== 'undefined' && INTERVALS[id] !== null) {
			clearInterval2(id);
		}
	});
	INTERVALS = {};
};


const runAtSpecificTimeOfDay = (hour, minutes, runOnce, func, ...args) => {
	const twentyFourHours = 86400000;
	const now = new Date();
	let eta_ms = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minutes, 0, 0).getTime() - now;
	if (eta_ms < 0) {
		// eta_ms += twentyFourHours;
		if (runOnce) {
			func(...args);
		}
	}
	setTimeout( ()=>{func(...args)}, eta_ms );
}


const exists = (what) => {
	try {
		let tmp = eval(what);
		return (typeof tmp !== 'undefined' && tmp !== null);
	} catch (e) {
		console.log(e);
		return false;
	}
}


const get_last = arr=>arr[arr.length-1];


const fetchJSON = async (url, body = null, method = 'GET') => {
	try {
		const response = await fetch(url, {
			"headers": {
				"accept": "*/*",
				"content-type": "application/json",
			},
			"body": body,
			"method": method,
		});
		return await response.json();
	} catch (e) {
		return {error: e};
	}
}