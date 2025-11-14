import { showToast, confirmDialog } from './ui.js';

export function initClassesSections({ qs, qsa }) {
  const classesTableBody = qs('#classes-table tbody');
  const sectionsTableBody = qs('#sections-table tbody');
  const classForm = qs('#class-form');
  const sectionForm = qs('#section-form');
  const selectedClassLabel = qs('#selected-class-label');

  let classCache = [];
  let sectionCache = [];
  let editingClassId = null;
  let editingSectionId = null;
  let selectedClassId = null;

  function describeClass(c) {
    if (!c) return 'لم يتم اختيار صف بعد.';
    const parts = [];
    if (c.stage) parts.push(c.stage);
    if (c.grade_label) parts.push(c.grade_label);
    if (c.branch) parts.push(`فرع ${c.branch}`);
    if (c.shift) parts.push(`دوام ${c.shift}`);
    return parts.join(' - ');
  }

  function loadClasses() {
    classCache = window.api.listClasses() || [];
    renderClasses(classCache);
    // If a class was selected before, try to keep selection
    if (selectedClassId) {
      const stillExists = classCache.find(c => c.id === selectedClassId);
      if (!stillExists) {
        selectedClassId = null;
        sectionCache = [];
        renderSections(sectionCache);
      } else {
        updateSelectedClassLabel();
        loadSectionsForSelected();
      }
    }
  }

  function loadSectionsForSelected() {
    if (!selectedClassId) {
      sectionCache = [];
      renderSections(sectionCache);
      return;
    }
    sectionCache = window.api.listSectionsByClass(selectedClassId) || [];
    renderSections(sectionCache);
  }

  function updateSelectedClassLabel() {
    const cls = classCache.find(c => c.id === selectedClassId);
    if (!cls) {
      if (selectedClassLabel) selectedClassLabel.textContent = 'لم يتم اختيار صف بعد.';
      return;
    }
    if (selectedClassLabel) selectedClassLabel.textContent = describeClass(cls);
  }

  function renderClasses(rows) {
    classesTableBody.innerHTML = (rows || []).map(c => `
      <tr data-id="${c.id}" class="${selectedClassId === c.id ? 'selected' : ''}">
        <td>${c.id}</td>
        <td>${editingClassId === c.id ? `
          <select class="ed-stage">
            <option value="ابتدائي" ${c.stage === 'ابتدائي' ? 'selected' : ''}>ابتدائي</option>
            <option value="متوسط" ${c.stage === 'متوسط' ? 'selected' : ''}>متوسط</option>
            <option value="إعدادي" ${c.stage === 'إعدادي' ? 'selected' : ''}>إعدادي</option>
            <option value="معهد" ${c.stage === 'معهد' ? 'selected' : ''}>معهد</option>
          </select>` : (c.stage || '')}
        </td>
        <td>${editingClassId === c.id ? `<input class="ed-grade" value="${c.grade_label || ''}">` : (c.grade_label || '')}</td>
        <td>${editingClassId === c.id ? `<input class="ed-branch" value="${c.branch || ''}">` : (c.branch || '')}</td>
        <td>${editingClassId === c.id ? `
          <select class="ed-shift">
            <option value="" ${!c.shift ? 'selected' : ''}>الدوام</option>
            <option value="صباحي" ${c.shift === 'صباحي' ? 'selected' : ''}>صباحي</option>
            <option value="مسائي" ${c.shift === 'مسائي' ? 'selected' : ''}>مسائي</option>
          </select>` : (c.shift || '')}
        </td>
        <td>
          ${editingClassId === c.id
            ? `<button data-id="${c.id}" class="save-class">حفظ</button>
               <button data-id="${c.id}" class="cancel-edit-class">إلغاء</button>`
            : `<button data-id="${c.id}" class="select-class">اختيار</button>
               <button data-id="${c.id}" class="edit-class">تعديل</button>
               <button data-id="${c.id}" class="del-class">حذف</button>`}
        </td>
      </tr>
    `).join('');

    // Wire buttons
    qsa('.select-class', classesTableBody).forEach(btn => btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      if (!id) return;
      selectedClassId = id;
      updateSelectedClassLabel();
      loadSectionsForSelected();
      renderClasses(classCache); // refresh selection highlight
    }));

    qsa('.edit-class', classesTableBody).forEach(btn => btn.addEventListener('click', () => {
      editingClassId = parseInt(btn.dataset.id);
      renderClasses(classCache);
    }));

    qsa('.cancel-edit-class', classesTableBody).forEach(btn => btn.addEventListener('click', () => {
      editingClassId = null;
      renderClasses(classCache);
    }));

    qsa('.save-class', classesTableBody).forEach(btn => btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      if (!id) return;
      const tr = btn.closest('tr');
      const stageVal = tr.querySelector('.ed-stage')?.value || '';
      const gradeVal = tr.querySelector('.ed-grade')?.value.trim() || '';
      const branchVal = tr.querySelector('.ed-branch')?.value || '';
      const shiftVal = tr.querySelector('.ed-shift')?.value || '';
      if (!stageVal) { showToast('المرحلة مطلوبة', 'warning'); return; }
      if (!gradeVal) { showToast('اسم الصف مطلوب', 'warning'); return; }
      window.api.updateClass(id, {
        stage: stageVal,
        grade_label: gradeVal,
        branch: branchVal,
        shift: shiftVal
      });
      editingClassId = null;
      showToast('تم حفظ بيانات الصف', 'success');
      loadClasses();
    }));

    qsa('.del-class', classesTableBody).forEach(btn => btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      if (!id) return;
      const ok = await confirmDialog('سيتم حذف الصف وجميع الشعب المرتبطة به. هل أنت متأكد؟');
      if (!ok) return;
      window.api.deleteClass(id);
      if (selectedClassId === id) {
        selectedClassId = null;
        updateSelectedClassLabel();
        sectionCache = [];
        renderSections(sectionCache);
      }
      showToast('تم حذف الصف', 'success');
      loadClasses();
    }));
  }

  function renderSections(rows) {
    sectionsTableBody.innerHTML = (rows || []).map(s => `
      <tr>
        <td>${s.id}</td>
        <td>${editingSectionId === s.id ? `<input class="ed-name" value="${s.name || ''}">` : (s.name || '')}</td>
        <td>${editingSectionId === s.id ? `<input class="ed-room" value="${s.room || ''}">` : (s.room || '')}</td>
        <td>${editingSectionId === s.id ? `<input class="ed-capacity" type="number" value="${s.capacity ?? ''}">` : (s.capacity ?? '')}</td>
        <td>
          ${editingSectionId === s.id
            ? `<button data-id="${s.id}" class="save-section">حفظ</button>
               <button data-id="${s.id}" class="cancel-edit-section">إلغاء</button>`
            : `<button data-id="${s.id}" class="edit-section">تعديل</button>
               <button data-id="${s.id}" class="del-section">حذف</button>`}
        </td>
      </tr>
    `).join('');

    qsa('.edit-section', sectionsTableBody).forEach(btn => btn.addEventListener('click', () => {
      editingSectionId = parseInt(btn.dataset.id);
      renderSections(sectionCache);
    }));

    qsa('.cancel-edit-section', sectionsTableBody).forEach(btn => btn.addEventListener('click', () => {
      editingSectionId = null;
      renderSections(sectionCache);
    }));

    qsa('.save-section', sectionsTableBody).forEach(btn => btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      if (!id) return;
      const tr = btn.closest('tr');
      const nameVal = tr.querySelector('.ed-name')?.value.trim() || '';
      const roomVal = tr.querySelector('.ed-room')?.value || '';
      const capRaw = tr.querySelector('.ed-capacity')?.value || '';
      const capVal = capRaw ? parseInt(capRaw, 10) : null;
      if (!nameVal) { showToast('اسم الشعبة مطلوب', 'warning'); return; }
      window.api.updateSection(id, {
        name: nameVal,
        room: roomVal,
        capacity: capVal
      });
      editingSectionId = null;
      showToast('تم حفظ بيانات الشعبة', 'success');
      loadSectionsForSelected();
    }));

    qsa('.del-section', sectionsTableBody).forEach(btn => btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      if (!id) return;
      const ok = await confirmDialog('سيتم حذف الشعبة. هل أنت متأكد؟');
      if (!ok) return;
      window.api.deleteSection(id);
      showToast('تم حذف الشعبة', 'success');
      loadSectionsForSelected();
    }));
  }

  if (classForm) {
    classForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const data = Object.fromEntries(fd.entries());
      const stage = data.stage || '';
      const gradeLabel = (data.grade_label || '').trim();
      const branch = (data.branch || '').trim();
      const shift = data.shift || '';
      if (!stage) { showToast('المرحلة مطلوبة', 'warning'); return; }
      if (!gradeLabel) { showToast('اسم الصف مطلوب', 'warning'); return; }
      window.api.addClass({
        stage,
        grade_label: gradeLabel,
        branch,
        shift,
        notes: null
      });
      e.currentTarget.reset();
      showToast('تم إضافة الصف', 'success');
      loadClasses();
    });
  }

  if (sectionForm) {
    sectionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!selectedClassId) {
        showToast('يرجى اختيار صف أولاً', 'warning');
        return;
      }
      const fd = new FormData(e.currentTarget);
      const data = Object.fromEntries(fd.entries());
      const name = (data.name || '').trim();
      const room = (data.room || '').trim();
      const capRaw = (data.capacity || '').trim();
      const capacity = capRaw ? parseInt(capRaw, 10) : null;
      if (!name) { showToast('اسم الشعبة مطلوب', 'warning'); return; }
      window.api.addSection({
        class_id: selectedClassId,
        name,
        room,
        capacity,
        notes: null
      });
      e.currentTarget.reset();
      showToast('تم إضافة الشعبة', 'success');
      loadSectionsForSelected();
    });
  }

  // initial
  loadClasses();
}
