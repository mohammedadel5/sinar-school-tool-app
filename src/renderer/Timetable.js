import { showToast, confirmDialog } from './ui.js';

export function initTimetableSection({ qs, qsa }) {
  const sectionEl = qs('#timetable');
  if (!sectionEl) return;

  const classSelect = qs('#tt-class-select');
  const sectionSelect = qs('#tt-section-select');
  const labelEl = qs('#tt-current-label');
  const grid = qs('#timetable-grid');
  const gridHead = grid ? grid.querySelector('thead') : null;
  const gridBody = grid ? grid.querySelector('tbody') : null;

  const slotForm = qs('#tt-slot-form');
  const dayHidden = qs('#tt-day');
  const periodHidden = qs('#tt-period');
  const entryIdHidden = qs('#tt-entry-id');
  const dayLabel = qs('#tt-day-label');
  const periodLabel = qs('#tt-period-label');
  const subjectSelect = qs('#tt-subject');
  const teacherSelect = qs('#tt-teacher');
  const notesInput = qs('#tt-notes');
  const clearBtn = qs('#tt-clear-btn');
  const deleteBtn = qs('#tt-delete-btn');
  const printBtn = qs('#tt-print-btn');

  const DAYS = [
    { code: 'sun', label: 'الأحد' },
    { code: 'mon', label: 'الإثنين' },
    { code: 'tue', label: 'الثلاثاء' },
    { code: 'wed', label: 'الأربعاء' },
    { code: 'thu', label: 'الخميس' }
  ];

  let classesCache = [];
  let sectionsCache = [];
  let subjectsCache = [];
  let teachersCache = [];
  let entriesCache = [];
  let periodsConfig = [];
  let selectedClassId = null;
  let selectedSectionId = null;

  function describeClass(c) {
    if (!c) return '';
    const parts = [];
    if (c.stage) parts.push(c.stage);
    if (c.grade_label) parts.push(c.grade_label);
    if (c.branch) parts.push(`فرع ${c.branch}`);
    if (c.shift) parts.push(`دوام ${c.shift}`);
    return parts.join(' - ');
  }

  function updateLabel() {
    if (!labelEl) return;
    const cls = classesCache.find(c => c.id === selectedClassId);
    const sec = sectionsCache.find(s => s.id === selectedSectionId);
    if (!cls || !sec) {
      labelEl.textContent = 'يرجى اختيار صف وشعبة.';
      return;
    }
    labelEl.textContent = `${describeClass(cls)} - شعبة ${sec.name}`;
  }

  function loadClasses() {
    if (!classSelect) return;
    classesCache = window.api.listClasses() || [];
    const options = ['<option value="">اختر صفاً</option>']
      .concat(classesCache.map(c => `<option value="${c.id}">${describeClass(c)}</option>`));
    classSelect.innerHTML = options.join('');
  }

  function loadSectionsForSelected() {
    sectionsCache = [];
    if (!sectionSelect) return;
    sectionSelect.innerHTML = '<option value="">اختر شعبة</option>';
    if (!selectedClassId) {
      updateLabel();
      entriesCache = [];
      renderGrid();
      return;
    }
    sectionsCache = window.api.listSectionsByClass(selectedClassId) || [];
    const options = ['<option value="">اختر شعبة</option>']
      .concat(sectionsCache.map(s => `<option value="${s.id}">${s.name}</option>`));
    sectionSelect.innerHTML = options.join('');
    selectedSectionId = null;
    updateLabel();
    entriesCache = [];
    renderGrid();
  }

  function loadSubjects() {
    if (!subjectSelect) return;
    subjectsCache = window.api.listSubjects() || [];
    const options = ['<option value="">اختر المادة</option>']
      .concat(subjectsCache.map(s => `<option value="${s.id}">${s.name}</option>`));
    subjectSelect.innerHTML = options.join('');
  }

  function loadTeachers() {
    if (!teacherSelect) return;
    teachersCache = window.api.listTeachers() || [];
    const options = ['<option value="">اختر المعلم</option>']
      .concat(teachersCache.map(t => `<option value="${t.id}">${t.name}</option>`));
    teacherSelect.innerHTML = options.join('');
  }

  function loadTimetable() {
    if (!selectedSectionId) {
      entriesCache = [];
      renderGrid();
      return;
    }
    entriesCache = window.api.listTimetableBySection(selectedSectionId) || [];
    renderGrid();
  }

  function renderGrid() {
    if (!gridHead || !gridBody) return;

    let headHtml = '<tr><th>الحصة</th>';
    DAYS.forEach(d => {
      headHtml += `<th>${d.label}</th>`;
    });
    headHtml += '</tr>';
    gridHead.innerHTML = headHtml;

    const rowsHtml = (periodsConfig || []).map(p => {
      const idx = p.index;
      const hasTime = p.from && p.to;
      const timeStr = hasTime ? `${p.from} - ${p.to}` : '';
      let row = '<tr><th>'; 
      row += `الحصة ${idx}`;
      if (timeStr) {
        row += `<div class="tt-period-time">${timeStr}</div>`;
      }
      row += '</th>';
      DAYS.forEach(d => {
        const entry = entriesCache.find(e => e.day_of_week === d.code && e.period_idx === idx);
        if (entry) {
          const subj = entry.subject_name || '';
          const teacher = entry.teacher_name || '';
          row += `<td data-day="${d.code}" data-period="${idx}" data-entry-id="${entry.id}" class="tt-has-entry">` +
                 `<div class="tt-subject">${subj}</div>` +
                 `<div class="tt-teacher">${teacher}</div>` +
                 `</td>`;
        } else {
          row += `<td data-day="${d.code}" data-period="${idx}" class="tt-empty">` +
                 `<span class="tt-empty-hint">انقر هنا لتحديد الحصة</span>` +
                 `</td>`;
        }
      });
      row += '</tr>';
      return row;
    }).join('');

    gridBody.innerHTML = rowsHtml;

    qsa('td[data-day]', gridBody).forEach(td => {
      td.addEventListener('click', () => {
        const dayCode = td.getAttribute('data-day');
        const periodIdx = parseInt(td.getAttribute('data-period') || '0', 10);
        selectCell(dayCode, periodIdx);
      });
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      if (!selectedClassId || !selectedSectionId) {
        showToast('يرجى اختيار صف وشعبة أولاً', 'warning');
        return;
      }
      const cls = classesCache.find(c => c.id === selectedClassId) || null;
      const sec = sectionsCache.find(s => s.id === selectedSectionId) || null;
      const orgName = (window.api.getSetting && window.api.getSetting('school_name'))
        || (document.querySelector('header h1')?.textContent || 'نظام المالية للمدارس').trim();
      const logoData = (window.api.getSetting && window.api.getSetting('school_logo_dataurl')) || null;
      const today = new Date().toLocaleDateString('ar-IQ');

      if (sectionEl) {
        let header = sectionEl.querySelector('.print-header');
        if (!header) {
          header = document.createElement('div');
          header.className = 'print-header';
          const wrapper = sectionEl.querySelector('#timetable-wrapper');
          if (wrapper) {
            sectionEl.insertBefore(header, wrapper);
          } else {
            sectionEl.appendChild(header);
          }
        }
        const classLabel = cls ? describeClass(cls) : '';
        const sectionLabel = sec ? ('شعبة ' + (sec.name || '')) : '';
        header.innerHTML =
          '<div class="ph-row three">'
          + '<div class="ph-left">'
          + (logoData ? '<img class="ph-logo" src="' + logoData + '" alt="" />' : '')
          + '<span class="ph-org">' + orgName + '</span>'
          + '</div>'
          + '<div class="ph-title">الجدول الأسبوعي</div>'
          + '<div class="ph-date">' + today + '</div>'
          + '</div>'
          + '<div class="ph-meta">' + classLabel + (sectionLabel ? ' — ' + sectionLabel : '') + '</div>';

        let wm = sectionEl.querySelector('.print-watermark');
        if (logoData) {
          if (!wm) {
            wm = document.createElement('div');
            wm.className = 'print-watermark';
            const img = document.createElement('img');
            img.src = logoData;
            img.alt = '';
            wm.appendChild(img);
            sectionEl.insertBefore(wm, sectionEl.firstChild);
          } else {
            const img = wm.querySelector('img') || document.createElement('img');
            img.src = logoData;
            img.alt = '';
            if (!wm.contains(img)) wm.appendChild(img);
          }
        } else if (wm) {
          wm.remove();
        }
      }

      window.print();
    });
  }

  function selectCell(dayCode, periodIdx) {
    if (!selectedSectionId) {
      showToast('يرجى اختيار صف وشعبة أولاً', 'warning');
      return;
    }
    if (dayHidden) dayHidden.value = dayCode;
    if (periodHidden) periodHidden.value = String(periodIdx);

    const dayInfo = DAYS.find(d => d.code === dayCode);
    if (dayLabel) dayLabel.textContent = dayInfo ? dayInfo.label : '—';
    const periodCfg = (periodsConfig || []).find(p => p.index === periodIdx);
    if (periodLabel) {
      let lbl = String(periodIdx || '—');
      if (periodCfg && periodCfg.from && periodCfg.to) {
        lbl += ` (${periodCfg.from} - ${periodCfg.to})`;
      }
      periodLabel.textContent = lbl;
    }

    if (gridBody) {
      qsa('td[data-day]', gridBody).forEach(td => td.classList.remove('selected'));
      const target = gridBody.querySelector(`td[data-day="${dayCode}"][data-period="${periodIdx}"]`);
      if (target) target.classList.add('selected');
    }

    const existing = entriesCache.find(e => e.day_of_week === dayCode && e.period_idx === periodIdx);
    if (existing) {
      if (entryIdHidden) entryIdHidden.value = existing.id;
      if (subjectSelect) subjectSelect.value = existing.subject_id != null ? String(existing.subject_id) : '';
      if (teacherSelect) teacherSelect.value = existing.teacher_id != null ? String(existing.teacher_id) : '';
      if (notesInput) notesInput.value = existing.notes || '';
    } else {
      if (entryIdHidden) entryIdHidden.value = '';
      if (subjectSelect) subjectSelect.value = '';
      if (teacherSelect) teacherSelect.value = '';
      if (notesInput) notesInput.value = '';
    }
  }

  if (classSelect) {
    classSelect.addEventListener('change', () => {
      const val = classSelect.value;
      selectedClassId = val ? parseInt(val, 10) : null;
      selectedSectionId = null;
      if (sectionSelect) sectionSelect.value = '';
      updateLabel();
      loadSectionsForSelected();
    });
  }

  if (sectionSelect) {
    sectionSelect.addEventListener('change', () => {
      const val = sectionSelect.value;
      selectedSectionId = val ? parseInt(val, 10) : null;
      updateLabel();
      // reset current slot selection
      if (entryIdHidden) entryIdHidden.value = '';
      if (dayHidden) dayHidden.value = '';
      if (periodHidden) periodHidden.value = '';
      if (dayLabel) dayLabel.textContent = '—';
      if (periodLabel) periodLabel.textContent = '—';
      if (notesInput) notesInput.value = '';
      loadTimetable();
    });
  }

  if (slotForm) {
    slotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!selectedSectionId) {
        showToast('يرجى اختيار صف وشعبة أولاً', 'warning');
        return;
      }
      const dayCode = dayHidden ? dayHidden.value : '';
      const periodIdx = periodHidden ? parseInt(periodHidden.value || '0', 10) : 0;
      if (!dayCode || !periodIdx) {
        showToast('يرجى اختيار خلية من الجدول أولاً', 'warning');
        return;
      }
      const subjectId = subjectSelect ? parseInt(subjectSelect.value || '0', 10) : 0;
      const teacherId = teacherSelect ? parseInt(teacherSelect.value || '0', 10) : 0;
      const notes = notesInput ? (notesInput.value || '').trim() : '';

      if (!subjectId) {
        showToast('يرجى اختيار مادة', 'warning');
        return;
      }
      if (!teacherId) {
        showToast('يرجى اختيار معلم', 'warning');
        return;
      }

      const payload = {
        day_of_week: dayCode,
        period_idx: periodIdx,
        subject_id: subjectId,
        teacher_id: teacherId,
        notes: notes || null
      };

      const existingAtSlot = entriesCache.find(e => e.day_of_week === dayCode && e.period_idx === periodIdx);
      const hasId = entryIdHidden && entryIdHidden.value;

      try {
        if (hasId) {
          const id = parseInt(entryIdHidden.value, 10);
          window.api.updateTimetableEntry(id, payload);
        } else {
          if (existingAtSlot) {
            showToast('هذه الشعبة لديها حصة أخرى في هذا اليوم وهذه الحصة.', 'warning');
            return;
          }
          window.api.addTimetableEntry({
            section_id: selectedSectionId,
            ...payload
          });
        }
      } catch (err) {
        const msg = String((err && err.message) || err || '');
        if (msg.includes('teacher_id')) {
          showToast('تعارض: هذا المعلم لديه حصة أخرى في هذا اليوم وهذه الحصة.', 'error');
        } else if (msg.includes('section_id')) {
          showToast('تعارض: هذه الشعبة لديها حصة أخرى في هذا اليوم وهذه الحصة.', 'error');
        } else {
          showToast('لا يمكن حفظ الحصة (تعارض في الجدول).', 'error');
        }
        return;
      }

      showToast('تم حفظ الحصة', 'success');
      loadTimetable();
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!entryIdHidden || !entryIdHidden.value) {
        showToast('لا توجد حصة محددة للحذف', 'warning');
        return;
      }
      const ok = await confirmDialog('سيتم حذف هذه الحصة من الجدول. هل أنت متأكد؟');
      if (!ok) return;
      const id = parseInt(entryIdHidden.value, 10);
      window.api.deleteTimetableEntry(id);
      showToast('تم حذف الحصة', 'success');
      entryIdHidden.value = '';
      if (notesInput) notesInput.value = '';
      loadTimetable();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (entryIdHidden) entryIdHidden.value = '';
      if (subjectSelect) subjectSelect.value = '';
      if (teacherSelect) teacherSelect.value = '';
      if (notesInput) notesInput.value = '';
      if (gridBody) {
        qsa('td[data-day]', gridBody).forEach(td => td.classList.remove('selected'));
      }
      if (dayHidden) dayHidden.value = '';
      if (periodHidden) periodHidden.value = '';
      if (dayLabel) dayLabel.textContent = '—';
      if (periodLabel) periodLabel.textContent = '—';
    });
  }

  function init() {
    // Load periods configuration from settings
    try {
      let count = 0;
      try {
        const rawCount = window.api.getSetting && window.api.getSetting('timetable_periods_count');
        count = parseInt(rawCount || '0', 10);
      } catch {}
      if (!count || count < 1) count = 7;

      let times = [];
      try {
        const rawTimes = window.api.getSetting && window.api.getSetting('timetable_periods_times');
        if (rawTimes) {
          const parsed = JSON.parse(rawTimes);
          if (Array.isArray(parsed)) times = parsed;
        }
      } catch {}

      periodsConfig = [];
      for (let i = 1; i <= count; i++) {
        const found = times.find(p => p && p.index === i) || {};
        periodsConfig.push({
          index: i,
          from: found.from || '',
          to: found.to || ''
        });
      }
    } catch {
      periodsConfig = [];
      for (let i = 1; i <= 7; i++) {
        periodsConfig.push({ index: i, from: '', to: '' });
      }
    }

    loadClasses();
    loadSubjects();
    loadTeachers();
    renderGrid();
  }

  init();
}
