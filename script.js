// Firebase Configuration
// To enable real-time sync, replace with your own Firebase project config:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project
// 3. Enable Realtime Database
// 4. Copy your config here
// 5. Set database rules to allow read/write access
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCsspX3aBC746fyDOQvVcNdy38_NrBPbm0",
  authDomain: "classroom-floorpan.firebaseapp.com",
  databaseURL: "https://classroom-floorpan-default-rtdb.firebaseio.com",
  projectId: "classroom-floorpan",
  storageBucket: "classroom-floorpan.firebasestorage.app",
  messagingSenderId: "559694340928",
  appId: "1:559694340928:web:047c7005df9b2d9b3510a5",
  measurementId: "G-09BTGGJLSM"
};

// Initialize Firebase
let database = null;
let isFirebaseEnabled = false;

try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        isFirebaseEnabled = true;
        console.log('🔥 Firebase connected successfully!');
        
        // Monitor connection status
        const connectedRef = database.ref('.info/connected');
        connectedRef.on('value', (snapshot) => {
            const connected = snapshot.val();
            updateConnectionStatus(connected);
        });
    }
} catch (error) {
    console.warn('⚠️ Firebase connection failed, running in offline mode:', error);
    isFirebaseEnabled = false;
    updateConnectionStatus(false);
}

function updateConnectionStatus(connected) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (connected && isFirebaseEnabled) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Live Sync Active';
        statusText.className = 'status-text connected';
    } else {
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Offline Mode';
        statusText.className = 'status-text offline';
    }
}

class Timer {
    constructor(id, duration = 90 * 60 * 1000) { // 1.5 hours in milliseconds
        this.id = id;
        this.duration = duration;
        this.remaining = duration;
        this.isRunning = false;
        this.isPaused = false;
        this.intervalId = null;
        this.startTime = null;
        this.pausedTime = 0;
        this.firebaseRef = null;
        
        // Setup Firebase sync if available
        if (isFirebaseEnabled && database) {
            this.firebaseRef = database.ref(`timers/${this.id}`);
            this.setupFirebaseSync();
        }
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now() - this.pausedTime;
        
        this.startLocalTimer();
        this.updateDisplay();
        this.syncToFirebase();
    }

    pause() {
        if (!this.isRunning || this.isPaused) return;
        
        this.isPaused = true;
        this.isRunning = false;
        this.pausedTime = Date.now() - this.startTime;
        
        clearInterval(this.intervalId);
        this.updateDisplay();
        this.syncToFirebase();
    }

    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.remaining = this.duration;
        this.pausedTime = 0;
        
        clearInterval(this.intervalId);
        this.updateDisplay();
        this.syncToFirebase();
    }

    setupFirebaseSync() {
        // Listen for remote timer state changes
        this.firebaseRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && !this.isLocalUpdate) {
                this.syncFromFirebase(data);
            }
            this.isLocalUpdate = false;
        });
    }

    syncFromFirebase(data) {
        const wasRunning = this.isRunning;
        
        this.isRunning = data.isRunning || false;
        this.isPaused = data.isPaused || false;
        this.remaining = data.remaining || this.duration;
        this.startTime = data.startTime || null;
        this.pausedTime = data.pausedTime || 0;
        
        // Update local timer state
        if (this.isRunning && !wasRunning) {
            this.startLocalTimer();
        } else if (!this.isRunning && wasRunning) {
            clearInterval(this.intervalId);
        }
        
        this.updateDisplay();
    }

    syncToFirebase() {
        if (this.firebaseRef) {
            this.isLocalUpdate = true;
            this.firebaseRef.set({
                isRunning: this.isRunning,
                isPaused: this.isPaused,
                remaining: this.remaining,
                startTime: this.startTime,
                pausedTime: this.pausedTime,
                lastUpdate: Date.now()
            }).catch(error => {
                console.warn('Firebase sync error:', error);
            });
        }
    }

    startLocalTimer() {
        clearInterval(this.intervalId);
        this.intervalId = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            this.remaining = this.duration - elapsed;
            this.updateDisplay();
        }, 100);
    }

    updateDisplay() {
        const container = document.querySelector(`[data-table-id="${this.id}"]`);
        if (!container) return;

        const timeDisplay = container.querySelector('.timer-time');
        const statusDisplay = container.querySelector('.timer-status');
        
        let displayTime, isOvertime = false;
        
        if (this.remaining <= 0) {
            // Calculate overtime
            const overtime = Math.abs(this.remaining);
            displayTime = overtime;
            isOvertime = true;
        } else {
            displayTime = this.remaining;
        }
        
        // Format time as HH:MM:SS
        const hours = Math.floor(displayTime / (1000 * 60 * 60));
        const minutes = Math.floor((displayTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((displayTime % (1000 * 60)) / 1000);
        
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (isOvertime) {
            timeDisplay.innerHTML = `<span style="color: #e74c3c; font-weight: bold;">+${timeString}</span>`;
        } else {
            timeDisplay.innerHTML = timeString;
        }
        
        // Update status and styling
        container.classList.remove('timer-running', 'timer-paused', 'timer-stopped', 'timer-finished');
        
        if (isOvertime) {
            statusDisplay.innerHTML = '<span style="color: #e74c3c; font-weight: bold;">OVERTIME</span>';
            container.classList.add('timer-finished');
        } else if (this.isRunning) {
            statusDisplay.textContent = 'Running';
            container.classList.add('timer-running');
        } else if (this.isPaused) {
            statusDisplay.textContent = 'Paused';
            container.classList.add('timer-paused');
        } else {
            statusDisplay.textContent = 'Ready';
            container.classList.add('timer-stopped');
        }
    }
}

class ClassroomFloorplan {
    constructor() {
        this.timers = new Map();
        this.studentNames = new Map(); // Store student names
        this.numberOfTables = 24; // 4 tables in row 1 + 7×2 tables in rows 3,4 + 6 tables in row 6
        this.namesRef = null;
        
        // Setup Firebase for names sync
        if (isFirebaseEnabled && database) {
            this.namesRef = database.ref('studentNames');
            this.setupNamesSync();
        }
        
        this.init();
    }

    init() {
        this.createTables();
        this.setupEventListeners();
        this.loadStudentNames(); // Load saved names
    }

    createTables() {
        const tablesGrid = document.querySelector('.tables-grid');
        tablesGrid.innerHTML = '';

        let tableNumber = 1;
        
        // Create 6 rows × 7 columns grid
        for (let row = 1; row <= 6; row++) {
            for (let col = 1; col <= 7; col++) {
                if (row === 2 || row === 5) {
                    // Create invisible empty space for aisles
                    const emptySpace = document.createElement('div');
                    emptySpace.className = 'invisible-aisle';
                    tablesGrid.appendChild(emptySpace);
                } else if ((row === 1 && col === 1) || (row === 6 && col === 1)) {
                    // Teacher desks in row 1 col 1 and row 6 col 1
                    const teacherDesk = this.createTeacherDesk(row);
                    tablesGrid.appendChild(teacherDesk);
                } else if (row === 1 && col === 6) {
                    // First row: empty space in column 6
                    const emptySpace = document.createElement('div');
                    emptySpace.className = 'empty-space';
                    tablesGrid.appendChild(emptySpace);
                } else if (row === 1 && col === 7) {
                    // First row: door in column 7
                    const door = this.createDoor();
                    tablesGrid.appendChild(door);
                } else if (row === 1 && col >= 2 && col <= 5) {
                    // First row: tables only in columns 2, 3, 4, 5
                    const tableContainer = this.createTableElement(tableNumber);
                    tablesGrid.appendChild(tableContainer);
                    
                    // Create timer instance
                    const timer = new Timer(tableNumber);
                    this.timers.set(tableNumber, timer);
                    timer.updateDisplay();
                    
                    // Restore student name if it exists
                    this.restoreStudentName(tableNumber);
                    
                    tableNumber++;
                } else if (row === 3 || row === 4) {
                    // Rows 3, 4: full 7 tables each
                    const tableContainer = this.createTableElement(tableNumber);
                    tablesGrid.appendChild(tableContainer);
                    
                    // Create timer instance
                    const timer = new Timer(tableNumber);
                    this.timers.set(tableNumber, timer);
                    timer.updateDisplay();
                    
                    // Restore student name if it exists
                    this.restoreStudentName(tableNumber);
                    
                    tableNumber++;
                } else if (row === 6 && col >= 2 && col <= 7) {
                    // Row 6: tables only in columns 2, 3, 4, 5, 6, 7
                    const tableContainer = this.createTableElement(tableNumber);
                    tablesGrid.appendChild(tableContainer);
                    
                    // Create timer instance
                    const timer = new Timer(tableNumber);
                    this.timers.set(tableNumber, timer);
                    timer.updateDisplay();
                    
                    // Restore student name if it exists
                    this.restoreStudentName(tableNumber);
                    
                    tableNumber++;
                }
            }
        }
    }

    createTableElement(tableNumber) {
        const container = document.createElement('div');
        container.className = 'table-container timer-stopped';
        container.setAttribute('data-table-id', tableNumber);

        container.innerHTML = `
            <div class="table-header">Table ${tableNumber}</div>
            <div class="name-tag">
                <input type="text" class="student-name" placeholder="Student Name" data-table="${tableNumber}" maxlength="25">
            </div>
            <div class="timer-display">
                <div class="timer-time">01:30:00</div>
                <div class="timer-status">Ready</div>
            </div>
            <div class="timer-controls">
                <button class="start-btn" data-action="start" data-table="${tableNumber}">Start</button>
                <button class="pause-btn" data-action="pause" data-table="${tableNumber}">Pause</button>
                <button class="reset-btn" data-action="reset" data-table="${tableNumber}">Reset</button>
            </div>
        `;

        return container;
    }

    createTeacherDesk(row) {
        const container = document.createElement('div');
        container.className = 'teacher-desk-grid';
        
        const deskNumber = row === 1 ? 1 : 2;
        
        container.innerHTML = `
            <div class="teacher-desk-content">
                <div class="teacher-desk-header">Teacher Desk</div>
                <div class="teacher-desk-icon">🎓</div>
                <div class="teacher-desk-label">Desk ${deskNumber}</div>
            </div>
        `;

        return container;
    }

    createDoor() {
        const container = document.createElement('div');
        container.className = 'door-element';
        
        container.innerHTML = `
            <div class="door-content">
                <div class="door-header">Exit</div>
                <div class="door-icon">🚪</div>
                <div class="door-label">Door</div>
            </div>
        `;

        return container;
    }

    setupEventListeners() {
        // Global controls
        document.getElementById('startAllBtn').addEventListener('click', () => {
            this.startAllTimers();
        });

        document.getElementById('pauseAllBtn').addEventListener('click', () => {
            this.pauseAllTimers();
        });

        document.getElementById('resetAllBtn').addEventListener('click', () => {
            this.resetAllTimers();
        });

        document.getElementById('clearNamesBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all student names?')) {
                this.clearAllNames();
            }
        });

        // Individual table controls
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action]')) {
                const action = e.target.dataset.action;
                const tableId = parseInt(e.target.dataset.table);
                const timer = this.timers.get(tableId);

                if (timer) {
                    switch (action) {
                        case 'start':
                            timer.start();
                            break;
                        case 'pause':
                            timer.pause();
                            break;
                        case 'reset':
                            timer.reset();
                            break;
                    }
                }
            }
        });

        // Student name input handling
        document.addEventListener('input', (e) => {
            if (e.target.matches('.student-name')) {
                const tableId = parseInt(e.target.dataset.table);
                const studentName = e.target.value.trim();
                this.setStudentName(tableId, studentName);
            }
        });

        // Save names when user leaves input field
        document.addEventListener('blur', (e) => {
            if (e.target.matches('.student-name')) {
                this.saveStudentNames();
            }
        }, true);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.startAllTimers();
                        break;
                    case 'p':
                        e.preventDefault();
                        this.pauseAllTimers();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.resetAllTimers();
                        break;
                }
            }
        });
    }

    startAllTimers() {
        this.timers.forEach(timer => timer.start());
    }

    pauseAllTimers() {
        this.timers.forEach(timer => timer.pause());
    }

    resetAllTimers() {
        this.timers.forEach(timer => timer.reset());
    }

    addTable() {
        this.numberOfTables++;
        this.createTables();
    }

    removeTable() {
        if (this.numberOfTables > 1) {
            this.numberOfTables--;
            this.createTables();
        }
    }

    setTimerDuration(minutes) {
        const duration = minutes * 60 * 1000; // Convert to milliseconds
        this.timers.forEach(timer => {
            timer.duration = duration;
            timer.reset();
        });
    }

    setupNamesSync() {
        // Listen for remote name changes
        this.namesRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && !this.isLocalNameUpdate) {
                // Update local names from Firebase
                Object.entries(data).forEach(([tableId, name]) => {
                    this.studentNames.set(parseInt(tableId), name);
                    const input = document.querySelector(`input[data-table="${tableId}"]`);
                    if (input && input.value !== name) {
                        input.value = name;
                    }
                });
            }
            this.isLocalNameUpdate = false;
        });
    }

    syncNameToFirebase(tableId, name) {
        if (this.namesRef) {
            this.isLocalNameUpdate = true;
            if (name.trim()) {
                this.namesRef.child(tableId).set(name).catch(error => {
                    console.warn('Firebase name sync error:', error);
                });
            } else {
                this.namesRef.child(tableId).remove().catch(error => {
                    console.warn('Firebase name removal error:', error);
                });
            }
        }
    }

    setStudentName(tableId, name) {
        this.studentNames.set(tableId, name);
        this.syncNameToFirebase(tableId, name);
    }

    getStudentName(tableId) {
        return this.studentNames.get(tableId) || '';
    }

    saveStudentNames() {
        const namesObject = {};
        this.studentNames.forEach((name, tableId) => {
            if (name) {
                namesObject[tableId] = name;
            }
        });
        localStorage.setItem('classroomStudentNames', JSON.stringify(namesObject));
    }

    loadStudentNames() {
        try {
            const savedNames = localStorage.getItem('classroomStudentNames');
            if (savedNames) {
                const namesObject = JSON.parse(savedNames);
                Object.entries(namesObject).forEach(([tableId, name]) => {
                    this.studentNames.set(parseInt(tableId), name);
                    // Update the input field if it exists
                    const input = document.querySelector(`input[data-table="${tableId}"]`);
                    if (input) {
                        input.value = name;
                    }
                });
            }
        } catch (error) {
            console.warn('Failed to load student names:', error);
        }
    }

    clearAllNames() {
        this.studentNames.clear();
        document.querySelectorAll('.student-name').forEach(input => {
            input.value = '';
        });
        localStorage.removeItem('classroomStudentNames');
        
        // Clear from Firebase
        if (this.namesRef) {
            this.namesRef.remove().catch(error => {
                console.warn('Firebase clear names error:', error);
            });
        }
    }

    restoreStudentName(tableNumber) {
        const savedName = this.getStudentName(tableNumber);
        if (savedName) {
            const input = document.querySelector(`input[data-table="${tableNumber}"]`);
            if (input) {
                input.value = savedName;
            }
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const classroom = new ClassroomFloorplan();
    
    // Make classroom instance globally available for debugging
    window.classroom = classroom;
    
    // Add some helpful console messages
    console.log('🎓 Classroom Floorplan initialized!');
    console.log('📡 Sync Status:', isFirebaseEnabled ? 'LIVE SYNC ENABLED' : 'OFFLINE MODE');
    console.log('✨ Features:');
    console.log('- 🔄 Real-time timer synchronization across all devices');
    console.log('- 👥 Live student name updates for all users');
    console.log('- 📱 Works on multiple devices simultaneously');
    console.log('- 💾 Automatic data persistence');
    console.log('⌨️ Keyboard shortcuts:');
    console.log('- Ctrl/Cmd + S: Start all timers');
    console.log('- Ctrl/Cmd + P: Pause all timers');
    console.log('- Ctrl/Cmd + R: Reset all timers');
    console.log('🛠️ Available methods:');
    console.log('- classroom.addTable(): Add a new table');
    console.log('- classroom.removeTable(): Remove a table');
    console.log('- classroom.setTimerDuration(minutes): Set timer duration for all tables');
    console.log('- classroom.clearAllNames(): Clear all student names');
    if (isFirebaseEnabled) {
        console.log('🔥 Firebase methods:');
        console.log('- Real-time sync is automatic');
        console.log('- Changes sync instantly across all connected devices');
    }
});
