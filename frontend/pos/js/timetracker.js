const EMPLOYEE_DB = {
  "EMP-2025-017": { id:"EMP-2025-017", name:"Mynelle Staff", position:"Cashier", email:"mynellestaff@gmail.com", phone:"0917-123-4567",
    checkedIn:false, checkInAt:null, checkInLabel:null,
    logs:[
      { date:"May 16, 2026 (Sat)", checkIn:"08:01 AM", checkOut:"05:02 PM", hours:"9h 3m", status:"Completed" },
      { date:"May 15, 2026 (Fri)", checkIn:"08:00 AM", checkOut:"05:00 PM", hours:"9h 0m", status:"Completed" },
      { date:"May 14, 2026 (Thu)", checkIn:"08:05 AM", checkOut:"05:05 PM", hours:"9h 10m", status:"Completed" },
      { date:"May 13, 2026 (Wed)", checkIn:"08:00 AM", checkOut:"05:00 PM", hours:"9h 0m", status:"Completed" },
      { date:"May 12, 2026 (Tue)", checkIn:"08:03 AM", checkOut:"05:01 PM", hours:"9h 4m", status:"Completed" },
    ]},
  "EMP-2025-018": { id:"EMP-2025-018", name:"Angela Cruz", position:"Pharmacist", email:"angela.cruz@mynelles.com", phone:"0917-555-2231",
    checkedIn:false, checkInAt:null, checkInLabel:null,
    logs:[ { date:"May 16, 2026 (Sat)", checkIn:"08:00 AM", checkOut:"04:58 PM", hours:"8h 58m", status:"Completed" } ]},
  "EMP-2025-019": { id:"EMP-2025-019", name:"Marco Reyes", position:"Cashier", email:"marco.reyes@mynelles.com", phone:"0917-777-9043",
    checkedIn:false, checkInAt:null, checkInLabel:null, logs:[] },
};

const state = { matchedId:null, idError:"", idMessage:"" };

function nowParts(){
  const d = new Date();
  return {
    time: d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true}),
    date: d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric",weekday:"long"}),
    raw: d
  };
}
function formatDuration(ms){
  const totalMin = Math.max(0, Math.round(ms/60000));
  return `${Math.floor(totalMin/60)}h ${totalMin%60}m`;
}
function esc(s){ const d=document.createElement("div"); d.innerText = s==null?"":s; return d.innerHTML; }

function render(){
  document.getElementById("app").innerHTML = state.matchedId ? renderDashboard() : renderIdEntry();
  bindEvents();
}

function renderIdEntry(){
  return `
  <div class="id-entry-wrap">
    <div class="card" style="text-align:center;">
      <div class="id-icon">&#128100;</div>
      <h2 style="margin:0 0 4px;">Employee Time Tracker</h2>
      <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">Enter your Employee ID to check in or check out.</p>
      ${state.idMessage ? `<div class="id-msg-ok">&#10003; ${esc(state.idMessage)}</div>` : ""}
      <input id="idInput" placeholder="e.g. EMP-2025-017" style="text-align:center;" />
      ${state.idError ? `<div class="id-msg-err">&#9888; ${esc(state.idError)}</div>` : ""}
      <button class="btn btn-indigo" style="margin-top:16px;" id="idSubmitBtn">Continue</button>
      <p style="font-size:12px;color:#9ca3af;margin-top:14px;">Try EMP-2025-017, EMP-2025-018, or EMP-2025-019</p>
    </div>
  </div>`;
}

function renderDashboard(){
  const emp = EMPLOYEE_DB[state.matchedId];
  const today = nowParts().date;
  return `
  <div class="dash-grid">
    <div class="dash-left">
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h2 style="margin:0;">Time Record Today</h2>
          <button class="link-btn muted" id="switchIdBtn">Not you? Switch ID</button>
        </div>
        <div class="info-grid">
          <p><span class="info-label">Employee ID</span><span class="info-val">${esc(emp.id)}</span></p>
          <p><span class="info-label">Employee Name</span><span class="info-val">${esc(emp.name)}</span></p>
          <p><span class="info-label">Position</span><span class="info-val">${esc(emp.position)}</span></p>
          <p><span class="info-label">Date</span><span class="info-val">${esc(today)}</span></p>
        </div>
        <div class="record-box">
          <span class="status-pill ${emp.checkedIn?'in':''}">${emp.checkedIn?'CHECKED IN':'NOT CHECKED IN'}</span>
          <p class="record-time">${emp.checkedIn ? esc(emp.checkInLabel) : '--:--:--'}</p>
          <p class="record-date">${esc(today)}</p>
          <div class="record-sub">
            <p><span class="lbl">Check-in Time</span><br><span style="color:${emp.checkInLabel?'#16a34a':'#9ca3af'};font-weight:600;">${emp.checkInLabel?esc(emp.checkInLabel):'-- : -- : --'}</span></p>
            <p><span class="lbl">Check-out Time</span><br><span style="color:#9ca3af;">-- : -- : --</span>${!emp.checkedIn?'<br><span style="font-size:11px;color:#9ca3af;">Not yet checked in</span>':''}</p>
          </div>
        </div>
        <button class="btn ${emp.checkedIn?'btn-rose':'btn-green'}" style="margin-top:20px;" id="toggleCheckBtn">
          ${emp.checkedIn ? 'Check Out' : 'Check In'}
        </button>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="margin:0;">Recent Time Logs</h2>
          <button class="link-btn">View All</button>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Total Hours</th><th>Status</th></tr></thead>
          <tbody>
            ${emp.logs.length===0 ? `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:24px 0;">No time logs yet.</td></tr>` :
              emp.logs.map(l => `<tr><td>${esc(l.date)}</td><td>${esc(l.checkIn)}</td><td>${esc(l.checkOut)}</td><td>${esc(l.hours)}</td><td><span class="badge-green">${esc(l.status)}</span></td></tr>`).join("")}
          </tbody>
        </table>
        <div style="margin-top:16px;font-size:12px;color:#6b7280;">
          <p style="font-weight:600;color:#4b5563;margin:0 0 4px;">Note:</p>
          <p style="margin:0;">• Please check in at the start of your shift and check out at the end.</p>
          <p style="margin:0;">• Accurate time logs help keep records organized.</p>
        </div>
      </div>
    </div>

    <div class="card profile-card">
      <div class="profile-avatar-wrap">
        <div class="profile-avatar">&#128100;</div>
        <span class="dot ${emp.checkedIn?'on':''}"></span>
      </div>
      <p class="profile-name">${esc(emp.name)}</p>
      <p class="profile-role">${esc(emp.position)}</p>
      <div class="profile-rows">
        <div class="row"><span>Employee ID</span><span>${esc(emp.id)}</span></div>
        <div class="row"><span>Email</span><span>${esc(emp.email)}</span></div>
        <div class="row"><span>Phone</span><span>${esc(emp.phone)}</span></div>
      </div>
      <button class="btn btn-indigo-o" style="margin-top:20px;">View Profile</button>
    </div>
  </div>`;
}

function bindEvents(){
  const idInput = document.getElementById("idInput");
  if(idInput){
    idInput.focus();
    idInput.addEventListener("keydown", e=>{ if(e.key==="Enter") submitId(); });
  }
  const idSubmitBtn = document.getElementById("idSubmitBtn");
  if(idSubmitBtn) idSubmitBtn.onclick = submitId;

  const switchBtn = document.getElementById("switchIdBtn");
  if(switchBtn) switchBtn.onclick = ()=>{ state.matchedId=null; state.idError=""; render(); };

  const toggleBtn = document.getElementById("toggleCheckBtn");
  if(toggleBtn) toggleBtn.onclick = handleToggleCheck;
}

function submitId(){
  const val = (document.getElementById("idInput").value||"").trim().toUpperCase();
  if(!val) return;
  if(EMPLOYEE_DB[val]){ state.matchedId = val; state.idError = ""; }
  else { state.idError = "Employee ID not found. Please check and try again."; }
  render();
}

function handleToggleCheck(){
  const emp = EMPLOYEE_DB[state.matchedId];
  const t = nowParts();
  if(!emp.checkedIn){
    emp.checkedIn = true;
    emp.checkInAt = t.raw;
    emp.checkInLabel = t.time;
    render();
  } else {
    const hoursLabel = formatDuration(t.raw - new Date(emp.checkInAt));
    emp.logs.unshift({ date:t.date, checkIn:emp.checkInLabel, checkOut:t.time, hours:hoursLabel, status:"Completed" });
    emp.checkedIn = false; emp.checkInAt = null; emp.checkInLabel = null;
    state.idMessage = `${emp.name} checked out • ${hoursLabel} logged`;
    state.matchedId = null;
    render();
    setTimeout(()=>{ state.idMessage=""; if(!state.matchedId) render(); }, 4000);
  }
}

render();
