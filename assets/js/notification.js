function askNotificationPermission() {
	// function to actually ask the permissions
	function handlePermission(permission) {
		// set the button to shown or hidden, depending on what the user answers
		// notificationBtn.style.display = Notification.permission === "granted" ? "none" : "block";
	}

	// Let's check if the browser supports notifications
	if (!("Notification" in window)) {
		console.log("This browser does not support notifications.");
	} else if (checkNotificationPromise()) {
		Notification.requestPermission().then((permission) => {
			handlePermission(permission);
		});
	} else {
		Notification.requestPermission((permission) => {
			handlePermission(permission);
		});
	}
}


function checkNotificationPromise() {
	try {
		Notification.requestPermission().then();
	} catch (e) {
		return false;
	}

	return true;
}



// var img = "/to-do-notifications/img/icon-128.png";
var text = `HEY! Your task is now overdue.`;
var notification = new Notification("To do list", { body: text });


var n = new Notification("My Great Song");
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState === "visible") {
		// The tab has become visible so clear the now-stale Notification.
		n.close();
	}
});