import { showToast, confirmDialog } from './ui.js';
export function initStudentsSection({ qs, qsa }) {
  const studentsTableBody = qs('#students-table tbody');
  const searchInput = qs('#student-search');
  let cache = [];
  let editingId = null;

  function loadStudents() {
    cache = window.api.listStudents() || [];
    render(cache);
  }

  function render(rows) {
    const statusLabel = (st) => ({ active: 'نشط', graduated: 'متخرج', withdrawn: 'منسحب' }[st] || (st || ''));
    studentsTableBody.innerHTML = (rows || []).map(s => `
      <tr>
        <td>${s.id}</td>
        <td>${editingId === s.id ? `<input class="ed-name" value="${s.name || ''}">` : s.name}</td>
        <td>${editingId === s.id ? `<input class=\"ed-grade\" value=\"${s.grade || ''}\">` : (s.grade || '')}</td>
        <td>${editingId === s.id ? `<input class=\"ed-section\" value=\"${s.section || ''}\">` : (s.section || '')}</td>
        <td>${editingId === s.id ? `<input class=\"ed-phone\" value=\"${s.parent_phone || ''}\">` : (s.parent_phone || '')}</td>
        <td>${editingId === s.id
              ? `<select class=\"ed-status\">
                   <option value=\"active\" ${s.status === 'active' ? 'selected' : ''}>نشط</option>
                   <option value=\"graduated\" ${s.status === 'graduated' ? 'selected' : ''}>متخرج</option>
                   <option value=\"withdrawn\" ${s.status === 'withdrawn' ? 'selected' : ''}>منسحب</option>
                 </select>`
              : statusLabel(s.status)}</td>
        <td>${editingId === s.id ? `<input type=\"date\" class=\"ed-adm\" value=\"${s.admission_date || ''}\">` : (s.admission_date || '')}</td>
        <td>
          ${editingId === s.id
            ? `<button data-id="${s.id}" class="save-student">حفظ</button>
               <button data-id="${s.id}" class="cancel-edit">إلغاء</button>`
            : `<button data-id="${s.id}" class="edit-student">تعديل</button>
               <button data-id="${s.id}" class="del-student">حذف</button>`}
        </td>
      </tr>
    `).join('');
    // Wire delete with confirm
    qsa('.del-student', studentsTableBody).forEach(btn => btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      if (!id) return;
      const ok = await confirmDialog('سيتم حذف الطالب وجميع الرسوم المرتبطة. هل أنت متأكد؟');
      if (!ok) return;
      window.api.deleteStudent(id);
      showToast('تم حذف الطالب', 'success');
      loadStudents();
    }));
    // Enter edit mode
    qsa('.edit-student', studentsTableBody).forEach(btn => btn.addEventListener('click', () => {
      editingId = parseInt(btn.dataset.id);
      render(cache);
    }));
    // Cancel edit
    qsa('.cancel-edit', studentsTableBody).forEach(btn => btn.addEventListener('click', () => {
      editingId = null;
      render(cache);
    }));
    // Save edit
    qsa('.save-student', studentsTableBody).forEach(btn => btn.addEventListener('click', (e) => {
      const id = parseInt(btn.dataset.id);
      if (!id) return;
      const tr = btn.closest('tr');
      const nameVal = tr.querySelector('.ed-name')?.value.trim() || '';
      const gradeVal = tr.querySelector('.ed-grade')?.value || '';
      const sectionVal = tr.querySelector('.ed-section')?.value || '';
      const phoneVal = tr.querySelector('.ed-phone')?.value || '';
      const statusVal = tr.querySelector('.ed-status')?.value || '';
      const admVal = tr.querySelector('.ed-adm')?.value || '';
      if (!nameVal) { showToast('الاسم مطلوب', 'warning'); return; }
      if (phoneVal && !/^\+?\d{7,15}$/.test(phoneVal.trim())) { showToast('صيغة هاتف غير صحيحة', 'warning'); return; }
      window.api.updateStudent(id, { name: nameVal, grade: gradeVal, section: sectionVal, parent_phone: phoneVal, status: statusVal || 'active', admission_date: admVal });
      editingId = null;
      showToast('تم حفظ بيانات الطالب', 'success');
      loadStudents();
    }));
  }

  const form = qs('#student-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    // Basic validation
    data.name = (data.name || '').trim();
    if (!data.name) { showToast('الاسم مطلوب', 'warning'); return; }
    if (data.parent_phone && !/^\+?\d{7,15}$/.test(data.parent_phone.trim())) { showToast('صيغة هاتف غير صحيحة', 'warning'); return; }
    window.api.addStudent(data);
    e.currentTarget.reset();
    showToast('تم إضافة الطالب', 'success');
    loadStudents();
  });

  // Search by name or id or phone
  if (searchInput) {
    const doFilter = () => {
      const q = (searchInput.value || '').trim();
      if (!q) { render(cache); return; }
      const rows = cache.filter(s => {
        const idMatch = String(s.id).includes(q);
        const nameMatch = (s.name || '').includes(q);
        const phoneMatch = (s.parent_phone || '').includes(q);
        return idMatch || nameMatch || phoneMatch;
      });
      render(rows);
    };
    searchInput.addEventListener('input', doFilter);
  }

  // initial
  loadStudents();
}
