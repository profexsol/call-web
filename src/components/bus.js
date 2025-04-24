const bus = {
	on(event, callback) {
		document.addEventListener(event, (e) => callback(...e.detail));
	},
	dispatch(event, ...args) {
		document.dispatchEvent(new CustomEvent(event, { detail: args }));
	},
	remove(event, callback) {
		document.removeEventListener(event, callback);
	}
};

export default bus;