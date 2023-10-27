const childProcess = require('child_process');
const path = require('path');
const generateRtpStream = ({ record, videoRtpPort, videoRtcpPort }) => {

    console.log('path of recording file ------------------> ', path.join(__dirname, `../recs/${record}.mp4`))
    const cp = childProcess.spawn(
        'ffmpeg',
        [
            '-re',
            '-v', 'info',
            '-stream_loop', '-1',
            '-i', path.join(__dirname, `../recs/${record}.mp4`),
            '-map', '0:v:0',
            '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-b:v', '1000k', '-deadline', 'realtime', '-cpu-used', '4',
            '-f', 'tee',
            `[select=v:f=rtp:ssrc=22222222:payload_type=102]rtp://127.0.0.1:${videoRtpPort}?rtcpport=${videoRtcpPort}`
        ]
    );
    // cp.stderr.on('data', (data) => {
    //     console.debug('data of cp stderr: ', JSON.stringify(data))
    // })
    // cp.on('data', (data) => {
    //     console.debug('data : ', { data })
    // })
    cp.on('error', (error) => {
        console.log('error -----------------> ', error);
    })
}

module.exports = { generateRtpStream };
