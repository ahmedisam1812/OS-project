/**
 * CPU SCHEDULER ENGINE
 * Supports: FCFS, SJF, SRTF, Round Robin, Priority (Preemptive), and MLQ
 */

let processes = [];
let currentAlgo = 'FCFS';
const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];

// --- DOM ELEMENTS ---
const processList = document.getElementById('process-list');
const ganttChart = document.getElementById('gantt-chart');
const configPanel = document.getElementById('config-panel');
const resultsTableContainer = document.getElementById('results-table-container');

// --- TAB INTERACTION ---
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentAlgo = e.target.dataset.algo;
        
        // UI Adjustments for specific algorithms
        configPanel.classList.toggle('hidden', currentAlgo !== 'RR');
        document.querySelectorAll('.mlq-only').forEach(el => 
            el.classList.toggle('hidden', currentAlgo !== 'MLQ')
        );
        renderTable();
    });
});

// --- PROCESS MANAGEMENT ---
function addProcess() {
    const p = {
        id: `P${processes.length + 1}`,
        arrival: 0,
        burst: 5,
        priority: 1,
        queue: 1, // 1 for High, 2 for Low
        color: colors[processes.length % colors.length]
    };
    processes.push(p);
    renderTable();
}

function renderTable() {
    processList.innerHTML = '';
    processes.forEach((p, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b style="color:${p.color}">${p.id}</b></td>
            <td><input type="number" value="${p.arrival}" onchange="updateP(${i},'arrival',this.value)"></td>
            <td><input type="number" value="${p.burst}" onchange="updateP(${i},'burst',this.value)"></td>
            <td><input type="number" value="${p.priority}" onchange="updateP(${i},'priority',this.value)"></td>
            <td class="${currentAlgo === 'MLQ' ? '' : 'hidden'}">
                <select onchange="updateP(${i},'queue',this.value)">
                    <option value="1" ${p.queue == 1 ? 'selected' : ''}>Q1</option>
                    <option value="2" ${p.queue == 2 ? 'selected' : ''}>Q2</option>
                </select>
            </td>
            <td><button onclick="removeP(${i})">×</button></td>
        `;
        processList.appendChild(tr);
    });
}

window.updateP = (i, field, val) => processes[i][field] = parseInt(val);
window.removeP = (i) => { processes.splice(i, 1); renderTable(); };

// --- SIMULATION LOGIC ---
function runSimulation() {
    if (processes.length === 0) return alert("Please add processes first!");
    
    let time = 0;
    let completed = 0;
    let n = processes.length;
    let ganttData = [];
    
    // Prepare working copies
    let readyQueue = processes.map(p => ({ 
        ...p, 
        remaining: p.burst, 
        firstScheduled: -1, 
        finish: 0,
        tat: 0,
        wt: 0,
        rt: 0,
        history: [] 
    }));

    let quantum = parseInt(document.getElementById('quantum').value) || 2;
    let rrCounter = 0;

    // Time-Step Simulation Loop
    while (completed < n) {
        let arrived = readyQueue.filter(p => p.arrival <= time && p.remaining > 0);
        let selected = null;

        if (arrived.length > 0) {
            // ALGORITHM SELECTOR
            if (currentAlgo === 'FCFS') {
                selected = arrived.sort((a,b) => a.arrival - b.arrival)[0];
            } else if (currentAlgo === 'SJF') {
                // Non-preemptive: keep running if not finished
                let currentRunning = arrived.find(p => p.history[p.history.length-1] === 'running');
                if (currentRunning) selected = currentRunning;
                else selected = arrived.sort((a,b) => a.burst - b.burst || a.arrival - b.arrival)[0];
            } else if (currentAlgo === 'SRTF') {
                selected = arrived.sort((a,b) => a.remaining - b.remaining || a.arrival - b.arrival)[0];
            } else if (currentAlgo === 'Priority') {
                selected = arrived.sort((a,b) => a.priority - b.priority || a.arrival - b.arrival)[0];
            } else if (currentAlgo === 'MLQ') {
                // Queue 1 takes absolute precedence
                selected = arrived.sort((a,b) => a.queue - b.queue || a.priority - b.priority || a.arrival - b.arrival)[0];
            } else if (currentAlgo === 'RR') {
                selected = arrived[0];
            }

            // Calculate Response Time
            if (selected.firstScheduled === -1) {
                selected.firstScheduled = time;
                selected.rt = selected.firstScheduled - selected.arrival;
            }

            // Update Gantt Data
            if (ganttData.length > 0 && ganttData[ganttData.length - 1].id === selected.id) {
                ganttData[ganttData.length - 1].end++;
            } else {
                ganttData.push({ id: selected.id, color: selected.color, start: time, end: time + 1 });
            }

            // Record State for Timeline Table
            readyQueue.forEach(p => {
                if (p.id === selected.id) p.history.push('running');
                else if (p.arrival <= time && p.remaining > 0) p.history.push('waiting');
                else p.history.push('idle');
            });

            selected.remaining--;
            time++;

            // Handle Completion
            if (selected.remaining === 0) {
                selected.finish = time;
                selected.tat = selected.finish - selected.arrival;
                selected.wt = selected.tat - selected.burst;
                completed++;
            }

            // Round Robin Rotation
            if (currentAlgo === 'RR') {
                rrCounter++;
                if (rrCounter >= quantum || selected.remaining === 0) {
                    readyQueue.push(readyQueue.splice(readyQueue.indexOf(selected), 1)[0]);
                    rrCounter = 0;
                }
            }
        } else {
            // CPU Idle Tick
            readyQueue.forEach(p => p.history.push('idle'));
            time++;
        }
    }
    renderOutput(ganttData, readyQueue, time);
}

// --- RENDERING OUTPUT ---
function renderOutput(gantt, finished, totalTime) {
    // 1. Gantt Chart
    ganttChart.innerHTML = '';
    gantt.forEach(block => {
        const div = document.createElement('div');
        div.className = 'gantt-block';
        div.style.width = `${((block.end - block.start) / totalTime) * 100}%`;
        div.style.backgroundColor = block.color;
        div.innerText = block.id;
        ganttChart.appendChild(div);
    });

    // 2. Average Stats
    const avgRT = finished.reduce((s, p) => s + p.rt, 0) / finished.length;
    const avgWT = finished.reduce((s, p) => s + p.wt, 0) / finished.length;
    const avgTAT = finished.reduce((s, p) => s + p.tat, 0) / finished.length;
    
    document.getElementById('avg-response').innerText = avgRT.toFixed(2);
    document.getElementById('avg-waiting').innerText = avgWT.toFixed(2);
    document.getElementById('avg-turnaround').innerText = avgTAT.toFixed(2);

    // 3. Detailed Timeline Table
    let html = `<table><thead><tr>
        <th>Process</th><th>Arrival</th><th>Burst</th><th>RT</th><th>WT</th><th>TAT</th><th>Timeline Breakdown</th>
    </tr></thead><tbody>`;

    finished.forEach(p => {
        html += `<tr>
            <td><b style="color:${p.color}">${p.id}</b></td>
            <td>${p.arrival}</td>
            <td>${p.burst}</td>
            <td>${p.rt}</td>
            <td>${p.wt}</td>
            <td>${p.tat}</td>
            <td>
                <div class="timeline-row">
                    <span class="time-label">arr:${p.arrival} → fin:${p.finish}</span>
                    <div class="timeline-bar">`;
        
        p.history.forEach(state => {
            let color = 'transparent';
            if (state === 'running') color = p.color;
            if (state === 'waiting') color = 'rgba(255,255,255,0.15)'; // Visible gray-ish waiting bar
            html += `<div class="segment" style="width:${(1/totalTime)*100}%; background:${color}"></div>`;
        });

        html += `</div></div></td></tr>`;
    });

    html += `</tbody></table>`;
    resultsTableContainer.innerHTML = html;
}

// --- INITIALIZATION ---
document.getElementById('add-btn').onclick = addProcess;
document.getElementById('run-btn').onclick = runSimulation;
document.getElementById('reset-btn').onclick = () => { processes = []; renderTable(); };

// Start with 2 default processes
addProcess();
addProcess();