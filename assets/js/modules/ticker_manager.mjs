import { StreamClient } from "./stream_client.mjs";

class TickerManager {
	#tickerData = {};
	#streamer = null;


	constructor (tickers = []) {
		this.add(tickers);
	}


	add (tickers = []) {
		if (!Array.isArray(tickers)) return;
		tickers.forEach(t => {
			if (typeof t !== 'string' || (t in this.#tickerData) ) {
				return;
			}
			this.#tickerData[t] = {};
		});
	}


	remove (ticker) {
		return delete this.#tickerData[ticker];
	}


	getTickers () {
		return Object.keys(this.#tickerData);
	}


	getTickerData (tickers = null) {
		if ( tickers === null || Object.keys(this.#tickerData).length == 0 ) {
			return this.#tickerData;
		}
		let data = {};
		tickers.forEach(t => {
			if (t in this.#tickerData) {
				data[t] = this.#tickerData[t];
			}
		});
		return data;
	}


	#getEndTime () {
		const def = null;
		const tickers = this.getTickers();
		if (tickers.length > 0 ) {
			const data = this.getTickerData([ tickers[0] ]);
			if ( !('times' in data ) ) return def;
			const times = get_last( data.times );
			if (times.length > 0) {
				return times[0];
			}
		}
		return def;
	}


	#addData (data = {}) {
		for (const [ticker, tbalv] of Object.entries(data)) {
			if ( !(ticker in this.#tickerData) ) continue;
			for (const [k, arr] of Object.entries( tbalv )) {  // k = times, bids, asks, lasts, volumes
				this.#tickerData[ticker][k].push(...arr);
			}
		}
	}


	startStream () {
		const end = this.#getEndTime();
		const from_time = (end === null) ? '' : `from_time=${end}`;
		let url = `/s/tickers?${from_time}`;
		this.#streamer = new StreamClient(url, (e)=>{console.log(e)});
		this.#streamer.addEventListener("update", ev=>{
			this.#addData( JSON.parse(ev.data) );
		});
	}



	// startStream (func) {
	// 	const end = this.#getEndTime();
	// 	const from_time = end === null ? '' : `&from_time=${end}`;
	// 	let url = `/s/tickers?1=1${from_time}`;
	// 	this.#evtSource = new EventSource(url);
	// 	this.#evtSource.addEventListener("update", ev=>{
	// 		try {
	// 			func( JSON.parse(ev.data) );
	// 		} catch (er) {
	// 			console.log(er);
	// 		}
	// 	});
	// 	this.#evtSource.addEventListener("end", ev=>{
	// 		try {
	// 			func( JSON.parse(ev) );
	// 		} catch (er) {
	// 			console.log(er);
	// 		}
	// 		this.#evtSource.close();
	// 	});
	// }


	stopStream () {
		this.#streamer.close()
	}

}

export { TickerManager };