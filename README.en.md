<div align="center">

# 📡 MorseWave

🌐 [Русский](README.md) · English

**A dark, minimalist Morse code trainer**
Individual letters · Koch method · Character groups · Real words · Callsigns · XP and achievements

![PHP](https://img.shields.io/badge/PHP-8%2B-777bb4)
![MySQL](https://img.shields.io/badge/MySQL-PDO-4479A1)
![JS](https://img.shields.io/badge/JavaScript-Vanilla-f7df1e)
![License](https://img.shields.io/badge/license-MIT-green)

🌐 **[morse.r9old.ru](https://morse.r9old.ru)** — live version

</div>

---

## What it is

MorseWave is a web-based Morse code trainer that takes you from zero to
copying real callsigns by ear and preparing for a ham radio exam (the
"Groups" mode has an exam mode matching the Russian "First Category"
license requirements). No frontend framework, no Bootstrap: plain JS
(Web Audio API) plus a custom dark design system.

Progress (XP, level, daily streak, learned characters) is stored locally in
the browser — no registration required, you can start training right away.
An account is an optional add-on that gives you three things: a spot on the
home-page leaderboard (only via an explicit "Publish" button), progress sync
across devices (start on your computer, continue on your phone), and
password recovery by email. Under the hood, MySQL stores reference data
(achievements, the callsign bank), anonymous community stats, accounts, and
server-side progress copies.

The interface is bilingual (Russian / English) — a switcher lives in the
header next to the profile, see "How it works internally" below for details.

## Features

| Section | What's inside |
|---|---|
| 📖 **Letters** | Three sub-modes: keying (tap/spacebar, with live sidetone; three sets — Latin + digits, Koch order, Cyrillic), copying by ear (a character plays → tap it on the on-screen keyboard; a separate "Cyrillic characters" set), and **key rhythm** (compares the real durations of dots/dashes/pauses against the ideal 1:3:1 ratio — speed is fully adjustable and the ideal recalculates for it; 5 accurate reps in a row masters a letter's rhythm and grants a one-off XP reward; sets are Latin + digits and Cyrillic — no Koch order, it's not relevant here) |
| 👾 **Invasion** (BETA) | A tower-defense mini-game living next to "Letters": aliens fly toward your base carrying a letter played by ear, and you must recognize it and tap it on a custom QWERTY keyboard (or your computer's physical keyboard) before the enemy lands — a shovel flies out from the base on a hit. Enemy speed depends on how complex the letter's Morse code is, up to 5 concurrent targets as a 100-kill wave progresses, and a completed wave grants a bonus based on remaining base HP and reaction speed |
| 🎯 **Koch method** | Characters right away at full target speed; a new character unlocks at ≥90% accuracy; you can manually set any number of unlocked characters (in either direction) |
| 🔢 **Character groups** | Copy 2–5 character groups by ear: letters / digits / mixed / learned-only / custom set, with speed and Farnsworth spacing as sliders; an exam mode matching ham radio license requirements |
| 📝 **Real words** | Copying common English words and Q&A radio phrases (`CQ CQ DE R9OGL K`, `UR RST 599 599`): trains recognizing a word as a single sound shape rather than assembling it letter by letter. Third tab under "Groups" |
| 💬 **Abbreviations** | Q-codes and ham radio abbreviations (CQ, QTH, 73…) by ear, multiple choice |
| 📡 **Callsigns** | Practice on real-format callsigns (including Russian formats), the bank grows via a generator script |
| 🏆 **Achievements** | Achievement conditions live in the database (`achievements`) — new ones can be added without touching code |
| 🎯 **Daily challenge** | A challenge tailored to the player's stage (beginner → "learn some letters", further along → "copy by ear", knows the alphabet → groups) plus a +50 XP bonus once a day |
| 💡 **Signal lamp** | A visual analog of the sound — you can train with no sound at all |
| 🏆 **Leaderboard** | Top 10 on the home page by XP and by daily streak, plus a logged-in user's real rank shown separately if they're outside the top 10; a standalone page with the full table (`leaderboard.php`) — publishing is manual only, via the "Publish" button |
| 👤 **Account** | Optional: progress sync across devices with a "last synced" indicator, password recovery by email, self-service account deletion |
| 💾 **Progress backup** | Download/upload progress as a file on the profile page — no account needed. Import merges "upward only", so loading an old file on top of newer progress is safe |
| ⚠️ **Progress reset** | Button on the "Achievements" page — a full reset (localStorage and the server copy) with confirmation |
| 🌐 **Russian / English** | A language switcher in the header; emails, legal pages, and API errors are translated too |

## Stack

- **PHP 8+** — no framework, simple file-based routing
- **MySQL / MariaDB** — via PDO
- **Vanilla JS** — Web Audio API for sound, no build step, no npm
- **Custom CSS** — design system in `assets/css/style.css`, no Bootstrap
- **Docker** — for local development (PHP+Apache, MySQL, phpMyAdmin)

## Running & deployment

Quick start locally, via Docker:

```bash
git clone <REPO_URL> morse-trainer
cd morse-trainer
docker compose up -d --build
```

Site at **http://localhost:8080**, phpMyAdmin at **http://localhost:8081**.

Full instructions — running without Docker, a command cheat sheet, VPS
deployment, database migrations, mail setup, and **admin management (who
becomes an admin and how to hand off rights)** — are in **[DEPLOY.md](DEPLOY.md)**.

## Project structure

```
morse-trainer/
├── docker-compose.yml       # local run: PHP+Apache, MySQL, phpMyAdmin
├── docker/                  # Dockerfile + Apache config (AllowOverride for .htaccess)
├── README.md                 # project overview in Russian (main, what GitHub visitors see by default)
├── README.en.md               # this file — project overview in English
├── DEPLOY.md                  # running, deployment, migrations, admin management
├── CLAUDE.md                 # context and rules for Claude Code
├── CHANGELOG.md               # changelog, v2.49+ (newest entries first)
├── CHANGELOG-archive.md       # changelog, v2.48 and older
├── lang/
│   ├── ru.php                # interface string dictionary — Russian
│   └── en.php                 # interface string dictionary — English
├── api/                     # JSON endpoints: achievements, callsigns, stats, register,
│                             #   login, logout, me, sync_progress, refresh_published_stats,
│                             #   leaderboard, verify_email, resend_verification, captcha,
│                             #   admin_users, admin_rename_user, admin_delete_user,
│                             #   admin_set_admin, push_progress, pull_progress,
│                             #   delete_progress, delete_account, request_password_reset,
│                             #   reset_password, update_account, unpublish_stats
├── config/
│   ├── database.example.php # DB config template (committed)
│   ├── database.php         # real DB config with credentials (in .gitignore)
│   ├── mail.example.php      # mail config template (committed)
│   ├── mail.php               # real mail config with the API key (in .gitignore)
│   └── .htaccess               # blocks web access to the folder
├── database/
│   ├── schema.sql            # the ONLY source of truth for the DB schema
│   ├── seed_callsigns.php    # callsign batch generator
│   └── .htaccess              # blocks web access to the folder
├── includes/                 # header / footer / nav + auth.php, mailer.php, i18n.php,
│                             #   resend_mailer.php, captcha.php, leaderboard_guard.php
├── storage/sessions/         # PHP session files (blocked by .htaccess, not in git)
├── assets/
│   ├── css/style.css         # design system
│   └── js/                   # morse-data, daily, audio, progress, signal, input, i18n + pages
├── index.php                 # home page + daily challenge
├── leaderboard.php            # the full leaderboard table
├── learn.php                 # letters: keying / copying by ear / key rhythm
├── koch.php                  # Koch method
├── groups.php                # 2–5 character groups (+ real words, abbreviations)
├── callsigns.php              # callsign practice
├── achievements.php           # achievements + progress reset
├── account.php                 # profile (tabs: account / sound / display / backup)
├── terms.php · privacy.php     # terms of service and privacy policy
├── admin.php                    # admin panel: users, rename, delete, grant admin rights
└── settings.php                # 301 redirect to account.php (settings moved to profile, v2.24)
```

## How XP is earned

All XP is rounded to whole numbers. Level grows as `1 + √(XP / 80)`
(i.e. level 2 at 80 XP, level 3 at 320 XP, level 5 at 1280 XP, and so on).

| Mode | Amount | Conditions and farming protection |
|---|---|---|
| **Letters → keying** | **+25 XP** per character | Once per character — the first time you land 5 correct reps in a row. Repeating a streak on an already-learned character grants no XP. Same flat rate for Latin and Cyrillic — no difficulty bonus here (a deliberate simplification, v2.51.1). |
| **Letters → copying by ear** | **+1 XP** per correct answer | Spamming the correct tile during the pause between rounds is blocked. Same flat rate for Latin and Cyrillic (v2.51.1 briefly gave Cyrillic +2, but that was confusing — a same-looking Latin and Cyrillic "M" earned different XP; reverted in v2.51.7). |
| **Letters → key rhythm** | **+25 XP** once per letter | Same anti-farm scheme as keying: no XP for individual attempts, awarded once when 5 accurate reps in a row are reached (correct letter AND rhythm accuracy ≥ 80% of the ideal 1:3:1 ratio). Any slip resets the streak; practicing an already-mastered letter earns no further XP. |
| **Invasion** (BETA) | **+1 XP** per destroyed alien, plus a one-off wave-clear bonus (10–130 XP) | A flat per-kill rate — no more farmable than regular copying by ear. The wave-clear bonus is only awarded for a fully completed wave (100 hits) and combines remaining base HP (1:1) with the average reaction speed across the whole wave (10–30 XP) — stalling until the last moment doesn't earn the same bonus as reacting fast. |
| **Koch method** | `2 × (unlocked_chars / 15, capped at 1, floored at 0.15) × (group_length / 3)` XP per correctly copied character | The more characters unlocked and the longer the groups, the higher the rate (max 2 XP/character with the full set). At the start, with 2 characters, the rate is minimal — farming easy sessions doesn't pay off. |
| **Koch method — bonus** | **+10/+20/+30 XP** (equal to the number of groups in the session) | Only if the session is completed in full with ≥90% accuracy. Achievements for this mode are checked against the honestly earned level (`kochLevelEarned`) — you can't drag the slider to the end and unlock the achievement. |
| **Character groups** | `2 × √(set_size / 26, capped at 1, floored at 0.15) × (group_length / 3)` XP per correctly copied character | The rate depends on the size of the chosen set and the group length. Awarded immediately for each answered group. |
| **Groups — mistake review** | **x3** base XP + **5 XP** bonus per perfect group | Generates new random groups containing the specific characters you missed (if you confused two letters, both will be mixed in). The generous XP acts with an **anti-abuse** check: it is only awarded if the original session accuracy was ≥ 60%. If it's lower (intentional spamming of empty answers), mistakes retraining yields 0 XP. |
| **Groups — exam** | session rate × correct characters | Only if the exam is played through to the end — stopping early zeroes out the exam's XP (it still counts toward the group's overall stats). |
| **Real words** | **1.2 XP** per character (words) / **1.5 XP** (phrases) | The rate is lower than in groups: coherent text is predictable, and a missed letter can be inferred from context. If a word is copied below 60% accuracy, it earns no XP at all (otherwise the word bank could be farmed blindly). Spaces in phrases don't count. |
| **Abbreviations (Q-codes)** | **+5 XP** per correct answer | — |
| **Callsigns** | **+20 XP** per correctly copied callsign | Awarded immediately, without waiting for the session to end. |
| **Daily challenge** | **+50 XP** bonus | Once a day. The challenge is tailored to the player's stage (see `daily.js`): beginner → "learn 3 new letters", intermediate → "copy 20 characters by ear", knows the alphabet → group copying. For a group-based challenge, the session parameters must match the challenge **and accuracy must be at least 50%** (clicking through empty answers won't work, fixed in v2.26). |
| **Speed bonus (daily challenge only)** | XP multiplier `speedXpFactor(wpm)`: ≤12 wpm → ×1.0, above that +4%/wpm, capped at ×1.6 (≈27 wpm) | Applies **only** to the daily group challenge, where speed is fixed by the challenge. Doesn't apply in regular sessions, "Real words", or Koch — there the person chooses their own speed. The point: don't force a beginner to chase 24 wpm for the same 50 XP, but genuinely reward a fast pace. No farming here — XP is still only for correct characters, and copying fast is simply harder. |

### Why the Koch and Groups formulas differ

It looks like an oversight, but it's a deliberate decision (v2.33) — don't
merge them into one.

In **Groups**, the person chooses the character set themselves, so a small
set must proportionally give less XP. The old divisor of 15 hit the cap too
early: a custom set of the 15 easiest characters gave exactly the same rate
as the full 36-character alphabet — a real, working loophole. A divisor of
26 (the full Latin alphabet) closes it, and a square root instead of a
linear ratio is needed so that honest in-between sets like "Digits" (10
characters) aren't penalized too harshly. The numbers are chosen so the two
main presets — "Letters" (26) and "Letters + digits" (36) — still give the
original 2.0 XP/character: the balance of existing modes wasn't disturbed.

In **Koch**, the set is determined by the level, not chosen by the person.
Farming with a small set isn't really possible there in the first place: to
do it you'd have to sit at a low level, which already gives the minimal
rate. So the formula stayed as it was — tightening it wouldn't close any
loophole, it would just cut motivation at the mid levels of the method.

The daily streak (🔥) only counts a real, completed training session (a
Koch/groups/callsigns session or the daily challenge) — just visiting the
site isn't enough.

## How it works internally

- **`assets/js/audio.js`** — `MorseAudio` plays dots/dashes through a Web
  Audio API oscillator, supports Farnsworth spacing (characters at one
  speed, pauses at another, slower one). The `onSymbol` callback returns
  `durationMs`, used to precisely sync the visualization.
- **`assets/js/input.js`** — `TelegraphKey` turns holding down a key (a
  screen tap or spacebar) into dots/dashes based on hold duration relative
  to the current `wpm`, plus a live sidetone (real sound) while held.
  Thresholds: `< 2×unit` → dot, otherwise dash; a `2.5×unit` pause is a
  letter boundary, another `+4×unit` is a word boundary.
- **`assets/js/daily.js`** — `DailyChallenge`: the single source of truth
  for the "daily challenge" on the home page and in the training modes; the
  challenge is derived from the pair "date + player's stage".
- **`assets/js/signal.js`** — `SignalLine` (an oscilloscope-style dot/dash
  trace) and `MorseLamp` (a visual lamp) — cross-cutting visual elements
  that mirror both sound and input in sync across every training page.
- **`assets/js/progress.js`** — all of the user's progress lives in one
  `localStorage` key (`morsewave_progress_v1`): XP, level, daily streak,
  learned characters, Koch level, stats, unlocked achievements.
  `Progress.resetAll()` does a full reset.
- **Sync and its indicator.** `Progress.pushNow()` sends the whole Progress
  object to `api/push_progress.php`, and on `ok: true` it remembers the
  moment in a separate `morsewave_last_sync` key and fires a
  `progress:synced` event; `account.js` renders that as "☁ Synced: 5 minutes
  ago". The mark is set **only** on a real success.
- **File backup** — `Progress.exportBackup()` / `Progress.importBackup()`.
  Import deliberately goes through the same `mergeFromServer()` used for the
  login merge: "upward only" (max on numbers, union on sets). So loading an
  old file on top of newer progress is safe.
- **Achievements** are defined in MySQL (`achievements`, `condition_type` +
  `condition_value` fields), and condition checks against stats happen
  client-side in `Progress.checkAchievements()` — see the type mapping in
  `progress.js` (`statValue()`).
- **Leaderboard protection** (`includes/leaderboard_guard.php`) — before
  publishing to `user_stats`, values are clamped to a plausible ceiling
  (tied to account age), cutting off crude inflation. Real progress isn't
  touched — only the public row is clamped (details in CHANGELOG, v2.40).
- **Internationalization** (`includes/i18n.php`, `lang/ru.php`, `lang/en.php`,
  `assets/js/i18n.js`) — the language is resolved via `?lang=` → the
  `mw_lang` cookie → the browser's `Accept-Language` header → Russian by
  default. The `t('key')` helper is available both in PHP templates and (as
  a global `t()` function) in JS via `window.MW_I18N`, which
  `includes/header.php` embeds in `<head>`. Fallback for a missing
  translation: current language → Russian → the key itself. The syllabic
  letter mnemonics (`MORSE_MNEMONICS` and `CYRILLIC_MNEMONICS` in
  `morse-data.js`) are a phonetic memory aid tied to Russian sounds, so
  they're deliberately disabled in the English interface rather than
  translated word-for-word.
- **Cyrillic Morse alphabet** (`learn.php`, v2.51) — a separate 33-letter
  table (`CYRILLIC_CODE`/`CYRILLIC_TO_CHAR` in `morse-data.js`), deliberately
  *not* merged with the Latin `MORSE_CODE`/`MORSE_TO_CHAR`: several Cyrillic
  letters share the exact same dot/dash code as a "similar-sounding" Latin
  letter (by design of the historical alphabet), so a merged reverse lookup
  would make keyed decoding ambiguous. `TelegraphKey` (`input.js`) takes the
  decode table as an option/`setTable()` call instead of a hardcoded global.
  Progress for Cyrillic letters is stored with an `RU_` prefix
  (`learnedLetters`), so Latin `A` and Cyrillic `А` never collide — and the
  "full alphabet" achievement counts strictly against the Latin+digit set
  (`progress.js`), unaffected by Cyrillic progress living in the same array.

## Changelog

Recent history (v2.49 and newer) is in [CHANGELOG.md](CHANGELOG.md), newest
entries first. Earlier versions, all the way back to the first one, are in
[CHANGELOG-archive.md](CHANGELOG-archive.md).

## Known limitations / open questions

- Accounts are an optional add-on over localStorage (not required for
  training). The client remains the source of truth for XP, so there's no
  absolute protection against inflation; the public leaderboard is covered
  by a server-side sanity ceiling (`leaderboard_guard.php`, v2.40) — it cuts
  off crude values, but it's "a lock against honest people", not bulletproof
  protection. The same progress from a single browser can technically be
  published under multiple accounts — the barrier is email verification
  plus a soft warning on republishing.
- Emails are sent via the **Resend API** (see [DEPLOY.md](DEPLOY.md)) —
  on shared hosting, SMTP turned out to be unreliable (no DKIM, the shared
  IP's PTR doesn't point at the domain, Gmail silently dropped mail).
- The Morse-code CAPTCHA (`includes/captcha.php`) is basic protection
  against primitive scripts, not against a targeted bypass.
- `TelegraphKey` calibrates dots/dashes relative to the selected `wpm`,
  rather than adapting to the user's actual pace.
- Cyrillic is only in "Letters" (keying + copying by ear) — "Koch method"
  and "Character groups" stay Latin-only. This is deliberate, not an
  oversight: Koch has a fixed classical character order that's Latin by
  definition, and Groups/the exam mode target the ham radio license
  syllabus (Latin+digits), so a Cyrillic set there wouldn't map to anything.

## Roadmap / ideas for the future

Roughly ordered by priority (details and nuance are in [CLAUDE.md](CLAUDE.md)):

- [ ] **A custom adaptive ear-copy decoder** — adapts to the actual sending
  speed from timestamps, instead of relying on a chosen wpm
- [ ] **Adaptive key calibration** to the user's actual pace
- [ ] _(long-term)_ A native Android app (not a PWA)
- [ ] _(research)_ Support for a real telegraph key (Arduino adapter / Web
  Serial / microphone input)

Already done: password recovery by email, progress export/import as a file,
targeted daily challenges, self-service account deletion, leaderboard
protection, a bilingual interface (Russian/English), the Cyrillic Morse
alphabet in "Letters" (v2.51), the full leaderboard page plus a user's own
rank on the home page (v2.52), key rhythm scoring in "Letters" (v2.53), the
"Invasion" tower-defense mini-game (v2.54, BETA status), achievements for
invasion waves and for mastered key rhythm (v2.55–v2.56).

## Related project

Once you've learned to copy individual characters and callsigns, the next
step on the route (see "Beginner's path" on the home page) is
**[Morse Walker](https://morse.r9o.ru)**: a radio contact simulator with
pile-ups, contest and POTA modes, and a Russian callsign generator. It's a
separate project, not part of MorseWave — original author
[W6NYC](https://github.com/sc0tfree/morsewalker), with further development
and localization also by R9OGL:
[github.com/loloka/morsewalker](https://github.com/loloka/morsewalker).

## License

MIT — do whatever you want with it, see [LICENSE](LICENSE).
