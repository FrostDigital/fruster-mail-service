
import * as log from "@fruster/log";
import { start as healthStart } from "@fruster/health";
import bus from "@fruster/bus";

import config from "./config";
import { start } from "./fruster-mail-service";
import constants from "./lib/constants";

import AbstractMailClient from "./lib/clients/AbstractMailClient";
import SendGridMailClient from "./lib/clients/SendGridMailClient";
import IdRelayMailClient from "./lib/clients/IdRelayMailClient";
import FlowMailerMailClient from "./lib/clients/FlowMailerMailClient";

const getMailClient = (): AbstractMailClient => {
	switch (config.mailClient) {
		case constants.mailClients.ID_RELAY:
			log.info(`Use ${constants.mailClients.ID_RELAY} as mail client`);
			return new IdRelayMailClient();

		case constants.mailClients.FLOW_MAILER:
			log.info(`Use ${constants.mailClients.FLOW_MAILER} as mail client`);
			return new FlowMailerMailClient();

		default:
			log.info(`Use ${constants.mailClients.SEND_GRID} as mail client`);
			return new SendGridMailClient();
	}
}

/**
 * Main entry point for starting the service.
 *
 * Must exit with an exit code greater than 1 in case service
 * could not be started which most commonly happens if it cannot
 * connect to bus or mongo (if mongo is used).
 */
(async () => {
	try {
		await start(config.bus, config.mongoUrl, getMailClient());
		log.info(`Successfully started ${constants.SERVICE_NAME}`);
		healthStart(bus);
	} catch (err) {
		log.error(`Failed starting ${constants.SERVICE_NAME}`, err);
		process.exit(1);
	}
})();

export default () => { };
