const express = require('express');
const { execFile } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const cors = require('cors')

const app = express();
app.use(express.json());
app.use(cors());

ffmpeg.setFfmpegPath('C:\\ffmpeg-7.1-essentials_build\\bin\\ffmpeg.exe');

app.listen(5000, () => {
    console.log("Server is running on port 5000");
})

const ytDlpPath = path.join(__dirname, 'yt-dlp.exe');

app.post("/process-video", async (req, res) => {
    console.log("Received request: ", req.body);
    try {
        const { videoUrl, startTime, endTime } = req.body;

        // validate the URL again
        if (!videoUrl.includes("youtube.com/watch?v=")) {
            res.status(400).send('Invalid YouTube URL');
        }

        const outputPath = path.join(__dirname, `output-${Date.now()}.mp3`);

        execFile(ytDlpPath, ['-x', '--audio-format', 'mp3', '--output', outputPath, videoUrl], (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                res.status(500).send("failed to download the video");
            }
            
            let ffmpegProcess = ffmpeg(outputPath);
            let [startMin, startSec] = startTime.split(':').map(Number);
            let [endMin, endSec] = endTime.split(':').map(Number);
            let startSeconds = startMin * 60 + startSec;
            let endSeconds = endMin * 60 + endSec;
            ffmpegProcess = ffmpegProcess.setStartTime(startSeconds).setDuration(endSeconds - startSeconds);

            console.log('Start Time:', startSeconds, 'End Time:', endSeconds);

            const processedOutputPath = path.join(__dirname, `processed_${Date.now()}.mp3`);

            ffmpegProcess
                .audioCodec('libmp3lame')
                .audioBitrate(128)
                .on('end', () => {
                    console.log('Processing finished!');
                    res.download(outputPath, (err) => {
                        if (!err) {
                            fs.unlinkSync(outputPath);
                            fs.unlinkSync(processedOutputPath);
                        }
                    });
                })
                .on('error', (err) => {
                    console.error(err);
                    res.status(500).send("Processing failed");
                })
                .save(processedOutputPath);
            return;
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Something went wrong");
    }
});
