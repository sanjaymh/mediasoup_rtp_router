const config = require("../config");
const { TRANSPORT_TYPE } = require("../lib/constants");

class Routers {
    constructor() {
        this.rtpTransports = new Map();
        this.webrtcTransports = new Map();
        this.producers = [];
        this.consumers = [];
        this.router = null;
    }

    async createRouter(mediasoupWorker) {
        this.worker = mediasoupWorker;
        console.info('Creating router from mediasoup worker . . .')
        try {
            const { mediaCodecs } = config.mediasoup.routerOptions;
            this.router = await this.worker.createRouter({ mediaCodecs });        
        } catch (error) {
            console.error('Error while creating router', error);   
        }

    }

    async createRtpTransport(options) {
        try {
            const transport = await this.router.createPlainTransport(options);
            console.log('transport rtp : : :', transport.id);
            this.rtpTransports.set(transport.id, transport);
            return transport.id;   
        } catch (error) {
            console.error('Error while creating rtpTransport: ', error);        
        }
    }

    getRtpTransport(transportId) {
        return this.rtpTransports.get(transportId);
    }

    async createWebRtcTransport(options) {
        try {
            const transport = await this.router.createTransport(options);
            this.rtpTransports.set(transport.id, transport);
            return transport.id;   
        } catch (error) {
            console.error('Error while creating webrtcTransport: ', error);
        }
    }

    async createTransport(type, transportOptions) {
        if (type === TRANSPORT_TYPE.RTP) {
            return await this.createRtpTransport(transportOptions);
        } else {
            return await this.createWebRtcTransport(transportOptions);
        }
    }
    
    async connectTransport(type, transportId, options) {
        let transport;
        console.debug('Trying to connect . . .')
        try {
            if (type === 'rtp') {
                transport = this.rtpTransports.get(transportId); 
            } else {
                transport = this.webrtcTransports.get(transportId);
            }
            if (!transport) {
                throw { error: 'NO_TRANSPORT_FOUND', message: `no transport found with id ${transportId}` }
            }
            const connectOptions = {
                ...options,
            }
            await transport.connect({ ...connectOptions });
        } catch (error) {
            console.error('Error while connecting transport: ', error);
        }
    }

    async produceInToMediasoup(transportId) {
       const transport = this.rtpTransports.get(transportId);
       const videoProducer = await transport.produce({
            kind          : 'video',
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
                encodings : [ { ssrc: 0xFAFEC8EC } ]
            }
        });
        console.log('producer -------------------> ', videoProducer.id);
        this.producers.push(videoProducer);
        videoProducer.enableTraceEvent([ 'keyframe', 'rtp', 'nack', 'pli', 'fir' ]);
        videoProducer.on('trace', (trace) => {
            console.log('producer trace: : : : : : : : : ', trace);
        })
        return { rtp: transport.tuple, rtcp: transport.rtcpTuple }
    }

    async consumeFromMediaSoup(transportId, options) {
        const transport = this.rtpTransports.get(transportId);
        if (transport) {
            this.producers.map(async (producer) => {
                console.log('producer --------------->', producer.id);
                const consumer = await transport.consume({
                    producerId: producer.id,
                    rtpCapabilities: {
                        codecs :
                        [
                            {
                                mimeType     : 'video/vp8',
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
                                { type: 'goog-remb' }],
                                parameters   :
                                {
                                    'x-google-start-bitrate' : 1000
                                }
                            }
                        ],
                        encodings : [ { ssrc: 0xFAFEC8EC } ]
                    },
                });
                this.consumers.push[consumer];
            })
            return { rtp: transport.tuple, rtcp: transport.rtcpTuple }
        }
    }

    requestKeyFrames() {
        try {
            console.log('Requesting key frame . . . . . . . . . . . . .');
            this.consumers.forEach(async (consumer) => await consumer.requestKeyFrame());
        } catch (error) {
            console.log('Error while requesting keyFrames', error)
        }
    }
}

module.exports = new Routers();
