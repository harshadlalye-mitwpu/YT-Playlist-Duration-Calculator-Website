document.getElementById("calculate-btn").addEventListener("click", async () => {
    const API_KEY = 'AIzaSyBIA7Y6din3kIGXS_GreO-Y0xWx27oGbGc';
    const playlistUrl = document.getElementById("playlist-link").value;
    const playlistId = extractPlaylistId(playlistUrl);
    const startVideo = parseInt(document.getElementById("start-video").value) || 1;
    const endVideo = parseInt(document.getElementById("end-video").value) || null;
    const playbackSpeed = parseFloat(document.getElementById("speed-slider").value);

    if (!playlistId) {
        alert("Please enter a valid YouTube playlist URL.");
        return;
    }

    let totalDuration = await fetchPlaylistDuration(playlistId, startVideo, endVideo, API_KEY);
    const adjustedDuration = totalDuration / playbackSpeed;
    document.getElementById("result").innerText = `Total Duration: ${formatDuration(adjustedDuration)} at ${playbackSpeed}x speed`;
});

document.getElementById("speed-slider").addEventListener("input", (e) => {
    document.getElementById("speed-value").innerText = `${e.target.value}x`;
});

async function fetchPlaylistDuration(playlistId, start, end, apiKey) {
    let totalDuration = 0;
    let nextPageToken = '';
    let videoIndex = 0;

    do {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}&pageToken=${nextPageToken}`);
        const data = await response.json();

        for (const item of data.items) {
            videoIndex++;
            if (videoIndex < start) continue;
            if (end && videoIndex > end) break;

            const videoId = item.contentDetails.videoId;
            const videoDuration = await fetchVideoDuration(videoId, apiKey);
            totalDuration += videoDuration;
        }
        nextPageToken = data.nextPageToken;
    } while (nextPageToken && (!end || videoIndex < end));

    return totalDuration;
}

async function fetchVideoDuration(videoId, apiKey) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`);
    const data = await response.json();
    return parseISODuration(data.items[0].contentDetails.duration);
}

function parseISODuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    return (parseInt(match[1]) || 0) * 3600 + (parseInt(match[2]) || 0) * 60 + (parseInt(match[3]) || 0);
}

function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
}

function extractPlaylistId(url) {
    const match = url.match(/[&?]list=([^&]+)/);
    return match ? match[1] : null;
}
