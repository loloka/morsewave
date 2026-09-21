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
            const res = await fetch('api/admin_users.php?sort=' + document.getElementById('admin-sort-select').value);
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
                            ${Number(u.is_sponsor) ? `<span title="Спонсор проекта" style="color:var(--accent);">${(u.sponsor_badge && u.sponsor_badge !== 'none') ? u.sponsor_badge : '👑'} Спонсор</span>` : ''}
                            ${Number(u.recent_anomalies) ? `<span title="Подозрительная активность" style="color:var(--danger);">🚩</span>` : ''}
                        </div>
                        <div class="muted" style="font-size:12px;">${escapeHtml(u.email)} · ${t('js.admin.registered_on')} ${escapeHtml((u.created_at || '').slice(0, 10))}</div>
                        <div class="mono muted" style="font-size:12px; margin-top:4px;">
                            XP: ${u.xp ?? '—'} · ${t('js.admin.streak_label')}: ${u.streak_count ?? '—'}
                        </div>
                    </div>
                    <div class="btn-row">
                        <button class="btn btn-sm xp-stats-btn" style="border-color:#3498db; color:#3498db;">📊 Статистика XP</button>
                        ${Number(u.is_sponsor)
                            ? `<button class="btn btn-sm sponsor-toggle-btn" data-make="0">${t('js.admin.remove_sponsor_btn')}</button>`
                            : `<button class="btn btn-sm sponsor-toggle-btn" data-make="1" style="border-color:#f1c40f; color:#f1c40f;">${t('js.admin.make_sponsor_btn')}</button>`}
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
        listEl.querySelectorAll('.sponsor-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => setSponsor(btn.closest('[data-user-id]'), btn.dataset.make === '1'));
        });
        listEl.querySelectorAll('.admin-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => setAdmin(btn.closest('[data-user-id]'), btn.dataset.make === '1'));
        });
        listEl.querySelectorAll('.xp-stats-btn').forEach(btn => {
            btn.addEventListener('click', () => showXpStats(btn.closest('[data-user-id]')));
        });
    }

    async function setSponsor(card, makeSponsor) {
        const id = card.dataset.userId;
        try {
            const res = await fetch('api/admin_set_sponsor.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_sponsor: makeSponsor }),
            });
            const data = await res.json();
            if (res.ok) {
                loadUsers();
            } else {
                alert(data.error || 'Не удалось изменить статус спонсора');
            }
        } catch {
            alert(t('js.admin.network_error'));
        }
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
                    const isAnomaly = parseInt(row.amount) >= 1500;
                    
                    let wpmStr = '-';
                    let durStr = '-';
                    let errStr = '-';
                    let accStr = '-';
                    let historyHtml = '';
                    
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
                            
                            if (d.history && Array.isArray(d.history) && d.history.length > 0) {
                                historyHtml = `
                                <details style="margin-top: 5px; font-size: 12px; cursor: pointer;">
                                    <summary class="muted">Подробно (${d.history.length})</summary>
                                    <div style="max-height: 150px; overflow-y: auto; background: var(--bg); padding: 5px; border-radius: 4px; margin-top: 5px; border: 1px solid var(--border);">
                                        ${d.history.map((h, i) => {
                                            const isCorrect = h.e === h.t;
                                            return `<div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                                                <span class="mono">
                                                    ${escapeHtml(h.e)} → 
                                                    <span style="color: ${isCorrect ? 'var(--success)' : 'var(--danger)'}">${escapeHtml(h.t)}</span>
                                                </span>
                                                <span style="color:var(--text); font-weight:bold;">+${h.xp} XP</span>
                                            </div>`;
                                        }).join('')}
                                    </div>
                                </details>`;
                            }
                        } catch(e) {}
                    }
                    
                    return `<tr style="${isAnomaly ? 'background:rgba(255,0,0,0.1);' : ''}">
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:12px;" class="muted">${escapeHtml(row.created_at)}</td>
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:14px; vertical-align: top;">
                            ${escapeHtml(row.source)}
                            ${historyHtml}
                        </td>
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:14px; font-weight:bold; vertical-align: top; ${isAnomaly ? 'color:var(--danger);' : ''}">+${escapeHtml(row.amount)}</td>
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:14px; vertical-align: top;">${escapeHtml(wpmStr)}</td>
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:14px; vertical-align: top;">${escapeHtml(durStr)}</td>
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:14px; vertical-align: top;">${escapeHtml(errStr)}</td>
                        <td style="padding:10px; border-bottom:1px solid var(--border); font-size:14px; vertical-align: top;">${escapeHtml(accStr)}</td>
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

    document.getElementById('admin-sort-select')?.addEventListener('change', loadUsers);
    loadUsers();

    // =========================================================
    // Вкладки: Пользователи / Донаты и Стена / Чат поддержки
    // =========================================================
    const adminTabs = document.querySelectorAll('#admin-tabs .segmented-tab');
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            adminTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.tab;
            document.getElementById('tab-content-users').style.display = target === 'users' ? 'block' : 'none';
            document.getElementById('tab-content-donations').style.display = target === 'donations' ? 'block' : 'none';
            document.getElementById('tab-content-chat').style.display = target === 'chat' ? 'block' : 'none';

            if (target === 'donations') loadDonations();
            if (target === 'chat') loadChatThreads();
        });
    });

    // =========================================================
    // Модерация донатов и Стены признания
    // =========================================================
    const donationsListEl = document.getElementById('admin-donations-list');

    async function loadDonations() {
        if (!donationsListEl) return;
        donationsListEl.innerHTML = '<p class="muted">' + t('admin.loading') + '</p>';

        try {
            const res = await fetch('api/admin_donations.php');
            const data = await res.json();
            const list = data.donations || [];

            if (!list.length) {
                donationsListEl.innerHTML = '<p class="muted">Пока нет входящих донатов или сообщений.</p>';
                return;
            }

            donationsListEl.innerHTML = list.map(d => {
                const isApproved = d.status === 'approved';
                const isRejected = d.status === 'rejected';
                const isPending = d.status === 'pending';
                const hasUser = !!d.user_id;

                let statusBadge = `<span class="wall-badge" style="background:rgba(255,255,255,0.1); color:var(--text-muted);">${escapeHtml(t('admin.donations.status_pending'))}</span>`;
                if (isApproved) statusBadge = `<span class="wall-badge" style="background:rgba(46,204,113,0.2); color:#2ecc71; border-color:#2ecc71;">${escapeHtml(t('admin.donations.status_approved'))}</span>`;
                if (isRejected) statusBadge = `<span class="wall-badge" style="background:rgba(231,76,60,0.2); color:#e74c3c; border-color:#e74c3c;">${escapeHtml(t('admin.donations.status_rejected'))}</span>`;

                return `
                    <div class="card mt-2" data-donation-id="${d.id}" data-user-id="${d.user_id || ''}">
                        <div class="flex-between flex-wrap gap-2">
                            <div>
                                <div style="font-weight:700; font-size:15px; display:flex; align-items:center; gap:8px;">
                                    <span>${escapeHtml(d.callsign)}</span>
                                    ${d.is_anonymous ? '<span class="muted" style="font-size:11px;">(Анонимно)</span>' : ''}
                                    ${d.is_sponsor ? `<span title="Спонсор проекта" style="color:var(--accent);">${(d.sponsor_badge && d.sponsor_badge !== 'none') ? d.sponsor_badge : '👑'} Спонсор</span>` : ''}
                                    ${statusBadge}
                                </div>
                                <div class="muted" style="font-size:12px; margin-top:3px;">
                                    Сумма: <b class="mono" style="color:var(--accent);">${d.amount} ₽</b> · 
                                    Тариф: <i>${escapeHtml(d.tier_title || '—')}</i> · 
                                    Дата: ${escapeHtml((d.created_at || '').slice(0, 19))}
                                    ${hasUser ? ` · Аккаунт: <b>${escapeHtml(d.user_name || '')}</b> (${escapeHtml(d.user_email || '')})` : ' · <i>(Гость)</i>'}
                                </div>
                                ${d.message ? `<div style="font-size:13.5px; margin-top:6px; padding:6px 10px; background:var(--surface-2); border-radius:6px; border-left:3px solid var(--accent);">«${escapeHtml(d.message)}»</div>` : ''}
                            </div>
                            <div class="btn-row" style="align-self:center;">
                                ${!isApproved ? `<button class="btn btn-sm donation-status-btn" data-status="approved" style="border-color:#2ecc71; color:#2ecc71;">${escapeHtml(t('admin.donations.approve_btn'))}</button>` : ''}
                                ${!isRejected ? `<button class="btn btn-sm donation-status-btn" data-status="rejected" style="border-color:var(--danger); color:var(--danger);">${escapeHtml(t('admin.donations.reject_btn'))}</button>` : ''}
                                ${hasUser ? (
                                    d.is_sponsor
                                        ? `<button class="btn btn-sm donation-sponsor-btn" data-make="0">${escapeHtml(t('admin.donations.remove_sponsor_btn'))}</button>`
                                        : `<button class="btn btn-sm donation-sponsor-btn" data-make="1" style="border-color:#f1c40f; color:#f1c40f;">${escapeHtml(t('admin.donations.make_sponsor_btn'))}</button>`
                                ) : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Навешиваем обработчики
            donationsListEl.querySelectorAll('.donation-status-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const card = btn.closest('[data-donation-id]');
                    const id = card.dataset.donationId;
                    const status = btn.dataset.status;
                    try {
                        const res = await fetch('api/admin_donations.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'set_status', id, status })
                        });
                        if (res.ok) loadDonations();
                        else alert('Ошибка изменения статуса');
                    } catch {
                        alert(t('js.admin.network_error'));
                    }
                });
            });

            donationsListEl.querySelectorAll('.donation-sponsor-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const card = btn.closest('[data-donation-id]');
                    const id = card.dataset.donationId;
                    const make = btn.dataset.make === '1';
                    try {
                        const res = await fetch('api/admin_donations.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'make_sponsor', id, is_sponsor: make })
                        });
                        if (res.ok) loadDonations();
                        else alert('Ошибка назначения спонсора');
                    } catch {
                        alert(t('js.admin.network_error'));
                    }
                });
            });

        } catch {
            donationsListEl.innerHTML = '<p class="muted">Ошибка загрузки донатов.</p>';
        }
    }

    // =========================================================
    // Чат поддержки со спонсорами (Админка)
    // =========================================================
    const threadsListEl = document.getElementById('admin-threads-list');
    const chatWindowEl = document.getElementById('admin-chat-window');
    const chatTargetUserEl = document.getElementById('admin-chat-target-user');
    const chatUserStatusEl = document.getElementById('admin-chat-user-status');
    const chatMessagesEl = document.getElementById('admin-chat-messages');
    const chatFormEl = document.getElementById('admin-chat-form');
    const chatInputEl = document.getElementById('admin-chat-input');

    let activeChatUserId = null;

    async function loadChatThreads() {
        if (!threadsListEl) return;
        threadsListEl.innerHTML = '<p class="muted p-2" style="padding:12px;">' + t('admin.loading') + '</p>';

        try {
            const res = await fetch('api/admin_support_threads.php');
            const data = await res.json();
            const threads = data.threads || [];

            if (!threads.length) {
                threadsListEl.innerHTML = '<p class="muted p-2" style="padding:12px;">' + escapeHtml(t('admin.chat.no_threads')) + '</p>';
                return;
            }

            threadsListEl.innerHTML = threads.map(th => `
                <div class="admin-thread-item ${activeChatUserId === th.user_id ? 'active' : ''}" data-user-id="${th.user_id}" data-user-name="${escapeHtml(th.name)}" data-is-sponsor="${th.is_sponsor ? '1' : '0'}">
                    <div class="admin-thread-name">
                        <span>${escapeHtml(th.name)} ${th.is_sponsor ? ((th.sponsor_badge && th.sponsor_badge !== 'none') ? th.sponsor_badge : '👑') : ''}</span>
                        ${th.unread_count > 0 ? `<span class="unread-badge">${th.unread_count}</span>` : ''}
                    </div>
                    <div class="admin-thread-preview">
                        ${escapeHtml(th.last_message_text || '')}
                    </div>
                </div>
            `).join('');

            threadsListEl.querySelectorAll('.admin-thread-item').forEach(item => {
                item.addEventListener('click', () => {
                    const uid = parseInt(item.dataset.userId, 10);
                    const name = item.dataset.userName;
                    const isSponsor = item.dataset.isSponsor === '1';
                    openAdminChat(uid, name, isSponsor);
                });
            });

            // Если уже выбран пользователь — обновляем подсветку
            if (activeChatUserId) {
                const activeEl = threadsListEl.querySelector(`[data-user-id="${activeChatUserId}"]`);
                if (activeEl) activeEl.classList.add('active');
            }
        } catch {
            threadsListEl.innerHTML = '<p class="muted p-2" style="padding:12px;">Ошибка загрузки обращений.</p>';
        }
    }

    async function openAdminChat(userId, userName, isSponsor) {
        activeChatUserId = userId;
        chatWindowEl.style.display = 'flex';
        chatTargetUserEl.innerHTML = `${escapeHtml(userName)} ${isSponsor ? '<span class="sponsor-crown">👑</span>' : ''}`;
        chatUserStatusEl.textContent = isSponsor ? 'Спонсор проекта' : 'Пользователь';
        chatMessagesEl.innerHTML = '<p class="muted" style="text-align:center;">' + t('admin.loading') + '</p>';

        // Подсвечиваем в списке
        threadsListEl.querySelectorAll('.admin-thread-item').forEach(item => {
            item.classList.toggle('active', parseInt(item.dataset.userId, 10) === userId);
        });

        try {
            const res = await fetch(`api/support_chat.php?user_id=${userId}`);
            const data = await res.json();
            const messages = data.messages || [];

            renderChatMessages(messages);
            // Прокручиваем вниз
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        } catch {
            chatMessagesEl.innerHTML = '<p class="muted">Ошибка загрузки сообщений.</p>';
        }
    }

    function renderChatMessages(messages) {
        if (!messages.length) {
            chatMessagesEl.innerHTML = '<p class="muted" style="text-align:center;">Диалог пуст.</p>';
            return;
        }

        chatMessagesEl.innerHTML = messages.map(m => {
            const isAdmin = m.sender_type === 'admin';
            const bubbleClass = isAdmin ? 'chat-bubble-admin' : 'chat-bubble-user';
            const timeStr = (m.created_at || '').slice(11, 16);

            return `
                <div class="chat-bubble ${bubbleClass}">
                    <div>${escapeHtml(m.message)}</div>
                    <span class="chat-bubble-time">${escapeHtml(timeStr)}</span>
                </div>
            `;
        }).join('');
    }

    if (chatFormEl) {
        chatFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activeChatUserId) return;
            const text = chatInputEl.value.trim();
            if (!text) return;

            chatInputEl.value = '';
            try {
                const res = await fetch('api/support_chat.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: activeChatUserId, message: text })
                });
                if (res.ok) {
                    // Перезагружаем сообщения
                    const r = await fetch(`api/support_chat.php?user_id=${activeChatUserId}`);
                    const d = await r.json();
                    renderChatMessages(d.messages || []);
                    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
                    loadChatThreads();
                }
            } catch {}
        });
    }
})();
