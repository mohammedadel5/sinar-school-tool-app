export function initSettingsSection({ qs }) {
  const schoolForm = qs('#school-settings-form');
  const timetableForm = qs('#timetable-settings-form');
  if (!schoolForm && !timetableForm) return;

  const logoInput = schoolForm ? schoolForm.querySelector('input[name="school_logo"]') : null;
  const logoImg = document.getElementById('school-logo-img');
  let logoDataUrl = null;

  const periodsCountInput = document.getElementById('timetable_periods_count');
  const periodsTimesContainer = document.getElementById('timetable-periods-times');

  function collectCurrentTimes() {
    if (!periodsTimesContainer) return [];
    const rows = Array.from(periodsTimesContainer.querySelectorAll('.tt-period-setting'));
    return rows.map(row => {
      const idx = parseInt(row.getAttribute('data-index') || '0', 10);
      if (!idx) return null;
      const fromInput = row.querySelector(`input[name="period_${idx}_from"]`);
      const toInput = row.querySelector(`input[name="period_${idx}_to"]`);
      return {
        index: idx,
        from: fromInput ? fromInput.value : '',
        to: toInput ? toInput.value : ''
      };
    }).filter(Boolean);
  }

  function renderPeriodsRows(count, existing) {
    if (!periodsTimesContainer) return;
    let c = parseInt(count || '0', 10);
    if (!c || c < 1) c = 7;
    const existingArr = Array.isArray(existing) ? existing : [];
    let html = '';
    for (let i = 1; i <= c; i++) {
      const found = existingArr.find(p => p && p.index === i) || {};
      const fromVal = found.from || '';
      const toVal = found.to || '';
      html += `
        <div class="tt-period-setting" data-index="${i}">
          <span>الحصة ${i}</span>
          <input type="time" name="period_${i}_from" value="${fromVal}">
          <input type="time" name="period_${i}_to" value="${toVal}">
        </div>`;
    }
    periodsTimesContainer.innerHTML = html;
    if (periodsCountInput) {
      periodsCountInput.value = String(c);
    }
  }

  // Load current values
  try {
    const current = window.api.getSetting && window.api.getSetting('school_name');
    if (current && schoolForm && schoolForm.school_name) schoolForm.school_name.value = current;
    const currentLogo = window.api.getSetting && window.api.getSetting('school_logo_dataurl');
    if (currentLogo && logoImg) {
      logoImg.src = currentLogo;
      logoImg.style.display = 'inline-block';
      logoDataUrl = currentLogo;
    }

    let periodsCountSetting = null;
    let periodsTimesSetting = [];
    try {
      periodsCountSetting = window.api.getSetting && window.api.getSetting('timetable_periods_count');
    } catch {}
    try {
      const rawTimes = window.api.getSetting && window.api.getSetting('timetable_periods_times');
      if (rawTimes) {
        const parsed = JSON.parse(rawTimes);
        if (Array.isArray(parsed)) periodsTimesSetting = parsed;
      }
    } catch {}
    renderPeriodsRows(periodsCountSetting, periodsTimesSetting);
  } catch {}

  if (periodsCountInput) {
    periodsCountInput.addEventListener('change', () => {
      const val = periodsCountInput.value;
      const existing = collectCurrentTimes();
      renderPeriodsRows(val, existing);
    });
  }

  if (logoInput) {
    logoInput.addEventListener('change', async () => {
      const file = logoInput.files && logoInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        logoDataUrl = reader.result;
        if (logoImg) {
          logoImg.src = logoDataUrl;
          logoImg.style.display = 'inline-block';
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (schoolForm) {
    schoolForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = schoolForm.school_name ? schoolForm.school_name.value.trim() : '';
      if (!name) {
        alert('يرجى إدخال اسم المدرسة');
        return;
      }
      try {
        window.api.setSetting && window.api.setSetting('school_name', name);
        if (logoDataUrl) {
          window.api.setSetting && window.api.setSetting('school_logo_dataurl', logoDataUrl);
        }
        const h = document.querySelector('header h1');
        if (h) h.textContent = name;
        alert('تم حفظ بيانات المدرسة');
      } catch (err) {
        alert('حدث خطأ أثناء حفظ بيانات المدرسة');
      }
    });
  }

  if (timetableForm && periodsCountInput && periodsTimesContainer) {
    timetableForm.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        let countVal = parseInt(periodsCountInput.value || '0', 10);
        if (!countVal || countVal < 1) countVal = 1;
        window.api.setSetting && window.api.setSetting('timetable_periods_count', String(countVal));
        const times = collectCurrentTimes().filter(p => p.index >= 1 && p.index <= countVal);
        window.api.setSetting && window.api.setSetting('timetable_periods_times', JSON.stringify(times));
        alert('تم حفظ إعدادات الجدول');
      } catch (err) {
        alert('حدث خطأ أثناء حفظ إعدادات الجدول');
      }
    });
  }
}
