/**
 * Clones the given data.
 */
const clone = (data, defaultValue) => {
	if (typeof data === 'undefined')
		return defaultValue;

	return JSON.parse(JSON.stringify(data));
};

module.exports = { clone };
