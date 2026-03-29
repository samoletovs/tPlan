// ============================================================
// Tplan — Workout App Engine v2
// Features: localStorage backup, previous results, tempo timer,
//           auto-progression, streak, difficulty, weight
// ============================================================

// WORKOUT and PREVIOUS must be defined before this script loads.
// WORKOUT = { date, day, title, week, streak, steps[], previousResults[] }
// PREVIOUS is optional: array from last workout JSON

(function() {
  'use strict';

  // ===== СОСТОЯНИЕ =====
  const STORAGE_KEY = 'tplan_' + WORKOUT.date;
  const LOGS_KEY = 'tplan_all_logs';
  let current = 0;
  let results = [];
  let timerInterval = null;
  let startTime = Date.now();
  let itemTimers = {};
  let diffSelections = {};
  let tempoInterval = null;
  let elapsedInterval = null;
  let savedLogData = null;

  const stepsEl = document.getElementById('steps');
  const totalSteps = () => WORKOUT.steps.length;
  const diffLabels = { easy: '😊 Легко', normal: '💪 Норм', hard: '🔥 Сложно' };

  // ===== localStorage (#1) =====
  function saveState() {
    try {
      const state = { current, results, diffSelections, startTime, ts: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch(e) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const state = JSON.parse(raw);
      // Only restore if less than 4 hours old
      if (Date.now() - state.ts > 4 * 3600 * 1000) { localStorage.removeItem(STORAGE_KEY); return false; }
      current = state.current || 0;
      results = state.results || [];
      diffSelections = state.diffSelections || {};
      startTime = state.startTime || Date.now();
      return current > 0;
    } catch(e) { return false; }
  }

  function clearState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
  }

  // ===== PREVIOUS RESULTS (#2) =====
  function getPreviousForExercise(stepName, stepMeta) {
    if (!WORKOUT.previousResults || !WORKOUT.previousResults.length) return null;
    // Match by exercise name and set info
    return WORKOUT.previousResults.find(p =>
      p.name === stepName && p.set === stepMeta
    ) || null;
  }

  function buildPrevHint(step) {
    const prev = getPreviousForExercise(step.name, step.meta);
    if (!prev) return '';
    const d = diffLabels[prev.difficulty] || '';
    return `<div class="prev-result">Прошлый раз: <strong>${prev.actual}/${prev.planned}</strong> ${d ? '· ' + d : ''}</div>`;
  }

  // ===== STREAK (#7) =====
  function renderStreak() {
    const s = WORKOUT.streak || 0;
    const el = document.getElementById('streak');
    if (!el) return;
    if (s >= 2) {
      el.textContent = `🔥 ${s} ${pluralize(s, 'тренировка', 'тренировки', 'тренировок')} подряд!`;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  function pluralize(n, one, few, many) {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (last > 1 && last < 5) return few;
    if (last === 1) return one;
    return many;
  }

  // ===== ПРОГРЕСС-БАР =====
  function updateProgress() {
    const done = Math.min(current, totalSteps());
    const pct = Math.round((done / totalSteps()) * 100);
    document.getElementById('pFill').style.width = pct + '%';
    document.getElementById('pText').textContent = `${done} / ${totalSteps()}`;
  }

  // ===== ELAPSED TIMER =====
  let trainingStarted = false;

  function initElapsedUI() {
    const wrap = document.createElement('div');
    wrap.id = 'elapsed-wrap';
    const prog = document.querySelector('.prog');
    if (prog) prog.after(wrap);
    return wrap;
  }

  function showStartButton() {
    const wrap = document.getElementById('elapsed-wrap') || initElapsedUI();
    const stepCount = WORKOUT.steps.filter(s => s.type === 'exercise').length;
    wrap.innerHTML = `<button class="btn btn-start" id="btn-start">
      ▶ Начать тренировку<br>
      <span style="font-size:.65em;font-weight:500;opacity:.8">${stepCount} упражнений · Неделя ${WORKOUT.week}</span>
    </button>`;
    stepsEl.classList.add('hidden');
    document.getElementById('btn-start').addEventListener('click', beginTraining);
  }

  function beginTraining() {
    trainingStarted = true;
    startTime = Date.now();
    stepsEl.classList.remove('hidden');
    startElapsedTimer();
    renderAll();
    saveState();
  }

  function startElapsedTimer() {
    trainingStarted = true;
    const wrap = document.getElementById('elapsed-wrap') || initElapsedUI();
    wrap.innerHTML = `<div class="elapsed-timer" id="elapsed"></div>`;
    const el = document.getElementById('elapsed');
    function tick() {
      const ms = Date.now() - startTime;
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      el.textContent = `⏱ ${m}:${s.toString().padStart(2, '0')}`;
    }
    tick();
    elapsedInterval = setInterval(tick, 1000);
  }

  function stopElapsedTimer() {
    if (elapsedInterval) { clearInterval(elapsedInterval); elapsedInterval = null; }
  }

  // ===== РЕНДЕР =====
  function renderAll() {
    if (current >= totalSteps()) { showSummary(); return; }
    stepsEl.innerHTML = '';
    stepsEl.classList.remove('hidden');
    WORKOUT.steps.forEach((step, i) => {
      const div = document.createElement('div');
      div.id = 'step-' + i;
      div.className = 'card' + (i === current ? ' active' : i < current ? ' done' : ' upcoming');
      div.innerHTML = buildStepHTML(step, i);
      stepsEl.appendChild(div);
    });
    updateProgress();
    saveState();
    scrollToActive();
  }

  function buildStepHTML(step, i) {
    if (i < current) return buildDoneHTML(step, i);
    if (i > current) return buildUpcomingHTML(step);
    if (step.type === 'warmup' || step.type === 'cooldown') return buildChecklistHTML(step, i);
    return buildExerciseHTML(step, i);
  }

  function buildUpcomingHTML(step) {
    const tag = step.type === 'warmup' ? 'tag-warmup' : step.type === 'cooldown' ? 'tag-cooldown' : 'tag-exercise';
    const label = step.type === 'warmup' ? 'Разминка' : step.type === 'cooldown' ? 'Заминка' : 'Упражнение';
    let html = `<span class="tag ${tag}">${label}</span><h3>${step.name}</h3>`;
    if (step.meta) html += `<div class="meta">${step.meta}</div>`;
    if (step.planned) html += `<div class="meta">Цель: ${step.planned}</div>`;
    return html;
  }

  function buildDoneHTML(step, i) {
    const r = results.find(r => r.index === i);
    let html = `<h3>${step.name} <span class="done-badge">✓</span></h3>`;
    if (r && r.actual !== undefined) {
      const cls = r.actual >= r.planned ? 'good' : 'miss';
      const d = diffLabels[r.difficulty] || '';
      html += `<div class="meta">${step.meta || ''} · <span class="${cls}">${r.actual}/${r.planned}</span>${d ? ' · ' + d : ''}</div>`;
    }
    return html;
  }

  function buildChecklistHTML(step, i) {
    const tag = step.type === 'warmup' ? 'tag-warmup' : 'tag-cooldown';
    const label = step.type === 'warmup' ? 'Разминка' : 'Заминка';
    let items = step.items.map((item, j) => {
      const hasTimer = item.timer && item.timer > 0;
      const tid = `it-${i}-${j}`;
      return `
        <div class="check-item" id="ci-${i}-${j}">
          <input type="checkbox" onclick="window._app.toggleCheck(${i},${j})">
          <div class="ci-content">
            <span class="ci-text">${item.text}</span>
            ${item.desc ? `<span class="ci-desc">${item.desc}</span>` : ''}
            ${hasTimer ? `
              <div class="ci-timer">
                <button class="ci-timer-btn" id="btn-${tid}" onclick="window._app.startItemTimer('${tid}',${item.timer})">▶ Старт</button>
                <span class="ci-timer-display" id="disp-${tid}">${fmtTime(item.timer)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
    return `
      <span class="tag ${tag}">${label}</span>
      <h3>${step.name}</h3>
      <div style="margin:12px 0">${items}</div>
      <button class="btn btn-go" onclick="window._app.completeChecklist(${i})">Готово</button>
    `;
  }

  function buildExerciseHTML(step, i) {
    if (step.timer) return buildTimedExerciseHTML(step, i);
    const tempo = step.tempo || '2-1-2';
    return `
      <span class="tag tag-exercise">Упражнение</span>
      <h3>${step.name}</h3>
      <div class="meta">${step.meta}</div>
      ${buildPrevHint(step)}
      <div class="tech">${step.technique}</div>
      <div class="target-number">
        <div class="num">${step.planned}</div>
        <div class="label">Цель повторений</div>
      </div>
      <div id="tempo-box-${i}" class="tempo-box hidden"></div>
      <button class="btn btn-tempo" id="tempo-btn-${i}" onclick="window._app.toggleTempo(${i}, '${tempo}')">
        Темп ${tempo}
      </button>
      <div class="reps-row">
        <label>Сделано:</label>
        <input type="number" class="reps-input" id="reps-${i}" value="${step.planned}" min="0" max="99">
      </div>
      <div class="diff-row">
        <label>Как ощущения?</label>
        <button class="diff-btn" id="diff-${i}-easy" onclick="window._app.setDiff(${i},'easy')">Легко</button>
        <button class="diff-btn" id="diff-${i}-normal" onclick="window._app.setDiff(${i},'normal')">Нормально</button>
        <button class="diff-btn" id="diff-${i}-hard" onclick="window._app.setDiff(${i},'hard')">Сложно</button>
      </div>
      <input type="text" class="note-input" id="note-${i}" placeholder="Заметки">
      <button class="btn btn-go" style="margin-top:16px" onclick="window._app.completeExercise(${i})">
        Подход выполнен
      </button>
    `;
  }

  function buildTimedExerciseHTML(step, i) {
    const tid = `ext-${i}`;
    return `
      <span class="tag tag-exercise">Упражнение</span>
      <h3>${step.name}</h3>
      <div class="meta">${step.meta}</div>
      ${buildPrevHint(step)}
      <div class="tech">${step.technique}</div>
      <div class="target-number">
        <div class="num">${fmtTime(step.timer)}</div>
        <div class="label">Цель (секунды)</div>
      </div>
      <div class="ci-timer" style="justify-content:center;margin:16px 0">
        <button class="btn btn-tempo" id="btn-${tid}" onclick="window._app.startExTimer('${tid}',${step.timer},${i})">\u25B6 Старт</button>
        <span class="timer-display" id="disp-${tid}" style="font-size:2em;margin-left:12px">${fmtTime(step.timer)}</span>
      </div>
      <input type="hidden" id="reps-${i}" value="${step.planned}">
      <div class="diff-row">
        <label>Как ощущения?</label>
        <button class="diff-btn" id="diff-${i}-easy" onclick="window._app.setDiff(${i},'easy')">Легко</button>
        <button class="diff-btn" id="diff-${i}-normal" onclick="window._app.setDiff(${i},'normal')">Нормально</button>
        <button class="diff-btn" id="diff-${i}-hard" onclick="window._app.setDiff(${i},'hard')">Сложно</button>
      </div>
      <input type="text" class="note-input" id="note-${i}" placeholder="Заметки">
      <button class="btn btn-go" style="margin-top:16px" onclick="window._app.completeExercise(${i})">
        Готово
      </button>
    `;
  }

  // ===== TEMPO TIMER (#3) =====
  function toggleTempo(i, tempoStr) {
    const box = document.getElementById('tempo-box-' + i);
    const btn = document.getElementById('tempo-btn-' + i);
    if (!box) return;

    if (tempoInterval) {
      clearInterval(tempoInterval);
      tempoInterval = null;
      box.classList.add('hidden');
      btn.textContent = `🎵 Таймер темпа ${tempoStr}`;
      return;
    }

    const parts = tempoStr.split('-').map(Number); // [down, hold, up]
    const phases = [
      { name: '⬇️ Вниз', sec: parts[0] || 2, cls: 'phase-down' },
      { name: '⏸ Пауза', sec: parts[1] || 1, cls: 'phase-hold' },
      { name: '⬆️ Вверх', sec: parts[2] || 2, cls: 'phase-up' }
    ];

    let phaseIdx = 0;
    let phaseRemaining = phases[0].sec;
    let repCount = 0;

    box.classList.remove('hidden');
    btn.textContent = '⏹ Остановить темп';

    function updateTempoDisplay() {
      const p = phases[phaseIdx];
      box.innerHTML = `
        <div class="tempo-phase ${p.cls}">${p.name} ${phaseRemaining}</div>
        <div class="tempo-count">Повторение: ${repCount + 1}</div>
      `;
    }

    updateTempoDisplay();
    beep(phaseIdx === 0 ? 500 : phaseIdx === 1 ? 400 : 600, 120);

    tempoInterval = setInterval(() => {
      phaseRemaining--;
      if (phaseRemaining <= 0) {
        phaseIdx++;
        if (phaseIdx >= phases.length) {
          phaseIdx = 0;
          repCount++;
        }
        phaseRemaining = phases[phaseIdx].sec;
        // Different beep per phase
        beep(phaseIdx === 0 ? 500 : phaseIdx === 1 ? 400 : 600, 150);
      }
      updateTempoDisplay();
    }, 1000);
  }

  // ===== INLINE TIMER =====
  function startItemTimer(tid, totalSec) {
    const btn = document.getElementById('btn-' + tid);
    const disp = document.getElementById('disp-' + tid);
    if (!btn || !disp) return;

    if (itemTimers[tid]) {
      clearInterval(itemTimers[tid]);
      delete itemTimers[tid];
      btn.textContent = '▶ Старт';
      btn.classList.remove('running', 'finished');
      disp.textContent = fmtTime(totalSec);
      disp.className = 'ci-timer-display';
      disp.style.color = '';
      return;
    }

    let remaining = totalSec;
    btn.textContent = '⏸ Стоп';
    btn.classList.add('running');

    itemTimers[tid] = setInterval(() => {
      remaining--;
      disp.textContent = fmtTime(remaining);
      if (remaining <= 5) disp.className = 'ci-timer-display end';
      else if (remaining <= 10) disp.className = 'ci-timer-display warn';
      if (remaining <= 0) {
        clearInterval(itemTimers[tid]);
        delete itemTimers[tid];
        disp.textContent = '✓';
        disp.className = 'ci-timer-display';
        disp.style.color = 'var(--accent)';
        btn.textContent = 'Готово';
        btn.classList.remove('running');
        btn.classList.add('finished');
        beep(700, 400);
        const parts = tid.split('-');
        const si = parseInt(parts[1]), ii = parseInt(parts[2]);
        const ci = document.getElementById(`ci-${si}-${ii}`);
        if (ci) {
          const cb = ci.querySelector("input[type='checkbox']");
          if (cb && !cb.checked) { cb.checked = true; ci.classList.add('checked'); }
        }
      }
    }, 1000);
  }

  // ===== EXERCISE TIMER (timed holds like plank) =====
  function startExTimer(tid, totalSec, stepIdx) {
    const btn = document.getElementById('btn-' + tid);
    const disp = document.getElementById('disp-' + tid);
    const repsInput = document.getElementById('reps-' + stepIdx);
    if (!btn || !disp) return;

    if (itemTimers[tid]) {
      clearInterval(itemTimers[tid]);
      delete itemTimers[tid];
      btn.textContent = '\u25B6 Старт';
      btn.classList.remove('running');
      return;
    }

    let remaining = totalSec;
    btn.textContent = '\u23F8 Стоп';
    btn.classList.add('running');

    itemTimers[tid] = setInterval(() => {
      remaining--;
      disp.textContent = fmtTime(remaining);
      if (remaining <= 5) { disp.className = 'timer-display end'; beep(300, 80); }
      else if (remaining <= 10) disp.className = 'timer-display warn';
      if (remaining <= 0) {
        clearInterval(itemTimers[tid]);
        delete itemTimers[tid];
        disp.textContent = '\u2713 ' + fmtTime(totalSec);
        disp.className = 'timer-display';
        disp.style.color = 'var(--accent)';
        btn.textContent = 'Готово';
        btn.classList.remove('running');
        btn.classList.add('finished');
        beep(700, 400);
        if (repsInput) repsInput.value = totalSec;
      }
    }, 1000);
  }

  // ===== СЛОЖНОСТЬ =====
  function setDiff(i, level) {
    diffSelections[i] = level;
    ['easy', 'normal', 'hard'].forEach(l => {
      const b = document.getElementById(`diff-${i}-${l}`);
      if (b) b.classList.remove('selected', 'sel-easy', 'sel-normal', 'sel-hard');
    });
    const sel = document.getElementById(`diff-${i}-${level}`);
    if (sel) sel.classList.add('selected', `sel-${level}`);
  }

  // ===== ДЕЙСТВИЯ =====
  function toggleCheck(si, ii) {
    const el = document.getElementById(`ci-${si}-${ii}`);
    const cb = el.querySelector("input[type='checkbox']");
    el.classList.toggle('checked', cb.checked);
  }

  function completeChecklist(i) {
    Object.keys(itemTimers).forEach(k => {
      if (k.startsWith(`it-${i}-`)) { clearInterval(itemTimers[k]); delete itemTimers[k]; }
    });
    results.push({ index: i, name: WORKOUT.steps[i].name, type: 'checklist' });
    current++;
    renderAll();
  }

  function completeExercise(i) {
    // Stop tempo if running
    if (tempoInterval) { clearInterval(tempoInterval); tempoInterval = null; }

    const step = WORKOUT.steps[i];
    // Stop exercise timer if running
    const exTid = `ext-${i}`;
    if (itemTimers[exTid]) { clearInterval(itemTimers[exTid]); delete itemTimers[exTid]; }

    const actual = parseInt(document.getElementById(`reps-${i}`).value) || 0;
    const notes = document.getElementById(`note-${i}`).value;
    const diff = diffSelections[i] || 'easy';

    results.push({ index: i, name: step.name, meta: step.meta, planned: step.planned, actual, notes, difficulty: diff, type: 'exercise' });
    beep();
    current++;

    if (step.rest > 0 && current < totalSteps()) {
      showRestTimer(step.rest, i);
    } else {
      renderAll();
    }
  }

  // ===== ТАЙМЕР ОТДЫХА =====
  function showRestTimer(seconds, afterIdx) {
    const card = document.getElementById('step-' + afterIdx);
    card.className = 'card done';
    card.innerHTML = buildDoneHTML(WORKOUT.steps[afterIdx], afterIdx);
    updateProgress();

    const td = document.createElement('div');
    td.id = 'timer-card';
    td.className = 'card active';
    td.innerHTML = `
      <div class="timer">
        <div class="timer-label">⏸ Отдых</div>
        <div class="timer-display" id="tDisp">${fmtTime(seconds)}</div>
      </div>
      <button class="btn btn-skip" onclick="window._app.skipTimer()">Пропустить →</button>
    `;

    const nextCard = document.getElementById('step-' + current);
    if (nextCard) stepsEl.insertBefore(td, nextCard);
    else stepsEl.appendChild(td);
    scrollTo(td);

    let remaining = seconds;
    timerInterval = setInterval(() => {
      remaining--;
      const d = document.getElementById('tDisp');
      if (!d) { clearInterval(timerInterval); return; }
      d.textContent = fmtTime(remaining);
      if (remaining <= 5) { d.className = 'timer-display end'; beep(300, 80); }
      else if (remaining <= 15) d.className = 'timer-display warn';
      if (remaining <= 0) {
        clearInterval(timerInterval);
        beep(700, 400);
        removeTimer();
        renderAll();
      }
    }, 1000);
  }

  function skipTimer() { clearInterval(timerInterval); removeTimer(); renderAll(); }
  function removeTimer() { const t = document.getElementById('timer-card'); if (t) t.remove(); }

  // ===== УТИЛИТЫ =====
  function fmtTime(s) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; }

  function beep(freq = 600, dur = 120) {
    try {
      const c = new AudioContext(), o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.frequency.value = freq; g.gain.value = 0.15;
      o.start(); o.stop(c.currentTime + dur / 1000);
    } catch (e) {}
  }

  function scrollToActive() {
    const el = document.querySelector('.card.active');
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }
  function scrollTo(el) { setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }

  // ===== AUTO-PROGRESSION (#4) =====
  function buildProgressionAdvice() {
    if (!WORKOUT.previousResults || WORKOUT.previousResults.length === 0) return '';
    // Group previous results by exercise name
    const exerciseMap = {};
    WORKOUT.previousResults.forEach(p => {
      const key = p.name;
      if (!exerciseMap[key]) exerciseMap[key] = [];
      exerciseMap[key].push(p);
    });

    // Check current results
    const currentExerciseMap = {};
    results.filter(r => r.type === 'exercise').forEach(r => {
      const key = r.name;
      if (!currentExerciseMap[key]) currentExerciseMap[key] = [];
      currentExerciseMap[key].push(r);
    });

    let advice = [];
    for (const name in currentExerciseMap) {
      const curr = currentExerciseMap[name];
      const prev = exerciseMap[name] || [];
      // Check: if both this session and previous are all "easy" → suggest increase
      const allEasyNow = curr.every(e => e.difficulty === 'easy' && e.actual >= e.planned);
      const allEasyPrev = prev.length > 0 && prev.every(p => p.difficulty === 'easy');
      const anyHardNow = curr.some(e => e.difficulty === 'hard');

      if (allEasyNow && allEasyPrev) {
        advice.push(`📈 <strong>${name}</strong>: 2 раза подряд «Легко» — в следующий раз можно добавить +2 повтора!`);
      } else if (anyHardNow) {
        advice.push(`⚠️ <strong>${name}</strong>: было сложно — в следующий раз держим те же цифры или чуть снижаем.`);
      }
    }

    if (advice.length === 0) return '';
    return `<div class="prog-rec"><strong>💡 Рекомендации:</strong><br>${advice.join('<br>')}</div>`;
  }

  // ===== AUTO-SAVE =====
  function buildLogData() {
    const exercises = results.filter(r => r.type === 'exercise');
    return {
      date: WORKOUT.date,
      day: WORKOUT.day,
      week: WORKOUT.week,
      workout: WORKOUT.title,
      duration_min: Math.round((Date.now() - startTime) / 60000),
      body_weight_kg: null,
      streak: (WORKOUT.streak || 0) + 1,
      exercises: exercises.map(e => ({
        name: e.name, set: e.meta, planned: e.planned,
        actual: e.actual, difficulty: e.difficulty, notes: e.notes || ''
      })),
      notes: '',
      timestamp: new Date().toISOString()
    };
  }

  function saveToStorage(data) {
    try {
      let logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
      logs = logs.filter(l => l.date !== data.date);
      logs.push(data);
      logs.sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    } catch(e) { console.warn('Failed to save log:', e); }
  }

  function autoSave() {
    savedLogData = buildLogData();
    saveToStorage(savedLogData);
  }

  function updateSavedLog() {
    if (!savedLogData) return;
    const w = document.getElementById('bodyWeight');
    const n = document.getElementById('finalNotes');
    if (w) savedLogData.body_weight_kg = parseFloat(w.value) || null;
    if (n) savedLogData.notes = n.value;
    savedLogData.duration_min = Math.round((Date.now() - startTime) / 60000);
    saveToStorage(savedLogData);
  }

  // ===== ИТОГИ =====
  function showSummary() {
    stopElapsedTimer();
    stepsEl.classList.add('hidden');
    document.getElementById('pFill').style.width = '100%';
    document.getElementById('pText').textContent = `${totalSteps()} / ${totalSteps()}`;

    const exercises = results.filter(r => r.type === 'exercise');
    let html = `<table class="summary-table">
      <tr><th>Упражнение</th><th>Подход</th><th>План</th><th>Факт</th><th>Ощущ.</th></tr>`;
    for (const e of exercises) {
      const cls = e.actual >= e.planned ? 'good' : 'miss';
      const set = e.meta?.match(/Подход \d+ из \d+/)?.[0] || '';
      html += `<tr><td>${e.name}</td><td>${set}</td><td>${e.planned}</td><td class="${cls}">${e.actual}</td><td>${diffLabels[e.difficulty] || ''}</td></tr>`;
    }
    html += `</table>`;
    const mins = Math.round((Date.now() - startTime) / 60000);
    html += `<div style="text-align:center;color:var(--muted);font-size:.82em;margin-top:8px">⏱ Длительность: ${mins} мин</div>`;
    html += buildProgressionAdvice();

    document.getElementById('summaryBody').innerHTML = html;
    document.getElementById('summary').classList.remove('hidden');

    // Auto-save results
    autoSave();

    // Listen for weight/notes changes to update saved log
    const wEl = document.getElementById('bodyWeight');
    const nEl = document.getElementById('finalNotes');
    if (wEl) wEl.addEventListener('change', updateSavedLog);
    if (nEl) nEl.addEventListener('input', debounce(updateSavedLog, 500));

    saveState();
  }

  function exportResults() {
    updateSavedLog();
    const data = savedLogData || buildLogData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${WORKOUT.date}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function debounce(fn, ms) {
    let t; return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  }

  // ===== PUBLIC API =====
  window._app = {
    toggleCheck, completeChecklist, completeExercise,
    startItemTimer, startExTimer, setDiff, toggleTempo,
    skipTimer, exportResults
  };

  // Expose globally for HTML onclick
  window.exportResults = exportResults;

  // ===== СТАРТ =====
  const restored = loadState();
  initElapsedUI();
  renderStreak();

  if (restored) {
    // Session in progress — resume timer and UI
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;padding:8px 16px;border-radius:8px;font-size:.85em;z-index:999;';
    toast.textContent = '♻️ Прогресс восстановлен';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
    startElapsedTimer();
    renderAll();
  } else {
    // Fresh session — show start button, hide exercises
    showStartButton();
  }

})();
