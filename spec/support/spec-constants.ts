import bus from "fruster-bus";
import { FrusterTestUtilsConnection } from "fruster-test-utils";
import TypeScriptSchemaResolver from "fruster-bus-ts-schema-resolver";

import constants from "../../lib/constants";
import { start } from "../../fruster-mail-service";

export default {
	testUtilsOptions: (afterStart?: (connection: FrusterTestUtilsConnection) => Promise<void>) => {
		return {
			mockNats: true,
			bus,
			service: { start },
			afterStart,
			mongoUrl: `mongodb://localhost:27017/${constants.SERVICE_NAME}-test`,
			schemaResolver: TypeScriptSchemaResolver,
		};
	},
};
