const config = require("../../config");

class BatchLevelUtils {

    /**
     * Returns the settings for a specific batch level.
     * Returns the highest level if @param batchLevel is more than the highest level
     *
     * @param {Number} batchLevel
     */
	static getBatchLevelSettingsForLevel(batchLevel) {
		let currentBatchSettings;

		if (batchLevel >= config.groupedMailBatches.length)
			currentBatchSettings = config.groupedMailBatches[config.groupedMailBatches.length - 1];
		else
			currentBatchSettings = config.groupedMailBatches[batchLevel];

		return currentBatchSettings;
	}

    /**
     * Returns a timeout date for a specific batch level
     *
     * @param {Number} batchLevel
     */
	static getTimeoutDateForBatchLevel(batchLevel) {
		const currentBatchSettings = this.getBatchLevelSettingsForLevel(batchLevel)
		return new Date(Date.now() + currentBatchSettings.timeout);
	}

}

module.exports = BatchLevelUtils;
