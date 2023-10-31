const { TRANSPORT_TYPE } = require('../lib/constants');
const router = require('../mediasoup/router');

const config = require('../config');
const { generateRtpStream } = require('./generateRtpStream');

const getStatsOfTransport = (transportId, type) => {
    const transport = router.getRtpTransport(transportId);
    setInterval(async () => {
        console.log(`Stats of plain transport ${type}`, await transport.getStats());
    }, 3000);
}

const startRtpIn = async(options) => {
    try {
        console.debug('Creating RTP IN transport . . .');

        const transportOptions = config.mediasoup.plainTransportOptions.rtpIn;
        transportOptions.port = options.port;
        transportOptions.rtcpPort = options.rtcpPort;
        const transportId = await router.createTransport(TRANSPORT_TYPE.RTP, transportOptions);
        console.info(`Created RTP IN transport - ${transportId} `);
    
        // connect transport - no need as comedia is set to false
        /** connectTransport(transportId, options); */

        // produceRtp in to mediasoup
        const {rtp, rtcp} = await router.produceInToMediasoup(transportId);
        console.log('rtp - in', rtp, 'rtcp - in', rtcp)
        getStatsOfTransport(transportId, 'RTP_IN');

        if (options.toTest) {
            generateRtpStream({ record: 'rec_2', videoRtpPort: rtp.localPort, videoRtcpPort: rtcp.localPort });
            return;
        }
    } catch (error) {
        console.error('Error in startRtpIn: ', error);
    }   
}

const startRtpOut = async(options) => {
    try {
        console.debug('Creating RTP OUT transport . . .');

        const transportOptions = config.mediasoup.plainTransportOptions.rtpOut;
        const transportId = await router.createTransport(TRANSPORT_TYPE.RTP, transportOptions);
        console.info(`Created RTP OUT transport - ${transportId} `);
    
        if (options.rtcpPort && transportOptions.rtcpMux) {
            delete options.rtcpPort;
        }

        // connect transport to specific port and ip
        await router.connectTransport(TRANSPORT_TYPE.RTP, transportId, options);
    
        // cosume rtp -> point stream to a ip and 
        const {rtp, rtcp} = await router.consumeFromMediaSoup(transportId);
        console.log('rtp - out', rtp, 'rtcp - out', rtcp);
        getStatsOfTransport(transportId, 'RTP_OUT'); 
        
        setTimeout(() => {
            router.requestKeyFrames();
        }, 30000);
    } catch (error) {
        console.error('Error in startRtpOut: ', error);
    }
    
}

const routeRtp = async(rtpInObj, rtpOutObj) => {
    // create rtp in
    await startRtpIn(rtpInObj);
    // create rtp out
    await startRtpOut(rtpOutObj);
    return;
}

module.exports = { routeRtp, startRtpIn, startRtpOut };
