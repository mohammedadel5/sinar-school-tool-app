import { showToast, confirmDialog } from './ui.js';
export function initIncomeSection({ qs }) {
  const form = qs('#income-form');
  const list = qs('#income-list');
  const printBtn = qs('#btn-print-income');
  const section = qs('#income');

  function render() {
    const rows = (window.api.listIncomes && window.api.listIncomes()) || [];
    list.innerHTML = rows.map(r => `
      <tr>
        <td>${r.id}</td>
        <td>${r.description || ''}</td>
        <td>${r.income_category || ''}</td>
        <td>${Number(r.amount || 0).toFixed(2)}</td>
        <td>${r.date ? String(r.date).slice(0,10) : ''}</td>
        <td class="actions-col"><button data-id="${r.id}" class="btn-del">حذف</button></td>
      </tr>
    `).join('');
    // totals row
    const total = rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
    const table = section.querySelector('table');
    let tf = table.querySelector('tfoot');
    if (!tf) { tf = document.createElement('tfoot'); table.appendChild(tf); }
    tf.innerHTML = `<tr><td colspan="3">المجموع</td><td>${total.toFixed(2)}</td><td></td><td class="actions-col"></td></tr>`;
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      data.amount = parseFloat(data.amount);
      if (!data.amount || isNaN(data.amount) || data.amount <= 0) { showToast('المبلغ غير صالح', 'warning'); return; }
      window.api.addIncome(data);
      form.reset();
      showToast('تمت إضافة الإيراد', 'success');
      render();
    });
  }

  if (list) {
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('button.btn-del');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      if (!id) return;
      (async () => {
        const ok = await confirmDialog('هل تريد حذف هذا السجل؟');
        if (!ok) return;
        window.api.deleteIncome(id);
        showToast('تم حذف السجل', 'success');
        render();
      })();
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      // Ensure a print header exists/updated
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
          <div class="ph-title">كشف الإيرادات</div>
          <div class="ph-date">${today}</div>
        </div>`;
      window.print();
    });
  }

  // initial
  render();
}
