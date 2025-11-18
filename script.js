// script.js — PINFL parser + birthday countdown

const fileInput = document.getElementById('file-input');
const processBtn = document.getElementById('process-btn');
const downloadLink = document.getElementById('download-link');
const preview = document.getElementById('preview');
const tableWrapper = document.getElementById('table-wrapper');
const dropArea = document.getElementById('drop-area');

let lastWorkbook = null;

;['dragenter','dragover'].forEach(evt => {
  dropArea.addEventListener(evt, e => { e.preventDefault(); dropArea.classList.add('hover'); });
});
;['dragleave','drop'].forEach(evt => {
  dropArea.addEventListener(evt, e => { e.preventDefault(); dropArea.classList.remove('hover'); });
});

dropArea.addEventListener('drop', e => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if (f) handleFile(f);
});

processBtn.addEventListener('click', () => {
  if (!lastWorkbook) return;
  const processed = processWorkbook(lastWorkbook);
  renderPreview(processed);
  const wbout = buildWorkbook(processed);
  const blob = workbookToBlob(wbout);
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.classList.remove('disabled');
  downloadLink.classList.remove('ghost');
});

function handleFile(file){
  const reader = new FileReader();
  reader.onload = function(e){
    const data = new Uint8Array(e.target.result);
    const wb = XLSX.read(data, {type:'array', cellText:false, cellDates:false});
    lastWorkbook = wb;
    processBtn.disabled = false;
    processBtn.classList.remove('disabled');
  }
  reader.readAsArrayBuffer(file);
}

function processWorkbook(wb){
  const name = wb.SheetNames[0];
  const sheet = wb.Sheets[name];
  const json = XLSX.utils.sheet_to_json(sheet, {header:1, raw:false, defval:''});

  const out = [];

  for (let i=0; i<json.length; i++){
    const row = json[i];
    if (!row) continue;
    let cell = (row[0] ?? '').toString().trim();
    if (!cell) continue;

    let raw = cell.replace(/\D/g, '');
    if (raw.length < 14) raw = raw.padStart(14, '0');

    const info = parsePINFL(raw);
    out.push({
      PINFL: raw,
      Birthdate: info.birth || 'Invalid',
      Gender: info.gender || 'Unknown',
      DaysLeft: info.daysLeft ?? 'N/A'
    });
  }

  return out;
}

function parsePINFL(pinfl){
  if (!/^\d{14}$/.test(pinfl)) return {birth:null, gender:null, daysLeft:null};

  const s = parseInt(pinfl[0], 10);
  const dd = pinfl.slice(1,3);
  const mm = pinfl.slice(3,5);
  const yy = pinfl.slice(5,7);

  let century;
  if (s === 1 || s === 2) century = 1800;
  else if (s === 3 || s === 4) century = 1900;
  else if (s === 5 || s === 6) century = 2000;
  else return {birth:null, gender:null, daysLeft:null};

  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const fullYear = century + parseInt(yy, 10);

  const date = new Date(fullYear, month - 1, day);
  if (
    date.getFullYear() !== fullYear ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return {birth:null, gender:null, daysLeft:null};
  }

  const gender = (s % 2 === 1) ? "Erkak" : "Ayol";

  // === Tug'ilgan kunigacha necha kun qoldi ===
  const today = new Date();
  const thisYearBirthday = new Date(today.getFullYear(), month - 1, day);

  let target;
  if (thisYearBirthday >= today) {
    target = thisYearBirthday;
  } else {
    target = new Date(today.getFullYear() + 1, month - 1, day);
  }

  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  return {
    birth: `${String(day).padStart(2,'0')}.${String(month).padStart(2,'0')}.${fullYear}`,
    gender,
    daysLeft: diffDays
  };
}

function renderPreview(records){
  preview.classList.remove('hidden');

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  ['PINFL','Birthdate','Gender','DaysLeft'].forEach(h=>{
    const th=document.createElement('th'); th.innerText=h;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  records.forEach(r=>{
    const tr=document.createElement('tr');

    const td1=document.createElement('td'); td1.innerText = r.PINFL;
    const td2=document.createElement('td'); td2.innerText = r.Birthdate;
    const td3=document.createElement('td'); td3.innerText = r.Gender;
    const td4=document.createElement('td'); td4.innerText = r.DaysLeft;

    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrapper.innerHTML='';
  tableWrapper.appendChild(table);
}

function buildWorkbook(records){
  const ws = XLSX.utils.json_to_sheet(records, {
    header:['PINFL','Birthdate','Gender','DaysLeft']
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'result');
  return wb;
}

function workbookToBlob(wb){
  const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  return new Blob([wbout], {type:'application/octet-stream'});
}
