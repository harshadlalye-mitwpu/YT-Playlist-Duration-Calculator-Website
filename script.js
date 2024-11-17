document.addEventListener("DOMContentLoaded", () => {
    const speedSlider = document.getElementById("speed-slider");
    const darkModeSwitch = document.getElementById("dark-mode-switch");
    const body = document.body;
    const result = document.getElementById("result");
    const spinner = document.getElementById("loading-spinner");
    const playlistInfoDiv = document.getElementById("playlist-info");
    const API_KEY = 'AIzaSyBIA7Y6din3kIGXS_GreO-Y0xWx27oGbGc';

    function updateSliderBackground(slider) {
        const value = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.setProperty("--value", `${value}%`);
    }

    updateSliderBackground(speedSlider);

    speedSlider.addEventListener("input", (e) => {
        document.getElementById("speed-value").innerText = `${e.target.value}x`;
        updateSliderBackground(e.target);
    });

    document.getElementById("calculate-btn").addEventListener("click", async () => {
        const playlistUrl = document.getElementById("playlist-link").value;
        const playlistId = extractPlaylistId(playlistUrl);
        const startVideo = parseInt(document.getElementById("start-video").value) || 1;
        const endVideo = parseInt(document.getElementById("end-video").value) || null;
        const playbackSpeed = parseFloat(speedSlider.value);

        if (!playlistId) {
            alert("Please enter a valid YouTube playlist URL.");
            return;
        }

        playlistInfoDiv.style.display = "none";
        spinner.style.display = "flex";

        try {
            const totalDuration = await fetchPlaylistDuration(playlistId, startVideo, endVideo, API_KEY);
            const playlistDetails = await fetchPlaylistDetails(playlistId, API_KEY);

            displayPlaylistDetails(playlistDetails, totalDuration, playbackSpeed);
        } catch (error) {
            console.error(error);
            result.innerText = "An error occurred while calculating duration.";
        } finally {
            spinner.style.display = "none";
        }
    });

    darkModeSwitch.addEventListener("change", () => {
        body.classList.toggle("light-mode", !darkModeSwitch.checked);
        body.classList.toggle("dark-mode", darkModeSwitch.checked);
    });

    async function fetchPlaylistDetails(playlistId, apiKey) {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${apiKey}`);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const playlist = data.items[0];
            return {
                title: playlist.snippet.title,
                creator: playlist.snippet.channelTitle,
                videoCount: playlist.contentDetails.itemCount,
                creationDate: playlist.snippet.publishedAt,
                lastUpdated: playlist.snippet.localized.lastUpdated
            };
        } else {
            throw new Error("Playlist not found");
        }
    }

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
                    const videoDuration = await fetchVideoDuration(videoId, apiKey);
                    totalDuration += videoDuration;
                }

                nextPageToken = data.nextPageToken;
            } catch (error) {
                console.error("Error fetching playlist items:", error);
                break;
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
                return 0;
            }
        } catch (error) {
            console.error(`Failed to fetch video duration for ID ${videoId}:`, error);
            return 0;
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

    function displayPlaylistDetails(details, totalDuration, playbackSpeed) {
        document.getElementById("playlist-name").innerText = details.title;
        document.getElementById("creator-name").innerText = details.creator;
        document.getElementById("video-count").innerText = details.videoCount;
        document.getElementById("avg-duration").innerText = formatDuration(totalDuration / details.videoCount);

        // Check for separate creation and last updated dates
        if (details.creationDate && details.lastUpdated && details.creationDate !== details.lastUpdated) {
            document.getElementById("playlist-creation-date").innerText = details.creationDate;
            document.getElementById("playlist-update-date").innerText = details.lastUpdated;
        } else {
            // Combined field if only one date is provided
            document.getElementById("playlist-creation-date").parentElement.style.display = "none";
            document.getElementById("playlist-update-date").innerText = details.creationDate || "Unavailable";
        }

        document.getElementById("total-duration").innerText = formatDuration(totalDuration);
        document.getElementById("est-watch-time").innerText = `at ${playbackSpeed}x speed: ${formatDuration(totalDuration / playbackSpeed)}`;

        playlistInfoDiv.style.display = "block";
    }
});
