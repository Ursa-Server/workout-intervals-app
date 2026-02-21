// js/workout.js

class WorkoutEngine {
    constructor() {
        this.intervals = [];
        this.currentIdx = 0;
        this.timeLeft = 0;
        this.timerInterval = null;
        this.isRunning = false;
        this.routineName = "";

        // Total stats
        this.totalTimeElapsed = 0;
        this.totalTimeLeft = 0;

        // Audio Context (initialized on first user interaction)
        this.audioCtx = null;

        this.selectedVoiceURI = 'default';

        // Wake Lock
        this.wakeLock = null;

        // UI Elements
        this.elDisplays = {
            time: document.getElementById('time-display'),
            instruction: document.getElementById('instruction-display'),
            nextInstruction: document.getElementById('next-instruction-display'),
            progress: document.getElementById('workout-progress'),
            totalTime: document.getElementById('total-time-display'),
            btnPause: document.getElementById('btn-pause-resume')
        };

        this.onCompleteCallback = null;
    }

    initAudioContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        }
        // Resume if suspended (browser behavior)
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        // Force load voices if they aren't loaded yet
        if (window.speechSynthesis && window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.getVoices();
        }
    }

    async requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                // Re-acquire if visibility changes (e.g., user minimizes and returns)
                document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            } catch (err) {
                console.log(`Wake Lock Error: ${err.name}, ${err.message}`);
            }
        }
    }

    async releaseWakeLock() {
        if (this.wakeLock !== null) {
            await this.wakeLock.release()
                .catch(err => console.log(`Wake Lock Release Error: ${err.message}`));
            this.wakeLock = null;
        }
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    async handleVisibilityChange() {
        if (document.visibilityState === 'visible' && this.isRunning) {
            await this.requestWakeLock();
        }
    }

    playBeep(frequency, duration, type = 'sine') {
        if (!this.audioCtx) return;

        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

        // Start loud, fade out slightly to avoid click
        gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        oscillator.start();
        oscillator.stop(this.audioCtx.currentTime + duration);
    }

    getFemaleVoice() {
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices();

        if (this.selectedVoiceURI && this.selectedVoiceURI !== 'default') {
            const exact = voices.find(v => v.voiceURI === this.selectedVoiceURI);
            if (exact) return exact;
        }

        // 1. Prioritize Premium Neural/Cloud Voices (e.g. Edge Natural voices which have extreme realism/emotion)
        let premium = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural') && (v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Sonia') || v.name.includes('Amber')));
        if (premium) return premium;

        // 2. Prioritize high-quality Chrome Google voices
        let google = voices.find(v => v.name === 'Google US English'); // This is Chrome's default high-quality female
        if (google) return google;

        // 3. Fallback to OS-level standard female voices
        return voices.find(v =>
            v.lang.startsWith('en') &&
            (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Victoria'))
        ) || null;
    }

    getMotivationalPhrase() {
        const phrases = [
            "Keep it up!", "You're doing great!", "Push through!", "Almost there!",
            "Don't give up!", "Stay strong!", "You got this!", "Finish strong!",
            "Let's go!", "You are crushing it!"
        ];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    speak(text) {
        if (!window.speechSynthesis) return;

        // Cancel any currently speaking text
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        const voice = this.getFemaleVoice();
        if (voice) {
            utterance.voice = voice;

            // If it's a premium neural voice, don't mess with pitch/rate too much as it corrupts the realism.
            // If it's a basic OS voice (Zira/Samantha), making it slightly faster and higher helps it sound peppy.
            if (voice.name.includes('Natural') || voice.name.includes('Google')) {
                utterance.rate = 1.05;
                utterance.pitch = 1.1;
            } else {
                utterance.rate = 1.15;
                utterance.pitch = 1.3;
            }
        }

        window.speechSynthesis.speak(utterance);
    }

    loadRoutine(name, intervals) {
        this.routineName = name;
        this.intervals = intervals;
        this.currentIdx = 0;
        this.totalTimeElapsed = 0;
        this.totalTimeLeft = this.intervals.reduce((sum, int) => sum + int.time, 0);
        this.stop();
        this.updateUI();
    }

    start(onComplete) {
        this.initAudioContext();
        this.requestWakeLock();
        this.onCompleteCallback = onComplete;

        if (this.intervals.length === 0) return;

        this.isRunning = true;
        this.timeLeft = this.intervals[this.currentIdx].time;

        // Announce first interval immediately
        this.speak(this.intervals[this.currentIdx].instruction);
        this.updateUI();

        this.startTimerLoop();
    }

    startTimerLoop() {
        clearInterval(this.timerInterval);

        // We use a relatively simple setInterval here.
        // For sub-millisecond precision, requestAnimationFrame or comparing Date.now() is better, 
        // but for 1-second intervals, setInterval handles it adequately for this use case.
        let expected = Date.now() + 1000;

        this.timerInterval = setInterval(() => {
            const dt = Date.now() - expected; // Drift detection

            if (this.timeLeft > 0) {
                this.timeLeft--;
                this.totalTimeElapsed++;
                this.totalTimeLeft--;

                // Beep Logic when timeLeft is decreasing (last 5 seconds)
                if (this.timeLeft <= 5 && this.timeLeft > 0) {
                    this.playBeep(440, 0.2);
                }

            } else {  // Time hit 0, move to next interval
                this.playBeep(880, 0.6, 'triangle'); // High long beep for next interval

                this.currentIdx++;

                if (this.currentIdx < this.intervals.length) {
                    this.timeLeft = this.intervals[this.currentIdx].time;
                    let textToSpeak = this.intervals[this.currentIdx].instruction;

                    // Force exclamation points to prompt TTS engines to use a more enthusiastic/peppy inflection
                    if (!textToSpeak.endsWith('!') && !textToSpeak.endsWith('.')) {
                        textToSpeak += "!";
                    }

                    // Add motivation if past halfway point
                    const totalSecs = this.totalTimeElapsed + this.totalTimeLeft;
                    if (this.totalTimeElapsed > (totalSecs / 2)) {
                        // 60% chance to add motivation
                        if (Math.random() > 0.4) {
                            textToSpeak += " " + this.getMotivationalPhrase();
                        }
                    }
                    this.speak(textToSpeak);
                } else {
                    // WORKOUT FINISHED
                    this.finish();
                    return;
                }
            }

            this.updateUI();
            expected += 1000;

        }, 1000);
    }

    pauseResume() {
        if (this.isRunning) {
            clearInterval(this.timerInterval);
            this.isRunning = false;
            this.elDisplays.btnPause.textContent = "Resume";
            this.elDisplays.time.classList.add('paused');
            this.releaseWakeLock();
        } else {
            this.initAudioContext(); // Ensure interaction un-suspends mobile audio
            this.requestWakeLock();
            this.isRunning = true;
            this.elDisplays.btnPause.textContent = "Pause";
            this.elDisplays.time.classList.remove('paused');
            this.startTimerLoop();
        }
    }

    stop() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        this.releaseWakeLock();
        if (this.elDisplays.btnPause) {
            this.elDisplays.btnPause.textContent = "Pause";
        }
    }

    finish() {
        this.stop();
        this.speak("Workout Complete");
        if (this.onCompleteCallback) {
            // Wait 2 seconds before firing complete callback to show 00:00 briefly
            setTimeout(() => {
                this.onCompleteCallback({
                    name: this.routineName,
                    totalSeconds: this.totalTimeElapsed
                });
            }, 2000);
        }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    updateUI() {
        if (this.currentIdx >= this.intervals.length) return;

        const currentInterval = this.intervals[this.currentIdx];
        const nextInterval = this.intervals[this.currentIdx + 1];

        // Update Time display
        this.elDisplays.time.textContent = this.formatTime(this.timeLeft);

        // Emphasize last 3 seconds visually
        if (this.timeLeft <= 3 && this.timeLeft > 0) {
            this.elDisplays.time.classList.add('warning');
        } else {
            this.elDisplays.time.classList.remove('warning');
        }

        // Update Text
        this.elDisplays.instruction.textContent = currentInterval.instruction;
        this.elDisplays.progress.textContent = `${this.currentIdx + 1} / ${this.intervals.length}`;

        if (nextInterval) {
            this.elDisplays.nextInstruction.textContent = `${nextInterval.instruction} (${this.formatTime(nextInterval.time)})`;
        } else {
            this.elDisplays.nextInstruction.textContent = "Done";
        }

        if (this.elDisplays.totalTime) {
            this.elDisplays.totalTime.textContent = this.formatTime(this.totalTimeLeft);
        }
    }
}

window.WorkoutEngine = WorkoutEngine;
