import { showToast, confirmDialog } from './ui.js';
export function initExpensesSection({ qs, qsa }) {
  const expensesTableBody = qs('#expenses-table tbody');
  const section = qs('#expenses');
  const printBtn = qs('#btn-print-expenses');

  function loadExpenses() {
    const exps = window.api.listExpenses();
    expensesTableBody.innerHTML = exps.map(x => `
      <tr>
        <td>${x.id}</td>
        <td>${x.description || ''}</td>
        <td>${x.expense_category || ''}</td>
        <td>${Number(x.amount || 0).toFixed(2)}</td>
        <td>${x.date ? String(x.date).slice(0,10) : ''}</td>
        <td class="actions-col"><button data-id="${x.id}" class="del-expense">حذف</button></td>
      </tr>
    `).join('');
    // totals row
    const total = (exps || []).reduce((a, r) => a + (Number(r.amount) || 0), 0);
    const table = section.querySelector('table');
    let tf = table.querySelector('tfoot');
    if (!tf) { tf = document.createElement('tfoot'); table.appendChild(tf); }
    tf.innerHTML = `<tr><td colspan="3">المجموع</td><td>${total.toFixed(2)}</td><td></td><td class="actions-col"></td></tr>`;
    qsa('.del-expense', expensesTableBody).forEach(btn => btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      if (!id) return;
      const ok = await confirmDialog('هل تريد حذف هذا السجل؟');
      if (!ok) return;
      window.api.deleteExpense(id);
      showToast('تم حذف السجل', 'success');
      loadExpenses();
    }));
  }

  const form = qs('#expense-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    data.amount = parseFloat(data.amount);
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) { showToast('المبلغ غير صالح', 'warning'); return; }
    window.api.addExpense(data);
    e.currentTarget.reset();
    showToast('تمت إضافة المصروف', 'success');
    loadExpenses();
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
          <div class="ph-title">كشف المصروفات</div>
          <div class="ph-date">${today}</div>
        </div>`;
      window.print();
    });
  }

  // initial
  loadExpenses();
}
