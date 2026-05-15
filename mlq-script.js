let processes = [];
const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function addProcess() {
    const p = {
        id: `P${processes.length + 1}`,
        arrival: 0,
        burst: 6,
        color: palette[processes.length % palette.length]
    };
    processes.push(p);
    renderInputTable();
}

function renderInputTable() {
    const tbody = document.getElementById('process-list');
    tbody.innerHTML = processes.map((p, i) => `
        <tr>
            <td><b style="color:${p.color}">${p.id}</b></td>
            <td><input type="number" value="${p.arrival}" onchange="updateP(${i},'arrival',this.value)"></td>
            <td><input type="number" value="${p.burst}" onchange="updateP(${i},'burst',this.value)"></td>
            <td><span style="color: #9ca3af; font-size: 0.9em;">Starts @ Q0</span></td>
            <td><button onclick="removeP(${i})" style="background:transparent; color:#ef4444; border:1px solid #ef4444; padding: 5px 10px;">×</button></td>
        </tr>
    `).join('');
}

window.updateP = (i, field, val) => processes[i][field] = parseInt(val);
window.removeP = (i) => { processes.splice(i, 1); renderInputTable(); };

function runSimulation() {
    if (!processes.length) return;

    let time = 0, completed = 0;
    const n = processes.length;
    const gantt = [];
    const q0_q = parseInt(document.getElementById('q0-quantum').value) || 2;
    const q1_q = parseInt(document.getElementById('q1-quantum').value) || 4;

    let state = processes.map(p => ({ 
        ...p, remaining: p.burst, currentQueue: 0, 
        firstStart: -1, finish: 0, history: [] 
    }));

    let q0_queue = [], q1_queue = [], q2_queue = [];
    let currentQuantumTracker = 0;

    while (completed < n) {
        // 1. Check Arrivals
        state.forEach(p => {
            if (p.arrival === time) q0_queue.push(p);
        });

        let active = null;
        // 2. Strict Priority Selection
        if (q0_queue.length) active = q0_queue[0];
        else if (q1_queue.length) active = q1_queue[0];
        else if (q2_queue.length) active = q2_queue[0];

        if (active) {
            if (active.firstStart === -1) active.firstStart = time;

            // Log Gantt & History
            if (gantt.length && gantt[gantt.length-1].id === active.id) gantt[gantt.length-1].end++;
            else gantt.push({ id: active.id, color: active.color, start: time, end: time+1 });

            state.forEach(p => {
                if (p.id === active.id) p.history.push('running');
                else if (p.remaining > 0 && p.arrival <= time) p.history.push('waiting');
                else p.history.push('idle');
            });

            active.remaining--;
            time++;
            currentQuantumTracker++;

            // 3. Feedback / Demotion Logic
            if (active.remaining === 0) {
                active.finish = time;
                completed++;
                if (active.currentQueue === 0) q0_queue.shift();
                else if (active.currentQueue === 1) q1_queue.shift();
                else q2_queue.shift();
                currentQuantumTracker = 0;
            } else {
                if (active.currentQueue === 0 && currentQuantumTracker >= q0_q) {
                    let p = q0_queue.shift();
                    p.currentQueue = 1;
                    q1_queue.push(p);
                    currentQuantumTracker = 0;
                } else if (active.currentQueue === 1 && currentQuantumTracker >= q1_q) {
                    let p = q1_queue.shift();
                    p.currentQueue = 2;
                    q2_queue.push(p);
                    currentQuantumTracker = 0;
                }
                // If a higher queue process arrived, reset tracker to give next process its full quantum
                let higherArrival = state.find(p => p.arrival === time && p.queue < active.queue);
                if (higherArrival) currentQuantumTracker = 0;
            }
        } else {
            state.forEach(p => p.history.push('idle'));
            time++;
        }
    }
    renderUI(gantt, state, time);
}

function renderUI(gantt, finished, totalTime) {
    document.getElementById('gantt-chart').innerHTML = gantt.map(b => 
        `<div class="gantt-block" style="width:${((b.end-b.start)/totalTime)*100}%; background:${b.color}">${b.id}</div>`
    ).join('');

    finished.forEach(p => {
        p.tat = p.finish - p.arrival;
        p.wt = p.tat - p.burst;
        p.rt = p.firstStart - p.arrival;
    });

    const avg = (k) => (finished.reduce((s, p) => s + p[k], 0) / finished.length).toFixed(2);
    document.getElementById('avg-rt').innerText = avg('rt');
    document.getElementById('avg-wt').innerText = avg('wt');
    document.getElementById('avg-tat').innerText = avg('tat');

    let html = `<table><thead><tr><th>Process</th><th>Stats</th><th>Detailed Timeline</th></tr></thead><tbody>`;
    finished.forEach(p => {
        html += `<tr>
            <td><b style="color:${p.color}">${p.id}</b></td>
            <td style="font-size:11px">RT: ${p.rt} | WT: ${p.wt} | TAT: ${p.tat}</td>
            <td>
                <div class="row-layout">
                    <span class="time-label">${p.arrival} → ${p.finish}</span>
                    <div class="timeline-bar">
                        ${p.history.map(s => `<div class="segment" style="width:${(1/totalTime)*100}%; background:${s==='running'?p.color: (s==='waiting'?'rgba(255,255,255,0.1)':'transparent')}"></div>`).join('')}
                    </div>
                </div>
            </td>
        </tr>`;
    });
    document.getElementById('timeline-results').innerHTML = html + `</tbody></table>`;
}

document.getElementById('add-btn').onclick = addProcess;
document.getElementById('run-btn').onclick = runSimulation;
addProcess(); addProcess();