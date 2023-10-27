const express = require('express');

require('dotenv').config();
const bodyparser = require('body-parser');
const { runMediasoupWorkers, getMediasoupWorker } = require('./mediasoup/worker');
const { startRtpOut, startRtpIn } = require('./forwardRtp/routeRtp');

const app = express();

app.use(bodyparser.json());

app.post('/rtpOut', async(req, res) => {
    try {
        const rtpOutObj = req.body;
        console.log(`in route '/routeRtp' - rtpOutObj ${JSON.stringify(rtpOutObj, null, 3)}`);
        startRtpOut(rtpOutObj);
        res.sendStatus(201);
    } catch (error) {
        console.error('Error in \'/routeRtp\' ', error);
        res.status(500).json(error);
    }
})

app.post('/rtpIn', async(req, res) => {
    try {
        const rtpInObj = req.body;
        console.log(`in route '/routeRtp' - rtpInObj ${JSON.stringify(rtpInObj, null, 3)}`);
        startRtpIn(rtpInObj);
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