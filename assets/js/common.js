let INTERVALS = {};

// var is to make it globally accessible from iframe
var callFunc = (id) => {
	INTERVALS[id]();
};


let createIframe = (id, secs) => {
	const iframe = document.createElement('iframe');
	const html = '<html><head><meta http-equiv="refresh" content="' + secs + '"><script>parent.callFunc("'+id+'");</script></head></html>';
	iframe.srcdoc = html;
	iframe.sandbox = 'allow-same-origin allow-scripts';
	iframe.id = id;
	iframe.style.display = 'none';
	return iframe;
};


let setInterval2 = (func, ms, ...args) => {
	let id = 'func_' + Date.now();
	let secs = Math.floor(ms/1000);
	if (secs <= 0) {
		return null;
	}
	INTERVALS[id] = ()=>{
		func(...args);
	};
	let iframe = createIframe(id, secs);
	document.body.appendChild(iframe);
	return id;
};


let clearInterval2 = (id) => {
	document.body.removeChild( document.getElementById(id) );
}