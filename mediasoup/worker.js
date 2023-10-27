const mediasoup = require('mediasoup')
const config = require('../config');

const { clone } = require('../lib/utils');

const mediasoupWorkers = [];

let nextMediasoupWorkerIdx = 0;

/**
 * Launch as many mediasoup Workers as given in the configuration file.
 */
async function runMediasoupWorkers() {
	const { numWorkers } = config.mediasoup;

	console.info('running %d mediasoup Workers...', numWorkers);

	for (let i = 0; i < numWorkers; ++i) {
		const worker = await mediasoup.createWorker({
				dtlsCertificateFile : config.mediasoup.workerSettings.dtlsCertificateFile,
				dtlsPrivateKeyFile  : config.mediasoup.workerSettings.dtlsPrivateKeyFile,
				logLevel            : config.mediasoup.workerSettings.logLevel,
				logTags             : config.mediasoup.workerSettings.logTags,
				rtcMinPort          : Number(config.mediasoup.workerSettings.rtcMinPort),
				rtcMaxPort          : Number(config.mediasoup.workerSettings.rtcMaxPort)
			});

		worker.on('died', () => {
			console.error(
				'mediasoup Worker died, exiting  in 2 seconds... [pid:%d]', worker.pid);

			setTimeout(() => process.exit(1), 2000);
		});

		mediasoupWorkers.push(worker);

		// Create a WebRtcServer in this Worker.
		if (process.env.MEDIASOUP_USE_WEBRTC_SERVER !== 'false') {
			// Each mediasoup Worker will run its own WebRtcServer, so those cannot
			// share the same listening ports. Hence we increase the value in config.js
			// for each Worker.
			const webRtcServerOptions = clone(config.mediasoup.webRtcServerOptions);
			const portIncrement = mediasoupWorkers.length - 1;

			for (const listenInfo of webRtcServerOptions.listenInfos) {
				listenInfo.port += portIncrement;
			}

			const webRtcServer = await worker.createWebRtcServer(webRtcServerOptions);

			worker.appData.webRtcServer = webRtcServer;
		}

		// Log worker resource usage every X seconds.
		setInterval(async () =>{
         	const usage = await worker.getResourceUsage();
			console.info('mediasoup Worker resource usage [pid:%d]: %o', worker.pid, usage);
		}, 120000);
	}
}

/**
 * Get next mediasoup Worker.
 */
function getMediasoupWorker()
{
	const worker = mediasoupWorkers[nextMediasoupWorkerIdx];

	if (++nextMediasoupWorkerIdx === mediasoupWorkers.length)
		nextMediasoupWorkerIdx = 0;

	return worker;
}

module.exports = { runMediasoupWorkers, getMediasoupWorker };
