const { TRANSPORT_TYPE } = require('../lib/constants');
const router = require('../mediasoup/router');

const logger = console;

const config = require('../config');
const { generateRtpStream } = require('./generateRtpStream');

const participantManager = require('../janus/participantManager');

const publish = async(data) => {
    try {
        const publisher = participantManager.createPublisher(data);
        await publisher.publish();
    } catch (error) {
        logger.error('Error while publishing: ', error);
    }
}

const subscribe = async(rtpOutObj) => {
    try {
        const subscriber = participantManager.createSubscriber(rtpOutObj);
        await subscriber.subscribe(rtpOutObj.data.map(d => d.port));
    } catch (error) {
        logger.error('Error while subscribing: ', error); 
    }
}
 
module.exports = { publish, subscribe };
