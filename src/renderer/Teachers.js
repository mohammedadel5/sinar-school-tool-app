import { showToast, confirmDialog } from './ui.js';

export function initTeachersSection({ qs, qsa }) {
  const teachersTableBody = qs('#teachers-table tbody');
  const searchInput = qs('#teacher-search');
  const form = qs('#teacher-form');

  let cache = [];
  let editingId = null;

  function loadTeachers() {
    cache = window.api.listTeachers() || [];
    render(cache);
  }

  function render(rows) {
    const statusLabel = (st) => ({ active: 'نشط', inactive: 'غير نشط' }[st] || (st || ''));
    teachersTableBody.innerHTML = (rows || []).map(t => `
      <tr>
        <td>${t.id}</td>
        <td>${editingId === t.id ? `<input class="ed-name" value="${t.name || ''}">` : (t.name || '')}</td>
        <td>${editingId === t.id ? `<input class="ed-subject" value="${t.subject || ''}">` : (t.subject || '')}</td>
        <td>${editingId === t.id ? `<input class="ed-phone" value="${t.phone || ''}">` : (t.phone || '')}</td>
        <td>${editingId === t.id
              ? `<select class="ed-status">
                   <option value="active" ${t.status === 'active' ? 'selected' : ''}>نشط</option>
                   <option value="inactive" ${t.status === 'inactive' ? 'selected' : ''}>غير نشط</option>
                 </select>`
              : statusLabel(t.status)}</td>
        <td>${editingId === t.id ? `<input type="date" class="ed-hire" value="${t.hire_date || ''}">` : (t.hire_date || '')}</td>
        <td>
          ${editingId === t.id
            ? `<button data-id="${t.id}" class="save-teacher">حفظ</button>
               <button data-id="${t.id}" class="cancel-edit">إلغاء</button>`
            : `<button data-id="${t.id}" class="edit-teacher">تعديل</button>
               <button data-id="${t.id}" class="del-teacher">حذف</button>`}
        </td>
      </tr>
    `).join('');

    // Delete with confirm
    qsa('.del-teacher', teachersTableBody).forEach(btn => btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      if (!id) return;
      const ok = await confirmDialog('سيتم حذف المعلم. هل أنت متأكد؟');
      if (!ok) return;
      window.api.deleteTeacher(id);
      showToast('تم حذف المعلم', 'success');
      loadTeachers();
    }));

    // Enter edit mode
    qsa('.edit-teacher', teachersTableBody).forEach(btn => btn.addEventListener('click', () => {
      editingId = parseInt(btn.dataset.id);
      render(cache);
    }));

    // Cancel edit
    qsa('.cancel-edit', teachersTableBody).forEach(btn => btn.addEventListener('click', () => {
      editingId = null;
      render(cache);
    }));

    // Save edit
    qsa('.save-teacher', teachersTableBody).forEach(btn => btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      if (!id) return;
      const tr = btn.closest('tr');
      const nameVal = tr.querySelector('.ed-name')?.value.trim() || '';
      const subjectVal = tr.querySelector('.ed-subject')?.value || '';
      const phoneVal = tr.querySelector('.ed-phone')?.value || '';
      const statusVal = tr.querySelector('.ed-status')?.value || '';
      const hireVal = tr.querySelector('.ed-hire')?.value || '';

      if (!nameVal) { showToast('الاسم مطلوب', 'warning'); return; }
      if (phoneVal && !/^\+?\d{7,15}$/.test(phoneVal.trim())) { showToast('صيغة هاتف غير صحيحة', 'warning'); return; }

      window.api.updateTeacher(id, {
        name: nameVal,
        subject: subjectVal,
        phone: phoneVal,
        status: statusVal || 'active',
        hire_date: hireVal
      });
      editingId = null;
      showToast('تم حفظ بيانات المعلم', 'success');
      loadTeachers();
    }));
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const data = Object.fromEntries(fd.entries());
      data.name = (data.name || '').trim();
      if (!data.name) { showToast('الاسم مطلوب', 'warning'); return; }
      if (data.phone && !/^\+?\d{7,15}$/.test(data.phone.trim())) { showToast('صيغة هاتف غير صحيحة', 'warning'); return; }
      window.api.addTeacher(data);
      e.currentTarget.reset();
      showToast('تم إضافة المعلم', 'success');
      loadTeachers();
    });
  }

  // Search by id, name, subject or phone
  if (searchInput) {
    const doFilter = () => {
      const q = (searchInput.value || '').trim();
      if (!q) { render(cache); return; }
      const rows = cache.filter(t => {
        const idMatch = String(t.id).includes(q);
        const nameMatch = (t.name || '').includes(q);
        const subjMatch = (t.subject || '').includes(q);
        const phoneMatch = (t.phone || '').includes(q);
        return idMatch || nameMatch || subjMatch || phoneMatch;
      });
      render(rows);
    };
    searchInput.addEventListener('input', doFilter);
  }

  // initial
  loadTeachers();
}
