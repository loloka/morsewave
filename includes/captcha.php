<?php
/**
 * Простая капча на тему сайта: сервер загадывает короткое слово и отдаёт
 * клиенту ТОЛЬКО код Морзе (точки/тире), без самого слова — расшифровать
 * можно либо на слух (клиент реально проигрывает звук), либо глазами по
 * паттерну. Останавливает примитивные скрипты массовой регистрации, не
 * претендуя на защиту от целенаправленного обхода — этого достаточно для
 * небольшого сообщества.
 */

const CAPTCHA_MORSE = [
    'A'=>'.-','B'=>'-...','C'=>'-.-.','D'=>'-..','E'=>'.','F'=>'..-.','G'=>'--.',
    'H'=>'....','I'=>'..','J'=>'.---','K'=>'-.-','L'=>'.-..','M'=>'--','N'=>'-.',
    'O'=>'---','P'=>'.--.','Q'=>'--.-','R'=>'.-.','S'=>'...','T'=>'-','U'=>'..-',
    'V'=>'...-','W'=>'.--','X'=>'-..-','Y'=>'-.--','Z'=>'--..',
    '0'=>'-----','1'=>'.----','2'=>'..---','3'=>'...--','4'=>'....-',
    '5'=>'.....','6'=>'-....','7'=>'--...','8'=>'---..','9'=>'----.',
];

// Короткие слова из радиолюбительского обихода — тематично и легко на слух
const CAPTCHA_WORDS = [
    'SOS', 'CQ', 'DX', 'QTH', 'QRZ', 'ANT', 'RIG', 'KEY', 'HAM', 'WAVE',
    'CODE', 'WIRE', 'BAND', 'FIST', 'NET', 'ARM', 'ERA', 'ICE', 'OK',
];

function captcha_morse_for_word($word) {
    $groups = [];
    foreach (str_split($word) as $ch) {
        $groups[] = CAPTCHA_MORSE[$ch] ?? '';
    }
    return implode(' ', $groups);
}

function captcha_new() {
    $word = CAPTCHA_WORDS[array_rand(CAPTCHA_WORDS)];
    $_SESSION['captcha_word'] = $word;
    $_SESSION['captcha_time'] = time();
    return captcha_morse_for_word($word);
}

function captcha_verify($answer) {
    $word = $_SESSION['captcha_word'] ?? null;
    $time = $_SESSION['captcha_time'] ?? 0;
    // Капча одноразовая и живёт 5 минут
    unset($_SESSION['captcha_word'], $_SESSION['captcha_time']);

    if (!$word || (time() - $time) > 300) return false;
    return strtoupper(trim((string) $answer)) === $word;
}
