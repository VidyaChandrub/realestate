
const MODAL_ID = 'deactivated-account-modal';

export function showDeactivatedModal(message?: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(MODAL_ID)) return; // already showing

    const description = message?.trim()
      || 'Your account has been deactivated by an administrator.';

    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'deactivated-title');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
      font-family: system-ui, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="
        background: #fff; border-radius: 12px;
        padding: 2rem; max-width: 400px; width: 100%;
        text-align: center; box-sizing: border-box;
      ">
        <div style="
          width: 52px; height: 52px; border-radius: 50%;
          background: #FCEBEB;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.25rem; font-size: 26px;
        ">🔒</div>

        <h2 id="deactivated-title" style="
          margin: 0 0 0.5rem; font-size: 18px; font-weight: 600;
          color: #111;
        ">Account deactivated</h2>

        <p style="
          margin: 0 0 0.25rem; font-size: 14px;
          color: #555; line-height: 1.6;
        ">${description}</p>

        <p style="
          margin: 0 0 1.75rem; font-size: 14px;
          color: #555; line-height: 1.6;
        ">If you think this is a mistake, please contact your administrator.</p>

        <button id="deactivated-cta" style="
          width: 100%; padding: 10px 16px;
          background: #A32D2D; color: #fff; border: none;
          border-radius: 8px; font-size: 14px; font-weight: 500;
          cursor: pointer;
        ">Go to login</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Trap focus on the button immediately
    const btn = overlay.querySelector<HTMLButtonElement>('#deactivated-cta')!;
    btn.focus();

    btn.addEventListener('click', () => {
      btn.textContent = 'Redirecting…';
      btn.disabled = true;
      overlay.remove();
      resolve();
    });
  });
}