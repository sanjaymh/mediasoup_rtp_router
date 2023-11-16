const Publisher = require('./publisher');
const Subscriber = require('./subscriber');

const logger = console;

class Manager {
    constructor(roomId) {
        this.room = roomId;
        this.publishers = {};
        this.subscribers = {};
    };

    getProducerIdsOfPublisher(publisherId) {
        return this.publishers[publisherId].producersIds;
    };

    createPublisher(publisherData) {
        logger.info(`creating publisher ${publisherData.publisherId}`, publisherData.data);
        const {publisherId, codec, payloadType, rtcpPort, data} = publisherData; 
        const publisher = new Publisher(publisherId, codec, payloadType, rtcpPort, data)
        this.publishers[publisherId] = publisher;
        return publisher;
    };

    createSubscriber(subscriberData) {
        const { subscriberId, publisherId, rtcpPort, remoteIp, data } = subscriberData;
        const publisher = this.publishers[publisherId];
        const subscriber = new Subscriber(subscriberId, publisherId, publisher.codec, publisher.payloadType, publisher.producersIds, remoteIp, data );
        this.subscribers[subscriberId] = subscriber;
        return subscriber;
    };

    getAllProducerIds(publisherId) {
        return this.publishers[publisherId].getAllProducerIds();
    }
}

module.exports = new Manager();
