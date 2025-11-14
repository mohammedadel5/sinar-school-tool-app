import { showToast, confirmDialog } from './ui.js';

export function initSubjectsSection({ qs, qsa }) {
  const tableBody = qs('#subjects-table tbody');
  const form = qs('#subject-form');
  const datalist = document.getElementById('subjects-list');

  let cache = [];
  let editingId = null;

  function updateDatalist() {
    if (!datalist) return;
    datalist.innerHTML = (cache || []).map(s => `<option value="${s.name}"></option>`).join('');
  }

  function loadSubjects() {
    cache = window.api.listSubjects() || [];
    render(cache);
    updateDatalist();
  }

  function render(rows) {
    tableBody.innerHTML = (rows || []).map(s => `
      <tr>
        <td>${s.id}</td>
        <td>${editingId === s.id ? `<input class="ed-name" value="${s.name || ''}">` : (s.name || '')}</td>
        <td>${editingId === s.id ? `<input class="ed-notes" value="${s.notes || ''}">` : (s.notes || '')}</td>
        <td>
          ${editingId === s.id
            ? `<button data-id="${s.id}" class="save-subject">حفظ</button>
               <button data-id="${s.id}" class="cancel-edit-subject">إلغاء</button>`
            : `<button data-id="${s.id}" class="edit-subject">تعديل</button>
               <button data-id="${s.id}" class="del-subject">حذف</button>`}
        </td>
      </tr>
    `).join('');

    // Edit
    qsa('.edit-subject', tableBody).forEach(btn => btn.addEventListener('click', () => {
      editingId = parseInt(btn.dataset.id);
      render(cache);
    }));

    // Cancel edit
    qsa('.cancel-edit-subject', tableBody).forEach(btn => btn.addEventListener('click', () => {
      editingId = null;
      render(cache);
    }));

    // Save edit
    qsa('.save-subject', tableBody).forEach(btn => btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      if (!id) return;
      const tr = btn.closest('tr');
      const nameVal = tr.querySelector('.ed-name')?.value.trim() || '';
      const notesVal = tr.querySelector('.ed-notes')?.value || '';
      if (!nameVal) { showToast('اسم المادة مطلوب', 'warning'); return; }
      try {
        window.api.updateSubject(id, { name: nameVal, notes: notesVal });
      } catch (err) {
        showToast('لا يمكن حفظ المادة (ربما الاسم مكرر)', 'error');
        return;
      }
      editingId = null;
      showToast('تم حفظ المادة', 'success');
      loadSubjects();
    }));

    // Delete
    qsa('.del-subject', tableBody).forEach(btn => btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      if (!id) return;
      const ok = await confirmDialog('سيتم حذف المادة. هل أنت متأكد؟');
      if (!ok) return;
      window.api.deleteSubject(id);
      showToast('تم حذف المادة', 'success');
      loadSubjects();
    }));
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const data = Object.fromEntries(fd.entries());
      const name = (data.name || '').trim();
      const notes = (data.notes || '').trim();
      if (!name) { showToast('اسم المادة مطلوب', 'warning'); return; }
      try {
        window.api.addSubject({ name, notes: notes || null });
      } catch (err) {
        showToast('هذه المادة موجودة بالفعل', 'error');
        return;
      }
      e.currentTarget.reset();
      showToast('تم إضافة المادة', 'success');
      loadSubjects();
    });
  }

  // initial
  loadSubjects();
}
