/*
 * =====================================================================
 *  MorseWave Pro Keyer v1.4 (SRT Olympic Edition - up to 60 WPM)
 *  - Диапазон скорости: от 10 до 60 WPM (длительность точки от 120 до 20 мс)!
 *  - Диапазон тона: от 400 до 1200 Гц (шаг 25 Гц)!
 *  - Красивый графический прогресс-бар в Serial Monitor при вращении крутилок
 *  - Профессиональный интерфейс на OLED 0.96" (SSD1306 128x64):
 *      * Строка 0: WPM, частота тона и индикатор режима
 *      * Строка 3: КРУПНЫЙ вывод передаваемого знака Морзе в реальном времени
 *      * Строка 6-7: Бегущая строка принятого текста
 *  - Классический алгоритм Curtis 8044 / TX-500:
 *      * Полная защита от дребезга контактов весла
 *      * Память элементов (Dot/Dash Memory) для скоростной передачи
 *      * Блокировка АЦП крутилок во время звучания
 *  - Раскладка СРТ (Точки = D2 указательный, Тире = D3 большой палец)
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

// Декодер текста Морзе
String currentMorseChar = "";
String decodedLine = "";

struct MorseCode { const char* code; char letter; };
const MorseCode morseTable[] = {
  {".-", 'A'}, {"-...", 'B'}, {"-.-.", 'C'}, {"-..", 'D'}, {".", 'E'},
  {"..-.", 'F'}, {"--.", 'G'}, {"....", 'H'}, {"..", 'I'}, {".---", 'J'},
  {"-.-", 'K'}, {".-..", 'L'}, {"--", 'M'}, {"-.", 'N'}, {"---", 'O'},
  {".--.", 'P'}, {"--.-", 'Q'}, {".-.", 'R'}, {"...", 'S'}, {"-", 'T'},
  {"..-", 'U'}, {"...-", 'V'}, {".--", 'W'}, {"-..-", 'X'}, {"-.--", 'Y'},
  {"--..", 'Z'}, {"-----", '0'}, {".----", '1'}, {"..---", '2'}, {"...--", '3'},
  {"....-", '4'}, {".....", '5'}, {"-....", '6'}, {"--...", '7'}, {"---..", '8'},
  {"----.", '9'}, {".-.-.-", '.'}, {"--..--", ','}, {"..--..", '?'}, {"-..-.", '/'}
};
const int MORSE_TABLE_SIZE = sizeof(morseTable) / sizeof(MorseCode);

char decodeMorse(String code) {
  for (int i = 0; i < MORSE_TABLE_SIZE; i++) {
    if (code == morseTable[i].code) return morseTable[i].letter;
  }
  return '?';
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
  Wire.beginTransmission(0x3C);
  if (Wire.endTransmission() == 0) {
    hasOled = true;
    oled.init();
    oled.clear();
    drawScreenLayout();
  }

  // Первоначальное чтение крутилок
  int rawWpm = analogRead(PIN_POT_WPM);
  currentWpm = map(rawWpm, 0, 1023, MIN_WPM, MAX_WPM);
  ditMs = 1200 / currentWpm;
  dahMs = ditMs * 3;

  int rawPitch = analogRead(PIN_POT_PITCH);
  currentPitch = map(rawPitch, 0, 1023, MIN_PITCH, MAX_PITCH);
  currentPitch = (currentPitch / 25) * 25;

  if (hasOled) {
    updateScreenHeader();
    updateScreenText();
  }

  Serial.println();
  Serial.println(F("=================================================="));
  Serial.println(F("  MorseWave Pro Keyer v1.4 (SRT 60 WPM Edition)   "));
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
  Serial.println(hasOled ? F("ONLINE (SSD1306 128x64 OK)") : F("OFFLINE (подключи GND, 5V, A4, A5)"));
  Serial.println(F("--------------------------------------------------"));
  Serial.println(F("Крутилка A0: 10..60 WPM | Крутилка A2: 400..1200 Hz"));
  Serial.println(F("=================================================="));
  Serial.println();
}

void loop() {
  handleKeyer();
  readPots();
  handleDecodedPauses();
}

// --- АВТОМАТ СОСТОЯНИЙ КЛАССИЧЕСКОГО КЕЙЕРА CURTIS 8044 ---
void handleKeyer() {
  unsigned long now = millis();
  bool ditPin = (digitalRead(PIN_DIT) == LOW);
  bool dahPin = (digitalRead(PIN_DAH) == LOW);

  // Память противоположного элемента (Dot/Dash Memory):
  // Пока передается точка (звук или пауза), ловим нажатие тире
  if (state == STATE_PLAY_DIT || state == STATE_PAUSE_DIT) {
    if (dahPin) dahMemory = true;
  }
  // Пока передается тире (звук или пауза), ловим нажатие точки
  if (state == STATE_PLAY_DAH || state == STATE_PAUSE_DAH) {
    if (ditPin) ditMemory = true;
  }

  switch (state) {
    case STATE_IDLE:
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
      if (now - stateStartTime >= ditMs) {
        if (dahMemory || dahPin) {
          dahMemory = false;
          startDah();
        } else if (ditPin) {
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
      if (now - stateStartTime >= ditMs) {
        if (ditMemory || ditPin) {
          ditMemory = false;
          startDit();
        } else if (dahPin) {
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
  state = STATE_PLAY_DIT;
  stateStartTime = millis();

  tone(PIN_AUDIO, currentPitch);
  digitalWrite(PIN_LED_KEY, HIGH);

  currentMorseChar += ".";
  Serial.print(".");
  if (hasOled) updateScreenMorse();
}

void startDah() {
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

// --- ЧТЕНИЕ ПОТЕНЦИОМЕТРОВ (ТОЛЬКО В ПОКОЕ IDLE) ---
void readPots() {
  if (state != STATE_IDLE) return;

  static unsigned long lastPotRead = 0;
  if (millis() - lastPotRead > 80) {
    lastPotRead = millis();

    // Чтение WPM с мертвой зоной (deadband)
    static int lastRawWpm = -1;
    int rawWpm = analogRead(PIN_POT_WPM);
    if (lastRawWpm == -1) lastRawWpm = rawWpm;

    if (abs(rawWpm - lastRawWpm) > 18) {
      lastRawWpm = rawWpm;
      int newWpm = map(rawWpm, 0, 1023, MIN_WPM, MAX_WPM);
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

    // Чтение PITCH с мертвой зоной
    static int lastRawPitch = -1;
    int rawPitch = analogRead(PIN_POT_PITCH);
    if (lastRawPitch == -1) lastRawPitch = rawPitch;

    if (abs(rawPitch - lastRawPitch) > 25) {
      lastRawPitch = rawPitch;
      int newPitch = map(rawPitch, 0, 1023, MIN_PITCH, MAX_PITCH);
      newPitch = (newPitch / 25) * 25;
      if (abs(newPitch - currentPitch) >= 25) {
        currentPitch = newPitch;

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

// --- ДЕКОДЕР ЗНАКОВ И ПАУЗ ---
void handleDecodedPauses() {
  if (state != STATE_IDLE || currentMorseChar.length() == 0) return;

  unsigned long pause = millis() - lastSymbolEndTime;

  // Межзнаковая пауза (3 длительности точки) -> декодируем букву
  if (pause >= ditMs * 3) {
    char letter = decodeMorse(currentMorseChar);
    decodedLine += letter;
    if (decodedLine.length() > 21) {
      decodedLine = decodedLine.substring(decodedLine.length() - 21);
    }

    Serial.print(" [");
    Serial.print(letter);
    Serial.print("] ");

    currentMorseChar = "";
    if (hasOled) {
      updateScreenMorse();
      updateScreenText();
    }
  }

  // Межсловная пауза (7 длительностей точки) -> пробел
  if (pause >= ditMs * 7 && decodedLine.length() > 0 && !decodedLine.endsWith(" ")) {
    decodedLine += " ";
    Serial.println();
    if (hasOled) updateScreenText();
  }
}

// --- ОТРИСОВКА ИНТЕРФЕЙСА OLED (БЫСТРАЯ, БЕЗ МЕРЦАНИЯ) ---
void drawScreenLayout() {
  if (!hasOled) return;

  oled.clear();
  oled.setScale(1);

  // Горизонтальный разделитель под шапкой (строка 1)
  oled.setCursor(0, 1);
  oled.print(F("---------------------"));

  // Подпись принятого текста (строка 5)
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
  oled.print(F("          ")); // Очистка старых символов
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
  // Печатаем строку текста с дополнением пробелами
  String displayStr = decodedLine;
  while (displayStr.length() < 16) displayStr += " ";
  oled.print(displayStr.substring(displayStr.length() - 16));
}
