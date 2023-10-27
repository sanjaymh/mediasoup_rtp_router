const config = require("../config");
const { TRANSPORT_TYPE } = require("../lib/constants");

class Routers {
    constructor() {
        this.rtpTransports = new Map();
        this.webrtcTransports = new Map();
        this.producers = [];
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
            await transport.connect({ ...options });
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
                        mimeType     : 'video/h264',
                        clockRate    : 90000,
                        payloadType  : 102,
                        rtcpFeedback : [ ], // FFmpeg does not support NACK nor PLI/FIR.
                        parameters   : {
                            'packetization-mode'      : 1,
                            'profile-level-id'        : '42e01f',
                            'level-asymmetry-allowed' : 1,
                            'x-google-start-bitrate'  : 1000
                        }
                    }],
                encodings : [ { ssrc: 22222222 } ]
            }
        });
        console.log('producer -------------------> ', videoProducer.id);
        this.producers.push(videoProducer);
        return { rtp: transport.tuple, rtcp: transport.rtcpTuple }
    }

    async consumeFromMediaSoup(transportId, options) {
        const transport = this.rtpTransports.get(transportId);
        if (transport) {
            this.producers.map(async (producer) => {
                console.log('producer --------------->', producer.id);
                await transport.consume({
                    producerId: producer.id,
                    rtpCapabilities: {
                        codecs :
                        [
                            {
                                mimeType     : 'video/h264',
                                clockRate    : 90000,
                                payloadType  : 102,
                                rtcpFeedback : [ ],
                                parameters   :
                                {
                                    'packetization-mode'      : 1,
                                    'profile-level-id'        : '42e01f',
                                    'level-asymmetry-allowed' : 1,
                                    'x-google-start-bitrate'  : 1000
                                }
                            }
                        ],
                        encodings : [ { ssrc: 22222222 } ]
                    },
                })
            })
        }
    }
}

module.exports = new Routers();
