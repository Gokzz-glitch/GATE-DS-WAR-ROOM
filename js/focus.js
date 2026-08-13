const FocusTimer = (function() {
    let pomodoroTime = 25 * 60; // 25 minutes
    let isRunning = false;
    let timerInterval = null;
    let sessionStartTime = Date.now();
    let breakAlertShown = false;

    function renderTimer() {
        const topbar = document.querySelector('.topbar');
        if (!topbar) return;

        const timerContainer = document.createElement('div');
        timerContainer.id = 'focus-timer-container';
        timerContainer.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-right: 15px; font-family: var(--font-mono); background: var(--bg-secondary); padding: 5px 15px; border-radius: 20px; border: 1px solid var(--border); margin-left: auto;';

        timerContainer.innerHTML = `
            <span style="font-size: 1.1rem;">⏱️</span>
            <div id="pomodoro-display" style="font-size: 1.1rem; font-weight: bold; color: var(--accent); width: 55px; text-align: center;">25:00</div>
            <button id="btn-pomodoro-toggle" style="background: none; border: none; color: var(--text-primary); cursor: pointer; font-size: 1.1rem; padding: 0;">▶</button>
            <button id="btn-pomodoro-reset" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem; padding: 0;">↺</button>
        `;

        topbar.appendChild(timerContainer);

        document.getElementById('btn-pomodoro-toggle').addEventListener('click', toggleTimer);
        document.getElementById('btn-pomodoro-reset').addEventListener('click', resetTimer);

        // Start session tracking for Tech Breaks
        setInterval(checkSessionTime, 60000); // check every minute
    }

    function toggleTimer() {
        isRunning = !isRunning;
        const btn = document.getElementById('btn-pomodoro-toggle');
        if (isRunning) {
            btn.innerText = '⏸';
            timerInterval = setInterval(updateTimer, 1000);
        } else {
            btn.innerText = '▶';
            clearInterval(timerInterval);
        }
    }

    function resetTimer() {
        isRunning = false;
        clearInterval(timerInterval);
        pomodoroTime = 25 * 60;
        document.getElementById('btn-pomodoro-toggle').innerText = '▶';
        updateDisplay();
    }

    function updateTimer() {
        if (pomodoroTime > 0) {
            pomodoroTime--;
            updateDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            document.getElementById('btn-pomodoro-toggle').innerText = '▶';
            if (window.UI && UI.showModal) {
                UI.showModal('Pomodoro Complete! 🍅', '<p>Great focus session! Take a 5-minute break to recharge.</p>');
            } else {
                alert('Pomodoro complete! Take a 5-minute break.');
            }
        }
    }

    function updateDisplay() {
        const mins = Math.floor(pomodoroTime / 60).toString().padStart(2, '0');
        const secs = (pomodoroTime % 60).toString().padStart(2, '0');
        document.getElementById('pomodoro-display').innerText = `${mins}:${secs}`;
    }

    function checkSessionTime() {
        if (breakAlertShown) return;
        const activeTimeMins = (Date.now() - sessionStartTime) / 60000;
        if (activeTimeMins >= 45) {
            if (window.UI && UI.showModal) {
                UI.showModal('Technology Break Required 🛑', '<p>You have been active for 45 minutes. Research shows continuous screen time reduces focus.</p><p style="color:var(--accent); font-weight:bold; margin-top:10px;">Please take a 5-minute break away from the screen.</p>');
            } else {
                alert('Technology Break: You have been active for 45 minutes. Please take a 5-minute break away from the screen.');
            }
            breakAlertShown = true;
            setTimeout(() => { breakAlertShown = false; sessionStartTime = Date.now(); }, 600000); // reset after 10 mins
        }
    }

    document.addEventListener('DOMContentLoaded', renderTimer);

    return {
        resetSession: () => { sessionStartTime = Date.now(); }
    };
})();
