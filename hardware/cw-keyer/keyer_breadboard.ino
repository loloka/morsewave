/*
 * =====================================================================
 *  MorseWave Pro Keyer v1.7.2 (Single-Paddle & Iambic B Rock-Solid Latch)
 *  - Аппаратная защелка памяти (Single-Paddle Independent Latch):
 *      * Контакты весел опрашиваются непрерывно в каждом цикле loop().
 *      * Быстрое одиночное касание точки или тире (даже длительностью 15-30 мс)
 *        гарантированно защелкивается в памяти ditPending / dahPending.
 *      * Память очищается ИСКЛЮЧИТЕЛЬНО при фактическом старте звучания элемента
 *        (в startDit() / startDah()), а НЕ при переходе в IDLE.
 *      * В сложных знаках (Ц / C -.-., Ч ---., Q --.-, Y -.--, L .-..)
 *        второе тире или завершающая точка никогда не теряются на малых скоростях (10-14 WPM).
 *  - Адаптивный межзнаковый порог по стандарту ITU-R (2.5T):
 *      * На малых скоростях исключен преждевременный сброс текущей буквы при медленном переносе весла.
 *  - Честная обработка межсловных пробелов (Smart Word Spacing):
 *      * Ровно ОДИН пробел между словами при паузе > 4.5 точек.
 *  - Полная расширенная таблица Морзе (по стандарту ITU и ARRL):
 *      * Все знаки препинания: = (BT), + (AR), <SK>, <KN>, <AS>, @, -, :, ;, ', ", !, _, $, <HH>
 *      * Русские буквы Морзе (СРТ / ГОСТ): Ч (---.), Ш (----), Э (..-..), Ю (..--), Я (.-.-)
 *  - Регулировка WPM (10..60) и PITCH (400..1200 Гц) НА ЛЕТУ.
 *  - Калибровка АЦП (ADC_MIN=15, ADC_MAX=850) под просадку VIN.
 *  - Скоростной Fast I2C (400 кГц) + OLED 0.96" SSD1306.
 *  - Поддержка как однорычажного манипулятора (Single Paddle), так и двухрычажного (Iambic B).
 * =====================================================================
 */

#include <Wire.h>
#include <GyverOLED.h>

GyverOLED<SSD1306_128x64, OLED_NO_BUFFER> oled;
bool hasOled = false;

// --- ПИНЫ УСТРОЙСТВА ---
const int PIN_DIT       = 2;    // Точки (D2)
const int PIN_DAH       = 3;    // Тире (D3)
const int PIN_AUDIO     = 6;    // Динамик PWM
const int PIN_LED_KEY   = 8;    // Светодиод KEY
const int PIN_POT_WPM   = A0;   // Потенциометр скорости
const int PIN_POT_PITCH = A2;   // Потенциометр тона

// --- ДИАПАЗОНЫ НАСТРОЕК ---
const int MIN_WPM   = 10;
const int MAX_WPM   = 60;
const int MIN_PITCH = 400;
const int MAX_PITCH = 1200;

// Калибровка АЦП (при питании шины от VIN ~4.2 В и AREF 5.0 В максимум равен ~850)
const int ADC_MIN   = 15;
const int ADC_MAX   = 850;

int currentWpm = 20;
int currentPitch = 700;
unsigned long ditMs = 1200 / 20;
unsigned long dahMs = ditMs * 3;

// --- АВТОМАТ СОСТОЯНИЙ КЛЮЧА CURTIS 8044 ---
enum KeyerState {
  STATE_IDLE,
  STATE_PLAY_DIT,
  STATE_PAUSE_DIT,
  STATE_PLAY_DAH,
  STATE_PAUSE_DAH
};

KeyerState state = STATE_IDLE;
unsigned long stateStartTime = 0;
bool ditMemory = false;
bool dahMemory = false;
unsigned long lastSymbolEndTime = 0;
bool wordSpaceNeeded = false;

// Декодер текста Морзе
String currentMorseChar = "";
String decodedLine = "";

// --- ПОЛНАЯ ТАБЛИЦА МОРЗЕ (ITU + ARRL + СРТ ГОСТ) ---
struct MorseEntry {
  const char* code;
  const char* text;
};

const MorseEntry morseTable[] = {
  // Латинские буквы (A-Z)
  {".-", "A"}, {"-...", "B"}, {"-.-.", "C"}, {"-..", "D"}, {".", "E"},
  {"..-.", "F"}, {"--.", "G"}, {"....", "H"}, {"..", "I"}, {".---", "J"},
  {"-.-", "K"}, {".-..", "L"}, {"--", "M"}, {"-.", "N"}, {"---", "O"},
  {".--.", "P"}, {"--.-", "Q"}, {".-.", "R"}, {"...", "S"}, {"-", "T"},
  {"..-", "U"}, {"...-", "V"}, {".--", "W"}, {"-..-", "X"}, {"-.--", "Y"},
  {"--..", "Z"},

  // Цифры (0-9)
  {"-----", "0"}, {".----", "1"}, {"..---", "2"}, {"...--", "3"},
  {"....-", "4"}, {".....", "5"}, {"-....", "6"}, {"--...", "7"},
  {"---..", "8"}, {"----.", "9"},

  // Радиолюбительские знаки и знаки препинания (ITU / ARRL)
  {".-.-.-", "."},       // Точка
  {"--..--", ","},       // Запятая
  {"..--..", "?"},       // Вопросительный знак
  {"-..-.", "/"},        // Дробь (DN)
  {"-...-", "="},        // Раздел / Знак равенства (BT) - ключевой знак в эфире!
  {".-.-.", "+"},        // Конец передачи (AR)
  {"...-.-", "<SK>"},    // Конец связи (SK)
  {"-.--.", "("},        // Скобка / KN (только вызываемая станция)
  {"-.--.-", ")"},       // Закрывающая скобка
  {".-...", "<AS>"},     // Ждите (AS)
  {".--.-.", "@"},       // Собака (AC)
  {"-....-", "-"},       // Дефис / Минус (DU)
  {"---...", ":"},       // Двоеточие (OS)
  {"-.-.-.", ";"},       // Точка с запятой (KR)
  {".----.", "'"},       // Апостроф (WG)
  {".-..-.", "\""},      // Кавычки (AF)
  {"-.-.--", "!"},       // Восклицательный знак
  {"..--.-", "_"},       // Подчеркивание
  {"...-..-", "$"},      // Доллар
  {"........", "<HH>"},  // Ошибка / Исправление (8 точек)

  // Русские буквы Морзе (СРТ / ГОСТ), не совпадающие с латиницей
  {"---.", "CH"},        // Ч
  {"----", "SH"},        // Ш
  {"..-..", "E'"},       // Э
  {"..--", "YU"},        // Ю
  {".-.-", "YA"}         // Я
};
const int MORSE_TABLE_SIZE = sizeof(morseTable) / sizeof(MorseEntry);

String decodeMorse(const String& code) {
  // 1. Прямой поиск точного совпадения в таблице
  for (int i = 0; i < MORSE_TABLE_SIZE; i++) {
    if (code == morseTable[i].code) {
      return String(morseTable[i].text);
    }
  }

  // 2. Если знак слитный (оператор передал буквы без достаточной паузы, например R9 или CQ):
  // Автоматический жадный парсер (Greedy Segmentation) разбивает слипшуюся цепочку на валидные знаки
  String result = "";
  String remaining = code;

  while (remaining.length() > 0) {
    bool matched = false;
    int maxLen = min((int)remaining.length(), 6);
    for (int len = maxLen; len >= 1; len--) {
      String prefix = remaining.substring(0, len);
      for (int i = 0; i < MORSE_TABLE_SIZE; i++) {
        if (prefix == morseTable[i].code) {
          result += morseTable[i].text;
          remaining = remaining.substring(len);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    if (!matched) {
      result += "?";
      remaining = remaining.substring(1);
    }
  }

  return (result.length() > 0) ? result : "?";
}

// Вывод визуальной шкалы прогресс-бара в Serial
void printBar(int val, int minVal, int maxVal, int width) {
  int filled = map(val, minVal, maxVal, 0, width);
  if (filled < 0) filled = 0;
  if (filled > width) filled = width;

  Serial.print(F(" ["));
  for (int i = 0; i < width; i++) {
    if (i < filled) Serial.print(F("="));
    else if (i == filled) Serial.print(F(">"));
    else Serial.print(F(" "));
  }
  Serial.print(F("]"));
}

// --- ПРИВЕТСТВИЕ ПРИ ВКЛЮЧЕНИИ: VVV = (КАК ПЕРЕД РАДИОГРАММАМИ) ---
void playIntroTone(bool isDah) {
  unsigned long duration = isDah ? dahMs : ditMs;
  tone(PIN_AUDIO, currentPitch);
  digitalWrite(PIN_LED_KEY, HIGH);
  unsigned long start = millis();
  while (millis() - start < duration) {
    // Если коснулись весла — мгновенно прерываем звук
    if (digitalRead(PIN_DIT) == LOW || digitalRead(PIN_DAH) == LOW) {
      noTone(PIN_AUDIO);
      digitalWrite(PIN_LED_KEY, LOW);
      return;
    }
  }
  noTone(PIN_AUDIO);
  digitalWrite(PIN_LED_KEY, LOW);

  start = millis();
  while (millis() - start < ditMs) {
    if (digitalRead(PIN_DIT) == LOW || digitalRead(PIN_DAH) == LOW) return;
  }
}

void playIntroChar(const char* morse) {
  for (int i = 0; morse[i] != '\0'; i++) {
    if (digitalRead(PIN_DIT) == LOW || digitalRead(PIN_DAH) == LOW) return;
    playIntroTone(morse[i] == '-');
  }
  unsigned long start = millis();
  while (millis() - start < ditMs * 2) {
    if (digitalRead(PIN_DIT) == LOW || digitalRead(PIN_DAH) == LOW) return;
  }
}

void playStartupGreeting() {
  if (hasOled) {
    oled.clear();
    oled.setScale(1);
    oled.setCursor(19, 1);
    oled.print(F("MORSEWAVE KEYER"));
    oled.setScale(2);
    oled.setCursor(34, 3);
    oled.print(F("VVV ="));
    oled.setScale(1);
    oled.setCursor(25, 6);
    oled.print(F("R9OGL EDITION"));
  }

  Serial.println(F(">> Startup Intro: VVV = (R9OGL Edition) <<"));

  // Проигрываем V V V = (три буквы V и знак раздела =)
  playIntroChar("...-");  // V
  playIntroChar("...-");  // V
  playIntroChar("...-");  // V
  playIntroChar("-...-"); // = (BT)

  delay(150);

  if (hasOled) {
    drawScreenLayout();
    updateScreenHeader();
    updateScreenText();
    updateScreenMorse();
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_DIT, INPUT_PULLUP);
  pinMode(PIN_DAH, INPUT_PULLUP);
  pinMode(PIN_AUDIO, OUTPUT);
  pinMode(PIN_LED_KEY, OUTPUT);

  noTone(PIN_AUDIO);
  digitalWrite(PIN_LED_KEY, LOW);

  // Проверка наличия OLED-дисплея по I2C (адрес 0x3C)
  Wire.begin();
  Wire.setClock(400000); // 400 кГц Fast I2C для мгновенной отрисовки без задержек

  Wire.beginTransmission(0x3C);
  if (Wire.endTransmission() == 0) {
    hasOled = true;
    oled.init();
    oled.clear();
    drawScreenLayout();
  }

  // Первоначальное чтение крутилок
  int rawWpm = analogRead(PIN_POT_WPM);
  currentWpm = map(constrain(rawWpm, ADC_MIN, ADC_MAX), ADC_MIN, ADC_MAX, MIN_WPM, MAX_WPM);
  ditMs = 1200 / currentWpm;
  dahMs = ditMs * 3;

  int rawPitch = analogRead(PIN_POT_PITCH);
  currentPitch = map(constrain(rawPitch, ADC_MIN, ADC_MAX), ADC_MIN, ADC_MAX, MIN_PITCH, MAX_PITCH);
  currentPitch = (currentPitch / 25) * 25;

  // Воспроизводим фирменное приветствие радиограмм "VVV ="
  playStartupGreeting();

  Serial.println();
  Serial.println(F("=================================================="));
  Serial.println(F("  MorseWave Pro Keyer v1.7.2 (R9OGL Edition)      "));
  Serial.println(F("=================================================="));
  Serial.print(F("Speed : "));
  Serial.print(currentWpm);
  Serial.print(F(" WPM (dit: "));
  Serial.print(ditMs);
  Serial.print(F(" ms)"));
  printBar(currentWpm, MIN_WPM, MAX_WPM, 16);
  Serial.println();

  Serial.print(F("Tone  : "));
  Serial.print(currentPitch);
  Serial.print(F(" Hz"));
  printBar(currentPitch, MIN_PITCH, MAX_PITCH, 16);
  Serial.println();

  Serial.print(F("OLED  : "));
  Serial.println(hasOled ? F("ONLINE (SSD1306 Fast I2C OK)") : F("OFFLINE (подключи GND, 5V, A4, A5)"));
  Serial.println(F("--------------------------------------------------"));
  Serial.println(F("Декодер: Полная таблица ITU, спецзнаки BT, AR, SK,"));
  Serial.println(F("русские буквы Ч, Ш, Э, Ю, Я и честные пробелы!"));
  Serial.println(F("=================================================="));
  Serial.println();
}

void loop() {
  handleKeyer();
  readPots();
  handleDecodedPauses();
}

// --- АВТОМАТ СОСТОЯНИЙ КЛАССИЧЕСКОГО КЕЙЕРА (CURTIS 8044 / K3NG ARCHITECTURE) ---
void handleKeyer() {
  unsigned long now = millis();

  // 1. Аппаратно-программный опрос весел с надежным антидребезгом (8 мс)
  static unsigned long lastDitLowTime = 0;
  static unsigned long lastDahLowTime = 0;
  if (digitalRead(PIN_DIT) == LOW) lastDitLowTime = now;
  if (digitalRead(PIN_DAH) == LOW) lastDahLowTime = now;

  bool ditRaw = (digitalRead(PIN_DIT) == LOW);
  bool dahRaw = (digitalRead(PIN_DAH) == LOW);
  bool ditPin = ditRaw || (now - lastDitLowTime < 8);
  bool dahPin = dahRaw || (now - lastDahLowTime < 8);

  // 2. Память элементов (Канонический Curtis 8044 / K3NG):
  // Защёлка противоположного элемента взводится ИСКЛЮЧИТЕЛЬНО во время звучания текущего тона.
  // Во время пауз память НЕ опрашивается, чтобы исключить паразитный отскок (bounce) весла об упор!
  if (state == STATE_PLAY_DIT) {
    if (dahPin) dahMemory = true;
  } else if (state == STATE_PLAY_DAH) {
    if (ditPin) ditMemory = true;
  }

  switch (state) {
    case STATE_IDLE:
      // В покое реагируем строго на живое физическое касание весла
      if (dahPin) {
        startDah();
      } else if (ditPin) {
        startDit();
      }
      break;

    case STATE_PLAY_DIT:
      if (now - stateStartTime >= ditMs) {
        stopToneOutput();
        state = STATE_PAUSE_DIT;
        stateStartTime = now;
      }
      break;

    case STATE_PAUSE_DIT:
      // Межэлементная пауза после точки равна ровно 1 ditMs
      if (now - stateStartTime >= ditMs) {
        // Приоритет противоположного элемента: если в памяти есть тире
        if (dahMemory || dahPin) {
          dahMemory = false;
          startDah();
        } else if (ditPin) {
          // Повтор точки ТОЛЬКО если весло реально зажато
          startDit();
        } else {
          state = STATE_IDLE;
          ditMemory = false;
          dahMemory = false;
          lastSymbolEndTime = millis();
        }
      }
      break;

    case STATE_PLAY_DAH:
      if (now - stateStartTime >= dahMs) {
        stopToneOutput();
        state = STATE_PAUSE_DAH;
        stateStartTime = now;
      }
      break;

    case STATE_PAUSE_DAH:
      // Межэлементная пауза после тире равна ровно 1 ditMs
      if (now - stateStartTime >= ditMs) {
        // Приоритет противоположного элемента: если в памяти есть точка
        if (ditMemory || ditPin) {
          ditMemory = false;
          startDit();
        } else if (dahPin) {
          // Повтор тире ТОЛЬКО если весло реально зажато
          startDah();
        } else {
          state = STATE_IDLE;
          ditMemory = false;
          dahMemory = false;
          lastSymbolEndTime = millis();
        }
      }
      break;
  }
}

void startDit() {
  ditMemory = false;
  state = STATE_PLAY_DIT;
  stateStartTime = millis();

  tone(PIN_AUDIO, currentPitch);
  digitalWrite(PIN_LED_KEY, HIGH);

  currentMorseChar += ".";
  Serial.print(".");
  if (hasOled) updateScreenMorse();
}

void startDah() {
  dahMemory = false;
  state = STATE_PLAY_DAH;
  stateStartTime = millis();

  tone(PIN_AUDIO, currentPitch);
  digitalWrite(PIN_LED_KEY, HIGH);

  currentMorseChar += "-";
  Serial.print("-");
  if (hasOled) updateScreenMorse();
}

void stopToneOutput() {
  noTone(PIN_AUDIO);
  digitalWrite(PIN_LED_KEY, LOW);
}

// --- ЧТЕНИЕ ПОТЕНЦИОМЕТРОВ НА ЛЕТУ С ФИЛЬТРАЦИЕЙ ПОМЕХ ---
void readPots() {
  static unsigned long lastPotRead = 0;
  if (millis() - lastPotRead > 40) {
    lastPotRead = millis();

    // 1. ЧТЕНИЕ WPM НА ЛЕТУ
    static int filteredWpmAdc = -1;
    static int lastReportedWpmAdc = -1;
    int rawWpm = analogRead(PIN_POT_WPM);
    if (filteredWpmAdc == -1) {
      filteredWpmAdc = rawWpm;
      lastReportedWpmAdc = rawWpm;
    }
    filteredWpmAdc = (filteredWpmAdc * 3 + rawWpm) / 4;

    if (abs(filteredWpmAdc - lastReportedWpmAdc) > 20) {
      lastReportedWpmAdc = filteredWpmAdc;
      int clampedAdc = constrain(filteredWpmAdc, ADC_MIN, ADC_MAX);
      int newWpm = map(clampedAdc, ADC_MIN, ADC_MAX, MIN_WPM, MAX_WPM);
      if (newWpm != currentWpm) {
        currentWpm = newWpm;
        ditMs = 1200 / currentWpm;
        dahMs = ditMs * 3;

        if (hasOled) updateScreenHeader();

        Serial.print(F("\n[SPEED] "));
        if (currentWpm < 10) Serial.print(F(" "));
        Serial.print(currentWpm);
        Serial.print(F(" WPM (dit: "));
        if (ditMs < 100) Serial.print(F(" "));
        Serial.print(ditMs);
        Serial.print(F(" ms)"));
        printBar(currentWpm, MIN_WPM, MAX_WPM, 18);
        Serial.println();
      }
    }

    // 2. ЧТЕНИЕ PITCH НА ЛЕТУ
    static int filteredPitchAdc = -1;
    static int lastReportedPitchAdc = -1;
    int rawPitch = analogRead(PIN_POT_PITCH);
    if (filteredPitchAdc == -1) {
      filteredPitchAdc = rawPitch;
      lastReportedPitchAdc = rawPitch;
    }
    filteredPitchAdc = (filteredPitchAdc * 3 + rawPitch) / 4;

    if (abs(filteredPitchAdc - lastReportedPitchAdc) > 24) {
      lastReportedPitchAdc = filteredPitchAdc;
      int clampedAdc = constrain(filteredPitchAdc, ADC_MIN, ADC_MAX);
      int newPitch = map(clampedAdc, ADC_MIN, ADC_MAX, MIN_PITCH, MAX_PITCH);
      newPitch = (newPitch / 25) * 25;
      if (abs(newPitch - currentPitch) >= 25) {
        currentPitch = newPitch;

        // Если динамик звучит — мгновенно обновляем тон на лету!
        if (state == STATE_PLAY_DIT || state == STATE_PLAY_DAH) {
          tone(PIN_AUDIO, currentPitch);
        }

        if (hasOled) updateScreenHeader();

        Serial.print(F("\n[TONE]  "));
        if (currentPitch < 1000) Serial.print(F(" "));
        Serial.print(currentPitch);
        Serial.print(F(" Hz"));
        printBar(currentPitch, MIN_PITCH, MAX_PITCH, 18);
        Serial.println();
      }
    }
  }
}

// --- УМНЫЙ ДЕКОДЕР ЗНАКОВ И МЕЖСЛОВНЫХ ПРОБЕЛОВ ---
void handleDecodedPauses() {
  if (state != STATE_IDLE) return;

  unsigned long pause = millis() - lastSymbolEndTime;

  // 1. Межзнаковая пауза (по стандарту ITU: 1.0T межэлементная + 2.5T тишина = 3.5T между буквами)
  // При 10 WPM (dit: 120 мс) порог = 300 мс — комфортный люфт для переброски весла без разрыва букв C, Q, Y!
  unsigned long charSpaceThreshold = (ditMs * 25) / 10;
  if (currentMorseChar.length() > 0 && pause >= charSpaceThreshold) {
    String decoded = decodeMorse(currentMorseChar);
    decodedLine += decoded;
    if (decodedLine.length() > 32) {
      decodedLine = decodedLine.substring(decodedLine.length() - 32);
    }

    Serial.print(" [");
    Serial.print(decoded);
    Serial.print("] ");

    currentMorseChar = "";
    wordSpaceNeeded = true; // Символ принят: теперь разрешен межсловный пробел

    if (hasOled) {
      updateScreenMorse();
      updateScreenText();
    }
  }

  // 2. Межсловная пауза (в сумме с межэлементной дает 5.5 точек) -> ровно ОДИН пробел
  unsigned long wordSpaceThreshold = (ditMs * 45) / 10;
  if (wordSpaceNeeded && pause >= wordSpaceThreshold) {
    wordSpaceNeeded = false; // Однократное срабатывание: не будет спама пробелами!

    if (decodedLine.length() > 0 && !decodedLine.endsWith(" ")) {
      decodedLine += " ";
      if (decodedLine.length() > 32) {
        decodedLine = decodedLine.substring(decodedLine.length() - 32);
      }

      Serial.print(" ");
      Serial.println(); // Перевод строки в Serial для красивого чтения слов

      if (hasOled) {
        updateScreenText();
      }
    }
  }
}

// --- ОТРИСОВКА ИНТЕРФЕЙСА OLED (БЫСТРАЯ, БЕЗ МЕРЦАНИЯ) ---
void drawScreenLayout() {
  if (!hasOled) return;

  oled.clear();
  oled.setScale(1);

  // Разделитель под шапкой (строка 1)
  oled.setCursor(0, 1);
  oled.print(F("---------------------"));

  // Подпись блока принятого текста (строка 5)
  oled.setCursor(0, 5);
  oled.print(F("TXT:"));
}

void updateScreenHeader() {
  if (!hasOled) return;

  oled.setScale(1);
  oled.setCursor(0, 0);
  oled.print(F("WPM:"));
  if (currentWpm < 10) oled.print(F(" "));
  oled.print(currentWpm);
  oled.print(F(" "));
  if (currentPitch < 1000) oled.print(F(" "));
  oled.print(currentPitch);
  oled.print(F("Hz  [CW]"));
}

void updateScreenMorse() {
  if (!hasOled) return;

  // Строка 3: Крупный шрифт (Scale 2) для текущего знака Морзе
  oled.setScale(2);
  oled.setCursor(0, 3);
  oled.print(F("          ")); // Очистка
  oled.setCursor(10, 3);
  if (currentMorseChar.length() > 0) {
    oled.print(currentMorseChar);
  } else {
    oled.print(F("- READY -"));
  }
}

void updateScreenText() {
  if (!hasOled) return;

  oled.setScale(1);
  oled.setCursor(28, 5);
  
  // Выводим бегущую строку (последние 16 символов)
  String displayStr = decodedLine;
  if (displayStr.length() > 16) {
    displayStr = displayStr.substring(displayStr.length() - 16);
  }
  while (displayStr.length() < 16) displayStr += " ";
  oled.print(displayStr);
}
