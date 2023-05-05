class BasicEventEmitter{
	#callbacks = {};

    on(event, cb) {
        if (!this.callbacks[event]) this.#callbacks[event] = [];
        this.#callbacks[event].push(cb);
    }

    emit(event, data) {
        let cbs = this.callbacks[event];
        if (cbs) {
            cbs.forEach(cb => cb(data));
        }
    }

	
}