// js/app.js

document.addEventListener('DOMContentLoaded', () => {

    // Core Modules
    const storage = window.AppStorage;
    const workout = new window.WorkoutEngine();
    const calendar = new window.CalendarView();

    // View Management
    const views = {
        dashboard: document.getElementById('view-dashboard'),
        workout: document.getElementById('view-workout'),
        calendar: document.getElementById('view-calendar')
    };

    function showView(viewName) {
        Object.values(views).forEach(v => v.classList.remove('active'));
        views[viewName].classList.add('active');

        // View specific lifecycle hooks
        if (viewName === 'calendar') {
            calendar.render();
        }
    }

    // ---- Dashboard: Routine Loading ----
    const selectRoutine = document.getElementById('routine-select');
    const btnStartSelected = document.getElementById('btn-start-selected');
    const txtJson = document.getElementById('routine-json');
    const txtName = document.getElementById('routine-name');
    const btnSaveJson = document.getElementById('btn-save-json');
    const btnStartJson = document.getElementById('btn-start-json');
    const voiceSelect = document.getElementById('voice-select');

    function populateVoices() {
        if (!window.speechSynthesis) return;
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return;

        while (voiceSelect.options.length > 1) {
            voiceSelect.remove(1);
        }

        const enVoices = voices.filter(v => v.lang.startsWith('en'));
        enVoices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.voiceURI;
            opt.textContent = `${v.name} (${v.lang})`;
            voiceSelect.appendChild(opt);
        });
    }

    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = populateVoices;
        populateVoices(); // Try immediately in case they are already loaded
    }

    // Give it a manual test button for voice
    voiceSelect.addEventListener('change', () => {
        if (voiceSelect.value !== 'default' && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance("Testing voice");
            const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === voiceSelect.value);
            if (voice) utterance.voice = voice;
            window.speechSynthesis.speak(utterance);
        }
    });

    function populateRoutines() {
        const routines = storage.getRoutines();
        // Clear except first option
        while (selectRoutine.options.length > 1) {
            selectRoutine.remove(1);
        }

        routines.forEach((r, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${r.name} (${r.intervals.length} intervals)`;
            selectRoutine.appendChild(opt);
        });

        btnStartSelected.disabled = true;
    }

    selectRoutine.addEventListener('change', () => {
        btnStartSelected.disabled = !selectRoutine.value;
    });

    btnStartSelected.addEventListener('click', () => {
        const idx = selectRoutine.value;
        if (!idx) return;

        const routine = storage.getRoutines()[idx];
        startWorkout(routine.name, routine.intervals);
    });

    // ---- Dashboard: Custom JSON ----
    function parseCustomJson() {
        try {
            const val = txtJson.value.trim();
            if (!val) throw new Error("Empty JSON");

            const intervals = JSON.parse(val);
            if (!Array.isArray(intervals)) throw new Error("JSON must be an array");

            // Validate shape
            if (intervals.length === 0) throw new Error("Array is empty");
            if (typeof intervals[0].time !== 'number' || typeof intervals[0].instruction !== 'string') {
                throw new Error("Invalid object format. Expected { time: Number, instruction: String }");
            }
            return intervals;

        } catch (e) {
            alert("Invalid JSON Format. " + e.message);
            return null;
        }
    }

    btnSaveJson.addEventListener('click', () => {
        const intervals = parseCustomJson();
        if (!intervals) return;

        let name = txtName.value.trim();
        if (!name) name = "Custom " + new Date().toLocaleDateString();

        storage.addRoutine(name, intervals);
        populateRoutines();
        alert(`Saved ${name}!`);

        txtName.value = "";
        txtJson.value = "";
    });

    btnStartJson.addEventListener('click', () => {
        const intervals = parseCustomJson();
        if (!intervals) return;
        startWorkout(txtName.value.trim() || "Custom Workout", intervals);
    });


    // ---- Workout Execution Logic ----
    function startWorkout(name, intervals) {
        workout.selectedVoiceURI = voiceSelect.value;
        workout.loadRoutine(name, intervals);
        showView('workout');

        workout.start((result) => {
            // Success Callback
            storage.addLog(result.name, result.totalSeconds);
            showView('calendar');
        });
    }

    document.getElementById('btn-cancel-workout').addEventListener('click', () => {
        workout.stop();
        showView('dashboard');
    });

    document.getElementById('btn-pause-resume').addEventListener('click', () => {
        workout.pauseResume();
    });


    // ---- Calendar / History Navigation ----
    document.getElementById('btn-show-calendar').addEventListener('click', () => {
        showView('calendar');
    });

    document.getElementById('btn-back-dashboard').addEventListener('click', () => {
        showView('dashboard');
    });


    // Initialize App
    populateRoutines();

});
