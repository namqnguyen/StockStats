class StreamClient {
	#evtSource = null;

	constructor (url, func) {
		this.#evtSource = StreamClient.stream(url, func);
		return this.#evtSource;
	}

	getSource () {
		return this.#evtSource;
	}

	addListener (ev, func) {
		this.#evtSource.addEventListener(ev, func);
	}

	static stream (url, func) {
		let evtSource = new EventSource(url);
		return evtSource;
	}
}

export { StreamClient };