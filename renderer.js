import { loadAll, saveAll, saveItem, defaultsMap } from './dataService.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const fmt = n => `€ ${Number(n || 0).toLocaleString('sq-AL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
let state = null;
let calcTargetInput = null;
let shpenzimeCurrentPage = 1;
let qarkullimiCurrentPage = 1;
const ITEMS_PER_PAGE = 10;

let bilanciChartInstance = null;
let shpenzimePieChartInstance = null;
let calendarInstance = null;

// --- Njoftimet Toast ---
function showNotification(options) {
    const container = $('#notification-container');
    if (!container) return;
    const id = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = 'toast-notification';
    
    const iconHtml = options.icon ? `<div class="flex-shrink-0 text-sky-500 pt-0.5"><i data-lucide="${options.icon}" class="w-5 h-5"></i></div>` : '';
    const titleHtml = options.title ? `<h4 class="font-semibold text-sm">${options.title}</h4>` : '';
    const messageHtml = options.message ? `<p class="text-xs text-slate-500 dark:text-slate-400">${options.message}</p>` : '';
    const progressHtml = options.progress ? `<div class="mt-2"><div id="progress-${id}" class="toast-progress-bar"></div></div>` : '';
    const actionsHtml = options.actions ? `<div class="mt-3 flex gap-2">${options.actions}</div>` : '';

    toast.innerHTML = `
        ${iconHtml}
        <div class="flex-1">
            ${titleHtml}
            ${messageHtml}
            ${progressHtml}
            ${actionsHtml}
        </div>
        <button class="p-1 -m-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 self-start" onclick="document.getElementById('${id}')?.remove()">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    if (options.duration) {
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, options.duration);
    }
    return id;
}


// --- Export Functions ---
function exportToPdf(title, headers, data, filename) {
  const ok =
    window.jspdf &&
    window.jspdf.jsPDF &&
    window.jspdf.jsPDF.API &&
    typeof window.jspdf.jsPDF.API.autoTable === 'function';
  if (!ok) {
    return showAlert('Gabim', 'Libraria për krijimin e PDF nuk u ngarkua.', 'error');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFont('LiberationSans', 'normal');
  doc.text(title, 14, 20);
  doc.autoTable({
    startY: 28,
    head: [headers],
    body: data,
    theme: 'grid',
    headStyles: { fillColor: '#0ea5e9', font: 'LiberationSans', fontStyle: 'bold' },
    styles: { font: 'LiberationSans', fontStyle: 'normal', fontSize: 10 },
  });
  doc.save(filename);
}


function exportToXlsx(data, filename) {
    if (typeof XLSX === 'undefined') {
        return showAlert('Gabim', 'Libraria për krijimin e Excel nuk u ngarkua.', 'error');
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Të dhënat');
    XLSX.writeFile(wb, filename);
}

// --- Alert Modal ---
const alertModal = $('#alertModal');
const alertBox = $('#alertBox');
const alertOverlay = $('#alertOverlay');

function showAlert(title, message, type = 'info') {
    $('#alertTitle').textContent = title;
    $('#alertMessage').innerHTML = `<pre class="text-left whitespace-pre-wrap">${message}</pre>`;
    const iconContainer = $('#alertIcon');
    
    const icons = {
        info: { lucide: 'info', classes: 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400' },
        success: { lucide: 'check', classes: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' },
        error: { lucide: 'alert-triangle', classes: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' },
    };
    
    const icon = icons[type] || icons['info'];
    iconContainer.innerHTML = `<i data-lucide="${icon.lucide}" class="w-6 h-6"></i>`;
    iconContainer.className = `mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-4 ${icon.classes}`;
    lucide.createIcons();
    
    alertModal.classList.remove('hidden');
    alertModal.classList.add('flex');
    setTimeout(() => {
        alertBox.classList.remove('scale-95', 'opacity-0');
    }, 10);
}

function hideAlert() {
    alertBox.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        alertModal.classList.add('hidden');
        alertModal.classList.remove('flex');
    }, 200);
}

// --- Theme Management ---
const themeToggle = $('#theme-toggle');
const lightIcon = $('#theme-icon-light');
const darkIcon = $('#theme-icon-dark');

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        lightIcon.classList.remove('hidden');
        darkIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        lightIcon.classList.add('hidden');
        darkIcon.classList.remove('hidden');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    const newTheme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    if (document.querySelector('#route-raporte:not(.hidden)')) {
        renderRaporte();
    }
}


function applyGlobalSearch() {
  const q = $('#globalSearch')?.value || '';
  const route = document.querySelector('.route:not(.hidden)')?.id?.replace('route-', '') || 'dashboard';

  if (route === 'shpenzimet')      { renderTblShpenzime(q); }
  else if (route === 'qarkullimi') { renderTblQarkullimi(q); }
  else if (route === 'punetori')   { renderPunetore(q); }
  else if (route === 'custom')     { renderCustom(q); }
  else if (route === 'inventari')  { renderInventari(q); }
  
  const res = searchAll(q);
  renderSearchResultsDropdown(res, q);
}


function setActiveRoute(route) {
    $$('.route').forEach(el => el.classList.add('hidden'));
    $('#route-' + route).classList.remove('hidden');
    $$('#menu .navlink').forEach(b => b.classList.remove('active'));
    $(`#menu [data-route="${route}"]`).classList.add('active');
    applyGlobalSearch();

    if (route === 'kalendari') {
        setTimeout(() => renderKalendari(), 50);
    }
    if (route === 'raporte') {
        renderRaporte();
    }
}

function renderSelectOptions(sel, arr, valueProp, textProp) {
    if (!sel) return;
    sel.innerHTML = arr.map(item => {
        const value = valueProp ? item[valueProp] : item;
        const text = textProp ? item[textProp] : item;
        return `<option value="${value}">${text}</option>`;
    }).join('');
}

function renderFurnitore() {
    renderSelectOptions($('#shpFurnitor'), state.furnitoret);

    const filterSelect = $('#shpenzimeFurnitorFilter');
    if (filterSelect) {
        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="">Të gjithë furnitorët</option>' + state.furnitoret.map(f => `<option value="${f}">${f}</option>`).join('');
        filterSelect.value = currentValue;
    }

    const container = $('#furnitoreListaContainer');
    if (!container) return;
    if (state.furnitoret.length > 0) {
        container.innerHTML = state.furnitoret.map(f => `
            <div class="flex items-center justify-between p-2 rounded-md bg-slate-100 dark:bg-slate-800">
                <span class="text-sm font-medium">${f}</span>
                <button data-del-furnitor="${f}" class="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');
    } else {
        container.innerHTML = `<p class="text-center text-xs text-slate-400 p-2">Asnjë furnitor i shtuar.</p>`;
    }

    container.querySelectorAll('[data-del-furnitor]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const furnitorToDelete = btn.dataset.delFurnitor;
            const isInUse = state.shpenzimet.some(s => s.furnitor === furnitorToDelete);
            if (isInUse) {
                showAlert('Veprimi u ndalua', `Furnitori "${furnitorToDelete}" nuk mund të fshihet sepse është i lidhur me një ose më shumë shpenzime.`, 'error');
                return;
            }
            const index = state.furnitoret.indexOf(furnitorToDelete);
            if (index > -1) {
                state.furnitoret.splice(index, 1);
                await saveItem('furnitoret', state.furnitoret);
                refreshUI();
                showAlert('Sukses', `Furnitori "${furnitorToDelete}" u fshi me sukses.`, 'success');
            }
        });
    });
}

function renderShpenzimeKategori() {
    renderSelectOptions($('#shpKategoria'), state.shpenzimeKategorite);
    const container = $('#shpenzimKategoriListaContainer');
    if (!container) return;
    if (state.shpenzimeKategorite.length > 0) {
        container.innerHTML = state.shpenzimeKategorite.map(k => `
            <div class="flex items-center justify-between p-2 rounded-md bg-slate-100 dark:bg-slate-800">
                <span class="text-sm font-medium capitalize">${k}</span>
                <button data-del-shpenzim-kategori="${k}" class="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');
    } else {
        container.innerHTML = `<p class="text-center text-xs text-slate-400 p-2">Asnjë kategori e shtuar.</p>`;
    }
    container.querySelectorAll('[data-del-shpenzim-kategori]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const kToDelete = btn.dataset.delShpenzimKategori;
            const isInUse = state.shpenzimet.some(s => s.kategoria === kToDelete);
            if (isInUse) {
                showAlert('Veprimi u ndalua', `Kategoria "${kToDelete}" nuk mund të fshihet sepse është e lidhur me një ose më shumë shpenzime.`, 'error');
                return;
            }
            const index = state.shpenzimeKategorite.indexOf(kToDelete);
            if (index > -1) {
                state.shpenzimeKategorite.splice(index, 1);
                await saveItem('shpenzimeKategorite', state.shpenzimeKategorite);
                refreshUI();
                showAlert('Sukses', `Kategoria "${kToDelete}" u fshi me sukses.`, 'success');
            }
        });
    });
}

function renderNenkategori() {
    renderSelectOptions($('#qNenkategoria'), state.nenkategorite);
    const filterSelect = $('#qarkullimNenkategoriFilter');
    if (filterSelect) {
        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="">Të gjitha nënkategoritë</option>' + state.nenkategorite.map(nk => `<option value="${nk}">${nk}</option>`).join('');
        filterSelect.value = currentValue;
    }
    const container = $('#nenkategoriListaContainer');
    if (!container) return;
    if (state.nenkategorite.length > 0) {
        container.innerHTML = state.nenkategorite.map(nk => `
            <div class="flex items-center justify-between p-2 rounded-md bg-slate-100 dark:bg-slate-800">
                <span class="text-sm font-medium">${nk}</span>
                <button data-del-nenkategori="${nk}" class="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');
    } else {
        container.innerHTML = `<p class="text-center text-xs text-slate-400 p-2">Asnjë nënkategori e shtuar.</p>`;
    }
    container.querySelectorAll('[data-del-nenkategori]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const nkToDelete = btn.dataset.delNenkategori;
            const isInUse = state.qarkullimi.some(q => q.nenkategoria === nkToDelete);
            if (isInUse) {
                showAlert('Veprimi u ndalua', `Nënkategoria "${nkToDelete}" nuk mund të fshihet sepse është e lidhur me një ose më shumë hyrje qarkullimi.`, 'error');
                return;
            }
            const index = state.nenkategorite.indexOf(nkToDelete);
            if (index > -1) {
                state.nenkategorite.splice(index, 1);
                await saveItem('nenkategorite', state.nenkategorite);
                refreshUI();
                showAlert('Sukses', `Nënkategoria "${nkToDelete}" u fshi me sukses.`, 'success');
            }
        });
    });
}

function renderPagination(type, currentPage, totalItems, itemsPerPage) {
    const containerId = `${type}Pagination`;
    const container = $(`#${containerId}`);
    if (!container) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
    const endItem = Math.min(startItem + itemsPerPage - 1, totalItems);

    let buttonsHtml = '';
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        buttonsHtml += `<button data-page="${i}" class="btn ${isActive ? 'btn-primary' : 'btn-secondary'} !p-0 !w-9 !h-9 text-sm">${i}</button>`;
    }
    
    const prevDisabled = currentPage === 1;
    const nextDisabled = currentPage === totalPages;
    const prevButton = `<button data-page="${currentPage - 1}" class="btn btn-secondary !p-2" ${prevDisabled ? 'disabled' : ''}><i data-lucide="chevron-left" class="w-4 h-4"></i></button>`;
    const nextButton = `<button data-page="${currentPage + 1}" class="btn btn-secondary !p-2" ${nextDisabled ? 'disabled' : ''}><i data-lucide="chevron-right" class="w-4 h-4"></i></button>`;

    container.innerHTML = `
        <div class="text-sm text-slate-500 dark:text-slate-400">
            Po shfaqen <b>${startItem}</b>-<b>${endItem}</b> nga <b>${totalItems}</b> rezultate
        </div>
        <div class="flex items-center gap-1">
            ${prevButton}
            ${buttonsHtml}
            ${nextButton}
        </div>
    `;
    lucide.createIcons();
    
    container.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page, 10);
            if (type === 'shpenzime') {
                shpenzimeCurrentPage = page;
                renderTblShpenzime($('#globalSearch').value);
            } else if (type === 'qarkullimi') {
                qarkullimiCurrentPage = page;
                renderTblQarkullimi($('#globalSearch').value);
            }
        });
    });
}


function renderTblShpenzime(filter = '') {
    const body = $('#tblShpenzime');
    const q = (filter || '').toLowerCase();
    const furnitorFilter = $('#shpenzimeFurnitorFilter')?.value;
    const dateFilter = $('#shpenzimeDateFilter')?.value;

    const filteredData = state.shpenzimet.filter(r => {
        const textMatch = !q || Object.values(r).join(' ').toLowerCase().includes(q);
        const furnitorMatch = !furnitorFilter || r.furnitor === furnitorFilter;
        const dateMatch = !dateFilter || r.data === dateFilter;
        return textMatch && furnitorMatch && dateMatch;
    }).sort((a, b) => new Date(b.data) - new Date(a.data));

    const startIndex = (shpenzimeCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    const rows = paginatedData.map(r => `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
    <td class="px-5 py-3"><input type="checkbox" class="shpenzim-checkbox rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 focus:ring-sky-500" data-id="${r.id}"></td>
    <td class="px-5 py-3">${r.furnitor}</td><td class="px-5 py-3 capitalize">${r.kategoria}</td><td class="px-5 py-3 font-medium">${fmt(r.shuma)}</td>
    <td class="px-5 py-3">${r.data}</td><td class="px-5 py-3 text-slate-500 dark:text-slate-400">${r.shenim || ''}</td>
    <td class="px-5 py-3 text-right space-x-2"><button class="font-medium text-sky-600 dark:text-sky-400 hover:underline" data-edit="${r.id}">Edito</button><button class="font-medium text-red-600 dark:text-red-400 hover:underline" data-del="${r.id}">Fshi</button></td>
  </tr>`).join('');
    body.innerHTML = rows || `<tr><td colspan="7" class="py-10 text-center text-slate-400">Asnjë shpenzim i regjistruar për filtrat e zgjedhur.</td></tr>`;
    
    renderPagination('shpenzime', shpenzimeCurrentPage, filteredData.length, ITEMS_PER_PAGE);

    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { const idx = state.shpenzimet.findIndex(x => x.id === b.dataset.del); if (idx > -1) { state.shpenzimet.splice(idx, 1); await saveItem('shpenzimet', state.shpenzimet); refreshUI(); } }));
    body.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
        const r = state.shpenzimet.find(x => x.id === b.dataset.edit); if (!r) return;
        $('#shpFurnitor').value = r.furnitor; $('#shpShuma').value = r.shuma; $('#shpData').value = r.data; $('#shpShenim').value = r.shenim || ''; $('#shpKategoria').value = r.kategoria;
        state.shpenzimet = state.shpenzimet.filter(x => x.id !== r.id); saveItem('shpenzimet', state.shpenzimet).then(refreshUI);
    }));
}

function renderTblQarkullimi(filter = '') {
    const body = $('#tblQarkullimi');
    const q = (filter || '').toLowerCase();
    const dateFilter = $('#qarkullimDateFilter')?.value;
    const nenkategoriFilter = $('#qarkullimNenkategoriFilter')?.value;

    const filteredData = state.qarkullimi.filter(r => {
        const textMatch = !q || Object.values(r).join(' ').toLowerCase().includes(q);
        const dateMatch = !dateFilter || r.data === dateFilter;
        const nenkategoriMatch = !nenkategoriFilter || r.nenkategoria === nenkategoriFilter;
        return textMatch && dateMatch && nenkategoriMatch;
    }).sort((a, b) => new Date(b.data) - new Date(a.data));

    const startIndex = (qarkullimiCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    const rows = paginatedData.map(r => `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
    <td class="px-5 py-3"><input type="checkbox" class="qarkullim-checkbox rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 focus:ring-sky-500" data-id="${r.id}"></td>
    <td class="px-5 py-3">${r.nenkategoria}</td><td class="px-5 py-3 font-medium">${fmt(r.shuma)}</td><td class="px-5 py-3">${r.data}</td><td class="px-5 py-3">${r.punetori || '-'}</td><td class="px-5 py-3 text-slate-500 dark:text-slate-400">${r.shenim || ''}</td>
    <td class="px-5 py-3 text-right space-x-2"><button class="font-medium text-sky-600 dark:text-sky-400 hover:underline" data-edit="${r.id}">Edito</button><button class="font-medium text-red-600 dark:text-red-400 hover:underline" data-del="${r.id}">Fshi</button></td>
  </tr>`).join('');
    body.innerHTML = rows || `<tr><td colspan="7" class="py-10 text-center text-slate-400">Asnjë hyrje qarkullimi e regjistruar për filtrat e zgjedhur.</td></tr>`;
    
    renderPagination('qarkullimi', qarkullimiCurrentPage, filteredData.length, ITEMS_PER_PAGE);
    
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { const idx = state.qarkullimi.findIndex(x => x.id === b.dataset.del); if (idx > -1) { state.qarkullimi.splice(idx, 1); await saveItem('qarkullimi', state.qarkullimi); refreshUI(); } }));
    body.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
        const r = state.qarkullimi.find(x => x.id === b.dataset.edit); if (!r) return;
        $('#qNenkategoria').value = r.nenkategoria; $('#qShuma').value = r.shuma; $('#qData').value = r.data; $('#qPunetori').value = r.punetori || ''; $('#qShenim').value = r.shenim || '';
        state.qarkullimi = state.qarkullimi.filter(x => x.id !== r.id); saveItem('qarkullimi', state.qarkullimi).then(refreshUI);
    }));
}


function renderPunetore(filter = '') {
    const wrap = $('#listPunetore');
    const q = (filter || '').toLowerCase();

    const punetoretByName = state.punetoret.reduce((acc, p) => {
        acc[p.emri] = acc[p.emri] || [];
        acc[p.emri].push(p);
        return acc;
    }, {});

    const latestPunetoret = Object.values(punetoretByName).map(entries => {
        return entries.sort((a, b) => new Date(b.dataPageses) - new Date(a.dataPageses))[0];
    });

    const items = latestPunetoret
        .filter(p => !q || p.emri.toLowerCase().includes(q))
        .map(p => {
            const mb = Math.max(0, (Number(p.pushimTotali) || 0) - (Number(p.pushimPerdorura) || 0));
            return `<div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <input type="checkbox" class="punetor-checkbox rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 focus:ring-sky-500 mt-1" data-name="${p.emri}">
                  <div class="flex-shrink-0 w-10 h-10 grid place-items-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400"><i data-lucide="user" class="w-5 h-5"></i></div>
                  <div>
                    <div class="font-medium">${p.emri}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">Pagesa e fundit: ${p.dataPageses ? `${fmt(p.rroga)} (${p.dataPageses})` : 'Nuk ka'}</div>
                  </div>
                </div>
                <button class="btn btn-secondary !p-1.5" data-del-name="${p.emri}" title="Fshi Punëtorin dhe të gjitha pagesat"><i data-lucide="trash-2" class="w-4 h-4 text-red-500"></i></button>
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-2 mt-4 text-sm pl-8 flex-1">
                <div class="flex items-center gap-2" title="Orët shtesë nga pagesa e fundit"><i data-lucide="timer" class="w-4 h-4 text-slate-400"></i><span>Orë shtesë: <b>${p.oreShtese || 0}</b></span></div>
                <div class="flex items-center gap-2" title="Pagesa për orë shtesë"><i data-lucide="wallet" class="w-4 h-4 text-slate-400"></i><span>Pagesa: <b>${fmt(p.pagesaOreShtese || 0)}</b></span></div>
                <div class="flex items-center gap-2" title="Mungesat nga pagesa e fundit"><i data-lucide="circle-x" class="w-4 h-4 text-slate-400"></i><span>Mungesa: <b>${p.mungesa || 0}</b> ditë</span></div>
                <div class="flex items-center gap-2" title="Pushimi i përdorur / Pushimi total"><i data-lucide="calendar" class="w-4 h-4 text-slate-400"></i><span>Pushimi: <b>${p.pushimPerdorura || 0}</b>/<b>${p.pushimTotali || 0}</b> (mbetur ${mb})</span></div>
              </div>
              <div class="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button class="btn btn-primary flex-1 btn-sm" data-payment-id="${p.id}"><i data-lucide="plus-circle" class="w-4 h-4"></i><span>Regjistro Pagesë</span></button>
                <button class="btn btn-secondary flex-1 btn-sm" data-edit-name="${p.emri}"><i data-lucide="edit-3" class="w-4 h-4"></i><span>Modifiko Detajet</span></button>
              </div>
            </div>`
        }).join('');
        
    wrap.innerHTML = items || `<div class="text-center text-slate-400 py-10 col-span-full">Asnjë punëtor i regjistruar.</div>`;
    lucide.createIcons();

    wrap.querySelectorAll('[data-del-name]').forEach(b => b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const workerName = b.dataset.delName;
        if (confirm(`Jeni i sigurt që doni të fshini punëtorin "${workerName}" dhe gjithë historinë e pagesave? Ky veprim nuk kthehet pas.`)) {
            state.punetoret = state.punetoret.filter(p => p.emri !== workerName);
            await saveItem('punetoret', state.punetoret);
            refreshUI();
            showAlert('Sukses', `Punëtori '${workerName}' u fshi me sukses.`, 'success');
        }
    }));

    wrap.querySelectorAll('[data-edit-name]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const workerName = b.dataset.editName;
        const latestEntry = state.punetoret
            .filter(p => p.emri === workerName)
            .sort((a, b) => new Date(b.dataPageses) - new Date(a.dataPageses))[0];
        if (latestEntry) {
            openPunetorModal(latestEntry);
        }
    }));

    wrap.querySelectorAll('[data-payment-id]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        openPaymentModal(b.dataset.paymentId);
    }));
}

function updateCustomFormFields() {
    const select = $('#cKategoriSelect');
    if (!select) return;
    
    const selectedCategoryName = select.value;
    const category = state.customCategories.find(c => c.name === selectedCategoryName);

    const fields = category ? category.fields : {};

    $('#cPershkrimWrap').classList.toggle('hidden', !fields.pershkrim);
    $('#cShumaWrap').classList.toggle('hidden', !fields.shuma);
    $('#cDataWrap').classList.toggle('hidden', !fields.data);
    $('#cIkonaWrap').classList.toggle('hidden', !fields.ikona);
}


function renderCustomCategoriesAndForm() {
    const container = $('#customKategoriListaContainer');
    const select = $('#cKategoriSelect');

    if (container) {
        if (state.customCategories.length > 0) {
            container.innerHTML = state.customCategories.map(cat => `
                <div class="flex items-center justify-between p-2 rounded-md bg-slate-100 dark:bg-slate-800">
                    <span class="text-sm font-medium">${cat.name}</span>
                    <button data-del-custom-category="${cat.name}" class="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `).join('');
        } else {
            container.innerHTML = `<p class="text-center text-xs text-slate-400 p-2">Asnjë lloj kategorie i shtuar.</p>`;
        }
        container.querySelectorAll('[data-del-custom-category]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const catNameToDelete = btn.dataset.delCustomCategory;
                const isInUse = state.custom.some(item => item.kategori === catNameToDelete);
                if (isInUse) {
                    return showAlert('Veprimi u ndalua', `Ky lloj kategorie nuk mund të fshihet sepse është në përdorim.`, 'error');
                }
                state.customCategories = state.customCategories.filter(cat => cat.name !== catNameToDelete);
                await saveItem('customCategories', state.customCategories);
                refreshUI();
                showAlert('Sukses', `Lloji i kategorisë "${catNameToDelete}" u fshi.`, 'success');
            });
        });
    }

    if (select) {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Zgjidh llojin e kategorisë...</option>' + state.customCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        select.value = currentValue;
        select.removeEventListener('change', updateCustomFormFields);
        select.addEventListener('change', updateCustomFormFields);
        updateCustomFormFields();
    }
}


function renderCustom(filter = '') {
    const wrap = $('#listCustom');
    const q = (filter || '').toLowerCase();
    const items = state.custom.filter(c => !q || `${c.titull} ${c.pershkrim} ${c.shuma} ${c.data} ${c.kategori}`.toLowerCase().includes(q));

    wrap.innerHTML = items.map(c => {
        const categoryDef = state.customCategories.find(cat => cat.name === c.kategori);
        const iconName = (categoryDef?.fields?.ikona && c.ikona) ? c.ikona : 'star';

        return `<div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                 <input type="checkbox" class="custom-checkbox rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 focus:ring-sky-500" data-id="${c.id}">
                <div class="flex-shrink-0 w-10 h-10 grid place-items-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"><i data-lucide="${iconName}" class="w-5 h-5"></i></div>
                <div>
                  <div class="font-medium">${c.titull}</div>
                  <div class="text-[11px] text-sky-600 dark:text-sky-400 font-medium">${c.kategori || ''}</div>
                </div>
              </div>
              <div class="text-right space-x-2 flex-shrink-0"><button class="font-medium text-sky-600 dark:text-sky-400 hover:underline text-sm" data-edit="${c.id}">Edito</button><button class="font-medium text-red-600 dark:text-red-400 hover:underline text-sm" data-del="${c.id}">Fshi</button></div>
            </div>
            ${c.pershkrim ? `<div class="text-sm mt-2 text-slate-600 dark:text-slate-300 pl-14">${c.pershkrim}</div>` : ''}
            <div class="flex items-center justify-between pl-14 mt-1">
                ${c.shuma ? `<div class="text-base font-semibold text-emerald-600 dark:text-emerald-400">${fmt(c.shuma)}</div>` : '<div></div>'}
                ${c.data ? `<div class="text-xs text-slate-500 dark:text-slate-400">${c.data}</div>` : ''}
            </div>
          </div>`
    }).join('') || `<div class="text-center text-slate-400 py-10 col-span-full">${q ? 'Asnjë rezultat i gjetur.' : 'Asgjë ende – shto njësinë e parë.'}</div>`;
    
    wrap.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { const idx = state.custom.findIndex(x => x.id === b.dataset.del); if (idx > -1) { state.custom.splice(idx, 1); await saveItem('custom', state.custom); refreshUI(); } }));
    wrap.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
        const c = state.custom.find(x => x.id === b.dataset.edit); if (!c) return;
        
        $('#cKategoriSelect').value = c.kategori;
        $('#cKategoriSelect').dispatchEvent(new Event('change'));

        $('#cTitull').value = c.titull;
        if(c.pershkrim !== undefined) $('#cPershkrim').value = c.pershkrim || '';
        if(c.shuma !== undefined) $('#cShuma').value = c.shuma || '';
        if(c.data !== undefined) $('#cData').value = c.data || '';
        if(c.ikona !== undefined) $('#cIkona').value = c.ikona || 'star';
        
        state.custom = state.custom.filter(x => x.id !== c.id); 
        saveItem('custom', state.custom).then(refreshUI);
    }));
}

function renderInventari(filter = '') {
    const body = $('#tblInventari');
    const q = (filter || '').toLowerCase();

    const filteredData = state.inventari.filter(item => 
        !q || Object.values(item).join(' ').toLowerCase().includes(q)
    );

    const rows = filteredData.map(item => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td class="px-5 py-3 font-medium">${item.produkti}</td>
            <td class="px-5 py-3">${item.sasia}</td>
            <td class="px-5 py-3 text-slate-500 dark:text-slate-400">${item.shenim || ''}</td>
            <td class="px-5 py-3 text-right space-x-2">
                <button class="font-medium text-sky-600 dark:text-sky-400 hover:underline" data-edit-inv="${item.id}">Edito</button>
                <button class="font-medium text-red-600 dark:text-red-400 hover:underline" data-del-inv="${item.id}">Fshi</button>
            </td>
        </tr>
    `).join('');

    body.innerHTML = rows || `<tr><td colspan="4" class="py-10 text-center text-slate-400">Asnjë produkt në inventar.</td></tr>`;

    body.querySelectorAll('[data-del-inv]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const itemId = btn.dataset.delInv;
            state.inventari = state.inventari.filter(item => item.id !== itemId);
            await saveItem('inventari', state.inventari);
            refreshUI();
        });
    });

    body.querySelectorAll('[data-edit-inv]').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = state.inventari.find(i => i.id === btn.dataset.editInv);
            if (!item) return;
            $('#invItemId').value = item.id;
            $('#invProdukti').value = item.produkti;
            $('#invSasia').value = item.sasia;
            $('#invShenim').value = item.shenim || '';
        });
    });
}

function renderKalendari() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    const events = [];
    state.shpenzimet.forEach(s => events.push({ title: `Shpenzim: ${s.furnitor} (${fmt(s.shuma)})`, start: s.data, color: '#ef4444', extendedProps: { description: `Kategoria: ${s.kategoria}\nShënimi: ${s.shenim || '-'}` } }));
    state.qarkullimi.forEach(q => events.push({ title: `Qarkullim: ${q.nenkategoria} (${fmt(q.shuma)})`, start: q.data, color: '#22c55e', extendedProps: { description: `Punëtori: ${q.punetori || '-'}\nShënimi: ${q.shenim || '-'}` } }));
    state.punetoret.forEach(p => {
        if (p.dataPageses) {
            events.push({ title: `Pagesë: ${p.emri} (${fmt(p.rroga)})`, start: p.dataPageses, color: '#3b82f6', extendedProps: { description: 'Regjistrim page mujore.' } });
        }
    });
    state.custom.forEach(c => {
        if (c.data) {
            events.push({ title: `${c.kategori || 'Custom'}: ${c.titull}`, start: c.data, color: '#8b5cf6', extendedProps: { description: c.pershkrim || 'Asnjë përshkrim.' } });
        }
    });

    if (calendarInstance) {
        calendarInstance.destroy();
    }
    
    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        locale: 'sq',
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        buttonText: {
            today:    'Sot',
            month:    'Muaj',
            week:     'Javë',
            list:     'Listë'
        },
        events: events,
        eventDidMount: function(info) {
            info.el.setAttribute('title', info.event.title);
        },
        eventClick: function(info) {
            const title = info.event.title;
            const description = info.event.extendedProps.description;
            showAlert(`Detajet e Ngjarjes`, `${title}\n\n${description}`, 'info');
        }
    });
    calendarInstance.render();
}

function renderRaporte() {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#cbd5e1' : '#475569';

    // Chart 1: Monthly balance
    const bilanciCtx = document.getElementById('bilanciChart')?.getContext('2d');
    const bilanciWrapper = bilanciCtx?.canvas.parentElement;
    if (!bilanciCtx || !bilanciWrapper) return;

    const labels = [];
    const qarkullimiData = [];
    const shpenzimeData = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        labels.push(d.toLocaleString('sq-AL', { month: 'short', year: '2-digit' }));
        
        const monthlyQarkullim = state.qarkullimi
            .filter(q => q.data && q.data.startsWith(monthYear))
            .reduce((sum, q) => sum + Number(q.shuma), 0);
        qarkullimiData.push(monthlyQarkullim);

        const monthlyShpenzime = state.shpenzimet
            .filter(s => s.data && s.data.startsWith(monthYear))
            .reduce((sum, s) => sum + Number(s.shuma), 0);
        shpenzimeData.push(monthlyShpenzime);
    }
    
    const hasBilanciData = qarkullimiData.some(d => d > 0) || shpenzimeData.some(d => d > 0);
    if (bilanciChartInstance) bilanciChartInstance.destroy();
    
    bilanciWrapper.innerHTML = ''; // Clear previous content
    if (hasBilanciData) {
        const canvas = document.createElement('canvas');
        canvas.id = 'bilanciChart';
        bilanciWrapper.appendChild(canvas);
        
        bilanciChartInstance = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Qarkullimi', data: qarkullimiData, backgroundColor: 'rgba(34, 197, 94, 0.6)', borderColor: 'rgba(34, 197, 94, 1)', borderWidth: 1 },
                    { label: 'Shpenzimet', data: shpenzimeData, backgroundColor: 'rgba(239, 68, 68, 0.6)', borderColor: 'rgba(239, 68, 68, 1)', borderWidth: 1 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { color: gridColor } } }, plugins: { legend: { labels: { color: textColor } } } }
        });
    } else {
        bilanciWrapper.innerHTML = `<div class="flex items-center justify-center h-full text-slate-400 text-sm">Nuk ka të dhëna për të gjeneruar grafikun.</div>`;
    }

    // Chart 2: Expense Categories Pie Chart
    const shpenzimePieCtx = document.getElementById('shpenzimePieChart')?.getContext('2d');
    const shpenzimePieWrapper = shpenzimePieCtx?.canvas.parentElement;
    if (!shpenzimePieCtx || !shpenzimePieWrapper) return;

    const shpenzimeByCategory = state.shpenzimet.reduce((acc, s) => {
        acc[s.kategoria] = (acc[s.kategoria] || 0) + Number(s.shuma);
        return acc;
    }, {});
    
    const pieLabels = Object.keys(shpenzimeByCategory);
    const pieData = Object.values(shpenzimeByCategory);

    if(shpenzimePieChartInstance) shpenzimePieChartInstance.destroy();
    
    shpenzimePieWrapper.innerHTML = ''; // Clear previous content
    if (pieData.length > 0 && pieData.some(d => d > 0)) {
        const canvas = document.createElement('canvas');
        canvas.id = 'shpenzimePieChart';
        shpenzimePieWrapper.appendChild(canvas);

        shpenzimePieChartInstance = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: pieLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
                datasets: [{ data: pieData, backgroundColor: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6'], hoverOffset: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: textColor } } } }
        });
    } else {
         shpenzimePieWrapper.innerHTML = `<div class="flex items-center justify-center h-full text-slate-400 text-sm">Nuk ka shpenzime për të shfaqur.</div>`;
    }
}

function renderDashboard() {
    const totShp = state.shpenzimet.reduce((s, r) => s + Number(r.shuma || 0), 0);
    const totQ = state.qarkullimi.reduce((s, r) => s + Number(r.shuma || 0), 0);
    $('#dashShpenzime').textContent = fmt(totShp);
    $('#dashQarkullimi').textContent = fmt(totQ);
    
    const uniqueWorkerNames = new Set(state.punetoret.map(p => p.emri));
    $('#dashPunetore').textContent = String(uniqueWorkerNames.size);

    const bilanci = totQ - totShp;
    const bilanciEl = $('#dashBilanci');
    bilanciEl.textContent = fmt(bilanci);
    bilanciEl.classList.toggle('text-red-600', bilanci < 0);
    bilanciEl.classList.toggle('dark:text-red-500', bilanci < 0);
    bilanciEl.classList.toggle('text-emerald-600', bilanci >= 0);
    bilanciEl.classList.toggle('dark:text-emerald-500', bilanci >= 0);
}

function refreshUI() {
    const route = document.querySelector('.route:not(.hidden)')?.id?.replace('route-', '') || 'dashboard';
    const currentSearch = $('#globalSearch')?.value || '';
    
    renderDashboard();
    renderFurnitore();
    renderShpenzimeKategori();
    renderNenkategori();
    renderCustomCategoriesAndForm();

    if (route === 'shpenzimet') renderTblShpenzime(currentSearch);
    if (route === 'qarkullimi') renderTblQarkullimi(currentSearch);
    if (route === 'punetori') renderPunetore(currentSearch);
    if (route === 'custom') renderCustom(currentSearch);
    if (route === 'inventari') renderInventari(currentSearch);
    if (route === 'raporte') renderRaporte();
    
    lucide.createIcons();
}

function id() { return crypto.randomUUID(); }

// --- Modal Functions ---
function openModal(modalId) {
    const modal = $(`#${modalId}`);
    const box = $(`#${modalId}Box`);
    if (!modal || !box) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => box.classList.remove('scale-95', 'opacity-0'), 10);
}

function closeModal(modalId) {
    const modal = $(`#${modalId}`);
    const box = $(`#${modalId}Box`);
    if (!modal || !box) return;
    box.classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

function openPunetorModal(punetor = null) {
    const title = $('#punetorModalTitle');
    const originalNameInput = $('#pEditOriginalName');
    const emriInput = $('#pEmriModal');
    const pushimInput = $('#pPushimTotaliModal');

    if (punetor) { // Edit mode
        title.textContent = 'Modifiko Detajet e Punëtorit';
        originalNameInput.value = punetor.emri;
        emriInput.value = punetor.emri;
        pushimInput.value = punetor.pushimTotali || 0;
    } else { // Add mode
        title.textContent = 'Shto Punëtor të Ri';
        originalNameInput.value = '';
        emriInput.value = '';
        pushimInput.value = '';
    }
    openModal('punetorModal');
}

async function savePunetor() {
    const originalName = $('#pEditOriginalName').value;
    const newName = ($('#pEmriModal').value || '').trim();
    const newPushimTotal = Number($('#pPushimTotaliModal').value || 0);

    if (!newName) {
        return showAlert('Gabim', 'Emri i punëtorit nuk mund të jetë bosh.', 'error');
    }

    if (originalName) { // Edit mode
        if (originalName.toLowerCase() !== newName.toLowerCase() && state.punetoret.some(p => p.emri.toLowerCase() === newName.toLowerCase())) {
            return showAlert('Gabim', `Punëtori me emrin "${newName}" ekziston tashmë.`, 'error');
        }
        state.punetoret.forEach(p => {
            if (p.emri === originalName) {
                p.emri = newName;
                p.pushimTotali = newPushimTotal;
            }
        });
        showAlert('Sukses', `Të dhënat për "${newName}" u përditësuan.`, 'success');
    } else { // Add mode
        if (state.punetoret.some(p => p.emri.toLowerCase() === newName.toLowerCase())) {
            return showAlert('Gabim', `Punëtori me emrin "${newName}" ekziston tashmë.`, 'error');
        }
        const newPunetor = {
            id: id(),
            emri: newName,
            pushimTotali: newPushimTotal,
            rroga: 0, dataPageses: null, oreShtese: 0, pagesaOreShtese: 0,
            mungesa: 0, pushime: [], pushimPerdorura: 0
        };
        state.punetoret.push(newPunetor);
        showAlert('Sukses', `Punëtori "${newName}" u shtua me sukses.`, 'success');
    }

    await saveItem('punetoret', state.punetoret);
    closeModal('punetorModal');
    refreshUI();
}

function openPaymentModal(latestPunetorId) {
    const latestPunetor = state.punetoret.find(p => p.id === latestPunetorId);
    if (!latestPunetor) return showAlert('Gabim', 'Punëtori nuk u gjet.', 'error');

    $('#paymentPunetorId').value = latestPunetorId;
    $('#paymentModalTitle').textContent = `Regjistro Pagesë për: ${latestPunetor.emri}`;

    $('#pRroga').value = latestPunetor.rroga || '';
    $('#pDataPageses').value = new Date().toISOString().slice(0, 10);
    $('#pOreShtese').value = '';
    $('#pPagesaOreShtese').value = '';
    $('#pMungesa').value = '';
    $('#pPushime').value = '';
    $('#pPushimPerdoruraMujore').value = '';

    openModal('paymentModal');
}

async function savePayment() {
    const latestPunetorId = $('#paymentPunetorId').value;
    const latestPunetor = state.punetoret.find(p => p.id === latestPunetorId);
    if (!latestPunetor) return showAlert('Gabim', 'Punëtori nuk u gjet.', 'error');
    
    const pushimKeteMuaj = Number($('#pPushimPerdoruraMujore').value || 0);

    const newPaymentRecord = {
        ...latestPunetor,
        id: id(),
        rroga: Number($('#pRroga').value || 0),
        dataPageses: $('#pDataPageses').value || '',
        oreShtese: Number($('#pOreShtese').value || 0),
        pagesaOreShtese: Number($('#pPagesaOreShtese').value || 0),
        mungesa: Number($('#pMungesa').value || 0),
        pushime: ($('#pPushime').value || '').split(',').map(s => s.trim()).filter(Boolean),
        pushimPerdorura: (latestPunetor.pushimPerdorura || 0) + pushimKeteMuaj,
    };

    if (!newPaymentRecord.dataPageses) {
        return showAlert('Gabim', 'Ju lutem zgjidhni datën e pagesës.', 'error');
    }

    state.punetoret.push(newPaymentRecord);
    await saveItem('punetoret', state.punetoret);
    closeModal('paymentModal');
    refreshUI();
    showAlert('Sukses', `Pagesa për ${latestPunetor.emri} u regjistrua.`, 'success');
}


function bindEvents() {
    // Window Controls
    document.getElementById('minimize-btn')?.addEventListener('click', () => {
        window.api.windowControls('minimize');
    });
    document.getElementById('maximize-btn')?.addEventListener('click', () => {
        window.api.windowControls('maximize');
    });
    document.getElementById('close-btn')?.addEventListener('click', () => {
        window.api.windowControls('close');
    });

    // Modals
    $('#closeAlert')?.addEventListener('click', hideAlert);
    alertOverlay?.addEventListener('click', hideAlert);

    // Punetor Modals
    $('#openAddPunetorModalBtn')?.addEventListener('click', () => openPunetorModal());
    $('#savePunetorBtn')?.addEventListener('click', savePunetor);
    $('#closePunetorModal')?.addEventListener('click', () => closeModal('punetorModal'));
    $('#punetorModalOverlay')?.addEventListener('click', () => closeModal('punetorModal'));
    
    // Payment Modal
    $('#savePaymentBtn')?.addEventListener('click', savePayment);
    $('#closePaymentModal')?.addEventListener('click', () => closeModal('paymentModal'));
    $('#paymentModalOverlay')?.addEventListener('click', () => closeModal('paymentModal'));

    // Theme Toggle
    themeToggle?.addEventListener('click', toggleTheme);
    
    // Sidebar nav
    $$('#menu .navlink').forEach(btn => btn.addEventListener('click', () => {
        setActiveRoute(btn.dataset.route);
        if(window.innerWidth < 768) {
            $('#toggleSidebar').click();
        }
    }));

    // Searches
    $('#globalSearch')?.addEventListener('input', ()=> {
        shpenzimeCurrentPage = 1;
        qarkullimiCurrentPage = 1;
        applyGlobalSearch();
    });
    
    // Qarkullimi Filters
    const qarkullimDateFilterInput = $('#qarkullimDateFilter');
    const qarkullimNenkategoriFilterInput = $('#qarkullimNenkategoriFilter');
    
    const applyQarkullimFilters = () => {
        qarkullimiCurrentPage = 1;
        renderTblQarkullimi($('#globalSearch').value);
    };

    qarkullimDateFilterInput?.addEventListener('input', applyQarkullimFilters);
    qarkullimNenkategoriFilterInput?.addEventListener('change', applyQarkullimFilters);

    $('#clearQarkullimFilters')?.addEventListener('click', () => {
        if (qarkullimDateFilterInput) qarkullimDateFilterInput.value = '';
        if (qarkullimNenkategoriFilterInput) qarkullimNenkategoriFilterInput.value = '';
        applyQarkullimFilters();
    });

    // Shpenzime Filters
    const shpenzimeDateFilterInput = $('#shpenzimeDateFilter');
    const shpenzimeFurnitorFilterInput = $('#shpenzimeFurnitorFilter');

    const applyShpenzimeFilters = () => {
        shpenzimeCurrentPage = 1;
        renderTblShpenzime($('#globalSearch').value);
    };

    shpenzimeDateFilterInput?.addEventListener('input', applyShpenzimeFilters);
    shpenzimeFurnitorFilterInput?.addEventListener('change', applyShpenzimeFilters);

    $('#clearShpenzimeFilters')?.addEventListener('click', () => {
        if (shpenzimeDateFilterInput) shpenzimeDateFilterInput.value = '';
        if (shpenzimeFurnitorFilterInput) shpenzimeFurnitorFilterInput.value = '';
        applyShpenzimeFilters();
    });

    // Backup & Restore
    $('#backupBtn')?.addEventListener('click', () => {
        if (!state) return showAlert('Kujdes', 'Nuk ka të dhëna për të eksportuar.', 'info');
        try {
            const dataStr = JSON.stringify(state, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `backup-paneli-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showAlert('Sukses', 'Backup u krijua dhe shkarkua me sukses.', 'success');
        } catch (err) {
            showAlert('Gabim', 'Ndodhi një gabim gjatë krijimit të backup-it.', 'error');
        }
    });

    $('#restoreInput')?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData && typeof importedData === 'object' && Object.keys(defaultsMap).every(key => key in importedData)) {
                    state = importedData;
                    await saveAll(state);
                    refreshUI();
                    showAlert('Sukses', 'Backup u importua me sukses. Aplikacioni do të rifreskohet.', 'success');
                } else {
                    throw new Error('Skedari i backup-it nuk është në formatin e duhur.');
                }
            } catch (err) {
                showAlert('Gabim', `Ndodhi një gabim gjatë leximit të skedarit: ${err.message}`, 'error');
            } finally {
                event.target.value = '';
            }
        };
        reader.onerror = () => {
            showAlert('Gabim', 'Nuk mund të lexohej skedari.', 'error');
            event.target.value = '';
        };
        reader.readAsText(file);
    });

    // Exports & Print - SHPENZIMET
    $('#exportShpenzimePdfBtn')?.addEventListener('click', () => {
        const selectedIds = $$('.shpenzim-checkbox:checked').map(cb => cb.dataset.id);
        let dataToExport;
        if (selectedIds.length > 0) {
            dataToExport = state.shpenzimet.filter(r => selectedIds.includes(r.id));
        } else {
            const q = ($('#globalSearch')?.value || '').toLowerCase();
            dataToExport = state.shpenzimet.filter(r => !q || Object.values(r).join(' ').toLowerCase().includes(q));
        }
        if (dataToExport.length === 0) return showAlert('Kujdes', 'Nuk ka të dhëna për të eksportuar.', 'info');
        const headers = ['Furnitori', 'Kategoria', 'Shuma (€)', 'Data', 'Shënimi'];
        const body = dataToExport.map(r => [r.furnitor, r.kategoria, r.shuma.toLocaleString('sq-AL',{minimumFractionDigits:2, maximumFractionDigits:2}), r.data, r.shenim || '']);
        exportToPdf('Raport i Shpenzimeve', headers, body, 'shpenzimet.pdf');
    });

    $('#exportShpenzimeXlsxBtn')?.addEventListener('click', () => {
        const selectedIds = $$('.shpenzim-checkbox:checked').map(cb => cb.dataset.id);
        let dataToExport;
        if (selectedIds.length > 0) {
            dataToExport = state.shpenzimet.filter(r => selectedIds.includes(r.id));
        } else {
            const q = ($('#globalSearch')?.value || '').toLowerCase();
            dataToExport = state.shpenzimet.filter(r => !q || Object.values(r).join(' ').toLowerCase().includes(q));
        }
        if (dataToExport.length === 0) return showAlert('Kujdes', 'Nuk ka të dhëna për të eksportuar.', 'info');
        const dataForSheet = dataToExport.map(r => ({'Furnitori': r.furnitor, 'Kategoria': r.kategoria, 'Shuma (€)': r.shuma, 'Data': r.data, 'Shënimi': r.shenim || ''}));
        exportToXlsx(dataForSheet, 'shpenzimet.xlsx');
    });
    
    $('#printShpenzimeBtn')?.addEventListener('click', () => {
        const selectedIds = $$('.shpenzim-checkbox:checked').map(cb => cb.dataset.id);
        if (selectedIds.length === 0) {
            return showAlert('Kujdes', 'Ju lutem zgjidhni të paktën një faturë për të printuar.', 'info');
        }
        const selectedData = state.shpenzimet.filter(r => selectedIds.includes(r.id));
        
        const printArea = $('#print-area');
        const tableHeaders = `<th>Furnitori</th><th>Kategoria</th><th>Shuma</th><th>Data</th><th>Shënimi</th>`;
        const tableRows = selectedData.map(r => `
            <tr>
                <td>${r.furnitor}</td>
                <td>${r.kategoria}</td>
                <td>${fmt(r.shuma)}</td>
                <td>${r.data}</td>
                <td>${r.shenim || ''}</td>
            </tr>
        `).join('');
        
        printArea.innerHTML = `
            <h1 class="print-title">Raport i Shpenzimeve (Zgjedhur)</h1>
            <table class="print-table">
                <thead><tr>${tableHeaders}</tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
        window.print();
        printArea.innerHTML = '';
    });

    $('#selectAllShpenzime')?.addEventListener('change', (e) => {
        $$('.shpenzim-checkbox').forEach(cb => cb.checked = e.target.checked);
    });

    // Exports & Print - QARKULLIMI
    $('#exportQarkullimPdfBtn')?.addEventListener('click', () => {
        const selectedIds = $$('.qarkullim-checkbox:checked').map(cb => cb.dataset.id);
        let dataToExport;
        if (selectedIds.length > 0) {
            dataToExport = state.qarkullimi.filter(r => selectedIds.includes(r.id));
        } else {
            const q = ($('#globalSearch')?.value || '').toLowerCase();
            dataToExport = state.qarkullimi.filter(r => !q || Object.values(r).join(' ').toLowerCase().includes(q));
        }
        if (dataToExport.length === 0) return showAlert('Kujdes', 'Nuk ka të dhëna për të eksportuar.', 'info');
        const headers = ['Nënkategoria', 'Shuma (€)', 'Data', 'Punëtori', 'Shënimi'];
        const body = dataToExport.map(r => [r.nenkategoria, r.shuma.toLocaleString('sq-AL',{minimumFractionDigits:2, maximumFractionDigits:2}), r.data, r.punetori, r.shenim || '']);
        exportToPdf('Raport i Qarkullimit', headers, body, 'qarkullimi.pdf');
    });

    $('#exportQarkullimXlsxBtn')?.addEventListener('click', () => {
        const selectedIds = $$('.qarkullim-checkbox:checked').map(cb => cb.dataset.id);
        let dataToExport;
        if (selectedIds.length > 0) {
            dataToExport = state.qarkullimi.filter(r => selectedIds.includes(r.id));
        } else {
            const q = ($('#globalSearch')?.value || '').toLowerCase();
            dataToExport = state.qarkullimi.filter(r => !q || Object.values(r).join(' ').toLowerCase().includes(q));
        }
        if (dataToExport.length === 0) return showAlert('Kujdes', 'Nuk ka të dhëna për të eksportuar.', 'info');
        const dataForSheet = dataToExport.map(r => ({'Nënkategoria': r.nenkategoria, 'Shuma (€)': r.shuma, 'Data': r.data, 'Punëtori': r.punetori, 'Shënimi': r.shenim || ''}));
        exportToXlsx(dataForSheet, 'qarkullimi.xlsx');
    });

    $('#printQarkullimBtn')?.addEventListener('click', () => {
        const selectedIds = $$('.qarkullim-checkbox:checked').map(cb => cb.dataset.id);
        if (selectedIds.length === 0) {
            return showAlert('Kujdes', 'Ju lutem zgjidhni të paktën një hyrje për të printuar.', 'info');
        }
        const selectedData = state.qarkullimi.filter(r => selectedIds.includes(r.id));
        
        const printArea = $('#print-area');
        const tableHeaders = `<th>Nënkategoria</th><th>Shuma</th><th>Data</th><th>Punëtori</th><th>Shënimi</th>`;
        const tableRows = selectedData.map(r => `
            <tr>
                <td>${r.nenkategoria}</td>
                <td>${fmt(r.shuma)}</td>
                <td>${r.data}</td>
                <td>${r.punetori}</td>
                <td>${r.shenim || ''}</td>
            </tr>
        `).join('');
        
        printArea.innerHTML = `
            <h1 class="print-title">Raport i Qarkullimit (Zgjedhur)</h1>
            <table class="print-table">
                <thead><tr>${tableHeaders}</tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
        
        window.print();
        printArea.innerHTML = '';
    });

    $('#selectAllQarkullim')?.addEventListener('change', (e) => {
        $$('.qarkullim-checkbox').forEach(cb => cb.checked = e.target.checked);
    });

    // Exports & Print - PUNETORI
    $('#exportPunetoriPdfBtn')?.addEventListener('click', () => {
        const selectedNames = $$('.punetor-checkbox:checked').map(cb => cb.dataset.name);
        let dataToExport;
        if (selectedNames.length > 0) {
            dataToExport = state.punetoret.filter(p => selectedNames.includes(p.emri));
        } else {
            const q = ($('#globalSearch')?.value || '').toLowerCase();
            dataToExport = state.punetoret.filter(r => !q || Object.values(r).join(' ').toLowerCase().includes(q));
        }
        if (dataToExport.length === 0) return showAlert('Kujdes', 'Nuk ka punëtorë për të eksportuar.', 'info');
        const headers = ['Emri', 'Rroga (€)', 'Data Pagesës', 'Orë Shtesë', 'Pagesa Orë Shtesë (€)', 'Mungesa (ditë)'];
        const body = dataToExport.map(p => [p.emri, p.rroga, p.dataPageses, p.oreShtese, p.pagesaOreShtese, p.mungesa]);
        exportToPdf('Raport i Punëtorëve', headers, body, 'punetoret.pdf');
    });

    $('#exportPunetoriXlsxBtn')?.addEventListener('click', () => {
        const selectedNames = $$('.punetor-checkbox:checked').map(cb => cb.dataset.name);
        let dataToExport;
        if (selectedNames.length > 0) {
            dataToExport = state.punetoret.filter(p => selectedNames.includes(p.emri));
        } else {
            const q = ($('#globalSearch')?.value || '').toLowerCase();
            dataToExport = state.punetoret.filter(r => !q || Object.values(r).join(' ').toLowerCase().includes(q));
        }
        if (dataToExport.length === 0) return showAlert('Kujdes', 'Nuk ka punëtorë për të eksportuar.', 'info');
        const dataForSheet = dataToExport.map(p => ({
            'Emri': p.emri,
            'Rroga (€)': p.rroga,
            'Data e Pagesës': p.dataPageses,
            'Orë Shtesë': p.oreShtese,
            'Pagesa Orë Shtesë (€)': p.pagesaOreShtese,
            'Mungesa (ditë)': p.mungesa,
            'Pushimi Vjetor Total': p.pushimTotali,
            'Pushimi i Përdorur': p.pushimPerdorura
        }));
        exportToXlsx(dataForSheet, 'punetoret.xlsx');
    });

    $('#printPunetoriBtn')?.addEventListener('click', () => {
        const selectedNames = $$('.punetor-checkbox:checked').map(cb => cb.dataset.name);
        if (selectedNames.length === 0) return showAlert('Kujdes', 'Zgjidhni të paktën një punëtor për të printuar.', 'info');
        
        const punetoretByName = state.punetoret.reduce((acc, p) => {
            acc[p.emri] = acc[p.emri] || [];
            acc[p.emri].push(p);
            return acc;
        }, {});

        const latestPunetoret = Object.values(punetoretByName)
            .map(entries => entries.sort((a, b) => new Date(b.dataPageses) - new Date(a.dataPageses))[0])
            .filter(p => selectedNames.includes(p.emri));

        const printArea = $('#print-area');
        const tableHeaders = `<th>Emri</th><th>Rroga e fundit</th><th>Data</th><th>Pushimi (Përdorur/Total)</th>`;
        const tableRows = latestPunetoret.map(p => `
            <tr>
                <td>${p.emri}</td>
                <td>${fmt(p.rroga)}</td>
                <td>${p.dataPageses || '-'}</td>
                <td>${p.pushimPerdorura || 0}/${p.pushimTotali || 0}</td>
            </tr>`).join('');
        printArea.innerHTML = `
            <h1 class="print-title">Raport i Punëtorëve (Zgjedhur)</h1>
            <table class="print-table">
                <thead><tr>${tableHeaders}</tr></thead>
                <tbody>${tableRows}</tbody>
            </table>`;
        window.print();
        printArea.innerHTML = '';
    });


    $('#selectAllPunetore')?.addEventListener('change', (e) => {
        $$('.punetor-checkbox').forEach(cb => cb.checked = e.target.checked);
    });

    // Exports & Print - CUSTOM
    $('#exportCustomPdfBtn')?.addEventListener('click', () => {
        const selectedIds = $$('.custom-checkbox:checked').map(cb => cb.dataset.id);
        let dataToExport;
        if (selectedIds.length > 0) {
            dataToExport = state.custom.filter(c => selectedIds.includes(c.id));
        } else {
            const q = ($('#globalSearch')?.value || '').toLowerCase();
            dataToExport = state.custom.filter(r => !q || Object.values(r).join(' ').toLowerCase().includes(q));
        }
        if (dataToExport.length === 0) return showAlert('Kujdes', 'Nuk ka të dhëna për të eksportuar.', 'info');
        const headers = ['Titulli', 'Kategoria', 'Përshkrimi', 'Shuma (€)', 'Data'];
        const body = dataToExport.map(c => [c.titull, c.kategori, c.pershkrim, c.shuma ? c.shuma.toLocaleString('sq-AL',{minimumFractionDigits:2, maximumFractionDigits:2}) : '-', c.data]);
        exportToPdf('Raport i Kategorive Custom', headers, body, 'kategori-custom.pdf');
    });

    $('#exportCustomXlsxBtn')?.addEventListener('click', () => {
        const selectedIds = $$('.custom-checkbox:checked').map(cb => cb.dataset.id);
        let dataToExport;
        if (selectedIds.length > 0) {
            dataToExport = state.custom.filter(c => selectedIds.includes(c.id));
        } else {
            const q = ($('#globalSearch')?.value || '').toLowerCase();
            dataToExport = state.custom.filter(r => !q || Object.values(r).join(' ').toLowerCase().includes(q));
        }
        if (dataToExport.length === 0) return showAlert('Kujdes', 'Nuk ka të dhëna për të eksportuar.', 'info');
        const dataForSheet = dataToExport.map(c => ({
            'Titulli': c.titull,
            'Kategoria': c.kategori,
            'Përshkrimi': c.pershkrim,
            'Shuma (€)': c.shuma || 0,
            'Data': c.data
        }));
        exportToXlsx(dataForSheet, 'kategori-custom.xlsx');
    });

    $('#printCustomBtn')?.addEventListener('click', () => {
        const selectedIds = $$('.custom-checkbox:checked').map(cb => cb.dataset.id);
        if (selectedIds.length === 0) return showAlert('Kujdes', 'Zgjidhni të paktën një njësi për të printuar.', 'info');
        const selectedData = state.custom.filter(c => selectedIds.includes(c.id));
        const printArea = $('#print-area');
        const tableHeaders = `<th>Titulli</th><th>Kategoria</th><th>Përshkrimi</th><th>Shuma</th><th>Data</th>`;
        const tableRows = selectedData.map(c => `
            <tr>
                <td>${c.titull}</td>
                <td>${c.kategori}</td>
                <td>${c.pershkrim || '-'}</td>
                <td>${c.shuma ? fmt(c.shuma) : '-'}</td>
                <td>${c.data || '-'}</td>
            </tr>`).join('');
        printArea.innerHTML = `
            <h1 class="print-title">Raport i Kategorive Custom (Zgjedhur)</h1>
            <table class="print-table">
                <thead><tr>${tableHeaders}</tr></thead>
                <tbody>${tableRows}</tbody>
            </table>`;
        window.print();
        printArea.innerHTML = '';
    });

    $('#selectAllCustom')?.addEventListener('change', (e) => {
        $$('.custom-checkbox').forEach(cb => cb.checked = e.target.checked);
    });

    // Furnitor
    $('#addFurnitorBtn')?.addEventListener('click', async () => {
        const v = ($('#furnitorEmri').value || '').trim();
        if (!v) return showAlert('Gabim', 'Ju lutem shkruani emrin e furnitorit.', 'error');
        if (state.furnitoret.includes(v)) {
            return showAlert('Kujdes', 'Ky furnitor ekziston tashmë në listë.', 'info');
        }
        state.furnitoret.push(v);
        $('#furnitorEmri').value = '';
        await saveItem('furnitoret', state.furnitoret);
        refreshUI();
        showAlert('Sukses', `Furnitori "${v}" u shtua me sukses.`, 'success');
    });

     // Shpenzime Kategori
    $('#addShpenzimKategoriBtn')?.addEventListener('click', async () => {
        const v = ($('#shpenzimKategoriEmri').value || '').trim().toLowerCase();
        if (!v) return showAlert('Gabim', 'Ju lutem shkruani emrin e kategorisë.', 'error');
        if (state.shpenzimeKategorite.includes(v)) {
            return showAlert('Kujdes', `Kategoria "${v}" ekziston tashmë.`, 'info');
        }
        state.shpenzimeKategorite.push(v);
        $('#shpenzimKategoriEmri').value = ''; 
        await saveItem('shpenzimeKategorite', state.shpenzimeKategorite); 
        refreshUI();
        showAlert('Sukses', `Kategoria "${v}" u shtua me sukses.`, 'success');
    });

    // Shpenzime
    $('#addShpenzimBtn')?.addEventListener('click', async () => {
        const obj = { id: id(), furnitor: $('#shpFurnitor').value, shuma: Number($('#shpShuma').value || 0), data: $('#shpData').value || '', shenim: $('#shpShenim').value || '', kategoria: $('#shpKategoria').value };
        if (!obj.furnitor) return showAlert('Gabim', 'Ju lutem zgjidhni një furnitor.', 'error');
        if (!obj.kategoria) return showAlert('Gabim', 'Ju lutem zgjidhni një kategori.', 'error');
        if (!obj.data) return showAlert('Gabim', 'Ju lutem zgjidhni datën.', 'error');
        if (obj.shuma <= 0) return showAlert('Gabim', 'Shuma duhet të jetë më e madhe se zero.', 'error');
        state.shpenzimet.push(obj); $('#shpShuma').value = ''; $('#shpShenim').value = ''; await saveItem('shpenzimet', state.shpenzimet); refreshUI();
    });

    // Nënkategori
    $('#addNenkategoriBtn')?.addEventListener('click', async () => {
        const v = ($('#nkEmri').value || '').trim(); 
        if (!v) return showAlert('Gabim', 'Ju lutem shkruani emrin e nënkategorisë.', 'error');
        if (state.nenkategorite.includes(v)) {
            return showAlert('Kujdes', `Nënkategoria "${v}" ekziston tashmë.`, 'info');
        }
        state.nenkategorite.push(v);
        $('#nkEmri').value = ''; 
        await saveItem('nenkategorite', state.nenkategorite); 
        refreshUI();
    });

    // Qarkullim
    $('#addQarkullimBtn')?.addEventListener('click', async () => {
        const obj = { id: id(), nenkategoria: $('#qNenkategoria').value, shuma: Number($('#qShuma').value || 0), data: $('#qData').value || '', punetori: $('#qPunetori').value || '', shenim: $('#qShenim').value || '' };
        if (!obj.nenkategoria) return showAlert('Gabim', 'Zgjidhni një nënkategori.', 'error');
        if (!obj.data) return showAlert('Gabim', 'Zgjidhni datën.', 'error');
        if (obj.shuma <= 0) return showAlert('Gabim', 'Shuma duhet të jetë më e madhe se zero.', 'error');
        state.qarkullimi.push(obj); $('#qShuma').value = ''; $('#qPunetori').value = ''; $('#qShenim').value = ''; await saveItem('qarkullimi', state.qarkullimi); refreshUI();
    });

    // Custom Category Type
    $('#addCustomCategoryBtn')?.addEventListener('click', async () => {
        const name = ($('#cKategoriEmri').value || '').trim();
        if (!name) return showAlert('Gabim', 'Ju lutem shkruani emrin e llojit të kategorisë.', 'error');
        if (state.customCategories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            return showAlert('Kujdes', `Lloji i kategorisë "${name}" ekziston tashmë.`, 'info');
        }
        const fields = {
            pershkrim: $('#cFushePershkrim').checked,
            shuma: $('#cFusheShuma').checked,
            data: $('#cFusheData').checked,
            ikona: $('#cFusheIkona').checked,
        };
        state.customCategories.push({ name, fields });
        await saveItem('customCategories', state.customCategories);
        
        $('#cKategoriEmri').value = '';
        $('#cFushePershkrim').checked = false;
        $('#cFusheShuma').checked = false;
        $('#cFusheData').checked = false;
        $('#cFusheIkona').checked = false;

        refreshUI();
        showAlert('Sukses', `Lloji i kategorisë "${name}" u shtua.`, 'success');
    });

    // Custom Item
    $('#addCustomBtn')?.addEventListener('click', async () => {
        const kategori = $('#cKategoriSelect').value;
        if (!kategori) return showAlert('Gabim', 'Ju lutem zgjidhni një lloj kategorie.', 'error');
        
        const titull = ($('#cTitull').value || '').trim();
        if (!titull) return showAlert('Gabim', 'Ju lutem shkruani titullin.', 'error');

        const categoryDef = state.customCategories.find(c => c.name === kategori);
        if (!categoryDef) return showAlert('Gabim', 'Lloji i kategorisë nuk u gjet.', 'error');

        const obj = { id: id(), kategori, titull };
        
        if (categoryDef.fields.pershkrim) obj.pershkrim = $('#cPershkrim').value || '';
        if (categoryDef.fields.shuma) obj.shuma = Number($('#cShuma').value || 0) || null;
        if (categoryDef.fields.data) obj.data = $('#cData').value || '';
        if (categoryDef.fields.ikona) obj.ikona = ($('#cIkona').value || '').trim() || 'star';

        state.custom.push(obj); 
        
        $('#cKategoriSelect').value = '';
        $('#cTitull').value = '';
        $('#cPershkrim').value = '';
        $('#cShuma').value = '';
        $('#cData').value = '';
        $('#cIkona').value = '';
        updateCustomFormFields();
        
        await saveItem('custom', state.custom); 
        refreshUI();
    });
    
    // Inventar
    $('#addInventarBtn')?.addEventListener('click', async () => {
        const produkti = ($('#invProdukti').value || '').trim();
        const sasia = Number($('#invSasia').value || 0);
        const shenim = ($('#invShenim').value || '').trim();
        const itemId = $('#invItemId').value;

        if (!produkti) return showAlert('Gabim', 'Ju lutem shkruani emrin e produktit.', 'error');
        
        if (itemId) { // Update existing item
            const item = state.inventari.find(i => i.id === itemId);
            if(item) {
                item.produkti = produkti;
                item.sasia = sasia;
                item.shenim = shenim;
            }
        } else { // Add new item
             state.inventari.push({ id: id(), produkti, sasia, shenim });
        }
        
        await saveItem('inventari', state.inventari);
        $('#clearInventarForm').click();
        refreshUI();
    });
    $('#clearInventarForm')?.addEventListener('click', () => {
        $('#invItemId').value = '';
        $('#invProdukti').value = '';
        $('#invSasia').value = '';
        $('#invShenim').value = '';
    });


    // Settings
    $('#changeDataDir')?.addEventListener('click', async () => {
        const cfg = await window.api.chooseDataDir();
        showAlert('Sukses', 'Folderi i të dhënave u ndryshua në: ' + cfg.dataDir + ". Ju lutem rinisni aplikacionin.", 'success');
    });

    // Kalkulator
    $('#openCalculator')?.addEventListener('click', () => openCalc(''));
    $$('.calc-btn').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openCalc(btn.dataset.target || '')
    }));
    $('#closeCalculator')?.addEventListener('click', closeCalc);
    $$('#calculatorModal .key').forEach(k => k.addEventListener('click', () => {
        const d = $('#calcDisplay'); const v = k.textContent.trim();
        if (v === 'C') d.value = ''; else if (v === '÷') d.value += '/'; else if (v === '×') d.value += '*';
        else if (v === '=') { try { const safe = d.value.replace(/[^0-9+\-*/().]/g, ''); d.value = Function('"use strict";return(' + (safe || 0) + ')')(); } catch { d.value = 'Error'; } }
        else d.value += v;
    }));
    $('#useCalcValue')?.addEventListener('click', () => { if (calcTargetInput) { calcTargetInput.value = $('#calcDisplay').value; } closeCalc(); });

    // Sidebar mobile
    const sidebar = $('#sidebar'); const overlay = $('#overlay');
    $('#toggleSidebar')?.addEventListener('click', () => {
        const open = sidebar.classList.contains('translate-x-0');
        sidebar.classList.toggle('-translate-x-full', open);
        sidebar.classList.toggle('translate-x-0', !open);
        overlay.classList.toggle('hidden', open);
    });
    overlay?.addEventListener('click', () => { $('#toggleSidebar').click(); });
}

function openCalc(targetId) { calcTargetInput = document.getElementById(targetId); $('#calcDisplay').value = calcTargetInput?.value || ''; openModal('calculatorModal'); }
function closeCalc() { closeModal('calculatorModal'); }

async function bootstrap() {
    // Initial theme setup
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    // =================================================================
    // SHTUAR: KODI I RI PËR NJOFTIMET E PËRDITËSIMIT
    // =================================================================
    let updateToastId = null;

    window.api.onUpdaterEvent('update-available', (version) => {
        updateToastId = showNotification({
            icon: 'download-cloud',
            title: `Përditësim i ri: v${version}`,
            message: 'Një version i ri është i disponueshëm dhe po shkarkohet në sfond.',
            duration: 10000 
        });
    });

    window.api.onUpdaterEvent('download-progress', (progressObj) => {
        if (!updateToastId || !document.getElementById(updateToastId)) {
            updateToastId = showNotification({
                icon: 'download-cloud',
                title: 'Po shkarkohet përditësimi...',
                message: `Shkarkuar ${Math.round(progressObj.percent)}%`,
                progress: true,
            });
        }
        const progressBar = $(`#progress-${updateToastId}`);
        if (progressBar) {
            progressBar.style.width = `${progressObj.percent}%`;
            const messageEl = progressBar.closest('.toast-notification').querySelector('p');
            if (messageEl) {
                messageEl.textContent = `Shkarkuar ${Math.round(progressObj.percent)}%`;
            }
        }
    });

    window.api.onUpdaterEvent('update-downloaded', () => {
        if (updateToastId && document.getElementById(updateToastId)) {
            document.getElementById(updateToastId).remove();
        }

        showNotification({
            icon: 'party-popper',
            title: 'Përditësimi Gati për Instalim!',
            message: 'Versioni i ri u shkarkua. Rinisni aplikacionin për ta instaluar.',
            actions: `<button class="btn btn-primary btn-sm" onclick="window.api.restartApp()">Rinis Tani</button>`
        });
    });
    
    window.api.onUpdaterEvent('update-error', (errorMessage) => {
        showAlert('Gabim Përditësimi', `Ndodhi një gabim gjatë procesit të përditësimit:\n\n${errorMessage}`, 'error');
    });
    // =================================================================
    // FUNDI I KODIT TË RI
    // =================================================================

    window.api.onDataDirReady(async (_dir) => {
        state = await loadAll();
        if (!state.shpenzimeKategorite || !Array.isArray(state.shpenzimeKategorite)) {
            state.shpenzimeKategorite = ['fature', 'karburant', 'material', 'pajisje'];
        }
        if (!state.customCategories || !Array.isArray(state.customCategories)) {
            state.customCategories = [];
        }
        if (!state.inventari || !Array.isArray(state.inventari)) {
            state.inventari = [];
        }
        refreshUI();
        bindEvents();
    });
}

document.addEventListener('DOMContentLoaded', bootstrap);


function searchAll(q) {
  const qq = (q || '').toLowerCase();
  if (!qq) return { shpenzimet:[], qarkullimi:[], punetori:[], custom:[], inventari: [] };
  const inObj = (o) => Object.values(o).join(' ').toLowerCase().includes(qq);
  
  const punetoretByName = state.punetoret.reduce((acc, p) => {
      acc[p.emri] = p; 
      return acc;
  }, {});
  const uniquePunetoret = Object.values(punetoretByName);

  return {
    shpenzimet: state.shpenzimet.filter(inObj),
    qarkullimi: state.qarkullimi.filter(inObj),
    punetori:   uniquePunetoret.filter(inObj),
    custom:     state.custom.filter(inObj),
    inventari:  state.inventari.filter(inObj),
  };
}

function renderSearchResultsDropdown(results, q) {
  const box = document.getElementById('searchResults');
  if (!box) return;

  const count =
    results.shpenzimet.length + results.qarkullimi.length +
    results.punetori.length + results.custom.length + results.inventari.length;

  if (!q || count === 0) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }

  const limit = 5;
  const section = (title, items, toRoute, formatRow) => items.length ? `
    <div class="p-2 border-b border-slate-100 dark:border-slate-800">
      <div class="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400 mb-1">${title} • ${items.length}</div>
      <div class="space-y-0.5">
        ${items.slice(0, limit).map(it => `
          <button class="w-full text-left px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm"
                  data-open-route="${toRoute}">
            ${formatRow(it)}
          </button>`).join('')}
      </div>
    </div>` : '';

  box.innerHTML = [
    section('Shpenzimet', results.shpenzimet, 'shpenzimet', r => `${r.furnitor} — ${r.kategoria} • ${fmt(r.shuma)} • ${r.data}`),
    section('Qarkullimi', results.qarkullimi, 'qarkullimi', r => `${r.nenkategoria} • ${fmt(r.shuma)} • ${r.data} • ${r.punetori||''}`),
    section('Punëtori',   results.punetori,   'punetori',   p => `${p.emri}`),
    section('Custom',     results.custom,     'custom',     c => `${c.titull} • ${c.data||''} ${c.shuma ? ('• '+fmt(c.shuma)) : ''}`),
    section('Inventari',  results.inventari,  'inventari',  i => `${i.produkti} • Sasia: ${i.sasia}`)
  ].join('');

  box.classList.remove('hidden');

  box.querySelectorAll('[data-open-route]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      setActiveRoute(btn.dataset.openRoute);
      document.getElementById('searchResults')?.classList.add('hidden');
    });
  });

  const onDocClick = (e) => {
    const wrap = document.querySelector('.relative.flex-1');
    if (!wrap || !wrap.contains(e.target)) {
      box.classList.add('hidden');
      document.removeEventListener('click', onDocClick, true);
    }
  };
  setTimeout(() => document.addEventListener('click', onDocClick, true), 0);
}