import { showToast, confirmDialog } from './ui.js';
export function initFeesSection({ qs }) {
  const form = qs('#fee-form');
  const studentIdInput = form.querySelector('[name="student_id"]');
  const listContainer = qs('#fees-list');
  const loadBtn = qs('#btn-load-fees');
  const printBtn = qs('#btn-print-fees');

  function renderFees(studentId) {
    if (!studentId || isNaN(studentId)) {
      const nameEl = qs('#student-name-text');
      if (nameEl) nameEl.textContent = '—';
      listContainer.innerHTML = '<em>أدخل رقم الطالب ثم اضغط عرض.</em>';
      return;
    }
    let rows = window.api.listFeesByStudent(Number(studentId));
    // Normalize types defensively
    rows = (rows || []).map(r => ({
      ...r,
      amount: Number(r.amount) || 0,
      paid: Number(r.paid) || 0,
      paid_amount: Number(r.paid_amount) || 0
    }));
    const students = (window.api.listStudents && window.api.listStudents()) || [];
    const studentRow = students.find(s => Number(s.id) === Number(studentId));
    const studentName = studentRow?.name || '';
    const nameEl = qs('#student-name-text');
    if (nameEl) nameEl.textContent = studentName || '—';
    if (!rows || rows.length === 0) {
      listContainer.innerHTML = '<em>لا توجد رسوم لهذا الطالب.</em>';
      return;
    }
    const totals = rows.reduce((a, f) => {
      a.total += f.amount;
      a.paid += f.paid_amount;
      return a;
    }, { total: 0, paid: 0 });
    const outstanding = Math.max(0, totals.total - totals.paid);
    const orgName = (window.api.getSetting && window.api.getSetting('school_name')) || (document.querySelector('header h1')?.textContent || 'نظام المالية للمدارس').trim();
    const logoData = (window.api.getSetting && window.api.getSetting('school_logo_dataurl')) || null;
    const today = new Date().toLocaleDateString('ar-IQ');
    const html = [
      // Print watermark (shown only in print via CSS)
      logoData ? `<div class="print-watermark"><img src="${logoData}" alt="" /></div>` : '',
      // Print-only header (hidden on screen via CSS)
      `<div class="print-header">
         <div class="ph-row three">
           <div class="ph-left">
             ${logoData ? `<img class=\"ph-logo\" src=\"${logoData}\" alt=\"\" />` : ''}
             <span class="ph-org">${orgName}</span>
           </div>
           <div class="ph-title">كشف رسوم الطالب</div>
           <div class="ph-date">${today}</div>
         </div>
         <div class="ph-meta">رقم الطالب: ${studentId} — اسم الطالب: ${studentName}</div>
       </div>`,
      `<div class="summary">المجموع: ${totals.total.toFixed(2)} | المدفوع: ${totals.paid.toFixed(2)} | المتبقي: ${outstanding.toFixed(2)}</div>`,
      '<table class="table">',
      '<thead><tr><th>#</th><th>النوع</th><th>رقم دفعة</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th><th>الاستحقاق</th><th>تاريخ الدفع</th><th>مدفوع</th><th class="actions-col">إجراءات</th></tr></thead>',
      '<tbody>',
      ...rows.map(f => `
        <tr>
          <td>${f.id}</td>
          <td>${f.fee_type || ''}</td>
          <td>${f.installment_no ?? ''}</td>
          <td>${f.amount.toFixed(2)}</td>
          <td>${f.paid_amount.toFixed(2)}</td>
          <td>${Math.max(0, f.amount - f.paid_amount).toFixed(2)}</td>
          <td>${f.due_date || ''}</td>
          <td>${f.payment_date || ''}</td>
          <td>${Number(f.paid) === 1 ? 'نعم' : 'لا'}</td>
          <td class="actions-col">
            <button data-action="toggle-paid" data-id="${f.id}" data-paid="${Number(f.paid) === 1 ? 1 : 0}">${Number(f.paid) === 1 ? 'إلغاء الدفع' : 'تحديد كمدفوع'}</button>
            <button data-action="delete" data-id="${f.id}">حذف</button>
            <button data-action="print-receipt" data-id="${f.id}">إيصال</button>
          </td>
        </tr>
      `),
      '</tbody></table>',
      '<div class="print-sign">',
      '  <div class="sign">',
      '    <div class="box">توقيع المحاسب</div>',
      '    <div class="box">توقيع ولي الأمر</div>',
      '  </div>',
      '  <div class="footer">تم إنشاء هذا الكشف بواسطة النظام.</div>',
      '</div>'
    ].join('');
    listContainer.innerHTML = html;
  }

  // Load button to fetch fees for current student ID
  if (loadBtn) {
    loadBtn.addEventListener('click', () => renderFees(Number(studentIdInput.value)));
  }
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      const studentId = Number(studentIdInput.value);
      if (!studentId || isNaN(studentId)) {
        showToast('أدخل رقم الطالب أولاً', 'warning');
        return;
      }
      // Ensure latest data is shown before printing
      renderFees(studentId);
      window.print();
    });
  }

  // Split into installments helper
  const splitBtn = qs('#btn-split-installments');
  if (splitBtn) {
    splitBtn.addEventListener('click', () => {
      const sid = Number(studentIdInput.value);
      if (!sid || isNaN(sid)) { alert('أدخل رقم الطالب أولاً'); return; }
      const totalEl = qs('[name="split_total_amount"]');
      const countEl = qs('[name="split_count"]');
      const firstDueEl = qs('[name="split_first_due"]');
      const intervalEl = qs('[name="split_interval_months"]');
      const feeTypeEl = form.querySelector('[name="fee_type"]');
      const total = Number(totalEl?.value || 0);
      const count = parseInt(countEl?.value || '0', 10);
      const interval = parseInt(intervalEl?.value || '1', 10) || 1;
      const firstDue = firstDueEl?.value || '';
      const feeType = feeTypeEl?.value || '';
      if (!total || total <= 0 || !count || count <= 0 || !firstDue) {
        alert('يرجى ملء إجمالي المبلغ، عدد الأقساط، وتاريخ أول استحقاق');
        return;
      }
      // Distribute amounts fairly so sum equals total
      const cents = Math.round(total * 100);
      const base = Math.floor(cents / count);
      let remainder = cents - base * count;
      const amounts = Array.from({ length: count }, (_, i) => {
        const add = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder -= 1;
        return (base + add) / 100;
      });
      // Date helper
      function addMonths(iso, m) {
        const d = new Date(iso);
        const day = d.getDate();
        d.setMonth(d.getMonth() + m);
        // Handle month overflow (e.g., Jan 31 -> Feb)
        if (d.getDate() !== day) d.setDate(0);
        return d.toISOString().slice(0, 10);
      }
      // Create rows
      amounts.forEach((amt, idx) => {
        const due = addMonths(firstDue, idx * interval);
        window.api.addFee({
          student_id: sid,
          fee_type: feeType,
          installment_no: idx + 1,
          amount: amt,
          due_date: due,
          paid: 0,
          payment_date: '',
          non_refundable: 0,
          paid_amount: 0
        });
      });
      // Refresh list and clear helper inputs
      renderFees(sid);
      if (totalEl) totalEl.value = '';
      if (countEl) countEl.value = '';
      if (firstDueEl) firstDueEl.value = '';
      if (intervalEl) intervalEl.value = '1';
    });
  }

  // Optional: auto-load when student id changes
  studentIdInput.addEventListener('change', () => renderFees(Number(studentIdInput.value)));
  // Live update student name display while typing
  studentIdInput.addEventListener('input', () => {
    const val = Number(studentIdInput.value);
    const nameEl = qs('#student-name-text');
    if (!val || isNaN(val)) { if (nameEl) nameEl.textContent = '—'; return; }
    const students = (window.api.listStudents && window.api.listStudents()) || [];
    const student = students.find(s => Number(s.id) === val);
    if (nameEl) nameEl.textContent = (student && student.name) ? student.name : '—';
  });

  // Actions: toggle paid/unpaid and delete
  listContainer.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (!id) return;
    try {
      if (btn.dataset.action === 'toggle-paid') {
        const currentlyPaid = btn.dataset.paid === '1';
        // Fetch the row to know amount
        const sid = Number(studentIdInput.value);
        const rows = window.api.listFeesByStudent(sid) || [];
        const feeRow = rows.find(r => Number(r.id) === id);
        const fullAmount = Number(feeRow?.amount) || 0;
        const updates = { paid: currentlyPaid ? 0 : 1 };
        if (updates.paid === 1) {
          updates.paid_amount = fullAmount;
          updates.payment_date = new Date().toISOString().slice(0, 10);
        } else {
          updates.paid_amount = 0;
          updates.payment_date = null;
        }
        window.api.updateFee(id, updates);
        renderFees(Number(studentIdInput.value));
      } else if (btn.dataset.action === 'delete') {
        const ok = await confirmDialog('هل أنت متأكد من الحذف؟');
        if (!ok) return;
        window.api.deleteFee(id);
        showToast('تم حذف السجل', 'success');
        renderFees(Number(studentIdInput.value));
      } else if (btn.dataset.action === 'print-receipt') {
        // Find the fee row data from current rendered rows by re-querying
        const sid = Number(studentIdInput.value);
        const rows = window.api.listFeesByStudent(sid) || [];
        const fee = rows.find(r => Number(r.id) === id);
        if (!fee) return;
        if (!fee.paid) {
          const proceed = await confirmDialog('هذا القسط غير محدد كمدفوع. هل تريد طباعة إيصال على أي حال؟');
          if (!proceed) return;
        }
        const orgName = (window.api.getSetting && window.api.getSetting('school_name')) || (document.querySelector('header h1')?.textContent || 'نظام المالية للمدارس').trim();
        const logoData = (window.api.getSetting && window.api.getSetting('school_logo_dataurl')) || null;
        const studentRow = (window.api.listStudents && (window.api.listStudents().find(s => Number(s.id) === sid))) || null;
        const studentName = studentRow?.name || '';
        const now = new Date();
        const today = now.toLocaleDateString('ar-IQ');
        const yyyymmdd = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
        const receiptNo = `S${sid}-F${fee.id}-${yyyymmdd}`;
        const receiptHtml = `<!doctype html>
          <html lang="ar" dir="rtl">
            <head>
              <meta charset="UTF-8" />
              <title>إيصال دفع</title>
              <style>
                body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Naskh Arabic UI", sans-serif; margin: 24px; }
                .header { text-align:center; margin-bottom:16px; }
                .topline { display:flex; align-items:center; gap:12px; }
                .topline img { width: 48px; height: 48px; object-fit: contain; }
                h1 { font-size: 20px; margin: 8px 0; text-align:center; }
                .meta { display:flex; gap:12px; justify-content:space-between; margin-top:8px; font-size: 13px; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                td { padding: 8px; border: 1px solid #ddd; }
                .sign { display:flex; justify-content:space-between; margin-top: 20px; }
                .sign .box { width: 45%; border:1px dashed #aaa; padding:12px; height: 80px; }
                .footer { margin-top: 12px; font-size: 12px; color: #555; text-align:center; }
                @media print { .no-print { display:none; } }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="topline" style="justify-content:space-between;">
                  <img src="${logoData || '../../build/icon.png'}" alt="logo" />
                  <div style="font-weight:600">${orgName}</div>
                  <div>${today}</div>
                </div>
                <h1>إيصال دفع</h1>
                <div class="meta">
                  <div>رقم الإيصال: ${receiptNo}</div>
                  <div></div>
                </div>
              </div>
              <table>
                <tr><td>رقم الطالب</td><td>${sid}</td></tr>
                <tr><td>اسم الطالب</td><td>${studentName}</td></tr>
                <tr><td>رقم القسط</td><td>${fee.id}</td></tr>
                <tr><td>نوع الرسم</td><td>${fee.fee_type || ''}</td></tr>
                <tr><td>رقم دفعة</td><td>${fee.installment_no ?? ''}</td></tr>
                <tr><td>المبلغ</td><td>${Number(fee.amount).toFixed(2)}</td></tr>
                <tr><td>المدفوع</td><td>${Number(fee.paid_amount || 0).toFixed(2)}</td></tr>
                <tr><td>المتبقي</td><td>${Math.max(0, Number(fee.amount) - Number(fee.paid_amount || 0)).toFixed(2)}</td></tr>
                <tr><td>تاريخ الاستحقاق</td><td>${fee.due_date || ''}</td></tr>
                <tr><td>تاريخ الدفع</td><td>${fee.payment_date || ''}</td></tr>
                <tr><td>مدفوع</td><td>${Number(fee.paid) === 1 ? 'نعم' : 'لا'}</td></tr>
              </table>
              <div class="sign">
                <div class="box">توقيع المحاسب</div>
                <div class="box">توقيع ولي الأمر</div>
              </div>
              <div class="footer">تم إنشاء هذا الإيصال بواسطة النظام.</div>
              <div class="no-print" style="margin-top:12px"><button onclick="window.print()">طباعة</button></div>
              <script>window.addEventListener('load', () => { window.print(); });</script>
            </body>
          </html>`;
        const w = window.open('', '_blank');
        if (w) {
          w.document.open();
          w.document.write(receiptHtml);
          w.document.close();
        }
      }
    } catch (err) {
      showToast('حدث خطأ أثناء تنفيذ العملية', 'error');
    }
  });

  // On submit, add fee and refresh list
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    data.student_id = parseInt(data.student_id);
    data.installment_no = data.installment_no ? parseInt(data.installment_no) : null;
    data.amount = parseFloat(data.amount);
    data.paid_amount = data.paid_amount ? parseFloat(data.paid_amount) : 0;
    data.non_refundable = form.querySelector('[name="non_refundable"]')?.checked ? 1 : 0;
    // Derive paid and payment_date from paid_amount vs amount
    if (data.paid_amount >= data.amount && data.amount > 0) {
      data.paid = 1;
      data.payment_date = new Date().toISOString().slice(0, 10);
      // Snap paid_amount to amount
      data.paid_amount = data.amount;
    } else if (data.paid_amount > 0) {
      data.paid = 0;
      data.payment_date = new Date().toISOString().slice(0, 10);
    } else {
      data.paid = 0;
      data.payment_date = '';
    }
    if (!data.student_id || isNaN(data.student_id)) { showToast('رقم الطالب غير صالح', 'warning'); return; }
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) { showToast('المبلغ غير صالح', 'warning'); return; }
    window.api.addFee(data);
    // keep student id to show list; clear other fields
    const keepId = studentIdInput.value;
    form.reset();
    studentIdInput.value = keepId;
    showToast('تمت إضافة الرسوم', 'success');
    renderFees(Number(keepId));
  });

  // Initial state
  renderFees(Number(studentIdInput.value));
  // Also set initial student name if any
  (function() {
    const val = Number(studentIdInput.value);
    const nameEl = qs('#student-name-text');
    if (!nameEl) return;
    if (!val || isNaN(val)) { nameEl.textContent = '—'; return; }
    const students = (window.api.listStudents && window.api.listStudents()) || [];
    const student = students.find(s => Number(s.id) === val);
    nameEl.textContent = (student && student.name) ? student.name : '—';
  })();
}
