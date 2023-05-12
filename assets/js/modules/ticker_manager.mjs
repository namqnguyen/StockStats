import { StreamClient } from "./stream_client.mjs";
import { IframeInterval } from "./iframe_interval.mjs";

class TickerManager {
	#tickerData = {};
	#listeners = {};
	#streamer = null;

	constructor (tickers = []) {
		this.add(tickers);
	}


	static getDataStub () {
		return {
			"times": [],
			"bids": [],
			"asks": [],
			"lasts": [],
			"volumes": [],
			"low": 0,
			"high": 0,
		}
	}


	add (tickers = []) {
		if (!Array.isArray(tickers)) return;
		let td = this.#tickerData;
		tickers.forEach(t => {
			if (typeof t === 'string' && !(t in td) ) {
				td[t] = this.getDataStub();
			}
		});
	}


	remove (ticker) {
		return delete this.#tickerData[ticker];
	}


	getTickers () {
		return Object.keys(this.#tickerData);
	}


	getTickerData (tickers = null) {  // array of tickers
		let td = this.#tickerData;
		if ( tickers === null || Object.keys(td).length == 0 ) {
			return td;
		}
		let data = {};
		tickers.forEach(t => {
			if (t in td) {
				data[t] = td[t];
			}
		});
		return data;
	}


	setTickerData (data) {
		this.#tickerData = data;
	}


	// getIntervalData (ticker = '', interval = null) {
	// 	if (ticker === '' || !(ticker in this.#tickerData) || interval === null) return {};

	// 	let data = {times: [], bids: [], asks: [], lasts: [], volumes: []};
	// 	for (const [k, v] of Object.entries(this.#tickerData[ticker])) {
	// 		for (const [i, n] of v.entries()) {
	// 			if (i % interval == 0) {
	// 				data[k].push(n);
	// 			}
	// 		}
	// 	}
	// 	return data;
	// }


	#getEndTime () {
		const def = null;
		const tickers = this.getTickers();
		if (tickers.length > 0 ) {
			const td = this.#tickerData[ tickers[0] ];
			return ('times' in td && td.times.length > 0) ?  td.times.slice(-1)[0]  :  def
		}
		return def;
	}


	#addData (data = {}) {
		for (const [ticker, tbalv] of Object.entries(data)) { // tbalv: times, bids, asks, lasts, volumes
			if ( !(ticker in this.#tickerData) ) continue;
			let td = this.#tickerData[ticker];
			for (const [k, v] of Object.entries( tbalv )) {
				if (Array.isArray(v) && v.length > 0) {
					(k in td) ?  td[k].push(...v)  :  td[k] = v;
				} else {
					td[k] = v;
				}
			}
		}
	}


	#getStreamUrl () {
		const end = this.#getEndTime();
		const from_time = (end === null) ? '' : `from_time=${end}`;
		return `/sse/tickers?${from_time}`;
	}


	addTickerListener ( ticker, func ) {
		if ( !(ticker in this.#listeners) ) {
			this.#listeners[ticker] = [func]
			return true;
		} 
		if ( !this.#listeners[ticker].includes(func) ) {
	  		this.#listeners[ticker].push(func)
			return true;
		}
		return false;
	}


	removeTickerListener ( ticker, func ) {
		let ret = false;
		this.#listeners[ticker].forEach( (f, i, arr) => {
			if (f === func) {
				arr.splice(i,1);
				ret = true;
			}
		});
		return true;
	}


	#getIframeIntervalUrl () {
		const end = this.#getEndTime();
		const from_time = (end === null) ? '' : `from_time=${end}`;
		return `/q/tickers?${from_time}`;
	}


	startIframeIntervalStream (url = this.#getIframeIntervalUrl()) {
		let handler = ()=>{

		};
		IframeInterval.setInterval( handler, 1000 );
	}

	startSSEStream (url = this.#getStreamUrl()) {
		this.#streamer = new StreamClient(url, (e)=>{console.log(e)});
		this.#streamer.addEventListener("update", ev=>{
			try {
				let new_data = JSON.parse(ev.data);
				this.#addData( new_data );
				if ( !GL.P && GL.cur_ticker in new_data && new_data[GL.cur_ticker]['times'].length > 0) {
					updateCharts2();
				}
				let list = Object.keys(this.#listeners);
				for ( const [ticker, data] of Object.entries(new_data) ) {
					if ( list.includes(ticker) ) {
						this.#listeners[ticker].forEach( func=>func(data) );
					}
				}
			} catch(er) {
				console.log(er);
			}
		});
		this.#streamer.onerror = (er) => {
			this.#streamer.close();
			setTimeout(()=>{this.startSSEStream()}, 5000);
		};
	}


	stopStream () {
		this.#streamer.close()
	}

}

let TM = new TickerManager();
if (typeof window === 'object') {
	window.TM = TM
}

export {TM}