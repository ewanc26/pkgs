import { fetchJSON } from '/utils.js';

function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = '';
}

function set(id, text, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'kv-val' + (cls ? ' ' + cls : '');
}

export async function loadStatus() {
  // health
  try {
    const h = await fetchJSON('/xrpc/_health');
    set('val-reachable', '✓ online', 'ok');
    set('val-version', h.version ?? 'unknown');
  } catch {
    set('val-reachable', '✗ unreachable', 'err');
    set('val-version', '—', 'err');
  }

  // description
  try {
    const d = await fetchJSON('/xrpc/com.atproto.server.describeServer');
    set('val-did', d.did ?? '—');
    set('val-invite', d.inviteCodeRequired ? 'yes' : 'no',
      d.inviteCodeRequired ? 'warn' : 'ok');

    // phoneVerificationRequired (only show if present)
    if (typeof d.phoneVerificationRequired === 'boolean') {
      show('key-phone');
      show('val-phone');
      set('val-phone', d.phoneVerificationRequired ? 'yes' : 'no',
        d.phoneVerificationRequired ? 'warn' : 'ok');
    }

    // availableUserDomains
    if (d.availableUserDomains?.length) {
      show('key-domains');
      show('val-domains');
      set('val-domains', d.availableUserDomains.join(', '));
    }

    // links — append privacyPolicy / termsOfService to the links list
    if (d.links) {
      const list = document.getElementById('links-list');
      const entries = [
        ['privacyPolicy', 'Privacy Policy'],
        ['termsOfService', 'Terms of Service'],
      ];
      for (const [key, label] of entries) {
        if (d.links[key]) {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = d.links[key];
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = label;
          li.appendChild(a);
          list.appendChild(li);
        }
      }
    }

    // contact email
    if (d.contact?.email) {
      const el = document.getElementById('val-contact-email');
      el.style.display = '';
      el.innerHTML = `Email: <a href="mailto:${d.contact.email}" style="color:var(--color-green)">${d.contact.email}</a>`;
    }
  } catch {
    set('val-did', '—');
    set('val-invite', '—');
  }

  // account count — paginate com.atproto.sync.listRepos (public, no auth)
  try {
    let cursor, total = 0;
    do {
      const url = '/xrpc/com.atproto.sync.listRepos?limit=1000' +
                  (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
      const r = await fetchJSON(url);
      total += (r.repos ?? []).length;
      cursor = r.cursor;
    } while (cursor);
    set('val-accounts', total.toString());
  } catch {
    set('val-accounts', '—');
  }
}
