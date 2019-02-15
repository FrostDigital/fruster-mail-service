const bus = require('fruster-bus');
const sendMail = require('./lib/send-mail');

module.exports.start = function (busAddress) {
	return bus.connect(busAddress)
		.then(() => {
			bus.subscribe('mail-service.send', req => sendMail(req));
		});
};