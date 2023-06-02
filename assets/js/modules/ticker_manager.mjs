import { StreamClient } from "./stream_client.mjs";
import { IframeInterval } from "./iframe_interval.mjs";

class TickerManager {
	#tickerData = {};
	#listeners = {};
	#streamer = null;
	#iframeid = null;
	#priceChangeListeners = {};
	TRACKERS = ['bid', 'ask', 'last', 'volume', 'low', 'high'];

	constructor (tickers = []) {
		this.add(tickers);
		Array.prototype.last = function() {
			return (this.length > 0) ? this.at(-1) : undefined;
		}
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


	remove (tickers = []) {
		(Array.isArray(tickers))? tickers.forEach( t=>delete this.#tickerData[t] ) : null;
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


	// #getEndTime () {
	// 	const def = null;
	// 	const tickers = this.getTickers();
	// 	if (tickers.length > 0 ) {
	// 		const td = this.#tickerData[ tickers[0] ];
	// 		return ('times' in td && td.times.length > 0) ?  td.times.at(-1)  :  def
	// 	}
	// 	return def;
	// }


	// #addDatax (data = {}) {
	// 	for (const [ticker, tbalv] of Object.entries(data)) { // tbalv: times, bids, asks, lasts, volumes
	// 		if ( !(ticker in this.#tickerData) ) continue;
	// 		let td = this.#tickerData[ticker];
	// 		for (const [k, v] of Object.entries( tbalv )) {
	// 			if (Array.isArray(v) && v.length > 0) {
	// 				(k in td) ?  td[k].push(...v)  :  td[k] = v;
	// 			} else {
	// 				td[k] = v;
	// 			}
	// 		}
	// 	}
	// }


	#addData (data = {}) {
		// for each ticker in new data
		for (const [ticker, tbalv] of Object.entries(data)) { // tbalv = {times:[], bids:[], asks:[], lasts:[], volumes:[], low:float, high:float}
			if ( !(ticker in this.#tickerData) ) continue;  // might not want this
			let td = this.#tickerData[ticker];
			if ( !('times' in td) ) {  // no data
				td = tbalv;
				continue;
			}
			let lt =  td['times'].at(-1);
			let cur_date = new Date().toJSON().slice(0,10);
			let time = new Date(cur_date+' '+lt).getTime();
			for (let i = 0; i < tbalv['times'].length; i++) {
				let time2 = new Date(cur_date+' '+tbalv['times'][i]).getTime();
				if (time2 > time) {  // get only times that are new
					['times', 'bids', 'asks', 'lasts', 'volumes'].forEach( (e)=>{
						td[e].push( ...tbalv[e].slice(i) );
					});
					td['low'] = tbalv['low'];
					td['high'] = tbalv['high'];
					break;
				}
				// else {
				// 	console.log( ticker, time2, time );
				// }
			}
		}
	}	

	#getStreamUrl () {
		const end = this.getMostRecentTime();
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


	getMostRecentTime () {
		let a = '0';
		for ( const [_, d] of Object.entries(this.#tickerData) ) {
			const t = d['times'];
			if (t.length == 0) continue;
			const lt = t.at(-1).replace(/:/g, '');
			if (lt > a) a = lt;
		}
		return (a > '0') ? [a.slice(0,2), a.slice(2,4), a.slice(4,6)].join(':') : null;
	}


	#getIframeIntervalUrl () {
		const end = this.getMostRecentTime();
		const from_time = (end === null) ? '' : `from_time=${end}`;
		return `/json/tickers?${from_time}`;
	}

	#handleNewData (new_data = {}) {
		if (Object.keys(new_data).length == 0) return;
		let last_data = this.getLastData();  // save previous last data
		this.#addData( new_data );
		new_data = this.getLastData();  // override to get last most data
		// TODO: move to potential "ChartManager" module
		if ( !GL.P && GL.cur_ticker in new_data && new_data[GL.cur_ticker]['times'].length > 0) {
			updateCharts2();
		}
		// per ticker listeners
		let list = Object.keys(this.#listeners);
		for ( const [ticker, data] of Object.entries(new_data) ) {
			if ( list.includes(ticker) ) {
				this.#listeners[ticker].forEach( func=>func(data) );
			}
		}
		// specific price change listeners, per ticker
		this.#callPriceChangeListeners(last_data, new_data);
	}

	startIframeIntervalStream () {
		let handler = async ()=>{
			let url = this.#getIframeIntervalUrl();
			const response = await fetch(url, {
				"headers": {
					"content-type": "application/json",
				},
				"body": null,
				"method": "GET",
			});
		
			let new_data = await response.json();
			this.#handleNewData(new_data);
		};
		this.stopSSEStream();
		this.#iframeid = IframeInterval.setInterval( handler, 1000 );
	}


	stopIframeIntervalStream () {
		IframeInterval.clearInterval( this.#iframeid );
	}


	addPriceChangeListener (ticker, tracking, callback) {
		if ( !(this.TRACKERS).includes(tracking) ) return false;
		let list = this.#priceChangeListeners;
		if ( !(ticker in list) ) {
			list[ticker] = {}
			list[ticker][tracking] = [callback];
			return true;
		}
		if ( !(tracking in list[ticker]) ) {
			list[ticker][tracking] = [callback];
			return true;
		}
		if ( !list[ticker][tracking].includes(callback) ) {
	  		list[ticker][tracking].push(callback);
			return true;
		}
		return false;
	}

	#callPriceChangeListeners (last_data, newd = null) {
		let td = last_data;
		if (typeof newd != 'object' || Object.keys(td).length == 0) return
		let list = this.#priceChangeListeners;
		for (const t in newd) {  // each ticker in new data
			if ( !(t in list) || !(t in td) ) return;
			this.TRACKERS.forEach( p => {
				let lt = list[t];  // list of listeners for ticker
				if ( !(p in lt) ) return
				let ntd = newd[t]; // new data for ticker
				let arr = ['bid', 'ask', 'last'];
				if ( arr.includes(p) ) {
					let pl = p+'s'; // plural
					if ( ntd[pl].last() == td[t][pl].last() ) return
					lt[p].forEach( f => f( ntd[pl].last(), t, ntd ) );
				} else {
					lt[p].forEach( f => f( ntd[p], t, ntd ) );
				}
			})
		};
	}


	getLastData () {
		let data = {};
		let td = this.#tickerData;
		for (const t in td) {
			data[t] = {};
			for (const [k, v] of Object.entries(td[t])) {
				if ( ['times', 'bids', 'asks', 'lasts', 'volumes'].includes(k) ) {
					data[t][k] = v.slice(-1);
				} else {
					data[t][k] = v;
				}
			}
		}
		return data;
	}

	startSSEStream (url = this.#getStreamUrl()) {
		this.stopIframeIntervalStream();
		this.#streamer = new StreamClient(url, (e)=>{console.log(e)});
		this.#streamer.addEventListener("update", ev=>{
			try {
				let new_data = JSON.parse(ev.data);
				this.#handleNewData(new_data);
			} catch(er) {
				console.log(er);
			}
		});
		this.#streamer.onerror = (er) => {
			this.#streamer.close();
			setTimeout(()=>{this.startSSEStream()}, 5000);
		};
	}


	stopSSEStream () {
		if (this.#streamer !== null) this.#streamer.close();
	}

}

let TM = new TickerManager();
if (typeof window === 'object' && self === window) {
	window.TM = TM
}

export {TM}