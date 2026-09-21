(function () {
    const tierCards = document.querySelectorAll('.donate-tier-card');
    const amountInput = document.getElementById('donate-amount');
    const tierTitleInput = document.getElementById('donate-tier-title');
    const copyBtn = document.getElementById('copy-sbp-link-btn');
    const form = document.getElementById('donate-report-form');
    const statusEl = document.getElementById('donate-form-status');
    const wallGrid = document.getElementById('wall-grid');

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // 1. Интерактивные карточки сумм
    tierCards.forEach(card => {
        card.addEventListener('click', () => {
            tierCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            const amount = card.dataset.amount;
            const tier = card.dataset.tier;

            if (amountInput) amountInput.value = amount;
            if (tierTitleInput) tierTitleInput.value = tier || '';

            // Если выбрали 0 ₽ — плавно подкручиваем к форме отправки спасибо
            if (amount === '0') {
                const formCard = document.getElementById('donate-report-form-card');
                if (formCard) {
                    formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const msgArea = document.getElementById('donate-message');
                    if (msgArea) msgArea.focus();
                }
            }
        });
    });

    // 2. Копирование ссылки СБП
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const link = copyBtn.dataset.link;
            try {
                await navigator.clipboard.writeText(link);
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '✅ ' + (window.t ? t('donate.sbp_copied') : 'Скопировано!');
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2500);
            } catch {
                prompt('Скопируйте ссылку вручную:', link);
            }
        });
    }

    // 3. Отправка формы (уведомление о донате / тёплые слова 0 ₽)
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const callsign = document.getElementById('donate-callsign').value.trim();
            const amount = parseInt(document.getElementById('donate-amount').value, 10) || 0;
            const message = document.getElementById('donate-message').value.trim();
            const isAnonymous = document.getElementById('donate-anonymous').checked;
            const tierTitle = tierTitleInput ? tierTitleInput.value : '';

            statusEl.innerHTML = '<span class="muted">' + (window.t ? t('index.loading') : 'Отправка…') + '</span>';

            try {
                const res = await fetch('api/donations.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        callsign: callsign,
                        amount: amount,
                        tier_title: tierTitle,
                        message: message,
                        is_anonymous: isAnonymous,
                    }),
                });
                const data = await res.json();

                if (res.ok && data.ok) {
                    statusEl.innerHTML = '<span style="color:var(--signal);">✅ ' + escapeHtml(data.message) + '</span>';

                    // Разблокируем ачивку «Друг MorseWave»
                    if (window.Progress && typeof Progress.markProjectSupporter === 'function') {
                        Progress.markProjectSupporter();
                    }

                    // Проигрываем CW-звук «TNX 73»
                    if (window.MorseAudio && typeof MorseAudio.playText === 'function') {
                        try {
                            const ctx = window.getSharedAudioContext ? getSharedAudioContext() : null;
                            if (ctx && ctx.state === 'suspended') await ctx.resume();
                            await MorseAudio.playText('TNX 73', 24);
                        } catch { /* аудио не критично */ }
                    }

                    // Очищаем поле сообщения
                    const msgEl = document.getElementById('donate-message');
                    if (msgEl) msgEl.value = '';

                    // Обновляем Стену признания
                    loadWall();
                } else {
                    statusEl.innerHTML = '<span style="color:var(--danger);">' + escapeHtml(data.error || 'Ошибка отправки') + '</span>';
                }
            } catch {
                statusEl.innerHTML = '<span style="color:var(--danger);">Сетевая ошибка при отправке</span>';
            }
        });
    }

    // 4. Загрузка Стены признания
    async function loadWall() {
        if (!wallGrid) return;
        try {
            const res = await fetch('api/donations.php?limit=50');
            const data = await res.json();
            const list = data.donations || [];

            if (!list.length) {
                wallGrid.innerHTML = '<p class="muted">' + (window.t ? t('donate.wall_empty') : 'Здесь пока нет сообщений.') + '</p>';
                return;
            }

            wallGrid.innerHTML = list.map(d => {
                const isSponsor = Number(d.is_sponsor) || d.amount >= 150;
                const badgeText = d.amount > 0 ? `${d.amount} ₽` : '💌 0 ₽';
                const dateStr = (d.created_at || '').slice(0, 10);
                const BADGE_MAP = { crown: '👑', heart: '💖', lightning: '⚡', radio: '📻', star: '⭐', sparkles: '✨', none: '' };
                const slug = d.sponsor_badge || 'crown';
                const sponsorIcon = BADGE_MAP[slug] !== undefined ? BADGE_MAP[slug] : (d.sponsor_badge || '👑');
                const cleanSlug = ['crown', 'heart', 'lightning', 'radio', 'star', 'sparkles'].includes(slug) ? slug : 'crown';
                const sponsorBadgeHtml = isSponsor && sponsorIcon ? `
                    <span class="sponsor-badge-wrap" data-badge="${cleanSlug}" tabindex="0" role="img" aria-label="Спонсор проекта MorseWave">
                        <span class="sponsor-crown">${sponsorIcon}</span>
                        <span class="sponsor-tooltip" role="tooltip"><span class="sponsor-tooltip-spark">✨</span><span class="sponsor-tooltip-text">Спонсор проекта MorseWave</span></span>
                    </span>` : '';

                return `
                    <div class="wall-card">
                        <div class="wall-card-header">
                            <span class="wall-callsign">
                                ${escapeHtml(d.callsign)}
                                ${sponsorBadgeHtml}
                            </span>
                            <span class="wall-badge">${escapeHtml(badgeText)}</span>
                        </div>
                        ${d.tier_title && d.tier_title !== '0' ? `<div class="muted" style="font-size:12px;">${escapeHtml(d.tier_title)}</div>` : ''}
                        ${d.message ? `<div class="wall-message">«${escapeHtml(d.message)}»</div>` : ''}
                        <div class="wall-date">${escapeHtml(dateStr)}</div>
                    </div>
                `;
            }).join('');
        } catch {
            wallGrid.innerHTML = '<p class="muted">Не удалось загрузить Стену признания.</p>';
        }
    }

    loadWall();
})();
