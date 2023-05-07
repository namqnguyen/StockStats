import { StreamClient } from "./stream_client.mjs";

class TickerManager {
	#tickerData = {};
	#streamer = null;

	constructor (tickers = []) {
		this.add(tickers);
	}


	#getDataStub () {
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
				td[t] = this.#getDataStub();
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


	#getEndTime () {
		const def = null;
		const tickers = this.getTickers();
		if (tickers.length > 0 ) {
			const td = this.#tickerData[ tickers[0] ];
			return ('times' in td && td.times.length > 0) ?  td.times[0]  :  def
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


	#getUrl () {
		const end = this.#getEndTime();
		const from_time = (end === null) ? '' : `from_time=${end}`;
		return `/s/tickers?${from_time}`;
	}


	startStream (url = this.#getUrl()) {
		this.#streamer = new StreamClient(url, (e)=>{console.log(e)});
		this.#streamer.addEventListener("test", ev=>{
			try {
				this.#addData( JSON.parse(ev.data) );
			} catch(er) {
				console.log(er);
			}
		});
	}


	stopStream () {
		this.#streamer.close()
	}

}

export { TickerManager };