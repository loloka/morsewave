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
        listEl.innerHTML = '<p class="muted">Загрузка…</p>';
        try {
            const res = await fetch('api/admin_users.php');
            const data = await res.json();
            if (!res.ok) {
                listEl.innerHTML = `<p class="feedback show bad" style="display:block;">${escapeHtml(data.error || 'Ошибка загрузки')}</p>`;
                return;
            }
            renderUsers(data.users || []);
        } catch {
            listEl.innerHTML = '<p class="feedback show bad" style="display:block;">Не удалось связаться с сервером</p>';
        }
    }

    function renderUsers(users) {
        countEl.textContent = users.length;
        if (!users.length) {
            listEl.innerHTML = '<p class="muted">Пока никто не зарегистрировался.</p>';
            return;
        }
        listEl.innerHTML = users.map(u => `
            <div class="card mt-2" data-user-id="${u.id}">
                <div class="flex-between flex-wrap gap-2">
                    <div>
                        <div style="font-weight:700; font-size:15px;">
                            ${escapeHtml(u.name)}
                            ${u.email_verified_at ? '<span title="E-mail подтверждён">✅</span>' : '<span title="E-mail не подтверждён" style="opacity:.5;">✉️</span>'}
                            ${Number(u.is_admin) ? '<span title="Администратор" style="color:var(--accent);">🛠 админ</span>' : ''}
                        </div>
                        <div class="muted" style="font-size:12px;">${escapeHtml(u.email)} · зарегистрирован ${escapeHtml((u.created_at || '').slice(0, 10))}</div>
                        <div class="mono muted" style="font-size:12px; margin-top:4px;">
                            XP: ${u.xp ?? '—'} · серия: ${u.streak_count ?? '—'}
                        </div>
                    </div>
                    <div class="btn-row">
                        ${Number(u.is_admin)
                            ? '<button class="btn btn-sm admin-toggle-btn" data-make="0">Снять админа</button>'
                            : '<button class="btn btn-sm admin-toggle-btn" data-make="1" style="border-color:var(--accent); color:var(--accent);">Сделать админом</button>'}
                        <button class="btn btn-sm rename-btn">✏️ Переименовать</button>
                        <button class="btn btn-sm delete-btn" style="border-color:var(--danger); color:var(--danger);">🗑 Удалить</button>
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
    }

    async function setAdmin(card, makeAdmin) {
        const id = card.dataset.userId;
        const sure = confirm(makeAdmin
            ? 'Выдать этому пользователю права администратора?'
            : 'Снять права администратора с этого пользователя?');
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
                alert(data.error || 'Не получилось изменить права');
            }
        } catch {
            alert('Не удалось связаться с сервером');
        }
    }

    async function renameUser(card) {
        const id = card.dataset.userId;
        const currentName = card.querySelector('div[style*="font-weight:700"]').textContent.trim().replace(/[✅✉️]/g, '').trim();
        const newName = prompt('Новое имя:', currentName);
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
                alert(data.error || 'Не получилось переименовать');
            }
        } catch {
            alert('Не удалось связаться с сервером');
        }
    }

    async function deleteUser(card) {
        const id = card.dataset.userId;
        const sure = confirm('Точно удалить этого пользователя? Он пропадёт из лидерборда и не сможет войти в свой аккаунт. Действие необратимо.');
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
                alert(data.error || 'Не получилось удалить');
            }
        } catch {
            alert('Не удалось связаться с сервером');
        }
    }

    loadUsers();
})();
