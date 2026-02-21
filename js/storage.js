// js/storage.js

const STORAGE_KEY_ROUTINES = 'interval_app_routines';
const STORAGE_KEY_LOGS = 'interval_app_logs';

const defaultRoutines = [
    {
        name: "Tabata (4 mins)",
        intervals: [
            { time: 10, instruction: "Get Ready" },
            { time: 20, instruction: "Work Hard" }, { time: 10, instruction: "Rest" },
            { time: 20, instruction: "Work Hard" }, { time: 10, instruction: "Rest" },
            { time: 20, instruction: "Work Hard" }, { time: 10, instruction: "Rest" },
            { time: 20, instruction: "Work Hard" }, { time: 10, instruction: "Rest" },
            { time: 20, instruction: "Work Hard" }, { time: 10, instruction: "Rest" },
            { time: 20, instruction: "Work Hard" }, { time: 10, instruction: "Rest" },
            { time: 20, instruction: "Work Hard" }, { time: 10, instruction: "Rest" },
            { time: 20, instruction: "Work Hard" }, { time: 10, instruction: "Rest" },
            { time: 0, instruction: "Workout Complete!" }
        ]
    },
    {
        name: "Box Breathing (4 mins)",
        intervals: [
            { time: 5, instruction: "Get Ready" },
            { time: 4, instruction: "Inhale" }, { time: 4, instruction: "Hold" }, { time: 4, instruction: "Exhale" }, { time: 4, instruction: "Hold" },
            { time: 4, instruction: "Inhale" }, { time: 4, instruction: "Hold" }, { time: 4, instruction: "Exhale" }, { time: 4, instruction: "Hold" },
            { time: 4, instruction: "Inhale" }, { time: 4, instruction: "Hold" }, { time: 4, instruction: "Exhale" }, { time: 4, instruction: "Hold" },
            { time: 4, instruction: "Inhale" }, { time: 4, instruction: "Hold" }, { time: 4, instruction: "Exhale" }, { time: 4, instruction: "Hold" },
            { time: 4, instruction: "Inhale" }, { time: 4, instruction: "Hold" }, { time: 4, instruction: "Exhale" }, { time: 4, instruction: "Hold" },
            { time: 0, instruction: "Session Complete!" }
        ]
    }
];

const Storage = {
    // ---- Routines ----
    getRoutines() {
        const stored = localStorage.getItem(STORAGE_KEY_ROUTINES);
        if (!stored) {
            this.saveRoutines(defaultRoutines);
            return defaultRoutines;
        }
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse routines from storage", e);
            return defaultRoutines;
        }
    },

    saveRoutines(routines) {
        localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(routines));
    },

    addRoutine(name, intervals) {
        const routines = this.getRoutines();
        // Overwrite if name exists, otherwise push
        const existingIndex = routines.findIndex(r => r.name === name);
        if (existingIndex >= 0) {
            routines[existingIndex] = { name, intervals };
        } else {
            routines.push({ name, intervals });
        }
        this.saveRoutines(routines);
    },

    deleteRoutine(name) {
        let routines = this.getRoutines();
        routines = routines.filter(r => r.name !== name);
        this.saveRoutines(routines);
    },

    // ---- History Logs ----
    getLogs() {
        const stored = localStorage.getItem(STORAGE_KEY_LOGS);
        if (!stored) return [];
        try {
            return JSON.parse(stored);
        } catch (e) {
            return [];
        }
    },

    addLog(routineName, totalSeconds) {
        const logs = this.getLogs();
        const newLog = {
            id: Date.now().toString(),
            date: new Date().toISOString(), // ISO string for easy parsing later
            routineName: routineName || "Custom Workout",
            totalSeconds: totalSeconds
        };
        logs.unshift(newLog); // Add to beginning (newest first)
        
        // Optional: keep log size manageable (e.g., last 1000 logs)
        if (logs.length > 1000) logs.pop();
        
        localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
        return newLog;
    }
};

window.AppStorage = Storage;
