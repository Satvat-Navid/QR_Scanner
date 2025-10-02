// --- CONFIGURATION ---
// Make sure your FastAPI backend is running and accessible at this URL.
const BACKEND_URL = "/checkin";

// --- DOM ELEMENTS ---
const statusMessageEl = document.getElementById('status-message');
const scannedListEl = document.getElementById('scanned-list');
const placeholderEl = document.getElementById('placeholder');

// --- STATE ---
const checkedInStudents = new Map();
let lastScanTime = 0;
const SCAN_COOLDOWN = 3000; // 3 seconds cooldown to prevent duplicate scans

/**
 * Updates the list of checked-in students displayed on the page.
 */
function updateStudentList() {
    // Clear the current list
    scannedListEl.innerHTML = '';

    if (checkedInStudents.size === 0) {
        placeholderEl.style.display = 'block';
    } else {
        placeholderEl.style.display = 'none';
        
        // The forEach for a Map provides the value (timestamp) first, then the key (studentId).
        checkedInStudents.forEach((timestamp, studentId) => {
            const listItem = document.createElement('li');
            
            const studentIdSpan = document.createElement('span');
            studentIdSpan.className = 'student-id';
            studentIdSpan.textContent = studentId;

            const timeSpan = document.createElement('span');
            timeSpan.className = 'timestamp';
            // Use the timestamp that was stored in the Map!
            timeSpan.textContent = timestamp;
            
            listItem.appendChild(studentIdSpan);
            listItem.appendChild(timeSpan);
            
            // Prepend to show the latest scan at the top
            scannedListEl.prepend(listItem);
        });
    }
}

/**
 * Displays a status message (success or error) to the user.
 * @param {string} message - The message to display.
 * @param {boolean} isError - Whether the message is an error.
 */
function showStatus(message, isError = false) {
    statusMessageEl.textContent = message;
    statusMessageEl.className = isError ? 'error' : 'success';

    // Clear the message after 3 seconds
    setTimeout(() => {
        statusMessageEl.textContent = '';
        statusMessageEl.className = '';
    }, 3000);
}

/**
 * Sends the scanned student ID to the backend.
 * @param {string} studentId - The student ID from the QR code.
 */
async function processCheckIn(studentId) {
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ student_id: studentId }),
        });

        const result = await response.json();

        if (response.ok) {
            const checkInTime = new Date().toLocaleTimeString();
            checkedInStudents.set(studentId, checkInTime);
            updateStudentList();
            showStatus(`Success: ${result.message}`);
        } else {
            // Handle specific errors from the backend, e.g., "Student not found"
            showStatus(`Error: ${result.detail || 'Unknown error occurred'}`, true);
        }
    } catch (error) {
        console.error('Failed to connect to the backend:', error);
        showStatus('Error: Could not connect to the server.', true);
    }
}

/**
 * Callback function for when a QR code is successfully scanned.
 * @param {string} decodedText - The text decoded from the QR code.
 * @param {object} decodedResult - The detailed result object.
 */
function onScanSuccess(decodedText, decodedResult) {
    const now = Date.now();
    // Cooldown check to prevent multiple submissions for the same scan
    if (now - lastScanTime < SCAN_COOLDOWN) {
        return;
    }
    lastScanTime = now;

    // Check if student has already been checked in via this session
    if (checkedInStudents.has(decodedText)) {
        showStatus(`Already checked in: ${decodedText}`, true);
        return;
    }

    console.log(`QR Code scanned: ${decodedText}`);
    showStatus('Processing check-in...');
    processCheckIn(decodedText);
}

/**
 * Callback function for handling scanner errors.
 * @param {string} errorMessage - The error message.
 */
function onScanFailure(errorMessage) {
    // This function is called frequently, so we typically ignore most errors.
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the QR Code scanner
    const html5QrcodeScanner = new Html5Qrcode("qr-reader");

    // Configuration for the scanner
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
    };

    // Start the scanner
    html5QrcodeScanner.start(
        { facingMode: "environment" }, // Use the back camera
        config,
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error("Unable to start QR scanner", err);
        showStatus("Error: Could not access camera.", true);
    });

    // Initial render of the student list
    updateStudentList();
});
