const notifications = [];
const timestamps = [];

const maxAge = 1 * 60 * 1000;

function add(notification) {
    cleanup();
    notifications.push(notification);
    timestamps.push(Date.now());
}

function cleanup() {
    for (let i = 0; i < notifications.length; i++) {
        const timestamp = timestamps[i];
        if (Date.now() - timestamp > maxAge) {
            notifications.splice(i, 1);
            timestamps.splice(i, 1);
            i--;
        } else {
            break;
        }
    }
}

function get(timestamp) {
    if (!timestamp) timestamp = 0;
    const newNotifications = [];
    for (let i = notifications.length - 1; i >= 0 ; i--) {
        if (timestamps[i] > timestamp) {
            newNotifications.unshift(notifications[i]);
        } else {
            break;
        }
    }
    return newNotifications;
}

module.exports = {
    add: add,
    cleanup: cleanup,
    get: get
}