const express = require('express');

require('dotenv').config();
const bodyparser = require('body-parser');
const { runMediasoupWorkers, getMediasoupWorker } = require('./mediasoup/worker');
const { publish, subscribe } = require('./forwardRtp/routeRtp');

const app = express();

app.use(bodyparser.json());

app.post('/subscribe', async(req, res) => {
    try {
        const rtpOutObj = req.body;
        console.log(`in route '/subscribe' - rtpOutObj ${JSON.stringify(rtpOutObj, null, 3)}`);
        await subscribe(rtpOutObj);
        res.sendStatus(201);
    } catch (error) {
        console.error('Error in \'/routeRtp\' ', error);
        res.status(500).json(error);
    }
})

app.post('/publish', async(req, res) => {
    try {
        const rtpInObj = req.body;
        console.log(`in route '/publish' - rtpInObj ${JSON.stringify(rtpInObj, null, 3)}`);
        await publish(rtpInObj);
        res.sendStatus(201);
    } catch (error) {
        console.error('Error in \'/routeRtp\' ', error);
        res.status(500).json(error);
    }
})


const serverPort = process.env.SERVER_PORT || 5001;
app.listen(serverPort, async () => {
    const router = require('./mediasoup/router');
    await runMediasoupWorkers();
    const worker = getMediasoupWorker();
    await router.createRouter(worker);
    console.log(`mediasoup forwarder listening at ${serverPort}`);
})