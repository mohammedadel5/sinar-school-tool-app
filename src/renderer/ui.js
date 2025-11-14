export function ensureContainers() {
  let tc = document.getElementById('toast-container');
  if (!tc) {
    tc = document.createElement('div');
    tc.id = 'toast-container';
    document.body.appendChild(tc);
  }
  let modal = document.getElementById('confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.innerHTML = `
      <div class="cm-backdrop" data-role="backdrop"></div>
      <div class="cm-dialog">
        <div class="cm-message"></div>
        <div class="cm-actions">
          <button class="cm-yes">تأكيد</button>
          <button class="cm-no">إلغاء</button>
        </div>
      </div>`;
    modal.style.display = 'none';
    document.body.appendChild(modal);
  }
}

export function showToast(message, type = 'info', timeout = 3000) {
  ensureContainers();
  const tc = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  tc.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  const to = setTimeout(() => dismiss(), timeout);
  function dismiss() {
    el.classList.remove('visible');
    setTimeout(() => el.remove(), 300);
    clearTimeout(to);
  }
  el.addEventListener('click', dismiss);
}

export function confirmDialog(message) {
  ensureContainers();
  const modal = document.getElementById('confirm-modal');
  const msg = modal.querySelector('.cm-message');
  const btnYes = modal.querySelector('.cm-yes');
  const btnNo = modal.querySelector('.cm-no');
  msg.textContent = message;
  modal.style.display = 'block';
  return new Promise((resolve) => {
    function cleanup(result) {
      btnYes.removeEventListener('click', onYes);
      btnNo.removeEventListener('click', onNo);
      modal.querySelector('[data-role="backdrop"]').removeEventListener('click', onNo);
      modal.style.display = 'none';
      resolve(result);
    }
    function onYes() { cleanup(true); }
    function onNo() { cleanup(false); }
    btnYes.addEventListener('click', onYes);
    btnNo.addEventListener('click', onNo);
    modal.querySelector('[data-role="backdrop"]').addEventListener('click', onNo);
  });
}
