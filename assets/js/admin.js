(function () {
    const listEl = document.getElementById('admin-users-list');
    const countEl = document.getElementById('admin-user-count');
    if (!listEl) return; // не админ — страница уже показала отказ на сервере

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    async function loadUsers() {
        listEl.innerHTML = '<p class="muted">' + t('admin.loading') + '</p>';
        try {
            const res = await fetch('api/admin_users.php');
            const data = await res.json();
            if (!res.ok) {
                listEl.innerHTML = `<p class="feedback show bad" style="display:block;">${escapeHtml(data.error || t('js.admin.load_error_default'))}</p>`;
                return;
            }
            renderUsers(data.users || []);
        } catch {
            listEl.innerHTML = '<p class="feedback show bad" style="display:block;">' + t('js.admin.network_error') + '</p>';
        }
    }

    function renderUsers(users) {
        countEl.textContent = users.length;
        if (!users.length) {
            listEl.innerHTML = '<p class="muted">' + t('js.admin.no_users_yet') + '</p>';
            return;
        }
        listEl.innerHTML = users.map(u => `
            <div class="card mt-2" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name)}">
                <div class="flex-between flex-wrap gap-2">
                    <div>
                        <div style="font-weight:700; font-size:15px;">
                            ${escapeHtml(u.name)}
                            ${u.email_verified_at ? `<span title="${t('js.admin.email_verified_title')}">✅</span>` : `<span title="${t('js.admin.email_not_verified_title')}" style="opacity:.5;">✉️</span>`}
                            ${Number(u.is_admin) ? `<span title="${t('js.admin.admin_title')}" style="color:var(--accent);">🛠 ${t('js.admin.admin_label')}</span>` : ''}
                            ${u.recent_anomalies ? `<span title="Подозрительная активность" style="color:var(--danger);">🚩</span>` : ''}
                        </div>
                        <div class="muted" style="font-size:12px;">${escapeHtml(u.email)} · ${t('js.admin.registered_on')} ${escapeHtml((u.created_at || '').slice(0, 10))}</div>
                        <div class="mono muted" style="font-size:12px; margin-top:4px;">
                            XP: ${u.xp ?? '—'} · ${t('js.admin.streak_label')}: ${u.streak_count ?? '—'}
                        </div>
                    </div>
                    <div class="btn-row">
                        <button class="btn btn-sm xp-stats-btn" style="border-color:#3498db; color:#3498db;">📊 Статистика XP</button>
                        ${Number(u.is_admin)
                            ? `<button class="btn btn-sm admin-toggle-btn" data-make="0">${t('js.admin.remove_admin_btn')}</button>`
                            : `<button class="btn btn-sm admin-toggle-btn" data-make="1" style="border-color:var(--accent); color:var(--accent);">${t('js.admin.make_admin_btn')}</button>`}
                        <button class="btn btn-sm rename-btn">${t('js.admin.rename_btn')}</button>
                        <button class="btn btn-sm delete-btn" style="border-color:var(--danger); color:var(--danger);">${t('js.admin.delete_btn')}</button>
                    </div>
                </div>
            </div>
        `).join('');

        listEl.querySelectorAll('.rename-btn').forEach(btn => {
            btn.addEventListener('click', () => renameUser(btn.closest('[data-user-id]')));
        });
        listEl.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteUser(btn.closest('[data-user-id]')));
        });
        listEl.querySelectorAll('.admin-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => setAdmin(btn.closest('[data-user-id]'), btn.dataset.make === '1'));
        });
        listEl.querySelectorAll('.xp-stats-btn').forEach(btn => {
            btn.addEventListener('click', () => showXpStats(btn.closest('[data-user-id]')));
        });
    }

    async function setAdmin(card, makeAdmin) {
        const id = card.dataset.userId;
        const sure = confirm(makeAdmin
            ? t('js.admin.confirm_make_admin')
            : t('js.admin.confirm_remove_admin'));
        if (!sure) return;

        try {
            const res = await fetch('api/admin_set_admin.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_admin: makeAdmin }),
            });
            const data = await res.json();
            if (res.ok) {
                loadUsers();
            } else {
                alert(data.error || t('js.admin.change_rights_failed'));
            }
        } catch {
            alert(t('js.admin.network_error'));
        }
    }

    async function renameUser(card) {
        const id = card.dataset.userId;
        const currentName = card.querySelector('div[style*="font-weight:700"]').textContent.trim().replace(/[✅✉️]/g, '').trim();
        const newName = prompt(t('js.admin.rename_prompt'), currentName);
        if (!newName || newName.trim() === currentName) return;

        try {
            const res = await fetch('api/admin_rename_user.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name: newName.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                loadUsers();
            } else {
                alert(data.error || t('js.admin.rename_failed'));
            }
        } catch {
            alert(t('js.admin.network_error'));
        }
    }

    async function deleteUser(card) {
        const id = card.dataset.userId;
        const sure = confirm(t('js.admin.confirm_delete_user'));
        if (!sure) return;

        try {
            const res = await fetch('api/admin_delete_user.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (res.ok) {
                loadUsers();
            } else {
                alert(data.error || t('js.admin.delete_failed'));
            }
        } catch {
            alert(t('js.admin.network_error'));
        }
    }

    async function showXpStats(card) {
        const id = card.dataset.userId;
        const name = card.querySelector('div[style*="font-weight:700"]').textContent.trim().replace(/[✅✉️]/g, '').trim();
        
        document.getElementById('xp-modal-username').textContent = name;
        document.getElementById('xp-modal').style.display = 'block';
        document.getElementById('xp-modal-log').innerHTML = '<tr><td colspan="7" class="muted">Загрузка...</td></tr>';
        
        try {
            const res = await fetch(`api/admin_user_xp.php?id=${id}`);
            const data = await res.json();
            
            if (!res.ok) {
                document.getElementById('xp-modal-log').innerHTML = `<tr><td colspan="7">${escapeHtml(data.error || 'Ошибка загрузки')}</td></tr>`;
                return;
            }
            
            // Заполняем ленту
            const logEl = document.getElementById('xp-modal-log');
            if (data.log.length === 0) {
                logEl.innerHTML = '<tr><td colspan="7" class="muted">Нет данных</td></tr>';
            } else {
                logEl.innerHTML = data.log.map(row => {
                    const isAnomaly = parseInt(row.amount) >= 100;
                    
                    let wpmStr = '-';
                    let durStr = '-';
                    let errStr = '-';
                    let accStr = '-';
                    
                    if (row.details) {
                        try {
                            const d = JSON.parse(row.details);
                            if (d.wpm) wpmStr = `${d.wpm}${d.fw ? ' (fw:' + d.fw + ')' : ''}`;
                            if (d.dur !== undefined) {
                                const m = Math.floor(d.dur / 60);
                                const s = d.dur % 60;
                                durStr = m > 0 ? `${m}м ${s}с` : `${s}с`;
                            }
                            if (d.err !== undefined) errStr = d.err;
                            if (d.acc !== undefined) accStr = `${d.acc}%`;
                        } catch(e) {}
                    }
                    
                    return `<tr style="${isAnomaly ? 'background:rgba(255,0,0,0.1);' : ''}">
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:12px;" class="muted">${escapeHtml(row.created_at)}</td>
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:14px;">${escapeHtml(row.source)}</td>
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:14px; font-weight:bold; ${isAnomaly ? 'color:var(--danger);' : ''}">+${escapeHtml(row.amount)}</td>
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:14px;">${escapeHtml(wpmStr)}</td>
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:14px;">${escapeHtml(durStr)}</td>
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:14px;">${escapeHtml(errStr)}</td>
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:14px;">${escapeHtml(accStr)}</td>
                    </tr>`;
                }).join('');
            }
        } catch (err) {
            document.getElementById('xp-modal-log').innerHTML = '<tr><td colspan="7">Ошибка сети</td></tr>';
        }
    }

    document.getElementById('xp-modal-close')?.addEventListener('click', () => {
        document.getElementById('xp-modal').style.display = 'none';
    });
    
    // Close modal on outside click
    document.getElementById('xp-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'xp-modal') e.target.style.display = 'none';
    });

    loadUsers();
})();
