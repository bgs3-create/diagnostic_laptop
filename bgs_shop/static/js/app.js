/* BGS SHOP — Auto Diagnostic Web Tool | app.js */
'use strict';

var lastScanData = null;

// ── CLOCK ─────────────────────────────────────────
function updateClock() {
  var now = new Date();
  var el = document.getElementById("clock");
  if (el) el.textContent =
    now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
setInterval(updateClock, 1000);
updateClock();

// ── TOAST ─────────────────────────────────────────
function showToast(msg, type) {
  type = type || "success";
  var t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast show " + type;
  setTimeout(function() { t.className = "toast"; }, 4000);
}

// ── PROGRESS STEPS ────────────────────────────────
var STEPS = [
  "Inisialisasi sistem...",
  "Membaca RAM...",
  "Menganalisis CPU...",
  "Memeriksa storage...",
  "Mengecek baterai...",
  "Membaca versi OS...",
  "Membuat rekomendasi...",
  "Menyelesaikan laporan..."
];

// ── SCAN ──────────────────────────────────────────
function startScan() {
  var nameEl   = document.getElementById("customerName");
  var btnScan  = document.getElementById("btnScan");
  // btnText dicari dari dalam btnScan supaya kompatibel dengan semua versi HTML
  var btnText  = btnScan ? (btnScan.querySelector("span:not(.btn-icon):not(.btn-pulse)") || btnScan) : null;
  var prog     = document.getElementById("scanProgress");
  var results  = document.getElementById("resultsSection");
  var bar      = document.getElementById("progressBar");
  var stepsEl  = document.getElementById("progressSteps");

  var customer = nameEl.value.trim();
  if (!customer) {
    nameEl.focus();
    showToast("Masukkan nama customer terlebih dahulu!", "error");
    return;
  }

  // Reset UI
  btnScan.disabled = true;
  if (btnText) btnText.textContent = 'SCANNING...';
  prog.style.display = "block";
  results.style.display = "none";
  bar.style.width = "0%";
  stepsEl.innerHTML = '<span class="step active">' + STEPS[0] + '</span>';

  // Animasi progress
  var animStep = 0;
  var anim = setInterval(function() {
    if (animStep < STEPS.length - 1) {
      animStep++;
      bar.style.width = Math.round((animStep / STEPS.length) * 85) + "%";
      var html = "";
      for (var i = 0; i < STEPS.length; i++) {
        if (i < animStep) html += '<span class="step done">&#10003; ' + STEPS[i] + '</span>';
        else if (i === animStep) html += '<span class="step active">' + STEPS[i] + '</span>';
        else html += '<span class="step">' + STEPS[i] + '</span>';
      }
      stepsEl.innerHTML = html;
    }
  }, 130);

  // Fetch API
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/scan", true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.timeout = 20000; // 20 detik timeout

  xhr.onload = function() {
    clearInterval(anim);
    bar.style.width = "100%";
    var doneHtml = "";
    for (var i = 0; i < STEPS.length; i++) {
      doneHtml += '<span class="step done">&#10003; ' + STEPS[i] + '</span>';
    }
    stepsEl.innerHTML = doneHtml;

    btnScan.disabled = false;
    if (btnText) btnText.textContent = 'SCAN SEKARANG';

    var apiData;
    try {
      apiData = JSON.parse(xhr.responseText);
    } catch(e) {
      stepsEl.innerHTML = '<span class="step" style="color:#ff4d6d;">&#9888; Gagal parse response dari server</span>';
      showToast("Error: Response server tidak valid", "error");
      return;
    }

    if (!apiData || !apiData.success) {
      var errMsg = (apiData && apiData.error) ? apiData.error : "Server tidak mengembalikan data";
      stepsEl.innerHTML = '<span class="step" style="color:#ff4d6d;">&#9888; ' + errMsg + '</span>';
      showToast("Scan gagal: " + errMsg, "error");
      return;
    }

    lastScanData = apiData.data;
    renderResults(lastScanData);
    setTimeout(function() {
      prog.style.display = "none";
      results.style.display = "block";
      results.scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("Scan selesai! Laporan siap.", "success");
    }, 350);
  };

  xhr.onerror = function() {
    clearInterval(anim);
    btnScan.disabled = false;
    if (btnText) btnText.textContent = 'SCAN SEKARANG';
    stepsEl.innerHTML = '<span class="step" style="color:#ff4d6d;">&#9888; Tidak bisa konek ke server. Pastikan python app.py sudah jalan.</span>';
    showToast("Tidak bisa konek ke server!", "error");
  };

  xhr.ontimeout = function() {
    clearInterval(anim);
    btnScan.disabled = false;
    if (btnText) btnText.textContent = 'SCAN SEKARANG';
    stepsEl.innerHTML = '<span class="step" style="color:#ff4d6d;">&#9888; Timeout 20 detik. Coba restart python app.py</span>';
    showToast("Timeout! Server tidak merespons.", "error");
  };

  xhr.send(JSON.stringify({ customer: customer }));
}

// ── RENDER RESULTS ────────────────────────────────
function renderResults(data) {
  document.getElementById("resCustomer").textContent = data.customer || "-";
  document.getElementById("resScanTime").textContent = "Scan: " + (data.scan_time || "-");

  var grid = document.getElementById("cardsGrid");
  grid.innerHTML = "";

  // RAM
  if (data.ram && !data.ram.error) {
    grid.appendChild(buildCard({
      icon: "&#128190;", label: "MEMORY (RAM)",
      status: data.ram.status, badge: data.ram.label,
      value: data.ram.total_gb, unit: " GB",
      detail: "Terpakai: " + data.ram.used_gb + " GB | " + data.ram.percent + "%",
      barPct: data.ram.percent
    }));
  }

  // CPU
  if (data.cpu && !data.cpu.error) {
    grid.appendChild(buildCard({
      icon: "&#9881;", label: "PROCESSOR",
      status: data.cpu.status, badge: data.cpu.label,
      value: data.cpu.usage_percent, unit: "% Load",
      detail: truncate(data.cpu.name, 40) + "<br>" +
              data.cpu.cores_physical + " Core / " + data.cpu.cores_logical + " Thread &bull; " + data.cpu.freq_ghz + " GHz",
      barPct: data.cpu.usage_percent
    }));
  }

  // Battery
  if (data.battery) {
    if (data.battery.available) {
      grid.appendChild(buildCard({
        icon: "&#128267;", label: "BATERAI",
        status: data.battery.status, badge: data.battery.label,
        value: data.battery.percent, unit: "%",
        detail: data.battery.plugged ? "Sedang mengisi daya" : "Sisa: " + data.battery.time_left,
        barPct: data.battery.percent
      }));
    } else {
      grid.appendChild(buildCard({
        icon: "&#128267;", label: "BATERAI",
        status: "hijau", badge: "Desktop / N/A",
        value: "-", unit: "",
        detail: "Baterai tidak terdeteksi (Desktop / PC)",
        barPct: 0
      }));
    }
  }

  // OS
  if (data.os && !data.os.error) {
    grid.appendChild(buildCard({
      icon: "&#128187;", label: "SISTEM OPERASI",
      status: "hijau", badge: "Terdeteksi",
      valueFull: data.os.name,
      detail: "Arsitektur: " + data.os.machine + " | Host: " + data.os.hostname,
      barPct: null
    }));
  }

  // Storage
  if (data.storage && data.storage.length) {
    var valid = data.storage.filter(function(d) { return !d.error; });
    if (valid.length) grid.appendChild(buildStorageCard(valid, data.storage_type));
  }

  // Rekomendasi
  var recList = document.getElementById("recList");
  recList.innerHTML = "";
  var recs = data.recommendations || [];
  for (var i = 0; i < recs.length; i++) {
    var rec = recs[i];
    var el = document.createElement("div");
    el.className = "rec-card " + rec.level;
    el.innerHTML =
      '<div class="rec-ico">' + rec.icon + '</div>' +
      '<div class="rec-body">' +
        '<div class="rec-title">' + rec.title + '</div>' +
        '<div class="rec-desc">' + rec.desc + '</div>' +
        '<div class="rec-action ' + rec.level + '">&rarr; ' + rec.action + '</div>' +
      '</div>';
    recList.appendChild(el);
  }
}

function buildCard(opt) {
  var card = document.createElement("div");
  card.className = "diag-card " + opt.status;

  var valHtml = opt.valueFull
    ? '<div class="card-value" style="font-size:1rem;">' + opt.valueFull + '</div>'
    : '<div class="card-value">' + opt.value + '<span class="card-unit">' + opt.unit + '</span></div>';

  var barHtml = (opt.barPct !== null && opt.barPct !== undefined)
    ? '<div class="bar-wrap"><div class="bar ' + opt.status + '" style="width:' + Math.min(opt.barPct, 100) + '%"></div></div>'
    : "";

  card.innerHTML =
    '<div class="card-header">' +
      '<span class="card-label">' + opt.icon + ' ' + opt.label + '</span>' +
      '<span class="badge ' + opt.status + '">' + opt.badge + '</span>' +
    '</div>' +
    valHtml +
    '<div class="card-detail">' + opt.detail + '</div>' +
    barHtml;
  return card;
}

function buildStorageCard(drives, types) {
  var card = document.createElement("div");
  var worst = drives[0];
  var rank = { hijau: 0, kuning: 1, merah: 2 };
  for (var i = 1; i < drives.length; i++) {
    if (rank[drives[i].status] > rank[worst.status]) worst = drives[i];
  }
  card.className = "diag-card " + worst.status;

  var items = "";
  for (var j = 0; j < drives.length; j++) {
    var d = drives[j];
    var typeStr = "";
    if (types && Object.keys(types).length > 0) {
      var tv = Object.values(types)[0];
      if (tv) typeStr = " (" + tv + ")";
    }
    items +=
      '<div class="stor-item">' +
        '<div class="stor-row">' +
          '<span class="stor-device">' + d.device + typeStr + '</span>' +
          '<span class="badge ' + d.status + '" style="font-size:.58rem;">' + d.label + '</span>' +
        '</div>' +
        '<div class="stor-row" style="font-size:.72rem;">' +
          '<span>' + d.total_gb + ' GB total</span>' +
          '<span>' + d.free_gb + ' GB bebas</span>' +
        '</div>' +
        '<div class="bar-wrap"><div class="bar ' + d.status + '" style="width:' + Math.min(d.percent,100) + '%"></div></div>' +
      '</div>';
  }

  card.innerHTML =
    '<div class="card-header">' +
      '<span class="card-label">&#128191; STORAGE</span>' +
      '<span class="badge ' + worst.status + '">' + worst.label + '</span>' +
    '</div>' +
    '<div class="storage-list">' + items + '</div>';
  return card;
}

// ── GENERATE REPORT ───────────────────────────────
function generateReport() {
  if (!lastScanData) {
    showToast("Lakukan scan terlebih dahulu!", "error");
    return;
  }
  var btn = document.getElementById("btnReport");
  btn.textContent = "Membuat laporan...";
  btn.disabled = true;

  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/generate-report", true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.onload = function() {
    btn.innerHTML = "&#128196; Generate Laporan";
    btn.disabled = false;
    try {
      var data = JSON.parse(xhr.responseText);
      if (data.success) showToast("Laporan dibuka di browser!", "success");
      else showToast("Gagal: " + data.error, "error");
    } catch(e) {
      showToast("Error membuat laporan", "error");
    }
  };
  xhr.onerror = function() {
    btn.innerHTML = "&#128196; Generate Laporan";
    btn.disabled = false;
    showToast("Error koneksi saat generate laporan", "error");
  };
  xhr.send(JSON.stringify({ scan_data: lastScanData }));
}

// ── RESET ─────────────────────────────────────────
function resetScan() {
  document.getElementById("resultsSection").style.display = "none";
  document.getElementById("scanProgress").style.display = "none";
  document.getElementById("customerName").value = "";
  document.getElementById("customerName").focus();
  lastScanData = null;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function truncate(str, len) {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "..." : str;
}
