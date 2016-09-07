const log = require('./log');
const mailService = require('./mail-service');
const conf = require('./conf');

mailService
  .start(conf.bus)
  .then(() => {
    log.info('Mail service started and connected to bus', conf.bus);
  })
  .error(err => {
    log.error('Failed starting mail service', err);
    process.exit(1);
  });

