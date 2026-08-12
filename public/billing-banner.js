// ══════════════════════════════════════════════════════════════
//  Billing status — shown as a small badge on the "Billing" sidebar
//  menu item (not a page-top banner, which crowded the layout and
//  covered other UI). Also shows the latest active announcement, if
//  any, as a slim dismissible strip — that one IS a top banner since
//  it's a broadcast message meant to be seen once, not a persistent
//  nav item.
// ══════════════════════════════════════════════════════════════
(function () {
  function setBillingBadge(status, daysLeft) {
    var badge = document.getElementById('billing-badge');
    if (!badge) return;
    if (status === 'trial') {
      var urgent = daysLeft <= 2;
      badge.textContent = daysLeft + 'd';
      badge.style.cssText = 'margin-left:auto;display:inline-flex;padding:2px 8px;border-radius:20px;font-size:10.5px;font-weight:800;background:' + (urgent ? '#FDEDEC' : '#FEF3E2') + ';color:' + (urgent ? '#F04438' : '#F79009') + ';';
    } else if (status === 'active' && daysLeft <= 7) {
      badge.textContent = daysLeft + 'd';
      badge.style.cssText = 'margin-left:auto;display:inline-flex;padding:2px 8px;border-radius:20px;font-size:10.5px;font-weight:800;background:#FEF3E2;color:#F79009;';
    } else {
      badge.style.display = 'none';
    }
  }

  function showAnnouncement(message) {
    var slot = document.getElementById('announcement-slot');
    if (!slot) return; // slot only exists inside the app shell, not on /login etc.
    var el = document.createElement('div');
    el.id = 'announcement-banner';
    el.style.cssText = 'padding:9px 20px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:10px;background:#EAF0FE;color:#3B6DF0;';
    el.innerHTML = '<i class="ti ti-speakerphone"></i><span>' + message + '</span>' +
      '<span style="margin-left:auto;cursor:pointer;font-weight:800;" onclick="this.parentElement.remove()">✕</span>';
    slot.appendChild(el);
  }

  function load() {
    fetch('/api/org-status')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.error) return;
        setBillingBadge(data.status, data.daysLeft);
        if (data.announcement) showAnnouncement(data.announcement);
      })
      .catch(function () {});
  }

  // #billing-badge is plain static markup (not rendered by the app's own
  // JS), so it's already in the DOM by the time the page 'load' event
  // fires — no need to wait for bootstrapApp()'s data load to finish.
  window.addEventListener('load', load);
})();
