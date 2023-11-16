const config = require("../config");
const { TRANSPORT_TYPE } = require("../lib/constants");
const { getRtpParameters } = require("../lib/utils");
const router = require("../mediasoup/router");
const logger = console;

class Publisher {
    constructor(publisherId, codec, payloadType, rtcpPort, data) {
        this.publisherId= publisherId;
        this.rtcpPort = rtcpPort;
        this.data = data;
        this.codec = codec;
        this.payloadType = payloadType;
        this.transportsData = []; // in order l, m, h
        this.transportIds = []; // in order l, m, h
        this.producersIds = [];
    }

    async createTransports() {
        logger.info(`creating transports for publisher ${this.publisherId}. . . `);
        const transportOptions = { ...config.mediasoup.plainTransportOptions.rtpIn };
        await Promise.all(this.data.map(async (data, i) => {
            const { port, rid, ssrc } = data;
            transportOptions.port = port;
            if (i === 0 && this.rtcpPort) {
                transportOptions.rtcpPort = this.rtcpPort;
            }
            const transport = await router.createTransport(TRANSPORT_TYPE.RTP, transportOptions);
            logger.debug(`Created transport for publisher ${this.publisherId} ${transport.id}, rid - ${rid}`)
            let transportData = {};
            transportData['transport'] = transport;
            transportData['rid'] = rid;
            transportData['ssrc'] = ssrc;
            transportData['port'] = port;

            this.transportsData[i] = transportData;
            this.transportIds[i] = transport.id;
        }));
        logger.info(`Created transports for ${this.publisherId} in order of rid 'low', 'mid', 'high': ${JSON.stringify(this.transportIds)}`);
    };

    /** Produce options sample
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
                        { ssrc: 111112 },
                        { ssrc: 111111 },
                        { ssrc: 111110 }
                    ]
            }
        }
     */
    /**
     * create producers to inject media in to mediasoup for all available transports
     * of publisher.
     */
    async createProducers() {
        const producerOptions = getRtpParameters(config.mediasoup.codec, 'producer');
        await Promise.all(this.transportsData.map(async (transportData, idx) => {
            const {ssrc, transport} = transportData;
            producerOptions.rtpParameters.encodings.push({ ssrc });
            transportData['producer'] = await transport.produce(producerOptions);
            this.producersIds[idx] = transportData.producer.id;
            logger.debug(`producer ${this.producersIds[idx]} created for transport ${idx} for port: ${this.transportsData.port}, ssrc: ${this.transportsData.ssrc}`);
        }));
        logger.info(`Created producers in order of rid 'low', 'mid', 'high': ${JSON.stringify(this.producersIds)}`);
    }

    connectTransport() {
        // not needed
    };

    async getProducerStats() {
        setTimeout(() => {
            this.transportsData.forEach(async (td) => {
                logger.info(`stats of transport ${td.transport.id} with rid ${td.rid} -> ${JSON.stringify(await td.transport.getStats())}`)
            })
        }, 3000);
    }

    async publish() {
        logger.info(`publisher ${this.publisherId} wants to publish . . .`);
        
        // create transports for all rids
        await this.createTransports();
        
        // create producers for all transports
        await this.createProducers();
        
        this.getProducerStats();
    }

    getAllProducerIds() {
        return this.producersIds || [];
    }

}

module.exports = Publisher;
