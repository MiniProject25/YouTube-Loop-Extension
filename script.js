const vidUrl = document.getElementById('video-url');
const startInput = document.getElementById('start-time');
const endInput = document.getElementById('end-time');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    if (vidUrl instanceof HTMLInputElement) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            let activeTab = tabs[0];
            vidUrl.value = activeTab.url;
        });
    }
});

// validating the entered time ranges
function validateTimeFormat(time) {
    const timeRegex = /^[0-5][0-9]:[0-5][0-9]$/;
    return timeRegex.test(time);
}

function validateInput(url, startTime, endTime) {
    if (!url.includes('youtube.com/watch?v=')) {
        alert('Please enter a valid YouTube video URL');
        return false;
    }
    else if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
        alert('Please enter the time in the format MM:SS');
        return false;
    }
    return true;
}

document.getElementById('confirm').addEventListener('click', async (event) => {
    event.preventDefault();

    if (startInput instanceof HTMLInputElement && endInput instanceof HTMLInputElement) {
        const startTime = startInput.value;
        const endTime = endInput.value;

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: runLoop,
            args: [startTime, endTime]
        });
    }
});

document.getElementById('download').addEventListener('click', async (event) => {
    // download the video
    event.preventDefault();

    document.querySelector('button').disabled = true;
    document.getElementById('download').innerText = 'Processing...';
    console.log('Download button clicked'); 
    if (vidUrl instanceof HTMLInputElement && startInput instanceof HTMLInputElement && endInput instanceof HTMLInputElement) {
        const videoUrl = vidUrl.value;
        const startTime = startInput.value;
        const endTime = endInput.value

        if (!validateInput(videoUrl, startTime, endTime))
            return; // failed to validate

        // send data to backend
        fetch("http://localhost:5000/process-video", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                videoUrl,
                startTime,
                endTime
            }),
        })
            .then(response => response.json())
            .then(data => {
                console.log("Backend Response: ", data)
            })
            .catch(error => {
                console.error("Error: ", error)
            });
    }
});


function runLoop(startTime, endTime) {
    const [startMin, startSec] = startTime.split(':').map(Number);
    const [endMin, endSec] = endTime.split(':').map(Number);

    const totalStartSec = startMin * 60 + startSec;
    const totalEndSec = endMin * 60 + endSec;

    const video = document.querySelector('video');
    if (video) {
        video.currentTime = totalStartSec;
        video.ontimeupdate = () => {
            if (video.currentTime >= totalEndSec)
                video.currentTime = totalStartSec;
        }
    }
}


// get the start and end time
// check if the values are set
// if they are, get the active tab
// inject a script into the active tab
// write the script:
// split the time into [minutes, seconds]
// convert the time into seconds
// get the <video> element of the active tab
// if it is found, set the current-time to the start-time and update the current-time to start-time when the current-time exceeds the end-time