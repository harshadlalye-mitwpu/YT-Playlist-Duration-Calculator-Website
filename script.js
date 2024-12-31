// ================================
// DOM Elements
// ================================
const speedSlider = document.getElementById("speed-slider");
const darkModeSwitch = document.getElementById("dark-mode-switch");
const body = document.body;
const result = document.getElementById("result");
const spinner = document.getElementById("loading-spinner");
const playlistInfoDiv = document.getElementById("playlist-info");
const API_KEY = 'AIzaSyBIA7Y6din3kIGXS_GreO-Y0xWx27oGbGc';

// ================================
// Helper Functions
// ================================

/**
 * Update slider's background based on its value.
 * @param {HTMLInputElement} slider - The slider element.
 */
function updateSliderBackground(slider) {
    const value = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.setProperty("--value", `${value}%`);
}

/**
 * Extract the playlist ID from a YouTube playlist URL.
 * @param {string} url - The playlist URL.
 * @returns {string|null} - The extracted playlist ID.
 */
function extractPlaylistId(url) {
    const match = url.match(/[&?]list=([^&]+)/);
    return match ? match[1] : null;
}

/**
 * Convert ISO 8601 duration to seconds.
 * @param {string} duration - ISO 8601 duration string.
 * @returns {number} - Duration in seconds.
 */
function parseISODuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    return (parseInt(match[1]) || 0) * 3600 + (parseInt(match[2]) || 0) * 60 + (parseInt(match[3]) || 0);
}

/**
 * Format duration from seconds into a human-readable format.
 * @param {number} seconds - Duration in seconds.
 * @returns {string} - Formatted duration string.
 */
function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
}

// ================================
// YouTube API Helper Functions
// ================================

/**
 * Fetch playlist details from YouTube API.
 * @param {string} playlistId - Playlist ID.
 * @param {string} apiKey - YouTube API key.
 * @returns {Promise<object>} - Playlist details.
 */
async function fetchPlaylistDetails(playlistId, apiKey) {
    const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${apiKey}`
    );
    const data = await response.json();
    if (data.items && data.items.length > 0) {
        const playlist = data.items[0];
        return {
            title: playlist.snippet.title,
            creator: playlist.snippet.channelTitle,
            videoCount: playlist.contentDetails.itemCount,
            creationDate: playlist.snippet.publishedAt,
            lastUpdated: playlist.snippet.localized.lastUpdated,
            thumbnail: playlist.snippet.thumbnails.high.url // Add thumbnail URL
        };
    } else {
        throw new Error("Playlist not found");
    }
}

/**
 * Fetch total playlist duration by summing up individual video durations.
 * @param {string} playlistId - Playlist ID.
 * @param {number} start - Starting video index.
 * @param {number} end - Ending video index.
 * @param {string} apiKey - YouTube API key.
 * @returns {Promise<number>} - Total playlist duration in seconds.
 */
async function fetchPlaylistDuration(playlistId, start, end, apiKey) {
    let totalDuration = 0;
    let nextPageToken = '';
    let videoIndex = 0;

    do {
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}&pageToken=${nextPageToken}`
            );
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

/**
 * Fetch individual video duration using YouTube API.
 * @param {string} videoId - Video ID.
 * @param {string} apiKey - YouTube API key.
 * @returns {Promise<number>} - Video duration in seconds.
 */
async function fetchVideoDuration(videoId, apiKey) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`
        );
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

// ================================
// Dark Mode Toggle with LocalStorage
// ================================

/**
 * Apply the saved theme from localStorage or default to dark mode.
 */
function applySavedTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        body.classList.add("light-mode");
        body.classList.remove("dark-mode");
        darkModeSwitch.checked = false; // Ensure toggle is updated
    } else {
        body.classList.add("dark-mode");
        body.classList.remove("light-mode");
        darkModeSwitch.checked = true; // Ensure toggle is updated
    }
}

/**
 * Toggle the theme and save the preference in localStorage.
 */
function toggleTheme() {
    if (darkModeSwitch.checked) {
        body.classList.add("dark-mode");
        body.classList.remove("light-mode");
        localStorage.setItem("theme", "dark");
    } else {
        body.classList.add("light-mode");
        body.classList.remove("dark-mode");
        localStorage.setItem("theme", "light");
    }
}

// Apply saved theme on page load
applySavedTheme();

// Listen for changes on the dark mode toggle switch
darkModeSwitch.addEventListener("change", toggleTheme);

// ================================
// Language Support
// ================================

const translations = {
    en: {
        enterPlaylistUrl: "Enter Playlist URL:",
        startVideo: "Start Video:",
        endVideo: "End Video:",
        playbackSpeed: "Playback Speed:",
        calculateDuration: "Calculate Duration",
        playlistName: "Playlist Name:",
        creatorName: "Creator Name:",
        numberOfVideos: "Number of Videos:",
        avgVideoDuration: "Average Video Duration:",
        playlistCreation: "Playlist Creation:",
        lastUpdated: "Last Updated:",
        totalDuration: "Total Duration:",
        estimatedWatchTime: "Estimated Watch Time:",
        shareableLink: "Shareable Link:",
        howToUse: "How to Use:",
        instructions: [
            "Enter Playlist URL: Copy and paste the URL of the YouTube playlist into the \"Enter Playlist URL\" field.",
            "Set Start and End Videos (Optional): Specify the range of videos you want to calculate by entering start and end numbers. Leave blank to include the entire playlist.",
            "Adjust Playback Speed: Use the slider to choose the playback speed (e.g., 1x, 1.25x).",
            "Click \"Calculate Duration\": Press the button to calculate the total playlist duration based on your inputs.",
            "The playlist information, including Playlist Name, Creator Name, No. of Videos, Average Video Duration, Playlist Creation, Last Updated, Total Duration, and Estimated Watch Time at the selected speed, will be displayed."
        ]
    },
    // Add more languages here
};

function switchLanguage(lang) {
    document.getElementById("label-playlist-link").innerText = translations[lang].enterPlaylistUrl;
    document.getElementById("label-start-video").innerText = translations[lang].startVideo;
    document.getElementById("label-end-video").innerText = translations[lang].endVideo;
    document.getElementById("label-speed-slider").innerText = translations[lang].playbackSpeed;
    document.getElementById("calculate-btn").innerText = translations[lang].calculateDuration;
    document.getElementById("label-shareable-link").innerText = translations[lang].shareableLink;
    document.getElementById("how-to-use").innerText = translations[lang].howToUse;

    const instructionsList = document.getElementById("instructions-list");
    instructionsList.innerHTML = "";
    translations[lang].instructions.forEach(instruction => {
        const li = document.createElement("li");
        li.innerText = instruction;
        instructionsList.appendChild(li);
    });
}

// Set default language to English
switchLanguage("en");

// ================================
// Event Listeners and Handlers
// ================================

// Initialize slider background
updateSliderBackground(speedSlider);

// Update slider background and speed value on input
speedSlider.addEventListener("input", (e) => {
    document.getElementById("speed-value").innerText = `${e.target.value}x`;
    updateSliderBackground(e.target);
});

// Calculate button click handler
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

    // Hide playlist info and show spinner
    playlistInfoDiv.style.display = "none";
    spinner.style.display = "flex";

    try {
        // Fetch playlist details and total duration
        const totalDuration = await fetchPlaylistDuration(playlistId, startVideo, endVideo, API_KEY);
        const playlistDetails = await fetchPlaylistDetails(playlistId, API_KEY);

        // Display fetched details
        displayPlaylistDetails(playlistDetails, totalDuration, playbackSpeed);

        // Generate shareable link
        generateShareableLink(playlistUrl, startVideo, endVideo, playbackSpeed);

        // Display detailed statistics
        displayDetailedStatistics(totalDuration, playbackSpeed);

        // Enable download report buttons
        document.getElementById("download-report-container").style.display = "block";
    } catch (error) {
        console.error(error);
        if (error.message === "Playlist not found") {
            result.innerText = "The playlist could not be found. Please check the URL and try again.";
        } else if (error.message.includes("NetworkError")) {
            result.innerText = "Network error occurred. Please check your internet connection and try again.";
        } else {
            result.innerText = "An error occurred while calculating duration. Please try again later.";
        }
    } finally {
        spinner.style.display = "none";
    }
});

/**
 * Generate a shareable link for the calculated duration.
 * @param {string} playlistUrl - The playlist URL.
 * @param {number} startVideo - The starting video index.
 * @param {number} endVideo - The ending video index.
 * @param {number} playbackSpeed - The selected playback speed.
 */
function generateShareableLink(playlistUrl, startVideo, endVideo, playbackSpeed) {
    const baseUrl = window.location.href.split('?')[0];
    const params = new URLSearchParams({
        playlistUrl,
        startVideo,
        endVideo,
        playbackSpeed
    });
    const shareableLink = `${baseUrl}?${params.toString()}`;
    document.getElementById("shareable-link").value = shareableLink;
    document.getElementById("shareable-link-container").style.display = "block";
}

/**
 * Download the report in PDF format.
 */
function downloadPDFReport() {
    const doc = new jsPDF();
    doc.text("YouTube Playlist Duration Report", 10, 10);
    doc.text(`Playlist Name: ${document.getElementById("playlist-name").innerText}`, 10, 20);
    doc.text(`Creator Name: ${document.getElementById("creator-name").innerText}`, 10, 30);
    doc.text(`Number of Videos: ${document.getElementById("video-count").innerText}`, 10, 40);
    doc.text(`Average Video Duration: ${document.getElementById("avg-duration").innerText}`, 10, 50);
    doc.text(`Total Duration: ${document.getElementById("total-duration").innerText}`, 10, 60);
    doc.text(`Estimated Watch Time: ${document.getElementById("est-watch-time").innerText}`, 10, 70);
    doc.text(`Daily Watch Time: ${document.getElementById("daily-watch-time").innerText}`, 10, 80);
    doc.text(`Weekly Watch Time: ${document.getElementById("weekly-watch-time").innerText}`, 10, 90);
    doc.text(`Monthly Watch Time: ${document.getElementById("monthly-watch-time").innerText}`, 10, 100);
    doc.save("playlist_duration_report.pdf");
}

/**
 * Download the report in CSV format.
 */
function downloadCSVReport() {
    const csvContent = [
        ["YouTube Playlist Duration Report"],
        ["Playlist Name", document.getElementById("playlist-name").innerText],
        ["Creator Name", document.getElementById("creator-name").innerText],
        ["Number of Videos", document.getElementById("video-count").innerText],
        ["Average Video Duration", document.getElementById("avg-duration").innerText],
        ["Total Duration", document.getElementById("total-duration").innerText],
        ["Estimated Watch Time", document.getElementById("est-watch-time").innerText],
        ["Daily Watch Time", document.getElementById("daily-watch-time").innerText],
        ["Weekly Watch Time", document.getElementById("weekly-watch-time").innerText],
        ["Monthly Watch Time", document.getElementById("monthly-watch-time").innerText]
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "playlist_duration_report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Add event listeners for download buttons
document.getElementById("download-pdf-btn").addEventListener("click", downloadPDFReport);
document.getElementById("download-csv-btn").addEventListener("click", downloadCSVReport);

// ================================
// UI Display Functions
// ================================

/**
 * Display fetched playlist details and calculated durations.
 * @param {object} details - Playlist details.
 * @param {number} totalDuration - Total playlist duration in seconds.
 * @param {number} playbackSpeed - Selected playback speed.
 */
function displayPlaylistDetails(details, totalDuration, playbackSpeed) {
    document.getElementById("playlist-name").innerText = details.title;
    document.getElementById("creator-name").innerText = details.creator;
    document.getElementById("video-count").innerText = details.videoCount;
    document.getElementById("avg-duration").innerText = formatDuration(totalDuration / details.videoCount);

    // Display playlist thumbnail
    document.getElementById("playlist-thumbnail").src = details.thumbnail;
    document.getElementById("playlist-thumbnail").alt = details.title;

    // Check for separate creation and update dates
    if (details.creationDate && details.lastUpdated && details.creationDate !== details.lastUpdated) {
        document.getElementById("playlist-creation-date").innerText = details.creationDate;
        document.getElementById("playlist-update-date").innerText = details.lastUpdated;
    } else {
        document.getElementById("playlist-creation-date").parentElement.style.display = "none";
        document.getElementById("playlist-update-date").innerText = details.creationDate || "Unavailable";
    }

    document.getElementById("total-duration").innerText = formatDuration(totalDuration);
    document.getElementById("est-watch-time").innerText = `(at ${playbackSpeed}x speed) ${formatDuration(totalDuration / playbackSpeed)}`;

    playlistInfoDiv.style.display = "block";
}

/**
 * Display detailed statistics for the total duration.
 * @param {number} totalDuration - Total playlist duration in seconds.
 * @param {number} playbackSpeed - Selected playback speed.
 */
function displayDetailedStatistics(totalDuration, playbackSpeed) {
    const totalDurationAdjusted = totalDuration / playbackSpeed;
    const dailyWatchTime = totalDurationAdjusted / 7;
    const weeklyWatchTime = totalDurationAdjusted / 4;
    const monthlyWatchTime = totalDurationAdjusted / 12;

    document.getElementById("daily-watch-time").innerText = formatDuration(dailyWatchTime);
    document.getElementById("weekly-watch-time").innerText = formatDuration(weeklyWatchTime);
    document.getElementById("monthly-watch-time").innerText = formatDuration(monthlyWatchTime);

    document.getElementById("detailed-statistics").style.display = "block";
}
