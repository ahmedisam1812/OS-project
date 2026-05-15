let tasks = [];
const colors = ['#00f2ff', '#7000ff', '#ff007a', '#22ff88', '#ff9d00'];

function addTask() {
    const t = {
        id: `T${tasks.length + 1}`,
        execution: 2,
        period: 5,
        color: colors[tasks.length % colors.length]
    };
    tasks.push(t);
    renderTasks();
}

function renderTasks() {
    const list = document.getElementById('process-list');
    list.innerHTML = tasks.map((t, i) => `
        <tr>
            <td><b style="color:${t.color}">${t.id}</b></td>
            <td><input type="number" value="${t.execution}" onchange="updateT(${i},'execution',this.value)"></td>
            <td><input type="number" value="${t.period}" onchange="updateT(${i},'period',this.value)"></td>
            <td>${(100/t.period).toFixed(1)} (High 1/T)</td>
            <td><button onclick="removeT(${i})" style="color:#ff007a; background:none;">×</button></td>
        </tr>
    `).join('');
}

window.updateT = (i, f, v) => tasks[i][f] = parseInt(v);
window.removeT = (i) => { tasks.splice(i, 1); renderTasks(); };

function runSimulation() {
    if (!tasks.length) return;
    
    const limit = parseInt(document.getElementById('sim-limit').value) || 20;
    let time = 0;
    let gantt = [];
    
    // Utilization Check
    let u = tasks.reduce((sum, t) => sum + (t.execution / t.period), 0);
    const alertBox = document.getElementById('utilization-alert');
    if (u > 1) {
        alertBox.style.color = '#ff007a';
        alertBox.innerText = `Utilization: ${(u*100).toFixed(1)}% - SYSTEM OVERLOADED (Deadlines will be missed!)`;
    } else {
        alertBox.style.color = '#22ff88';
        alertBox.innerText = `Utilization: ${(u*100).toFixed(1)}% - Schedulable`;
    }

    // Prepare state
    let state = tasks.map(t => ({ ...t, remain: 0, history: [] }));

    while (time < limit) {
        // 1. Task Arrival (At every multiple of its period)
        state.forEach(t => {
            if (time % t.period === 0) {
                t.remain = t.execution;
            }
        });

        // 2. Selection: Shortest Period = Highest Priority
        let available = state.filter(t => t.remain > 0);
        available.sort((a, b) => a.period - b.period); // RM Rule

        let active = available[0] || null;

        if (active) {
            active.remain--;
            if (gantt.length && gantt[gantt.length-1].id === active.id) gantt[gantt.length-1].end++;
            else gantt.push({ id: active.id, color: active.color, start: time, end: time + 1 });
        }

        // Record History for visualization
        state.forEach(t => {
            if (active && t.id === active.id) t.history.push('run');
            else if (t.remain > 0) t.history.push('wait');
            else t.history.push('idle');
        });

        time++;
    }
    renderOutput(gantt, state, limit);
}

function renderOutput(gantt, finished, total) {
    const chart = document.getElementById('gantt-chart');
    chart.innerHTML = gantt.map(b => `
        <div class="gantt-block" style="width:${((b.end-b.start)/total)*100}%; background:${b.color}">${b.id}</div>
    `).join('');

    let html = `<table><thead><tr><th>Task</th><th>Timeline</th></tr></thead><tbody>`;
    finished.forEach(p => {
        html += `<tr>
            <td><b>${p.id}</b></td>
            <td>
                <div class="row-layout">
                    <div class="timeline-bar">
                        ${p.history.map(s => `
                            <div class="segment" style="width:${(1/total)*100}%; background:${s==='run'?p.color:(s==='wait'?'rgba(255,255,255,0.1)':'transparent')}"></div>
                        `).join('')}
                    </div>
                </div>
            </td>
        </tr>`;
    });
    document.getElementById('timeline-results').innerHTML = html + `</tbody></table>`;
}

document.getElementById('add-btn').onclick = addTask;
document.getElementById('run-btn').onclick = runSimulation;
addTask();