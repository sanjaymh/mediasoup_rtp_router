const config = require("../config");
const { TRANSPORT_TYPE } = require("../lib/constants");
const { getRtpParameters } = require("../lib/utils");
const router = require("../mediasoup/router");
const { createTransport, produceInToMediasoup } = require("../mediasoup/router");
const participantManager = require('./participantManager');
const logger = console;

class Subscriber {
    constructor(subscriberId, publisherId, codec, payloadType, producerIds, remoteIp, data) {
        console.log('test log', subscriberId, payloadType, data)
        this.subscriberId= subscriberId;
        // this.rtcpPort = rtcpPort;
        this.data = data;
        this.codec = codec;
        this.payloadType = payloadType;
        this.transportsData = []; // in order l, m, h
        this.transportIds = []; // in order l, m, h
        this.consumerIds = [];
        this.publisherId = publisherId;
        this.remoteIp = remoteIp;
        this.producerIds = producerIds;
    }

    async createTransports() {
        logger.info(`creating transports for subscriber ${this.subscriberId}. . . `);
        const transportOptions = { ...config.mediasoup.plainTransportOptions.rtpIn };
        await Promise.all(this.data.map(async (data, i) => {
            const { port, rid, ssrc } = data;
            if (i === 0 && this.rtcpPort) {
                transportOptions.rtcpPort = this.rtcpPort;
            }
            const transport = await router.createTransport(TRANSPORT_TYPE.RTP, transportOptions);
            let transportData = {};
            transportData['transport'] = transport;
            transportData['rid'] = rid;
            transportData['ssrc'] = ssrc;
            
            transportData['port'] = port; // port to connect

            this.transportsData[i] = transportData;
            this.transportIds[i] = transport.id;
        }))
        logger.info(`Created transports for ${this.subscriberId} in order of rid 'low', 'mid', 'high': ${JSON.stringify(this.transportIds)}`);
    };

    /** Consume options sample
     * {
            kind          : 'video',
	        type          : 'simulcast',
            rtpParameters : {
                codecs :[{
                        mimeType     : 'video/VP8',
                        clockRate    : 90000,
                        payloadType  : 120,
                        rtcpFeedback : [{ type: 'nack' },
                        { type: 'nack', parameter: 'pli' },
                        { type: 'nack', parameter: 'sli' },
                        { type: 'nack', parameter: 'rpsi' },
                        { type: 'nack', parameter: 'app' },
                        { type: 'ccm', parameter: 'fir' },
                        { type: 'ack', parameter: 'rpsi' },
                        { type: 'ack', parameter: 'app' },
                        { type: 'goog-remb' }], // FFmpeg does not support NACK nor PLI/FIR.
                        parameters   : {
                            'x-google-start-bitrate' : 1000
                        }
                    }],
                    encodings : [
                        { ssrc: 2222220 }
                    ]
            }
        }
     */
    /**
     * create consumers to consume media from mediasoup for all available transports
     * of subscribers.
     */
    async createConsumers(producerId, idx) {
        const consumerOptions = getRtpParameters(config.mediasoup.codec, 'consumer');
        const { transport, ssrc } = this.transportsData[idx];
        consumerOptions.rtpCapabilities.encodings.push({ ssrc });
        consumerOptions.producerId = producerId;
        console.log('consumer options -----------', JSON.stringify(consumerOptions))
        this.transportsData[idx]['consumer'] = await transport.consume(consumerOptions);
        this.consumerIds[idx] = this.transportsData[idx].consumer.id;
    }
    
    async connectTransportsToRemote(ports) {
        await Promise.all(this.transportsData.map(async (transportData, idx) => {
            const connectOptions = {
                ip: this.remoteIp, port: ports[idx]
            };
            if (transportData.rtcpPort) {
                connectOptions.rtcpPort = transportData.rtcpPort;
            }
            await transportData.transport.connect(connectOptions)
        }));
    };

    async connectTransports(ports) {
            await this.connectTransportsToRemote(ports);     
    };

    async subscribe(ports) {
        // create consumer transports
        await this.createTransports();

        // connect transports to remote
        await this.connectTransports(ports);

        // consume streams produced using producer ids
        const producerIdsToConsume = this.producerIds;
        await Promise.all(producerIdsToConsume.map(async (producerId, idx) => {
                await this.createConsumers(producerId, idx);
        }))
        logger.info(`Created consumers in order of rid 'low', 'mid', 'high': ${JSON.stringify(this.consumerIds)}`);
    }
}

module.exports = Subscriber;
