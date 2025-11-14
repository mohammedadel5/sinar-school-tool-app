export function initReportsSection({ qs }) {
  const output = qs('#report-output');
  const btnOutstanding = qs('#btn-outstanding');
  const btnPnl = qs('#btn-pnl');
  const btnExport = qs('#btn-export-report');
  const btnPrint = qs('#btn-print-report');

  let currentReport = { type: null, data: null };

  function fmt(num) { const n = Number(num||0); return n.toLocaleString('ar-IQ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function renderOutstanding() {
    const rows = window.api.reportOutstandingFees() || [];
    // Sort by outstanding desc
    rows.sort((a,b) => Number(b.outstanding||0) - Number(a.outstanding||0));
    const totals = rows.reduce((a,r) => {
      a.outstanding += Number(r.outstanding||0); return a;
    }, { outstanding: 0 });
    const html = [
      '<div class="print-header">',
      '  <div class="ph-row three">',
      `    <div class="ph-left"><span class="ph-org">${(window.api.getSetting && window.api.getSetting('school_name')) || (document.querySelector('header h1')?.textContent || '').trim()}</span></div>`,
      '    <div class="ph-title">تقرير الرسوم غير المسددة</div>',
      `    <div class="ph-date">${new Date().toLocaleDateString('ar-IQ')}</div>`,
      '  </div>',
      '</div>',
      '<table class="table">',
      '<thead><tr><th>رقم الطالب</th><th>اسم الطالب</th><th>المتبقي</th><th>عدد الأقساط المستحقة</th></tr></thead>',
      '<tbody>',
      ...rows.map(r => `
        <tr>
          <td>${r.student_id}</td>
          <td>${r.name || ''}</td>
          <td>${fmt(r.outstanding)}</td>
          <td>${r.installments_due || 0}</td>
        </tr>`),
      '</tbody>',
      `<tfoot><tr><td colspan="2">المجموع</td><td>${fmt(totals.outstanding)}</td><td></td></tr></tfoot>`,
      '</table>'
    ].join('');
    output.innerHTML = html;
    currentReport = { type: 'outstanding', data: rows };
  }

  function renderPnl() {
    const res = window.api.reportIncomeVsExpenses() || { income: 0, expenses: 0, profit: 0 };
    const html = [
      '<div class="print-header">',
      '  <div class="ph-row three">',
      `    <div class="ph-left"><span class="ph-org">${(window.api.getSetting && window.api.getSetting('school_name')) || (document.querySelector('header h1')?.textContent || '').trim()}</span></div>`,
      '    <div class="ph-title">تقرير الدخل مقابل المصروف</div>',
      `    <div class="ph-date">${new Date().toLocaleDateString('ar-IQ')}</div>`,
      '  </div>',
      '</div>',
      '<table class="table">',
      `<tr><td>الدخل</td><td>${fmt(res.income)}</td></tr>`,
      `<tr><td>المصروف</td><td>${fmt(res.expenses)}</td></tr>`,
      `<tr><td>الربح</td><td>${fmt(res.profit)}</td></tr>`,
      '</table>'
    ].join('');
    output.innerHTML = html;
    currentReport = { type: 'pnl', data: res };
  }

  function toCsv() {
    if (currentReport.type === 'outstanding') {
      const rows = currentReport.data || [];
      const header = ['student_id','name','outstanding','installments_due'];
      const lines = [header.join(',')].concat(rows.map(r => [r.student_id, JSON.stringify(r.name||''), Number(r.outstanding||0), r.installments_due||0].join(',')));
      return lines.join('\n');
    } else if (currentReport.type === 'pnl') {
      const r = currentReport.data || { income:0, expenses:0, profit:0 };
      return ['metric,value','income,'+r.income,'expenses,'+r.expenses,'profit,'+r.profit].join('\n');
    }
    return '';
  }

  function downloadCsv() {
    const csv = toCsv();
    if (!csv) { alert('لا يوجد تقرير للتصدير'); return; }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = currentReport.type === 'outstanding' ? 'outstanding' : 'pnl';
    a.download = `${base}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function printReport() {
    if (!currentReport.type) { alert('اعرض تقريراً أولاً'); return; }
    window.print();
  }

  if (btnOutstanding) btnOutstanding.addEventListener('click', renderOutstanding);
  if (btnPnl) btnPnl.addEventListener('click', renderPnl);
  if (btnExport) btnExport.addEventListener('click', downloadCsv);
  if (btnPrint) btnPrint.addEventListener('click', printReport);
}
