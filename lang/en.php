<?php
// English dictionary. Keys must mirror lang/ru.php.
return [
    // --- common ---
    'lang.switch_to' => 'RU',
    'lang.switch_title' => 'Переключить на русский',

    // --- includes/header.php ---
    'site.title_suffix' => 'MorseWave',
    'site.title_home' => 'MorseWave — learn Morse code',
    'site.meta_description' => 'MorseWave — a modern Morse code trainer: Koch method, character groups, callsigns, achievements and daily drills.',

    // --- includes/nav.php ---
    'nav.home' => 'Home',
    'nav.learn' => 'Letters',
    'nav.koch' => 'Koch',
    'nav.groups' => 'Groups',
    'nav.callsigns' => 'Callsigns',
    'nav.achievements' => 'Achievements',
    'nav.account' => 'Account',
    'nav.open_profile' => 'Open profile',
    'nav.xp' => 'XP',
    'nav.level' => 'Lvl',

    // --- includes/footer.php ---
    'footer.license' => 'MIT License',
    'footer.author' => 'Author R9OGL',
    'footer.main_site' => 'Main site r9o.ru',
    'footer.source' => 'Source code & changelog',
    'footer.terms' => 'Terms',
    'footer.privacy' => 'Privacy',
    'footer.key_hardware' => 'Real key',

    // --- index.php ---
    'index.hero_title' => 'Listen to the signal. Decode the telegraph code. Speak the language of the airwaves.',
    'index.hero_lead' => 'MorseWave is a Morse code trainer with the Koch method, character group drills, and callsign practice. Train from your phone or computer, earn XP, and keep a daily streak going.',
    'index.start_letters' => 'Start with letters',
    'index.koch_method' => 'Koch method →',
    'index.stat_xp' => 'Experience (XP)',
    'index.stat_level' => 'Level',
    'index.stat_streak' => 'Daily streak',
    'index.stat_learned' => 'Symbols learned',
    'index.leaderboard_title' => 'Leaderboard',
    'index.leaderboard_join' => 'Join in',
    'index.leaderboard_intro' => 'The numbers here come from people who created an account and pressed "Publish" themselves — that\'s optional, all progress works great in your browser without an account too.',
    'index.leaderboard_view_all' => 'View full leaderboard →',
    'leaderboard.you_badge' => 'You',
    'index.board_by_xp' => 'By XP',
    'index.board_by_streak' => 'By streak',
    'index.loading' => 'Loading…',
    'index.start_eyebrow' => 'Where to start',
    'index.start_h2' => 'Beginner\'s path: from silence to the airwaves in 5 steps',
    'index.start_intro' => 'You don\'t have to follow this exact order, but this sequence is the fastest way to learn Morse code.',
    'index.step1_title' => 'Learn your first symbols',
    'index.step1_text' => 'Start on the "Letters" page — tap out each symbol with the key (tap the screen or hold spacebar) and listen to how it sounds. Don\'t try to learn everything at once — 5–10 symbols is plenty to start with.',
    'index.step1_btn' => 'Start with letters →',
    'index.step2_title' => 'Move on to the Koch method',
    'index.step2_text' => 'Once you\'ve learned your first couple of symbols, it\'s time for the Koch method: symbols play at full speed right away, no "slow first, then faster." A new symbol unlocks automatically once your accuracy is consistently high.',
    'index.step2_btn' => 'Koch method →',
    'index.step3_title' => 'Build speed with groups',
    'index.step3_text' => 'Once at least 10 symbols are unlocked in Koch, move on to groups: practice copying random combinations of 2–5 symbols by ear. This hones speed and confidence in copying, not memorization.',
    'index.step3_btn' => 'Character groups →',
    'index.step4_title' => 'Dive into real airwaves',
    'index.step4_text' => 'The final stage — ham radio callsigns and service abbreviations (CQ, QTH, 73…). This is as close as it gets to what actually sounds on the air.',
    'index.step4_btn_callsigns' => 'Callsigns →',
    'index.step4_btn_abbrev' => 'Abbreviations →',
    'index.step5_title' => 'Go on the air — Morse Walker',
    'index.step5_text' => 'Once you can confidently copy callsigns and abbreviations, the trainer has done its job: what you need next isn\'t copying individual signs, but working the airwaves. Morse Walker is a pile-up radio contact simulator: stations answer your CQ, and you need to copy them and complete a QSO. It has contest and POTA modes, adjustable speed and Farnsworth spacing, and interference/fading to taste.',
    'index.step5_credit' => 'Project author — {author}, adaptation and localization — {adapter}, author of MorseWave.',
    'index.step5_btn' => 'Open Morse Walker →',
    'index.invasion_eyebrow' => 'New mode',
    'index.invasion_title' => 'Invasion — a mini-game for copying by ear',
    'index.invasion_text' => 'Aliens are closing in on your base, each one carrying a letter. Recognize it by ear and hit the right key before it lands — a shovel flies out from the base. Lives inside "Letters" as a fourth sub-mode.',
    'index.invasion_btn' => 'To battle →',
    'index.daily_eyebrow' => 'Daily challenge',
    'index.daily_btn' => 'Take the challenge (+50 XP)',
    'index.community_eyebrow' => 'Community',
    'index.community_text' => 'Together with other MorseWave operators: {groups} character groups and {callsigns} callsigns copied.',

    // --- learn.php ---
    'learn.title' => 'Learn letters',
    'learn.eyebrow' => 'Basics',
    'learn.h1' => 'Learn letters and digits',
    'learn.intro' => 'Two modes: <b>sending</b> — you tap out the symbol yourself with the key, and <b>ear training</b> — you listen and tap the letter you heard on the on-screen keyboard. The second mode works great once you already know the letters individually.',
    'learn.mode_send' => '📡 Sending with key',
    'learn.mode_recognize' => '👂 Ear training',
    'learn.mode_rhythm' => '🎵 Key rhythm',
    'learn.rhythm_intro' => 'Pick a character and key it (tap or spacebar) — we compare the real durations of dots, dashes, and the pauses between them against the ideal ratio 1 : 3 : 1. <b>Speed (wpm) is fully adjustable</b> — the ideal timing is recalculated relative to it, so you can train a steady rhythm anywhere from 5 wpm to 30: the faster the speed, the stricter the timing requirements. 5 accurate reps in a row (rhythm accuracy of 80% or more) masters the letter\'s rhythm: +25 XP once, then you keep practicing without XP.',
    'learn.rhythm_streak_label' => 'Accurate reps in a row for this letter:',
    'learn.rhythm_stat_best' => "This letter's best",
    'learn.rhythm_stat_accuracy' => 'Session accuracy',
    'learn.rhythm_stat_total' => 'Correct attempts',
    'learn.rhythm_signal_up_hint' => '▲ longer than ideal — go faster',
    'learn.rhythm_signal_down_hint' => '▼ shorter than ideal — go slower',
    'learn.mode_invasion' => '👽 Invasion',
    'learn.invasion_intro' => 'Aliens are advancing on your base — listen to the signal, figure out the letter, and pick it on the keyboard before the alien gets there. 1 XP per correct hit. A missed alien costs the base 1 HP (100 HP total). Hit #100 is a boss saucer — it takes 3 correct hits in a row, and breaking through costs the base 30 HP. Win the wave for a one-time bonus: however much base HP survived, plus a reaction-speed bonus (10-30).',
    'learn.invasion_start' => 'Engage',
    'learn.invasion_stop' => 'Stop',
    'learn.invasion_base_hp' => 'Base HP',
    'learn.invasion_stat_best_combo' => 'Best combo',
    'learn.invasion_kbd_hint' => 'QWERTY layout — just like a real keyboard. You can also type directly on your computer keyboard, not just tap the keys.',
    'learn.order_alphabet' => 'Latin + digits',
    'learn.order_koch' => 'Koch order',
    'learn.order_cyrillic' => 'Cyrillic',
    'learn.practicing_symbol' => 'Practicing symbol',
    'learn.speed' => 'Speed',
    'learn.streak_label' => 'Correct reps in a row:',
    'learn.tap_or_space' => 'Tap or<br>space',
    'learn.listen_btn' => '▶ Listen',
    'learn.real_key_hint' => 'Want to train with a real telegraph key instead of the spacebar?',
    'learn.real_key_hint_link' => 'How to connect →',
    'learn.rec_intro' => 'Press "Start training" — symbols will play one after another without stopping. After each answer (by tapping a tile <b>or using the keyboard</b>) the next symbol plays right away — you can\'t skip without answering.',
    'learn.rec_set_all' => 'All letters & digits',
    'learn.rec_set_letters' => 'Letters only',
    'learn.rec_set_digits' => 'Digits only',
    'learn.rec_set_learned' => 'Learned only',
    'learn.rec_set_cyrillic' => 'Cyrillic characters',
    'learn.rec_set_custom' => 'Custom characters',
    'learn.rec_custom_placeholder' => 'e.g. A E I O U',
    'learn.rec_custom_hint' => 'At least 5 characters, space-separated — Latin or Cyrillic, mixing is fine',
    'learn.rec_start' => '▶ Start training',
    'learn.rec_stop' => '⏹ Stop',
    'learn.stat_streak' => 'Streak',
    'learn.stat_best' => 'Best streak',
    'learn.stat_accuracy' => 'Session accuracy',
    'learn.stat_total' => 'Total correct',

    // --- koch.php ---
    'koch.title' => 'Koch method',
    'koch.eyebrow' => 'CW classic',
    'koch.h1' => 'Koch method',
    'koch.intro' => 'Symbols are played at full target speed right away — instead of slowing the signal down, you gradually add new symbols. Complete a session of 5-symbol groups with ≥ 90% accuracy to unlock the next symbol.',
    'koch.opened' => 'Symbols unlocked',
    'koch.current_charset_hint' => 'Current symbol set — tap to hear it',
    'koch.jump_hint' => 'Not a beginner anymore — or want to start over? Set the number of unlocked symbols (you can lower it too):',
    'koch.jump_apply' => 'Set',
    'koch.session_settings' => 'Session settings',
    'koch.symbol_speed' => 'Symbol speed',
    'koch.farnsworth' => 'Farnsworth',
    'koch.farnsworth_tooltip' => 'The Farnsworth method is a popular way to learn Morse code where individual characters are sent at full speed, but the pauses between them and between words are stretched out. This lets you perceive a letter as a single sound pattern instead of counting dots and dashes in your head.',
    'koch.groups_per_session' => 'Groups per session:',
    'koch.start_session' => '▶ Start session',
    'koch.group_label' => 'Group',
    'koch.replay' => '🔁 Replay',
    'koch.answer_placeholder' => 'Type the symbols…',
    'koch.check' => 'Check →',
    'koch.result_title' => 'Session result',
    'koch.result_accuracy' => 'Accuracy',
    'koch.result_correct' => 'Correct symbols',
    'koch.result_xp' => 'XP earned',
    'koch.new_session' => 'New session',

    // --- groups.php ---
    'groups.title' => 'Character groups',
    'groups.eyebrow' => 'Ear training',
    'groups.h1' => 'Character groups',
    'groups.intro' => 'Classic copy practice: listen to random groups of characters and write down what you hear. Input is available right away — type while the audio is still playing.',
    'groups.mode_groups' => '🔢 Character groups',
    'groups.mode_words' => '📝 Real words',
    'groups.mode_abbrev' => '📻 Abbreviations',
    'groups.settings' => 'Settings',
    'groups.length_label' => 'Group length',
    'groups.charset_label' => 'Character set',
    'groups.set_letters' => 'Letters',
    'groups.set_digits' => 'Digits',
    'groups.set_mixed' => 'Letters + digits',
    'groups.set_learned' => 'Learned only',
    'groups.set_custom' => 'Custom characters',
    'groups.custom_placeholder' => 'e.g. A E I O U',
    'groups.custom_hint' => 'At least 5 characters, space-separated',
    'groups.speed' => 'Speed',
    'groups.farnsworth' => 'Farnsworth',
    'groups.groups_per_session' => 'Groups per session:',
    'groups.farnsworth_tooltip' => 'The Farnsworth method is a popular way to learn Morse code where individual characters are sent at full speed, but the pauses between them and between words are stretched out. This lets you perceive a letter as a single sound pattern instead of counting dots and dashes in your head.',
    'groups.start_session' => '▶ Start session',
    'groups.exam_mode' => '🎓 Exam mode',
    'groups.exam_hint' => 'Exam mode: 50 groups of 5 characters (letters + digits), 250 characters total, 12 wpm speed (60 characters/min), 850 Hz tone. Groups play one after another with a short pause, without waiting for your answer — endurance training, like a real exam.',
    'groups.group_label' => 'Group',
    'groups.replay' => '🔁 Replay',
    'groups.answer_placeholder' => 'Type the symbols…',
    'groups.check' => 'Check →',
    'groups.exam_placeholder' => 'Type groups separated by spaces or new lines…',
    'groups.exam_transmitting' => '⏳ Transmitting…',
    'groups.result_title' => 'Session result',
    'groups.result_accuracy' => 'Accuracy',
    'groups.result_correct' => 'Correct symbols',
    'groups.result_xp' => 'XP earned',
    'groups.mistakes_hint' => 'Some symbols had mistakes — no big deal, that\'s a normal part of training. You can go through just those again, separately from the rest.',
    'groups.retrain_mistakes' => '🔁 Retry mistakes only (',
    'groups.new_session' => 'New session',
    'groups.words_intro' => 'Random groups train each character on its own, but on the air, words fly by. An experienced operator recognizes a common word as a single sound pattern, without spelling it out letter by letter — that\'s exactly what this trains.',
    'groups.words_what' => 'What you\'ll copy',
    'groups.wset_words' => 'Common words',
    'groups.wset_phrases' => 'QSO phrases',
    'groups.wset_mixed' => 'Mixed',
    'groups.wset_hint_words' => 'Short, very common English words — a good starting point for building speed.',
    'groups.words_per_session' => 'Words per session:',
    'groups.words_farnsworth_note' => 'Farnsworth is on by default here: the characters themselves play fast (so a word is heard as a single pattern), while the pauses between them are stretched out — giving you time to think. This is exactly the case the method was designed for.',
    'groups.words_answer_placeholder' => 'Type what you heard…',
    'groups.words_stop' => '⏹ Finish',
    'groups.words_result_correct' => 'Copied in full',
    'groups.abbrev_intro' => 'A random ham radio abbreviation plays (a Q-code, a service code, or a common shorthand) — tap the tile with what you heard. After answering, we\'ll show the meaning even if you got it wrong.',
    'groups.abbrev_start' => '▶ Start training',
    'groups.abbrev_stop' => '⏹ Stop',
    'groups.abbrev_streak' => 'Streak:',
    'groups.abbrev_correct' => 'Correct:',
    'groups.abbrev_of' => 'of',
    'groups.abbrev_reference_toggle' => '📖 Show all abbreviations with meanings',

    // --- callsigns.php ---
    'cs.title' => 'Callsigns',
    'cs.eyebrow' => 'Operator practice',
    'cs.h1' => 'Callsign training',
    'cs.intro' => 'Copy realistically formatted ham radio callsigns — as close to real airwaves as it gets. The database is built by fellow hams — add your own callsign below if it\'s not here yet.',
    'cs.settings' => 'Settings',
    'cs.speed' => 'Speed',
    'cs.per_session' => 'Callsigns per session:',
    'cs.start_session' => '▶ Start session',
    'cs.callsign_label' => 'Callsign',
    'cs.replay' => '🔁 Replay',
    'cs.answer_placeholder' => 'Type the callsign…',
    'cs.check' => 'Check →',
    'cs.result_title' => 'Session result',
    'cs.result_exact' => 'Exact matches',
    'cs.result_correct' => 'Correct',
    'cs.result_xp' => 'XP earned',
    'cs.new_session' => 'New session',
    'cs.add_title' => 'Add your callsign',
    'cs.add_intro' => 'Know a callsign that\'s not here yet? Add it — it\'ll join the shared training pool for everyone. Format matches real callsigns (letters and digits mixed, e.g. R7AB, UA3XYZ, W1AW).',
    'cs.add_placeholder' => 'e.g. R7AB',
    'cs.add_country_placeholder' => 'Country (optional)',
    'cs.add_btn' => 'Add',

    // --- achievements.php ---
    'ach.title' => 'Achievements',
    'ach.eyebrow' => 'Progress',
    'ach.h1' => 'Achievements',
    'ach.intro' => 'Every milestone on the way from your first signal to confident copy — learn letters, keep a daily streak, build up speed. New achievements will keep appearing as the trainer grows.',
    'ach.reset_title' => 'Reset progress',
    'ach.reset_intro' => 'Resets XP, level, daily streak, learned symbols, Koch method level, and all achievements. Useful if you want a clean start, or if a newcomer accidentally unlocked too much (e.g. all 38 Koch symbols at once). This action cannot be undone.',
    'ach.reset_btn' => '⚠ Reset all progress',

    // --- account.php ---
    'acc.title' => 'Profile & settings',
    'acc.eyebrow' => 'Profile',
    'acc.h1' => 'Profile & settings',
    'acc.tab_profile' => '👤 Profile',
    'acc.tab_sound' => '🔊 Sound',
    'acc.tab_display' => '👁 Display',
    'acc.tab_backup' => '💾 Backup',
    'acc.profile_intro' => 'An account is useful for two things: the leaderboard on the home page (opt-in — only if you press "Publish" yourself) and syncing progress across devices. Everything works without an account too — progress lives in this browser.',
    'acc.mode_login' => 'Log in',
    'acc.mode_register' => 'Sign up',
    'acc.login_h3' => 'Log in',
    'acc.email_ph' => 'Email',
    'acc.password_ph' => 'Password',
    'acc.login_btn' => 'Log in',
    'acc.forgot_link' => 'Forgot password?',
    'acc.reset_request_h3' => 'Password recovery',
    'acc.reset_request_intro' => 'We\'ll email you a link to set a new password (valid for 1 hour). The email can\'t be sent more than once every 5 minutes.',
    'acc.reset_email_ph' => 'Account email',
    'acc.captcha_hint' => 'Decode the Morse code — this is a CAPTCHA, a bot check',
    'acc.listen_btn' => '▶ Listen',
    'acc.other_code_btn' => '🔄 Another code',
    'acc.captcha_answer_ph' => 'What\'s encoded here?',
    'acc.send_link_btn' => 'Send link',
    'acc.new_password_h3' => 'New password',
    'acc.new_password_intro' => 'You followed the link from the email — set a new password for your account.',
    'acc.new_password_ph' => 'New password (at least 6 characters)',
    'acc.repeat_new_password_ph' => 'Repeat new password',
    'acc.save_password_btn' => 'Save password',
    'acc.register_h3' => 'Sign up',
    'acc.register_intro' => 'Your name will be visible to everyone on the leaderboard — you can use a callsign or nickname, no need for your real name.',
    'acc.register_name_ph' => 'Name or callsign',
    'acc.register_email_ph' => 'Email (for account recovery)',
    'acc.register_password_ph' => 'Password (at least 6 characters)',
    'acc.repeat_password_ph' => 'Repeat password',
    'acc.agree_prefix' => 'I accept the',
    'acc.agree_terms' => 'terms of service',
    'acc.agree_and' => 'and',
    'acc.agree_privacy' => 'privacy policy',
    'acc.agree_suffix' => ', and consent to processing of my personal data.',
    'acc.create_account_btn' => 'Create account',
    'acc.logged_in_as' => 'Logged in as',
    'acc.admin_link' => '🛠 Admin',
    'acc.logout_title' => 'Progress is saved to your account and will return next time you log in',
    'acc.logout_btn' => 'Log out',
    'acc.logout_note' => 'When you log out, training progress is removed from this browser — it stays saved in your account and returns as soon as you log back in (handy on a shared computer).',
    'acc.manual_sync_title' => 'Pull and merge progress with other devices right now',
    'acc.manual_sync_btn' => '🔄 Sync with other devices',
    'acc.publish_h3' => 'Publish current progress',
    'acc.publish_intro' => 'Your XP and daily streak are stored locally in this browser and <b>are never published automatically</b>. Until you press the button below, you won\'t appear on the leaderboard at all. Publishing is unavailable until your email is confirmed (this guards against accidental duplicates on the board, not cheating).',
    'acc.local_xp' => 'Your XP (local)',
    'acc.local_streak' => 'Your daily streak',
    'acc.publish_btn' => '🔄 Publish to leaderboard',
    'acc.settings_summary' => 'Account settings — name, password, email',
    'acc.name_hint' => 'Name (shown on the leaderboard)',
    'acc.change_name_btn' => 'Change name',
    'acc.change_password_hint' => 'Change password',
    'acc.current_password_ph' => 'Current password',
    'acc.change_password_btn' => 'Change password',
    'acc.change_email_hint' => 'Change email (the new address will need to be confirmed by email)',
    'acc.new_email_ph' => 'New email',
    'acc.change_email_btn' => 'Change email',
    'acc.delete_account_h3' => 'Delete account',
    'acc.delete_account_intro' => 'The account, leaderboard entry, and server-side progress copy are deleted permanently. Local progress in this browser stays — you can remove it separately with the "Reset all progress" button on the achievements page. For questions about deletion, you can also write to',
    'acc.delete_account_reveal_btn' => 'Delete account…',
    'acc.delete_confirm_ph' => 'Password to confirm',
    'acc.cancel_btn' => 'Cancel',
    'acc.delete_confirm_btn' => 'Yes, delete permanently',
    'acc.sound_h2' => 'Signal tone',
    'acc.sound_intro' => 'Applies immediately across all trainer pages — listening, sending with the key, and sidetone. No account needed, stored in this browser.',
    'acc.tone_freq_hint' => 'Tone frequency',
    'acc.waveform_hint' => 'Waveform',
    'acc.wave_sine' => 'Sine (soft)',
    'acc.wave_triangle' => 'Triangle (warm)',
    'acc.wave_square' => 'Square (sharp)',
    'acc.wave_sawtooth' => 'Sawtooth (buzzy)',
    'acc.test_tone_btn' => '▶ Test sound',
    'acc.reset_tone_btn' => 'Reset to default',
    'acc.tone_note' => 'A 600 Hz sine wave is the classic CW radio tone, closest to real airwaves. Square/sawtooth sound sharper and buzzier — some people find dots/dashes easier to tell apart with those.',
    'acc.display_h2' => 'Display',
    'acc.signal_line_label' => 'Show the signal line (dots-dashes) during ear training',
    'acc.signal_line_note' => 'The dots and dashes on screen are essentially a hint: it\'s easier to read them with your eyes than to work them out by ear. If you want to train your ear specifically, not your eyes — turn it off. The same toggle is available right on every ear-training page (a button next to the lamp) — it\'s a shared setting, wherever you flip it, it applies everywhere.',
    'acc.backup_h2' => 'Progress backup',
    'acc.backup_intro' => 'All progress is stored in this browser. If you clear your history, switch computers, or just want a safety net — save the file and keep it handy. No account needed.',
    'acc.backup_export_btn' => '⬇ Download backup',
    'acc.backup_import_btn' => '⬆ Load backup',
    'acc.backup_note' => 'Loading a backup doesn\'t erase anything: data from the file and your current data are merged using "whichever is greater wins". Learned letters and achievements are combined. So loading an old file on top of newer progress is safe.',

    // --- admin.php ---
    'admin.title' => 'Admin',
    'admin.eyebrow' => 'Admin',
    'admin.h1' => 'Users',
    'admin.forbidden' => 'This page is for administrators only.',
    'admin.total_accounts' => 'Total accounts:',
    'admin.loading' => 'Loading…',

    // --- terms.php / privacy.php ---
    'legal.docs_eyebrow' => 'Documents',
    'terms.title' => 'Terms of Service',
    'terms.h1' => 'Terms of Service',
    'terms.updated' => 'Last updated: July 24, 2026.',
    'terms.body' => <<<'HTML'
<p>MorseWave is a free Morse code trainer. By using the site, you agree to
    these simple rules. We tried to write them in plain language rather than
    legal jargon.</p>

<h2>1. What this site is</h2>
<p>MorseWave helps you learn and practice sending and receiving Morse code:
    individual letters, the Koch method, character groups, real words,
    callsigns, daily tasks, and achievements. Your progress (XP, level, daily
    streak, learned symbols) is stored primarily right in your browser and
    works even without an account.</p>

<h2>2. Account</h2>
<p>An account is only needed for the leaderboard and syncing progress across
    devices — it's not required. If you do create one:</p>
<ul>
    <li>use a real email — it's needed to recover access;</li>
    <li>your name or callsign will be visible to others on the leaderboard
        only if you choose to publish your numbers yourself (off by
        default);</li>
    <li>you're responsible for keeping your password safe.</li>
</ul>

<h2>3. Fair play</h2>
<p>XP, levels, and daily streaks exist for one reason — so <em>you</em> can
    see yourself improving. Padding your XP, editing save data, cheat codes,
    and similar tricks mostly cheat you, not us: the number in your profile
    goes up, but your actual ear-copying skill unfortunately doesn't. You're
    just robbing yourself of the satisfaction of earning it honestly.</p>
<p>We don't specifically hunt for this and don't consider it a "crime." There
    is one exception, though — the leaderboard: it's shared, and dishonest
    numbers there affect other people. So if an account with clearly inflated
    numbers turns up on the leaderboard, the administration reserves the
    right to remove it from the board or delete it — so it's not unfair to
    those who earned their numbers honestly. Nothing personal, just fair.</p>

<h2>4. Don't harm the site</h2>
<p>This one is more serious than "cheating yourself." Deliberately breaking
    the site, generating excessive load, exploiting vulnerabilities,
    bypassing protections, or interfering with the service or other users is
    not allowed. Such actions harm a shared project that everyone uses, and
    lead to access being blocked and the account being deleted.</p>
<p>If you find a bug, a loophole, or a security hole — don't exploit it,
    tell the administration instead. That's always appreciated: it's how the
    project gets better for everyone.</p>

<h2>5. No guarantees</h2>
<p>The site is provided "as is." We try to keep everything working and make
    sure progress isn't lost, but we can't guarantee that 100% — outages,
    bugs, and updates can happen. It's worth backing up valuable progress
    from time to time (there's a button in your profile for that). The
    administration is not liable for possible data loss or temporary service
    unavailability.</p>

<h2>6. Changes</h2>
<p>These terms may change over time — the current version is always on this
    page, with the update date shown at the top. By continuing to use the
    site after changes are made, you accept the new version.</p>

<p class="mt-3">How we handle your data is described in the
    <a href="privacy.php" class="link">Privacy Policy</a>. For any questions —
    <a href="mailto:morse@r9o.ru" class="link">morse@r9o.ru</a>.</p>
HTML,

    'privacy.title' => 'Privacy Policy',
    'privacy.h1' => 'Privacy Policy',
    'privacy.updated' => 'Last updated: July 24, 2026.',
    'privacy.body' => <<<'HTML'
<p>Here's a plain, no-nonsense rundown of what data MorseWave collects, why,
    and what you can do about it. Short version: we collect the bare minimum,
    we don't sell anything, and we don't show ads.</p>

<h2>1. Who processes the data</h2>
<p>The site operator is the MorseWave administration (R9OGL). For any
    questions about data processing, or to delete your account, write to
    <a href="mailto:morse@r9o.ru" class="link">morse@r9o.ru</a>.</p>

<h2>2. What data, and why</h2>
<ul>
    <li><b>Training progress</b> (XP, level, daily streak, learned symbols)
        is stored primarily in <b>your browser</b> (localStorage) and never
        leaves it automatically. A server-side copy is only created if you
        set up an account — and it exists solely to sync progress across
        your devices.</li>
    <li><b>Email</b> — only if you register. It's used for logging in,
        password recovery, and address confirmation.</li>
    <li><b>Name or callsign</b> — whatever you entered when registering. It
        becomes public (on the leaderboard) only if you press "Publish"
        yourself. Off by default.</li>
    <li><b>Password</b> is stored <b>only as a hash</b> (a one-way
        fingerprint). We never see or store it in plain text.</li>
    <li><b>Technical data</b> — such as a failed-login-attempt counter and
        CAPTCHA. Used solely to protect against password guessing and bots.</li>
    <li><b>Session cookie</b> — one technical cookie that keeps you logged
        in between pages. Login is impossible without it.</li>
</ul>

<h2>3. Who we share it with</h2>
<p>We <b>don't sell</b> data and <b>don't show ads</b>. The only data we
    share is with the email service
    <a href="https://resend.com" target="_blank" rel="noopener" class="link">Resend</a>,
    which delivers our emails (email confirmation and password recovery).
    Only what's needed to send an email goes to them — your address and
    name; your progress, password, or activity on the site is never shared
    with them.</p>
<p class="muted" style="font-size:13px;">Resend isn't just any service: it's
    certified for <b>SOC 2 Type II</b> and <b>GDPR</b>, is part of the
    <b>EU-US Data Privacy Framework</b>, and encrypts data at rest (AES-256)
    and in transit (TLS). There are no third-party trackers or analytics
    systems on the site.</p>

<h2>4. How long we keep it</h2>
<p>Account data is kept for as long as the account exists. If you delete
    your progress using the "Reset all progress" button, the server-side
    progress copy is deleted too. You can clear your local browser data
    yourself at any time — the same as when logging out of your account.</p>

<h2>5. Your rights</h2>
<p>You can view and change your data (name, email, password) in your profile
    and delete your progress. You can delete your account yourself — with
    the "Delete account" button in your profile (along with the entire
    server-side data copy); or, if more convenient, write to
    <a href="mailto:morse@r9o.ru" class="link">morse@r9o.ru</a>. Your local
    progress is always fully under your control — it lives in your browser.</p>

<h2>6. About cookies and the "consent banner"</h2>
<p>The site only uses one necessary cookie — the login session. Technical
    cookies like this are required for the service to function and, under
    general rules, don't require separate consent, so we don't have an
    intrusive banner. We don't set advertising or analytics cookies.</p>

<h2>7. Consent</h2>
<p>By registering an account, you confirm that you've read this policy and
    the <a href="terms.php" class="link">Terms of Service</a> and consent to
    the described data being processed as described here.</p>
HTML,

    // --- keyhardware.php ---
    'keyhardware.eyebrow' => 'DIY',
    'keyhardware.title' => 'Connecting a real telegraph key',
    'keyhardware.h1' => 'A real telegraph key instead of a keyboard',
    'keyhardware.updated' => 'Experimental guide, version 1 — feedback welcome.',
    'keyhardware.body' => <<<'HTML'
<p>In "Send" and "Key rhythm" (under "Letters"), holding a key down produces a
    dot/dash, exactly like on a real telegraph key. You can already trigger it
    not just by tapping the on-screen button, but with the <b>spacebar</b> on
    a keyboard. The point of this page is to replace that spacebar with an
    actual telegraph key, without changing anything in the site's code: all
    you need is a board that sends a spacebar press to the computer, as a
    regular USB keyboard, whenever the key's contacts close.</p>

<h2>1. What you'll need</h2>
<ul>
    <li>A board built on the <b>ATmega32u4</b> with "real" native USB (not a
        separate USB-serial chip) — for example an <b>Arduino Pro Micro</b>,
        <b>Arduino Leonardo</b>, or <b>Arduino Micro</b>. Only these boards
        have the <code>Keyboard.h</code> library in the Arduino IDE, which
        can act as a keyboard out of the box.</li>
    <li>The telegraph key itself (or any normally-open contact/button, if you
        just want to test the circuit first).</li>
    <li>Two wires (alligator clips are handy so you don't have to solder
        right away).</li>
    <li>A micro-USB cable (or whatever fits your board) to the computer.</li>
    <li><a href="https://www.arduino.cc/en/software" target="_blank" rel="noopener" class="link">Arduino IDE</a>,
        free.</li>
</ul>
<p class="muted" style="font-size:13px;"><b>Important:</b> Arduino Uno and
    Nano (based on the ATmega328P) will <em>not</em> work for this without
    extra hoop-jumping (reflashing the USB controller) — they don't have
    built-in <code>Keyboard.h</code> support. If you don't have a board yet
    and are buying one, get a Pro Micro/Leonardo/Micro specifically.</p>

<h2>2. Wiring</h2>
<p>All you need is one digital pin and ground:</p>
<ul>
    <li>One key contact — to any digital pin, e.g. <b>D2</b>.</li>
    <li>The other key contact — to the board's <b>GND</b>.</li>
</ul>
<p>No external resistor needed — the firmware below enables the pin's
    internal pull-up resistor (<code>INPUT_PULLUP</code>): while the key is
    open, the pin reads HIGH; the moment it closes, it reads LOW. That's the
    transition the firmware uses to know "pressed"/"released".</p>

<h2>3. Firmware</h2>
<p>Open the Arduino IDE, paste the sketch below, and upload it to the board:</p>
<pre class="code-block"><code>#include &lt;Keyboard.h&gt;

const int KEY_PIN = 2;               // key: one contact here, the other to GND
const unsigned long DEBOUNCE_MS = 5; // contact debounce

bool pressed = false;      // has a HID "space down" already been sent
bool lastReading = HIGH;   // last raw pin reading
unsigned long lastChangeAt = 0;

void setup() {
  pinMode(KEY_PIN, INPUT_PULLUP); // open = HIGH, closed = LOW
  Keyboard.begin();
}

void loop() {
  bool reading = digitalRead(KEY_PIN);

  if (reading != lastReading) {
    lastChangeAt = millis();
    lastReading = reading;
  }

  if (millis() - lastChangeAt > DEBOUNCE_MS) {
    bool keyDown = (reading == LOW);
    if (keyDown && !pressed) {
      Keyboard.press(' ');
      pressed = true;
    } else if (!keyDown && pressed) {
      Keyboard.release(' ');
      pressed = false;
    }
  }
}
</code></pre>
<p>Nothing more to it: while the key's contacts stay closed, the board holds
    the spacebar "down" — exactly as if you were holding it with your finger.
    Release the key and the board releases the spacebar. The press duration
    is what determines dot vs. dash, and the site already handles that — the
    board doesn't need to know anything about it.</p>

<h2>4. Flashing it</h2>
<ol>
    <li>Install the Arduino IDE, connect the board over USB.</li>
    <li>Under <b>Tools → Board</b>, choose "Arduino Leonardo" (for a genuine
        Leonardo/Micro) or "SparkFun Pro Micro" via the boards manager if
        you're using a Pro Micro clone — the seller's page usually says which
        board setting to pick.</li>
    <li>Under <b>Tools → Port</b>, choose the port the board shows up on.</li>
    <li>Paste the code from step 3 and hit "Upload".</li>
</ol>

<h2>5. Testing it</h2>
<p>Open "Letters" → "Send" or "Key rhythm", click anywhere on the page (so
    focus definitely isn't in a text field), and press the key — it should
    trigger the exact same reaction as pressing spacebar.</p>
<p class="muted" style="font-size:13px;"><b>Good to know:</b> while the board
    is connected, it sends the spacebar to <em>whatever window currently has
    focus</em> — not just the browser. If you press the key while some other
    window is active, a plain spacebar goes there instead (which might, say,
    scroll a page or pause a video). Nothing breaks, but it's a reason to keep
    the trainer's tab focused during practice.</p>

<h2>6. What's next</h2>
<p>This is the simplest path — keyboard emulation. Still on the list (no
    promises on timing): a Web Serial API path for DIY adapters with their
    own protocol, and receiving the signal straight from a microphone via tone
    detection — that would let you use a real telegraph key wired to an
    actual transmitter, no board required. If you build an adapter from this
    guide and something doesn't work (or does!) — let us know at
    <a href="mailto:morse@r9o.ru" class="link">morse@r9o.ru</a>.</p>
HTML,

    // --- includes/mailer.php (emails) ---
    'email.verify_page_title' => 'Confirm your email — MorseWave',
    'email.verify_subject' => 'Confirm your email — MorseWave',
    'email.verify_greeting' => 'Hi, {name}!',
    'email.verify_intro' => 'Confirm your email so your progress — XP and daily streak — can appear on the MorseWave leaderboard.',
    'email.verify_button' => 'Confirm email',
    'email.link_fallback' => 'If the button doesn\'t work, copy this link into your browser:',
    'email.verify_footer' => 'If you didn\'t sign up for MorseWave, just ignore this email.',
    'email.verify_text' => "Hi, {name}!\n\nConfirm your email for your MorseWave account by following this link:\n{link}\n\nIf you didn't sign up for MorseWave, just ignore this email.\n\n— MorseWave (morse.r9old.ru)",

    'email.reset_page_title' => 'Password reset — MorseWave',
    'email.reset_subject' => 'Password reset — MorseWave',
    'email.reset_intro' => 'Someone (hopefully you) requested a password reset for this MorseWave account. The link is valid for 1 hour.',
    'email.reset_button' => 'Set a new password',
    'email.reset_footer' => 'If you didn\'t request a password reset, just ignore this email — your password stays the same.',
    'email.reset_text' => "Hi, {name}!\n\nSomeone (hopefully you) requested a password reset for your MorseWave account.\nSet a new password using this link (valid for 1 hour):\n{link}\n\nIf you didn't request this, just ignore this email — your password stays the same.\n\n— MorseWave (morse.r9old.ru)",

    // --- assets/js/learn.js ---
    'js.learn.napev_prefix' => 'sounds like: ',
    'js.learn.correct_known' => 'Correct! That\'s "{ch}" — already learned, practicing without XP',
    'js.learn.correct_streak' => 'Correct! That\'s "{ch}" ({streak}/{req}, XP awarded for the full streak)',
    'js.learn.learned_symbol' => 'Symbol "{ch}" learned! +{xp} XP',
    'js.learn.wrong' => 'You entered "{got}", but it should be "{want}". Try again.',
    'js.learn.rhythm_wrong' => 'You entered "{got}", but it should be "{want}". Accurate streak reset — get the right character first.',
    // {sym}/{pause} — how close (in %) the real duration of dots/dashes and the
    // pauses between them came to the ideal (100% = perfectly steady); {acc} is
    // their average, the overall score for this attempt.
    'js.learn.rhythm_known' => 'Correct! The rhythm for "{ch}" was already mastered earlier — signals {sym} of ideal, pauses {pause} of ideal (overall {acc}%). Practicing without XP.',
    'js.learn.rhythm_streak' => 'Accurate! "{ch}": signals {sym} of ideal, pauses {pause} of ideal. Accurate in a row: {streak}/{req} — on rep {req} the letter\'s rhythm will be mastered and XP will be awarded.',
    'js.learn.rhythm_mastered' => 'Rhythm for "{ch}" mastered! 5 accurate reps in a row — +{xp} XP',
    'js.learn.rhythm_imprecise' => 'Letter "{ch}" recognized correctly, but the rhythm is uneven: signals {sym} of ideal, pauses {pause} of ideal (overall {acc}%, need at least {threshold}%). Streak reset — start the count over.',
    'js.learn.rhythm_tempo_faster' => '▲ faster',
    'js.learn.rhythm_tempo_slower' => '▼ slower',
    'js.learn.rhythm_tempo_good' => '● on tempo',
    'js.learn.invasion_go' => 'Wave started! Listen for the signal and hit the keyboard.',
    'js.learn.invasion_kill' => 'Got it! "{ch}" destroyed (+1 XP)',
    'js.learn.invasion_wrong' => 'Missed: "{got}" is wrong. Try again before it lands.',
    'js.learn.invasion_hit' => 'The alien broke through! Missed "{ch}", base lost {dmg} HP.',
    'js.learn.invasion_win' => 'Wave repelled! Bonus: {hp} for base HP + {speed} for speed = +{xp} XP.',
    'js.learn.invasion_win_overlay' => '🎉 BASE HELD',
    'js.learn.invasion_lose' => 'Base has fallen. Aliens destroyed: {kills}.',
    'js.learn.invasion_lose_overlay' => '💥 BASE FELL ({kills})',
    'js.learn.invasion_boss_incoming' => '🛸 Hit #100 is a boss saucer! You need 3 correct hits in a row.',
    'js.learn.invasion_boss_hit' => 'Boss hit! ({hits}/{total})',
    'js.learn.invasion_boss_kill' => 'Boss destroyed! Wave repelled!',
    'js.learn.invasion_boss_breach' => 'The boss broke through! Base lost {dmg} HP.',
    'js.learn.rec_correct' => 'Correct: "{ch}" (+{xp} XP)',
    'js.learn.rec_new_record' => ' — new personal streak record! 🏆',
    'js.learn.rec_wrong' => 'It was "{target}", you pressed "{ch}"',
    'js.learn.stopped' => 'Stopped. Press "Start training" to continue.',
    'js.learn.daily_banner' => '🎯 Daily challenge: {count}/{target} — {title}. +50 XP on completion.',
    'js.learn.daily_done_bonus' => '🎯 Daily challenge complete — +50 XP bonus awarded!',
    'js.learn.daily_done_norebonus' => '🎯 Today\'s challenge was already completed (bonus isn\'t awarded twice).',
    'js.learn.daily_already_done' => '🎯 Today\'s challenge is already done — you can keep training without the bonus.',

    // --- shared JS: dit/dah ---
    'js.common.dit' => 'dit',
    'js.common.dah' => 'dah',

    // --- assets/js/koch.js ---
    'js.koch.tap_to_hear' => 'Tap to hear it',
    'js.koch.erase' => '⌫ Erase',
    'js.koch.charset_feedback_with_mnemonic' => '"{ch}": {tita} (sounds like: {mnemonic})',
    'js.koch.charset_feedback' => '"{ch}": {tita}',
    'js.koch.confirm_decrease' => 'Decrease the number of unlocked symbols from {from} to {to}?\nYour Koch method progress will roll back.',
    'js.koch.now_open' => 'Now {level} Koch method symbols are unlocked.',
    'js.koch.correct' => 'Correct: {expected}',
    'js.koch.wrong' => 'Expected: {expected} — you typed: {typed}',
    'js.koch.empty_placeholder' => '(empty)',
    'js.koch.new_symbol_unlocked' => 'Great accuracy! New symbol unlocked: "{ch}"',
    'js.koch.all_unlocked' => 'Great accuracy — all Koch method symbols are already unlocked!',
    'js.koch.below_threshold' => 'Accuracy {pct}% is below the 90% threshold — practice this symbol set a bit more.',

    // --- assets/js/groups.js ---
    'js.groups.filter_learned_too_few' => 'The "Learned only" filter needs at least {min} known symbols (otherwise you could guess the group without listening) — using the full alphabet for now.',
    'js.groups.filter_custom_too_few' => '"Custom characters" needs at least {min} valid Latin characters (A-Z, 0-9) — using the full alphabet for now.',
    'js.groups.exam_stop_check' => '⏹ Stop and check',
    'js.groups.correct' => 'Correct: {expected}',
    'js.groups.wrong' => 'Expected: {expected} — you typed: {typed}',
    'js.groups.empty_placeholder' => '(empty)',
    'js.groups.retrain_intro' => 'Reviewing {count} group(s) that had mistakes — take your time.',
    'js.groups.exam_configured' => 'Exam mode is set up: 50 groups of 5 characters, 250 characters, 12 wpm (60 char/min), 850 Hz tone, groups play one after another without waiting for an answer. Press "Start session".',
    'js.groups.daily_banner' => '🎯 This is today\'s challenge — completing it earns a +50 XP bonus (once per day).',
    'js.groups.daily_mismatch' => ' (this doesn\'t match today\'s challenge — it required {count} groups of {len} characters at {wpm} wpm; no bonus awarded, but regular training XP still counts)',
    'js.groups.daily_low_accuracy' => ' (the bonus needs at least {min}% accuracy, you got {acc}% — no bonus, but regular XP for correct symbols still counts; try again!)',
    'js.groups.daily_bonus' => ' + 50 XP daily challenge bonus!',
    'js.groups.daily_already' => ' (today\'s challenge was already completed, the bonus isn\'t awarded twice)',
    'js.groups.daily_note_fail_prefix' => 'Daily challenge',
    'js.groups.daily_note_ok_prefix' => 'Daily challenge completed',
    'js.groups.exam_stopped_early' => 'Exam stopped early (played {played}/{total} groups) — no exam XP awarded, but the result is honestly counted toward your overall group total.',
    'js.groups.exam_passed_category' => 'Exam passed: mistakes in {wrong} of {total} groups — that\'s "First-class ham radio operator" level! 🎖️',
    'js.groups.exam_passed_toomany' => 'Exam completed in full, but there were too many mistakes ({wrong} of {total} groups) for the category — no more than 3 is required for that accuracy. Keep practicing!',
    'js.groups.abbrev_correct' => 'Correct: {code} — {meaning} (+5 XP)',
    'js.groups.abbrev_wrong' => 'It was "{code}" ({meaning}), but you pressed "{got}"',
    'js.groups.stopped' => 'Stopped. Press "Start training" to continue.',
    'js.groups.no_description' => 'no description',
    'js.groups.words_hint_phrases' => 'Real bits of radio exchange: calls, signal reports, QTH, service codes. Has digits and spaces — noticeably harder, and XP is higher for it.',
    'js.groups.words_hint_mixed' => 'Words and phrases mixed together — closest to real airwaves.',
    'js.groups.words_xp_suffix' => ' (+{xp} XP)',
    'js.groups.words_xp_none' => ' (no XP awarded — copied less than 60%)',
    'js.groups.words_missed_label' => 'What didn\'t come through:',

    // --- assets/js/abbreviations.js (code meanings) ---
    'abbrev.de' => '"From" — placed before the sender\'s callsign',
    'abbrev.tnx' => 'Thanks',
    'abbrev.tks' => 'Thanks',
    'abbrev.pse' => 'Please',
    'abbrev.gm' => 'Good morning',
    'abbrev.ga' => 'Good afternoon',
    'abbrev.ge' => 'Good evening',
    'abbrev.gn' => 'Good night',
    'abbrev.gb' => 'Goodbye',
    'abbrev.73' => 'Best regards',
    'abbrev.88' => 'Love and kisses',
    'abbrev.cq' => 'General call — calling any operator',
    'abbrev.k' => 'Over — go ahead and reply',
    'abbrev.kn' => 'Over, listening only for a specific station',
    'abbrev.r' => 'Roger, received',
    'abbrev.as' => 'Wait — pause in transmission',
    'abbrev.sk' => 'End of contact — QSO fully finished',
    'abbrev.cl' => 'Closing station, going off the air',
    'abbrev.qsl' => 'I confirm receipt (or a confirmation card)',
    'abbrev.qso' => 'A radio contact, direct exchange',
    'abbrev.qrp' => 'Low transmitter power (under 5 W)',
    'abbrev.qro' => 'High transmitter power',
    'abbrev.qrz' => 'Who is calling me?',
    'abbrev.qrs' => 'Send more slowly',
    'abbrev.qrq' => 'Send faster',
    'abbrev.qrm' => 'Interference from other stations',
    'abbrev.qrn' => 'Atmospheric/natural interference',
    'abbrev.qth' => 'My location (coordinates, city)',
    'abbrev.ur' => 'Your, you',
    'abbrev.my' => 'My',
    'abbrev.rig' => 'Equipment (transceiver, radio)',
    'abbrev.ant' => 'Antenna',
    'abbrev.rst' => 'Signal report (readability, strength, tone)',
    'abbrev.fb' => 'Fine business, excellent',
    'abbrev.wx' => 'Weather',

    // --- assets/js/callsigns.js ---
    'js.cs.fetch_error' => 'Couldn\'t load callsigns from the database. Check that MySQL is running and the callsigns table is populated (see database/schema.sql).',
    'js.cs.correct' => 'Correct: {expected} (+20 XP)',
    'js.cs.wrong' => 'Expected: {expected} — you typed: {typed}',
    'js.cs.empty_placeholder' => '(empty)',
    'js.cs.add_success' => 'Done! Callsign {callsign} was added to the shared database. Thanks!',
    'js.cs.add_failed' => 'Couldn\'t add the callsign.',
    'js.cs.add_network_error' => 'Couldn\'t reach the server. Please try again.',

    // --- api/*.php (shared) ---
    'api.method_not_allowed' => 'Method not supported',

    // --- api/login.php ---
    'api.login.generic_error' => 'Incorrect email or password',
    'api.login.locked' => 'Too many failed attempts. Try again in {min} min.',

    // --- api/register.php ---
    'api.register.must_agree' => 'You need to accept the terms of service and privacy policy',
    'api.register.captcha_wrong' => 'Incorrect CAPTCHA answer — try again',
    'api.register.passwords_mismatch' => 'Passwords don\'t match',
    'api.register.name_length' => 'Name must be between 2 and 40 characters',
    'api.register.invalid_email' => 'Invalid email',
    'api.register.password_length' => 'Password must be at least 6 characters',
    'api.register.email_taken' => 'This email is already registered',

    // --- api/add_callsign.php ---
    'api.callsign.bad_format' => 'Doesn\'t look like a callsign. Format: letters/digits, a required digit, then letters — e.g. R7AB, UA3XYZ, W1AW.',
    'api.callsign.exists' => 'Callsign {callsign} is already in the database.',

    // --- api/request_password_reset.php ---
    'api.reset_request.captcha_wrong' => 'Incorrect CAPTCHA answer — try again',
    'api.reset_request.invalid_email' => 'Invalid email',
    'api.reset_request.generic_message' => 'If that email is registered, a link is already on its way. Check your inbox (and spam folder).',

    // --- api/reset_password.php ---
    'api.reset_password.passwords_mismatch' => 'Passwords don\'t match',
    'api.reset_password.password_length' => 'Password must be at least 6 characters',
    'api.reset_password.invalid_link' => 'Invalid link',
    'api.reset_password.expired_link' => 'This link is invalid or has expired (valid for 1 hour) — request a new reset',
    'api.reset_password.success' => 'Password changed! You can now log in with your new password.',

    // --- api/update_account.php ---
    'api.account.need_login' => 'You need to be logged in',
    'api.account.locked' => 'Too many failed attempts. Try again in {min} min.',
    'api.account.wrong_current_password' => 'Incorrect current password',
    'api.account.name_length' => 'Name must be between 2 and 40 characters',
    'api.account.name_changed' => 'Name changed',
    'api.account.new_passwords_mismatch' => 'New passwords don\'t match',
    'api.account.password_length' => 'Password must be at least 6 characters',
    'api.account.password_changed' => 'Password changed',
    'api.account.invalid_email' => 'Invalid email',
    'api.account.same_email' => 'That\'s already your current email',
    'api.account.email_taken' => 'That email is already used by another account',
    'api.account.email_changed_check_inbox' => 'Email changed — check your new inbox and confirm it via the link in the email.',
    'api.account.email_changed_mail_failed' => 'Email changed, but we couldn\'t send the confirmation — use the "Resend" button.',
    'api.account.unknown_action' => 'Unknown action',
    'api.account.wrong_password' => 'Incorrect password',
    'api.account.deleted' => 'Account deleted',

    // --- api/push_progress.php ---
    'api.push.too_large' => 'Data payload too large',
    'api.push.expected_json' => 'Expected a JSON object with progress data',

    // --- api/admin_set_admin.php / admin_delete_user.php ---
    'api.admin.no_user' => 'No user specified',
    'api.admin.user_not_found' => 'User not found',
    'api.admin.cannot_remove_last_admin' => 'Can\'t remove admin rights from the last administrator — make someone else an admin first',
    'api.admin.cannot_delete_self' => 'Can\'t delete your own admin account',

    // --- api/stats.php ---
    'api.stats.unknown_field' => 'Unknown stats field',

    // --- assets/js/account.js ---
    'js.account.captcha_load_error' => 'Couldn\'t load the CAPTCHA — refresh the page',
    'js.account.email_verified' => '✅ Email confirmed',
    'js.account.email_not_verified_text' => '✉️ Email not confirmed — check your inbox (including spam). Without confirmation, your progress won\'t appear on the leaderboard.',
    'js.account.resend_email_btn' => 'Resend email',
    'js.account.resend_sending' => 'Sending…',
    'js.account.resend_sent' => 'Email sent ✓',
    'js.account.resend_failed' => 'Couldn\'t send it — try again later',
    'js.account.network_error_short' => 'Network error — try again later',
    'js.account.time_just_now' => 'just now',
    'js.account.time_less_minute' => 'less than a minute ago',
    'js.account.unit_minute_one' => 'minute',
    'js.account.unit_minute_few' => 'minutes',
    'js.account.unit_minute_many' => 'minutes',
    'js.account.unit_hour_one' => 'hour',
    'js.account.unit_hour_few' => 'hours',
    'js.account.unit_hour_many' => 'hours',
    'js.account.unit_day_one' => 'day',
    'js.account.unit_day_few' => 'days',
    'js.account.unit_day_many' => 'days',
    'js.account.time_ago' => '{n} {unit} ago',
    'js.account.sync_indicator_synced' => '☁ Synced: {ago}',
    'js.account.sync_indicator_never' => '☁ Not synced yet — progress will upload on its own the next time you earn XP',
    'js.account.verify_redirect_ok' => '✅ Email confirmed! You can now publish your progress to the leaderboard.',
    'js.account.verify_redirect_bad' => 'The link is invalid or has already been used.',
    'js.account.login_failed_default' => 'Couldn\'t log in',
    'js.account.network_error' => 'Couldn\'t reach the server',
    'js.account.must_agree_client' => 'To create an account, you need to accept the terms of service and privacy policy',
    'js.account.register_failed_default' => 'Couldn\'t sign up',
    'js.account.account_created_check_email' => 'Account created! Check your email to confirm it.',
    'js.account.account_created_mail_failed' => 'Account created, but we couldn\'t send the email — try the "Resend" button below.',
    'js.account.delete_need_password' => 'Enter your password to confirm',
    'js.account.delete_failed_default' => 'Couldn\'t delete the account',
    'js.account.delete_success' => 'Account deleted. Local progress in this browser was cleared too.',
    'js.account.sync_success' => 'Done! Your numbers are updated on the leaderboard.',
    'js.account.sync_need_verify' => 'Confirm your email first (link above) — then your progress will appear on the leaderboard.',
    'js.account.sync_failed_default' => 'Couldn\'t publish your progress.',
    'js.account.claim_confirm' => 'This browser\'s progress has already been published under "{claimName}".\nPublish the same numbers under "{userName}" too?\nThat would create two identical entries on the leaderboard.',
    'js.account.reset_request_failed_default' => 'Couldn\'t send it',
    'js.account.reset_password_opening' => ' Opening the login form…',
    'js.account.reset_password_failed_default' => 'Couldn\'t change the password',
    'js.account.update_failed_default' => 'Couldn\'t do that',
    'js.account.manual_sync_failed' => 'Couldn\'t reach the server — try again in a bit.',
    'js.account.manual_sync_pulled' => 'Done! Pulled in more recent progress from another device ({before} → {after} XP).',
    'js.account.manual_sync_uptodate' => 'Done! This device was already up to date.',
    'js.account.backup_saved' => 'File saved. Inside: {xp} XP, {count} learned symbols.',
    'js.account.backup_build_failed' => 'Couldn\'t build the backup file',
    'js.account.backup_loaded' => 'Done! Now at {xp} XP, {count} learned symbols.',
    'js.account.backup_corrupt' => 'The file is corrupted or not valid JSON',

    // --- assets/js/progress.js ---
    'js.progress.not_a_backup' => 'This doesn\'t look like a MorseWave backup file',
    'js.progress.no_progress_data' => 'No progress data found in the file',

    // --- assets/js/daily.js ---
    'js.daily.learn_title' => 'Learn 3 new letters with the key',
    'js.daily.learn_desc' => 'Unlock 3 new symbols in "Letters → Sending with key" mode. +50 XP bonus once per day.',
    'js.daily.recognize_title' => 'Copy 20 symbols by ear',
    'js.daily.recognize_desc' => 'Correctly recognize 20 symbols in "Letters → Ear training" mode. +50 XP bonus once per day.',
    'js.daily.groups_title' => '{count} groups of {len} symbol(s) at {wpm} wpm',
    'js.daily.groups_desc' => 'Copy groups in "Character groups" mode. +50 XP bonus once per day.',

    // --- api/achievements.php (achievement definitions from DB, achievements.code) ---
    'ach_def.first_signal.title' => 'First signal',
    'ach_def.first_signal.desc' => 'Learn your first symbol',
    'ach_def.ten_signals.title' => 'Rookie operator',
    'ach_def.ten_signals.desc' => 'Learn 10 symbols',
    'ach_def.full_alphabet.title' => 'Full alphabet',
    'ach_def.full_alphabet.desc' => 'Learn all letters and digits',
    'ach_def.xp_100.title' => 'First hundred',
    'ach_def.xp_100.desc' => 'Earn 100 XP',
    'ach_def.xp_1000.title' => 'Seasoned operator',
    'ach_def.xp_1000.desc' => 'Earn 1000 XP',
    'ach_def.xp_5000.title' => 'Master of the airwaves',
    'ach_def.xp_5000.desc' => 'Earn 5000 XP',
    'ach_def.streak_3.title' => 'Three days running',
    'ach_def.streak_3.desc' => 'Train 3 days in a row',
    'ach_def.streak_7.title' => 'Week of discipline',
    'ach_def.streak_7.desc' => 'Train 7 days in a row',
    'ach_def.streak_30.title' => 'Iron will',
    'ach_def.streak_30.desc' => 'Train 30 days in a row',
    'ach_def.koch_10.title' => 'Koch method: liftoff',
    'ach_def.koch_10.desc' => 'Unlock 10 symbols in the Koch method',
    'ach_def.koch_full.title' => 'Koch master',
    'ach_def.koch_full.desc' => 'Unlock all Koch method symbols',
    'ach_def.groups_50.title' => 'Group training',
    'ach_def.groups_50.desc' => 'Copy 50 character groups',
    'ach_def.groups_500.title' => 'Marathoner',
    'ach_def.groups_500.desc' => 'Copy 500 character groups',
    'ach_def.callsign_10.title' => 'Callsign hunter',
    'ach_def.callsign_10.desc' => 'Copy 10 callsigns',
    'ach_def.callsign_100.title' => 'DX champion',
    'ach_def.callsign_100.desc' => 'Copy 100 callsigns',
    'ach_def.recognize_10.title' => 'Ear training: liftoff',
    'ach_def.recognize_10.desc' => 'Correctly recognize 10 symbols by ear',
    'ach_def.recognize_100.title' => 'Sharp ear',
    'ach_def.recognize_100.desc' => 'Correctly recognize 100 symbols by ear',
    'ach_def.streak50.title' => 'Budding telegraphist',
    'ach_def.streak50.desc' => 'Build a streak of 50 correct in a row in ear training',
    'ach_def.streak500.title' => 'Veteran telegraphist',
    'ach_def.streak500.desc' => 'Build a streak of 500 correct in a row in ear training',
    'ach_def.exam_category1.title' => 'First-class ham radio operator',
    'ach_def.exam_category1.desc' => 'Pass the exam (250 characters) in full with no more than 3 groups with mistakes',
    'ach_def.cyrillic_alphabet.title' => 'Cyrillic alphabet',
    'ach_def.cyrillic_alphabet.desc' => 'Learn all letters of the Cyrillic Morse alphabet',
    'ach_def.cyrillic_recognized.title' => 'Cyrillic by ear',
    'ach_def.cyrillic_recognized.desc' => 'Correctly recognize every letter of the Cyrillic Morse alphabet by ear at least once',
    'ach_def.invasion_first.title' => 'Base secured',
    'ach_def.invasion_first.desc' => 'Clear your first invasion wave in the mini-game',
    'ach_def.invasion_10.title' => 'Defender of the airwaves',
    'ach_def.invasion_10.desc' => 'Clear 10 invasion waves in the mini-game',
    'ach_def.rhythm_10.title' => 'Steady hand',
    'ach_def.rhythm_10.desc' => 'Master the key rhythm for 10 characters',
    'ach_def.rhythm_full.title' => 'Metronome',
    'ach_def.rhythm_full.desc' => 'Master the key rhythm for every letter and digit',

    // --- assets/js/achievements.js ---
    'js.ach.load_failed' => 'Couldn\'t load achievements. Try refreshing the page in a bit.',
    'js.ach.reset_confirm' => 'Reset all progress for sure?\n\nXP, level, daily streak, learned symbols, Koch method level, and all achievements will be reset. If you\'ve published your results on the leaderboard, they\'ll be removed from there too. This action cannot be undone.',

    // --- assets/js/admin.js ---
    'js.admin.load_error_default' => 'Loading error',
    'js.admin.network_error' => 'Couldn\'t reach the server',
    'js.admin.no_users_yet' => 'No one has registered yet.',
    'js.admin.email_verified_title' => 'Email confirmed',
    'js.admin.email_not_verified_title' => 'Email not confirmed',
    'js.admin.admin_title' => 'Administrator',
    'js.admin.admin_label' => 'admin',
    'js.admin.registered_on' => 'registered',
    'js.admin.remove_admin_btn' => 'Remove admin',
    'js.admin.make_admin_btn' => 'Make admin',
    'js.admin.rename_btn' => '✏️ Rename',
    'js.admin.delete_btn' => '🗑 Delete',
    'js.admin.confirm_make_admin' => 'Grant this user administrator rights?',
    'js.admin.confirm_remove_admin' => 'Remove administrator rights from this user?',
    'js.admin.change_rights_failed' => 'Couldn\'t change the rights',
    'js.admin.rename_prompt' => 'New name:',
    'js.admin.rename_failed' => 'Couldn\'t rename',
    'js.admin.confirm_delete_user' => 'Delete this user for sure? They\'ll disappear from the leaderboard and won\'t be able to log into their account. This action cannot be undone.',
    'js.admin.delete_failed' => 'Couldn\'t delete',
    'js.admin.streak_label' => 'streak',

    // --- assets/js/home.js ---
    'js.home.daily_done_badge' => '✓ Daily challenge complete',
    'js.home.daily_done_desc' => 'Today\'s +50 XP bonus has already been claimed. You can still practice — XP for correct symbols is awarded as usual.',
    'js.home.daily_repeat_no_bonus' => 'Repeat without bonus',
    'js.home.leaderboard_empty' => 'No one has published their numbers yet — be the first!',
    'js.home.leaderboard_load_failed' => 'Couldn\'t load',

    // --- leaderboard.php / assets/js/leaderboard.js ---
    'leaderboard.eyebrow' => 'Community',
    'leaderboard.h1' => 'Full leaderboard',
    'leaderboard.back_link' => '← Back to home',
    'js.leaderboard.empty' => 'No one has published their numbers yet — be the first!',
    'js.leaderboard.load_failed' => 'Couldn\'t load the leaderboard.',

    // --- assets/js/app.js ---
    'js.app.achievement_unlocked' => 'Achievement unlocked!',

    // --- assets/js/signal.js ---
    'js.signal.hide' => '🙈 Hide',
    'js.signal.show' => '👁 Show',
    'js.signal.toggle_title' => 'Show/hide dots and dashes on screen during ear training',

    // --- includes/auth.php ---
    'auth.admin_only' => 'Access is for administrators only',
];
