// js/calendar.js

class CalendarView {
    constructor() {
        this.currentDate = new Date();

        // Elements
        this.gridEl = document.getElementById('calendar-grid');
        this.monthYearEl = document.getElementById('cal-month-year');
        this.logListEl = document.getElementById('log-list');

        // Event Listeners for Nav
        document.getElementById('btn-cal-prev').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('btn-cal-next').addEventListener('click', () => this.changeMonth(1));
    }

    render() {
        this.renderCalendar();
        this.renderRecentLogs();
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.renderCalendar();
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
        const totalDays = lastDay.getDate();

        // Set Header Texture
        const _monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        this.monthYearEl.textContent = `${_monthNames[month]} ${year}`;

        // Get Logs and create a simple map of active days for the current month
        const logs = window.AppStorage.getLogs();
        const activeDays = {};

        logs.forEach(log => {
            const rowDate = new Date(log.date);
            if (rowDate.getFullYear() === year && rowDate.getMonth() === month) {
                // Found a workout for this month!
                activeDays[rowDate.getDate()] = true;
            }
        });

        // Building the grid HTML
        let html = '';

        // Headers (Sun - Sat)
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        days.forEach(d => {
            html += `<div class="cal-day-header">${d}</div>`;
        });

        // Empty filler days
        for (let i = 0; i < startDayOfWeek; i++) {
            html += `<div class="cal-day empty"></div>`;
        }

        // The actual days
        const today = new Date();
        const isCurrentMonthContent = (today.getFullYear() === year && today.getMonth() === month);

        for (let day = 1; day <= totalDays; day++) {
            let classes = ['cal-day'];
            if (activeDays[day]) classes.push('has-workout');
            if (isCurrentMonthContent && today.getDate() === day) classes.push('today');

            html += `<div class="${classes.join(' ')}">${day}</div>`;
        }

        this.gridEl.innerHTML = html;
    }

    formatDuration(totalSecs) {
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        if (m > 0) {
            return `${m}m ${s}s`;
        }
        return `${s}s`;
    }

    renderRecentLogs() {
        const logs = window.AppStorage.getLogs();

        if (logs.length === 0) {
            this.logListEl.innerHTML = `<li><p class="helper-text">No workouts logged yet.</p></li>`;
            return;
        }

        // Show top 20 logs
        const recentLogs = logs.slice(0, 20);

        let html = '';
        recentLogs.forEach(log => {
            const dateObj = new Date(log.date);
            const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

            html += `
                <li class="log-item">
                    <div class="log-info">
                        <h3>${log.routineName}</h3>
                        <p>${dateStr}</p>
                    </div>
                    <div class="log-stat">${this.formatDuration(log.totalSeconds)}</div>
                </li>
            `;
        });

        this.logListEl.innerHTML = html;
    }
}

window.CalendarView = CalendarView;
