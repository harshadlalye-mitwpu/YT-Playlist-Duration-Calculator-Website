document.getElementById("calculate-btn").addEventListener("click", async () => {
    const API_KEY = 'AIzaSyBIA7Y6din3kIGXS_GreO-Y0xWx27oGbGc';
    const playlistUrl = document.getElementById("playlist-link").value;
    const playlistId = extractPlaylistId(playlistUrl);
    const startVideo = parseInt(document.getElementById("start-video").value) || 1;
    const endVideo = parseInt(document.getElementById("end-video").value) || null;
    const playbackSpeed = parseFloat(document.getElementById("speed-slider").value);

    const spinner = document.getElementById("loading-spinner");
    const result = document.getElementById("result");

    if (!playlistId) {
        alert("Please enter a valid YouTube playlist URL.");
        return;
    }

    // Hide result and show spinner
    result.style.display = "none";
    spinner.style.display = "block";

    let totalDuration;
    try {
        totalDuration = await fetchPlaylistDuration(playlistId, startVideo, endVideo, API_KEY);
    } catch (error) {
        console.error(error);
        result.innerText = "An error occurred while calculating duration.";
        spinner.style.display = "none";
        return;
    }

    // Hide spinner and display result
    const adjustedDuration = totalDuration / playbackSpeed;
    spinner.style.display = "none";
    result.style.display = "block";
    result.innerText = `Total Duration: ${formatDuration(adjustedDuration)} at ${playbackSpeed}x speed`;
});

document.getElementById("speed-slider").addEventListener("input", (e) => {
    document.getElementById("speed-value").innerText = `${e.target.value}x`;
});

// Select necessary elements
const darkModeSwitch = document.getElementById("dark-mode-switch");
const body = document.body;

// Default mode (Dark Mode)
body.classList.add("dark-mode"); // Ensure the body is in dark mode

// Toggle light/dark mode on switch change
darkModeSwitch.addEventListener("change", () => {
    if (darkModeSwitch.checked) {
        // Dark mode
        body.classList.remove("light-mode");
        body.classList.add("dark-mode");
    } else {
        // Light mode
        body.classList.remove("dark-mode");
        body.classList.add("light-mode");
    }
});





async function fetchPlaylistDuration(playlistId, start, end, apiKey) {
    let totalDuration = 0;
    let nextPageToken = '';
    let videoIndex = 0;

    do {
        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}&pageToken=${nextPageToken}`);
            const data = await response.json();

            for (const item of data.items) {
                videoIndex++;
                if (videoIndex < start) continue;
                if (end && videoIndex > end) break;

                const videoId = item.contentDetails.videoId;

                // Fetch video duration, handling hidden/unavailable videos
                const videoDuration = await fetchVideoDuration(videoId, apiKey);
                totalDuration += videoDuration;
            }

            nextPageToken = data.nextPageToken;
        } catch (error) {
            console.error("Error fetching playlist items:", error);
            break; // Exit loop on any critical error
        }
    } while (nextPageToken && (!end || videoIndex < end));

    return totalDuration;
}

async function fetchVideoDuration(videoId, apiKey) {
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`);
        const data = await response.json();

        if (data.items && data.items.length > 0 && data.items[0].contentDetails) {
            return parseISODuration(data.items[0].contentDetails.duration);
        } else {
            console.warn(`Video with ID ${videoId} is unavailable or hidden.`);
            return 0; // Skip hidden or unavailable videos
        }
    } catch (error) {
        console.error(`Failed to fetch video duration for ID ${videoId}:`, error);
        return 0; // Skip the video in case of any error
    }
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
