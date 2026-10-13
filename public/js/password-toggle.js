/* ===== Show / hide password (eye icon) =====
   Adds an eye button to every password field, including ones rendered later by JS. */
(() => {
  const EYE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const EYE_OFF = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.5M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m2 2 20 20"/></svg>`;

  const setShown = (btn, shown) => {
    btn.previousElementSibling.type = shown ? "text" : "password";
    btn.innerHTML = shown ? EYE_OFF : EYE;
    btn.setAttribute("aria-pressed", shown);
    btn.setAttribute("aria-label", shown ? "Hide password" : "Show password");
    btn.title = shown ? "Hide password" : "Show password";
  };

  const enhance = root => {
    root.querySelectorAll?.('input[type="password"]:not(.pw-in)').forEach(input => {
      const wrap = document.createElement("span");
      wrap.className = "pw-wrap";
      input.classList.add("pw-in");
      input.replaceWith(wrap);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pw-eye";
      wrap.append(input, btn);
      setShown(btn, false);
    });
  };

  document.addEventListener("click", e => {
    const btn = e.target.closest(".pw-eye"); if (!btn) return;
    e.preventDefault();
    setShown(btn, btn.previousElementSibling.type === "password");
    btn.previousElementSibling.focus();
  });
  // Hide the passwords again whenever a form is cleared
  document.addEventListener("reset", e => e.target.querySelectorAll(".pw-eye").forEach(b => setShown(b, false)), true);

  enhance(document);
  new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(enhance)))
    .observe(document.body, { childList: true, subtree: true });
})();
