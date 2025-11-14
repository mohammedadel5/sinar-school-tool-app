import { showToast, confirmDialog } from './ui.js';
export function initSalariesSection({ qs, qsa }) {
  const salariesTableBody = qs('#salaries-table tbody');
  const section = qs('#salaries');
  const printBtn = qs('#btn-print-salaries');

  function loadSalaries() {
    const rows = window.api.listSalaries();
    salariesTableBody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.id}</td>
        <td>${r.staff_name}</td>
        <td>${r.position || ''}</td>
        <td>${r.contract_type || ''}</td>
        <td>${Number(r.amount || 0).toFixed(2)}</td>
        <td>${r.date ? String(r.date).slice(0,10) : ''}</td>
        <td class="actions-col"><button data-id="${r.id}" class="del-salary">حذف</button></td>
      </tr>
    `).join('');
    // totals row
    const total = (rows || []).reduce((a, r) => a + (Number(r.amount) || 0), 0);
    const table = section.querySelector('table');
    let tf = table.querySelector('tfoot');
    if (!tf) { tf = document.createElement('tfoot'); table.appendChild(tf); }
    tf.innerHTML = `<tr><td colspan="4">المجموع</td><td>${total.toFixed(2)}</td><td></td><td class="actions-col"></td></tr>`;
    qsa('.del-salary', salariesTableBody).forEach(btn => btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      if (!id) return;
      const ok = await confirmDialog('هل تريد حذف هذا السجل؟');
      if (!ok) return;
      window.api.deleteSalary(id);
      showToast('تم حذف السجل', 'success');
      loadSalaries();
    }));
  }

  const form = qs('#salary-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    data.amount = parseFloat(data.amount);
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) { showToast('المبلغ غير صالح', 'warning'); return; }
    window.api.addSalary(data);
    e.currentTarget.reset();
    showToast('تمت إضافة الراتب', 'success');
    loadSalaries();
  });

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      // Ensure print header exists
      let ph = section.querySelector('.print-header');
      if (!ph) {
        ph = document.createElement('div');
        ph.className = 'print-header';
        section.insertBefore(ph, section.querySelector('table'));
      }
      const orgName = (window.api.getSetting && window.api.getSetting('school_name')) || (document.querySelector('header h1')?.textContent || 'نظام المالية للمدارس').trim();
      const today = new Date().toLocaleDateString('ar-IQ');
      ph.innerHTML = `
        <div class="ph-row three">
          <div class="ph-left"><span class="ph-org">${orgName}</span></div>
          <div class="ph-title">كشف الرواتب</div>
          <div class="ph-date">${today}</div>
        </div>`;
      window.print();
    });
  }

  // initial
  loadSalaries();
}
