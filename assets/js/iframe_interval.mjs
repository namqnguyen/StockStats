
class IframeInterval {

	#intervals = {};

	add (id, func, args) {
		this.#intervals[id] = ()=>{
			func(...args);
		};
	}


	callFunc (id) {
		if (typeof this.#intervals[id] !== 'undefined' && this.#intervals[id] !== null) {
			this.#intervals[id]();
		}
	};


	static createIframe (id, secs, callbackStr = '') {
		try {
			const iframe = document.createElement('iframe');
			const html = '<html><head><meta http-equiv="refresh" content="' + secs + '"><script>' + callbackStr + '</script></head></html>';
			iframe.srcdoc = html;
			iframe.sandbox = 'allow-same-origin allow-scripts';
			iframe.id = id;
			iframe.style.display = 'none';
			return iframe;
		} catch(e) {
			return e;
		}
	};


	static setInterval (func, ms, ...args) {
		try {
			if ( !exists('window.IframeInterval') ) {
				window.IframeInterval = new IframeInterval();
			}
			let secs = Math.floor(ms/1000);
			if (secs <= 0) {
				return 'ms must be >= 1000';
			}
			let id = Date.now();
			window.IframeInterval.add(id, func, args);
			let callback = 'parent.IframeInterval.callFunc("'+id+'")';
			let iframe = this.createIframe(id, secs, callback);
			document.body.appendChild(iframe);
			return id;
		} catch(e) {
			return e;
		}
	};


	static clearInterval (id) {
		if ( typeof document.getElementById(id) !== 'undefined' ) {
			document.body.removeChild( document.getElementById(id) );
		}
	};


	clearAllIntervals () {
		Object.keys(this.#intervals).forEach(id => {
			if (typeof this.#intervals[id] !== 'undefined' && this.#intervals[id] !== null) {
				this.clearInterval(id);
			}
		});
		this.#intervals = {};
	};

}

export {IframeInterval};
