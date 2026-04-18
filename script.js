let currentUser = "", activeQuiz = "", questions = [], userResponses = [], isReg = false, currentSession = 1, timerInt, myChart = null;

const params = new URLSearchParams(window.location.search);
const isUser = params.get('mode') === 'user', ownerP = params.get('owner'), quizP = params.get('quiz');

window.onload = () => {
    if(isUser) { 
        switchTab('user'); 
        checkSchedule();
        applyTheme(localStorage.getItem(`theme_${ownerP}_${quizP}`) || 'default');
    } else {
        const sess = sessionStorage.getItem('active_editor');
        if(sess) { currentUser = sess; switchTab('dashboard'); }
        else switchTab('auth');
    }
};

function applyTheme(themeName) {
    const root = document.documentElement;
    const themes = {
        'default': { primary: '#673ab7', grad: 'linear-gradient(135deg, #673ab7, #9c27b0)', bg: '#f0ebf8', card: '#ffffff', text: '#333333' },
        'grad-purple': { primary: '#8e24aa', grad: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', bg: '#f3f0ff', card: '#ffffff', text: '#333333' },
        'grad-blue': { primary: '#1a237e', grad: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', bg: '#e3f2fd', card: '#ffffff', text: '#333333' },
        'grad-sunset': { primary: '#e65100', grad: 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)', bg: '#fff5f5', card: '#ffffff', text: '#333333' },
        'grad-aurora': { primary: '#004d40', grad: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)', bg: '#f1f8e9', card: '#ffffff', text: '#333333' },
        'dark-mode': { primary: '#bb86fc', grad: 'linear-gradient(135deg, #3700b3, #03dac6)', bg: '#121212', card: '#2d2d2d', text: '#ffffff' }
    };
    const t = themes[themeName] || themes['default'];
    root.style.setProperty('--primary', t.primary);
    root.style.setProperty('--gradient', t.grad);
    root.style.setProperty('--bg', t.bg);
    root.style.setProperty('--card-bg', t.card);
    root.style.setProperty('--text-color', t.text);
}

function switchTab(t) {
    document.querySelectorAll('.content > div').forEach(div => div.classList.add('hidden'));
    document.getElementById('tab-'+t).classList.remove('hidden');
    document.getElementById('admin-nav').classList.toggle('hidden', isUser || t === 'auth');
    document.querySelectorAll('.nav button').forEach(btn => btn.classList.remove('active'));
    if(document.getElementById('btn-nav-'+t)) document.getElementById('btn-nav-'+t).classList.add('active');
    if(t === 'dashboard') renderDashboard();
    if(t === 'edit') renderEditor();
    if(t === 'results') renderResults();
}

function handleAuth() {
    const e = document.getElementById('auth-email').value, p = document.getElementById('auth-pass').value;
    if(!e || !p) return alert("Isi lengkap!");
    let eds = JSON.parse(localStorage.getItem('db_eds')) || {};
    if(isReg) {
        eds[e] = p; localStorage.setItem('db_eds', JSON.stringify(eds));
        alert("Berhasil Daftar!"); toggleAuthMode();
    } else {
        if(eds[e] === p) { currentUser = e; sessionStorage.setItem('active_editor', e); switchTab('dashboard'); }
        else alert("Email/Password salah!");
    }
}

function toggleAuthMode() {
    isReg = !isReg;
    document.getElementById('auth-title').innerText = isReg ? "Daftar Akun Baru" : "Login Editor";
    document.getElementById('btn-main-auth').innerText = isReg ? "DAFTAR" : "MASUK";
}

function logout() { sessionStorage.clear(); location.reload(); }

function renderDashboard() {
    const list = JSON.parse(localStorage.getItem('list_'+currentUser)) || {};
    const cont = document.getElementById('quiz-list-container');
    cont.innerHTML = '';
    for(let id in list) {
        cont.innerHTML += `<div class="card" style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${list[id]}</strong>
            <button class="btn btn-sm" onclick="activeQuiz='${id}';switchTab('edit')">Kelola Kuis</button>
        </div>`;
    }
}

function createNewQuiz() {
    const n = prompt("Judul Kuis:"); if(!n) return;
    const id = "q-" + Date.now();
    let list = JSON.parse(localStorage.getItem('list_'+currentUser)) || {};
    list[id] = n; localStorage.setItem('list_'+currentUser, JSON.stringify(list));
    renderDashboard();
}

function renderEditor() {
    questions = JSON.parse(localStorage.getItem(`q_${currentUser}_${activeQuiz}`)) || [];
    document.getElementById('start-date').value = localStorage.getItem(`start_${currentUser}_${activeQuiz}`) || "";
    document.getElementById('end-date').value = localStorage.getItem(`end_${currentUser}_${activeQuiz}`) || "";
    document.getElementById('quiz-theme').value = localStorage.getItem(`theme_${currentUser}_${activeQuiz}`) || "default";
    const cont = document.getElementById('editor-list');
    cont.innerHTML = '';
    
    questions.forEach((q, i) => {
        let optHTML = (q.type === 'pg' || q.type === 'ganda') ? (q.options || []).map((o, oi) => {
            const isChecked = q.correct.includes(oi) ? 'checked' : '';
            return `<div style="display:flex; gap:10px; margin-bottom:5px;">
                <input type="${q.type==='pg'?'radio':'checkbox'}" name="correct-${i}" ${isChecked} onchange="setKey(${i}, ${oi})">
                <input type="text" value="${o}" oninput="questions[${i}].options[${oi}]=this.value;save()">
                <button class="btn btn-red btn-sm" onclick="questions[${i}].options.splice(${oi},1);questions[${i}].correct=[];save();renderEditor()">✕</button>
            </div>`;
        }).join('') + `<button class="btn btn-sm btn-outline" onclick="questions[${i}].options.push('Opsi Baru');save();renderEditor()">+ Opsi</button>` : '';

        cont.innerHTML += `<div class="card">
            <div style="float:right; display:flex; gap:10px; flex-wrap:wrap; justify-content: flex-end;">
                <small>Bagian:<input type="number" class="input-inline" value="${q.session||1}" oninput="questions[${i}].session=parseInt(this.value);save()"></small>
                <small>⏱️:<input type="number" class="input-inline" value="${q.timer||60}" oninput="questions[${i}].timer=parseInt(this.value);save()"></small>
                <small>💎Poin:<input type="number" class="input-inline" value="${q.points||10}" oninput="questions[${i}].points=parseInt(this.value);save()"></small>
            </div>
            <strong>Pertanyaan #${i+1}</strong>
            <select onchange="questions[${i}].type=this.value; questions[${i}].options=['Opsi 1']; questions[${i}].correct=[]; save(); renderEditor()">
                <option value="pg" ${q.type==='pg'?'selected':''}>Pilgan</option>
                <option value="ganda" ${q.type==='ganda'?'selected':''}>Checkbox</option>
                <option value="essay" ${q.type==='essay'?'selected':''}>Essay</option>
                <option value="date" ${q.type==='date'?'selected':''}>Tanggal</option>
                <option value="file" ${q.type==='file'?'selected':''}>Upload File</option>
            </select>
            <textarea oninput="questions[${i}].q=this.value;save()">${q.q}</textarea>
            ${optHTML}
            <button class="btn btn-red btn-sm" style="width:100%; margin-top:10px;" onclick="questions.splice(${i},1);save();renderEditor()">Hapus Soal</button>
        </div>`;
    });
}

function setKey(i, oi) {
    if(questions[i].type === 'pg') { questions[i].correct = [oi]; } 
    else { const pos = questions[i].correct.indexOf(oi); pos > -1 ? questions[i].correct.splice(pos, 1) : questions[i].correct.push(oi); }
    save(); renderEditor();
}

function save() { localStorage.setItem(`q_${currentUser}_${activeQuiz}`, JSON.stringify(questions)); }

function saveSettings() {
    localStorage.setItem(`start_${currentUser}_${activeQuiz}`, document.getElementById('start-date').value);
    localStorage.setItem(`end_${currentUser}_${activeQuiz}`, document.getElementById('end-date').value);
    localStorage.setItem(`theme_${currentUser}_${activeQuiz}`, document.getElementById('quiz-theme').value);
    alert("Pengaturan Disimpan!");
}

function addQuestion() { questions.push({type:'pg', q:'', timer:60, session:1, options:['Opsi 1'], correct:[], points:10}); save(); renderEditor(); }

function copyLink() { 
    const link = `${window.location.origin}${window.location.pathname}?owner=${currentUser}&quiz=${activeQuiz}&mode=user`;
    navigator.clipboard.writeText(link); alert("Link Disalin!"); 
}

function checkSchedule() {
    const s = localStorage.getItem(`start_${ownerP}_${quizP}`), e = localStorage.getItem(`end_${ownerP}_${quizP}`);
    const now = new Date().getTime(), btn = document.getElementById('btn-start-quiz'), info = document.getElementById('schedule-info');
    if((s && now < new Date(s).getTime()) || (e && now > new Date(e).getTime())) {
        btn.disabled = true; info.innerText = "Maaf, Ujian Sedang Ditutup.";
    }
}

function startQuiz() {
    if(!document.getElementById('user-email').value) return alert("Email wajib!");
    questions = JSON.parse(localStorage.getItem(`q_${ownerP}_${quizP}`)) || [];
    userResponses = questions.map(() => ({ answer: [], fileName: "" }));
    currentSession = 1; renderStep();
}

async function handleFile(idx, file) {
    const reader = new FileReader();
    reader.onload = (e) => { 
        userResponses[idx].answer = [e.target.result]; 
        userResponses[idx].fileName = file.name; 
        renderStep(); 
    };
    reader.readAsDataURL(file);
}

function renderStep() {
    const cont = document.getElementById('user-quiz-area');
    document.getElementById('user-intro').classList.add('hidden');
    document.getElementById('quiz-timer-box').style.display = "block";
    
    let sessQ = questions.filter(q => (q.session || 1) === currentSession);
    if(sessQ.length === 0) { finishQuiz(); return; }

    let html = `<div class="card"><div class="session-header">Sesi Ujian: ${currentSession}</div>`;
    questions.forEach((q, i) => {
        if((q.session || 1) === currentSession) {
            let input = "";
            if (q.type === 'pg' || q.type === 'ganda') {
                input = q.options.map((o, oi) => {
                    const isChecked = userResponses[i].answer.includes(oi) ? 'checked' : '';
                    return `<label class="ans-label"><input type="${q.type === 'pg' ? 'radio' : 'checkbox'}" name="u-${i}" value="${oi}" ${isChecked} onchange="updateAns(${i})"> ${o}</label>`;
                }).join('');
            } else if(q.type==='essay') {
                input = `<textarea oninput="userResponses[${i}].answer=[this.value]">${userResponses[i].answer[0]||''}</textarea>`;
            } else if(q.type==='date') {
                input = `<input type="date" value="${userResponses[i].answer[0]||''}" onchange="userResponses[${i}].answer=[this.value]">`;
            } else if(q.type==='file') {
                input = `<input type="file" onchange="handleFile(${i}, this.files[0])"><p><small>${userResponses[i].fileName ? '✅ '+userResponses[i].fileName : ''}</small></p>`;
            }
            html += `<p><strong>${i+1}. ${q.q}</strong></p>${input}<br>`;
        }
    });
    
    let maxS = Math.max(...questions.map(q => q.session || 1));
    html += `<button class="btn btn-green" onclick="nextSess()">${currentSession >= maxS ? 'KIRIM JAWABAN' : 'SESI BERIKUTNYA'}</button></div>`;
    cont.innerHTML = html;

    let tl = sessQ[0].timer || 60;
    clearInterval(timerInt);
    timerInt = setInterval(() => { tl--; document.getElementById('timer-val').innerText = tl; if(tl<=0) nextSess(); }, 1000);
}

function updateAns(idx) {
    const q = questions[idx];
    const inputs = document.querySelectorAll(`input[name="u-${idx}"]:checked`);
    userResponses[idx].answer = Array.from(inputs).map(el => parseInt(el.value));
}

function nextSess() {
    let maxS = Math.max(...questions.map(q => q.session || 1));
    if(currentSession < maxS) { currentSession++; renderStep(); window.scrollTo(0,0); } else finishQuiz();
}

function finishQuiz() {
    clearInterval(timerInt); document.getElementById('quiz-timer-box').style.display = "none";
    let score = 0;
    questions.forEach((q, i) => {
        const uAns = userResponses[i].answer;
        const cAns = q.correct;
        if((q.type==='pg'||q.type==='ganda') && cAns.length===uAns.length && cAns.every(v=>uAns.includes(v))) {
            score += parseInt(q.points || 10);
        }
    });
    let res = JSON.parse(localStorage.getItem(`r_${ownerP}_${quizP}`)) || [];
    res.push({ email: document.getElementById('user-email').value, score: score, responses: userResponses });
    localStorage.setItem(`r_${ownerP}_${quizP}`, JSON.stringify(res));
    document.getElementById('final-score').innerText = "Skor Anda: " + score; switchTab('success');
}

// --- RESULTS LOGIC (FULL & DOWNLOAD) ---
function renderResults() {
    const data = JSON.parse(localStorage.getItem(`r_${currentUser}_${activeQuiz}`)) || [];
    const qData = JSON.parse(localStorage.getItem(`q_${currentUser}_${activeQuiz}`)) || [];
    const cont = document.getElementById('results-detail-list');
    
    if(myChart) myChart.destroy();
    if(data.length > 0 && document.getElementById('scoreChart')) {
        myChart = new Chart(document.getElementById('scoreChart'), { 
            type: 'bar', 
            data: { labels: data.map(d=>d.email.split('@')[0]), datasets:[{label:'Skor', data: data.map(d=>d.score), backgroundColor:'#673ab7'}] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    cont.innerHTML = '';
    if(data.length === 0) {
        cont.innerHTML = '<div class="card" style="text-align:center;">Belum ada responden.</div>';
        return;
    }

    data.forEach((res, rIdx) => {
        let det = res.responses.map((ans, idx) => {
            const q = qData[idx];
            if(!q) return `<div><strong>Q${idx+1}:</strong> Soal dihapus</div>`;
            
            let val = "-";
            if (q.type === 'pg' || q.type === 'ganda') {
                val = Array.isArray(ans.answer) ? ans.answer.map(i => q.options[i] || "?").join(', ') : "-";
            } else if (q.type === 'file') {
                if (ans.answer[0] && ans.answer[0].startsWith('data:')) {
                    val = `<a href="${ans.answer[0]}" download="${ans.fileName || 'file'}" class="btn btn-sm btn-green" style="display:inline-block; margin-top:5px; text-decoration:none;">📥 Download File</a>`;
                } else {
                    val = "Tidak ada file";
                }
            } else {
                val = ans.answer[0] || '-';
            }
            return `<div style="border-bottom:1px solid #eee; padding:8px;"><strong>Q${idx+1}:</strong> ${val}</div>`;
        }).join('');

        const card = document.createElement('div');
        card.className = 'card';
        card.style.marginBottom = '15px';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${res.email} (Skor: ${res.score})</strong>
                <button class="btn btn-sm btn-outline" onclick="this.parentElement.nextElementSibling.classList.toggle('hidden')">Lihat Detail</button>
            </div>
            <div class="hidden" style="margin-top:10px; background:#f9f9f9; padding:15px; border-radius:8px; border:1px solid #eee;">
                ${det}
            </div>
        `;
        cont.appendChild(card);
    });
}

function exportExcel() {
    const data = JSON.parse(localStorage.getItem(`r_${currentUser}_${activeQuiz}`)) || [];
    if(data.length === 0) return alert("Tidak ada data");
    const ws = XLSX.utils.json_to_sheet(data.map(d => ({ Email: d.email, Skor: d.score })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Hasil");
    XLSX.writeFile(wb, `Hasil_Ujian.xlsx`);
}