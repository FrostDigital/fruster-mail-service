import config from "../config";

class BatchLevelUtils {

	/**
	 * Returns the settings for a specific batch level.
	 * Returns the highest level if @param batchLevel is more than the highest level
	 */
	static getBatchLevelSettingsForLevel(batchLevel: number) {
		if (config.groupedMailBatches)
			if (batchLevel >= config.groupedMailBatches.length)
				return config.groupedMailBatches[config.groupedMailBatches.length - 1];
			else
				return config.groupedMailBatches[batchLevel];
	}

	/**
	 * Returns a timeout date for a specific batch level
	 */
	static getTimeoutDateForBatchLevel(batchLevel: number) {
		const currentBatchSettings = this.getBatchLevelSettingsForLevel(batchLevel);

		if (currentBatchSettings)
			return new Date(Date.now() + currentBatchSettings.timeout);

		return new Date();
	}

}

export default BatchLevelUtils;
