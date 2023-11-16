const config = require("../config");

/**
 * Clones the given data.
 */
const clone = (data, defaultValue) => {
	if (typeof data === 'undefined')
		return defaultValue;

	return JSON.parse(JSON.stringify(data));
};

const getRtpParameters = (codec, type = 'consumer') => {
	const {
		mimeTypeVP8,
		mimeTypeH264,
		clockRate,
		payloadType,
		parametersH264,
		parametersVP8,
		rtpFeedback
	} = config.mediasoup.producerConsumerOptions;
	let options = { kind: 'video'};

	let codecOptions = {             
		clockRate,
		payloadType,
		rtpFeedback
	}
	if (codec === 'VP8') {
		codecOptions.mimeType = mimeTypeVP8;
		codecOptions.parameters = parametersVP8;
	}
	if (codec === 'H264') {
		codecOptions.mimeType = mimeTypeH264;
		codecOptions.parameters = parametersH264;
	}
	if (type === 'producer') {
		options.rtpParameters = {codecs: [], encodings: []}
		options.rtpParameters.codecs.push(codecOptions);
	} else {
		options.rtpCapabilities = {codecs: [], encodings: []}
		options.rtpCapabilities.codecs.push(codecOptions);
	}
	return options;
}

module.exports = { clone, getRtpParameters };
