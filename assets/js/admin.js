/**
 * BigaTech Solutions - Admin JavaScript
 * CRUD operations, modals, alerts
 */

// ============================================================
// SIDEBAR TOGGLE
// ============================================================
const AdminSidebar = {
  init() {
    const toggle = document.getElementById('sidebar-toggle');
    const layout = document.querySelector('.admin-layout');
    const overlay = document.getElementById('sidebar-overlay');
    const isMobile = () => window.innerWidth <= 768;

    // Restore saved state on desktop
    if (!isMobile() && localStorage.getItem('sidebar-collapsed') === '1') {
      layout?.classList.add('sidebar-collapsed');
      this.updateIcon(toggle, true);
    }

    toggle?.addEventListener('click', () => {
      if (isMobile()) {
        document.querySelector('.sidebar')?.classList.toggle('open');
        overlay?.classList.toggle('show');
      } else {
        const isCollapsed = layout?.classList.toggle('sidebar-collapsed');
        localStorage.setItem('sidebar-collapsed', isCollapsed ? '1' : '0');
        this.updateIcon(toggle, isCollapsed);
      }
    });

    overlay?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.remove('open');
      overlay?.classList.remove('show');
    });
  },

  updateIcon(btn, collapsed) {
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (!icon) return;
    icon.className = collapsed ? 'fas fa-indent' : 'fas fa-outdent';
  }
};

// ============================================================
// MODAL SYSTEM
// ============================================================
const Modal = {
  open(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  },
  close(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.classList.remove('open');
    });
    document.body.style.overflow = '';
  }
};

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
  if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
    Modal.closeAll();
  }
});

// ============================================================
// ALERT SYSTEM
// ============================================================
const Alert = {
  show(message, type = 'success', duration = 4000) {
    const existing = document.getElementById('admin-alert');
    if (existing) existing.remove();

    const icons = { success: 'fa-check-circle', danger: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const alert = document.createElement('div');
    alert.id = 'admin-alert';
    alert.className = `alert alert-${type}`;
    alert.style.cssText = 'position:fixed;top:80px;inset-inline-end:24px;z-index:9999;min-width:280px;max-width:400px;animation:fadeInRight 0.3s ease;';
    alert.innerHTML = `<i class="fas ${icons[type] || 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(alert);

    if (duration > 0) setTimeout(() => alert.remove(), duration);
  }
};

// ============================================================
// CRUD HELPER
// ============================================================
const CRUD = {
  async request(action, data = {}) {
    const formData = new FormData();
    formData.append('action', action);
    Object.entries(data).forEach(([k, v]) => formData.append(k, v));

    const res = await fetch('ajax/crud.php', { method: 'POST', body: formData });
    return await res.json();
  },

  confirmDelete(message = '\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u0644\u062d\u0632\u0641\u061f') {
    return new Promise(resolve => {
      const confirmed = confirm(message);
      resolve(confirmed);
    });
  }
};

// ============================================================
// LANG TABS IN FORMS
// ============================================================
function initLangTabs(container) {
  const tabs = container.querySelectorAll('.lang-tab');
  const panes = container.querySelectorAll('.lang-pane');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const target = container.querySelector(`.lang-pane[data-lang="${tab.dataset.lang}"]`);
      target?.classList.add('active');
    });
  });
}

// ============================================================
// IMAGE PREVIEW
// ============================================================
function initImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Alert.show('\u062d\u062c\u0645 \u0627\u0644\u0635\u0648\u0631\u0629 \u064a\u062c\u0628 \u0623\u0646 \u0644\u0627 \u064a\u062a\u062c\u0627\u0648\u0632 5MB', 'danger');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================
// TABLE SEARCH
// ============================================================
function initTableSearch(inputId, tableId) {
  const input = document.getElementById(inputId);
  const table = document.getElementById(tableId);
  if (!input || !table) return;

  input.addEventListener('input', () => {
    const term = input.value.toLowerCase();
    table.querySelectorAll('tbody tr').forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? '' : 'none';
    });
  });
}

// ============================================================
// CONFIRM DELETE
// ============================================================
document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('btn-delete') || e.target.closest('.btn-delete')) {
    const btn = e.target.classList.contains('btn-delete') ? e.target : e.target.closest('.btn-delete');
    const confirmed = await CRUD.confirmDelete('\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u0644\u062d\u0632\u0641\u061f \u0644\u0627 \u064a\u0645\u0643\u0646 \u0627\u0644\u062a\u0631\u0627\u062c\u0639 \u0639\u0646 \u0647\u0632\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621.');
    if (!confirmed) return;

    const table = btn.dataset.table;
    const id = btn.dataset.id;
    if (!table || !id) return;

    try {
      const result = await CRUD.request('delete', { table, id });
      if (result.success) {
        btn.closest('tr')?.remove();
        Alert.show('\u062a\u0645 \u0627\u0644\u062d\u0632\u0641 \u0628\u0646\u062c\u0627\u062d');
      } else {
        Alert.show(result.error || '\u062e\u0637\u0622 \u0641\u064a \u0627\u0644\u062d\u0632\u0641', 'danger');
      }
    } catch(err) {
      Alert.show('\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644', 'danger');
    }
  }
});

// ============================================================
// TOGGLE STATUS
// ============================================================
document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('btn-toggle') || e.target.closest('.btn-toggle')) {
    const btn = e.target.classList.contains('btn-toggle') ? e.target : e.target.closest('.btn-toggle');
    const table = btn.dataset.table;
    const id = btn.dataset.id;
    const field = btn.dataset.field || 'is_active';
    const current = btn.dataset.value;
    if (!table || !id) return;

    try {
      const result = await CRUD.request('toggle', { table, id, field, value: current === '1' ? '0' : '1' });
      if (result.success) {
        const newVal = current === '1' ? '0' : '1';
        btn.dataset.value = newVal;
        const badge = btn.closest('tr')?.querySelector('.status-badge');
        if (badge) {
          badge.className = `badge status-badge ${newVal === '1' ? 'badge-success' : 'badge-danger'}`;
          badge.textContent = newVal === '1' ? '\u0645\u0641\u0639\u0651\u0644' : '\u0645\u0639\u0637\u0651\u0644';
        }
        Alert.show(newVal === '1' ? '\u062a\u0645 \u0627\u0644\u062a\u0641\u0639\u064a\u0644' : '\u062a\u0645 \u0627\u0644\u062a\u0639\u0637\u064a\u0644');
      }
    } catch(err) {
      Alert.show('\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644', 'danger');
    }
  }
});

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  AdminSidebar.init();

  // Init all lang tabs
  document.querySelectorAll('.has-lang-tabs').forEach(container => {
    initLangTabs(container);
  });

  // Init search
  initTableSearch('table-search', 'main-table');

  // Auto-hide alerts
  document.querySelectorAll('.alert[data-auto-hide]').forEach(alert => {
    setTimeout(() => alert.style.display = 'none', 4000);
  });
});
