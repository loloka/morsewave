/*
 * =====================================================================
 *  MorseWave Pro Keyer v1.1 (Authentic Iambic A / Curtis Timing)
 *  - Честный режим IAMBIC A (Curtis 8044):
 *      * Решение о повторе принимается ТОЛЬКО в конце паузы!
 *      * Никаких двойных точек при одиночном касании (буквы A, R передаются четко)!
 *      * Автоповтор работает при удержании весла!
 *      * Ямбическое чередование (squeeze) работает без паразитных хвостов.
 *  - Раскладка СРТ (Точки = D2 указательный, Тире = D3 большой палец)
 *  - Плавные крутилки A0 (WPM: 10..35) и A2 (PITCH: 450..850 Гц)
 *  - Наглядный вывод в Serial Monitor при каждом повороте крутилки!
 *  - Автоопределение OLED 0.96" по I2C (работает как с дисплеем, так и без)
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

// --- ДИНАМИЧЕСКИЕ ПАРАМЕТРЫ ---
int currentWpm = 18;
int currentPitch = 650;
unsigned long ditMs = 1200 / 18;
unsigned long dahMs = ditMs * 3;

// Автомат состояний Iambic A
enum KeyerState {
  STATE_IDLE,
  STATE_DIT,
  STATE_DAH,
  STATE_PAUSE
};

KeyerState state = STATE_IDLE;
KeyerState lastElement = STATE_IDLE;

unsigned long stateStartTime = 0;
bool ditMemory = false;
bool dahMemory = false;
bool wasSqueezed = false;
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

void setup() {
  Serial.begin(115200);

  pinMode(PIN_DIT, INPUT_PULLUP);
  pinMode(PIN_DAH, INPUT_PULLUP);
  pinMode(PIN_AUDIO, OUTPUT);
  pinMode(PIN_LED_KEY, OUTPUT);

  noTone(PIN_AUDIO);
  digitalWrite(PIN_LED_KEY, LOW);

  // Проверяем наличие дисплея на шине I2C (адрес 0x3C)
  Wire.begin();
  Wire.beginTransmission(0x3C);
  if (Wire.endTransmission() == 0) {
    hasOled = true;
    oled.init();
    oled.clear();
    oled.setScale(1);
    oled.setCursor(0, 0);
    oled.print(F("MorseWave Keyer"));
    oled.setCursor(0, 2);
    oled.print(F("Mode: IAMBIC-A"));
    oled.setCursor(0, 4);
    oled.print(F("Curtis Timing"));
  }

  // Первоначальное чтение потенциометров
  int rawWpm = analogRead(PIN_POT_WPM);
  currentWpm = map(rawWpm, 0, 1023, 10, 35);
  ditMs = 1200 / currentWpm;
  dahMs = ditMs * 3;

  int rawPitch = analogRead(PIN_POT_PITCH);
  currentPitch = map(rawPitch, 0, 1023, 450, 850);
  currentPitch = (currentPitch / 25) * 25;

  Serial.println();
  Serial.println(F("=================================================="));
  Serial.println(F("     MorseWave Pro Keyer v1.1 (IAMBIC-A Curtis)   "));
  Serial.println(F("=================================================="));
  Serial.print(F("Speed : "));
  Serial.print(currentWpm);
  Serial.print(F(" WPM (dit: "));
  Serial.print(ditMs);
  Serial.println(F(" ms)"));
  Serial.print(F("Tone  : "));
  Serial.print(currentPitch);
  Serial.println(F(" Hz"));
  Serial.print(F("OLED  : "));
  Serial.println(hasOled ? F("ONLINE") : F("OFFLINE (подключи GND, 5V, A4, A5)"));
  Serial.println(F("--------------------------------------------------"));
  Serial.println(F("Покрути A0 для смены WPM, A2 для смены Тона."));
  Serial.println(F("=================================================="));
  Serial.println();
}

void loop() {
  readPots();
  handleKeyer();
  handleDecodedPauses();
}

void readPots() {
  static unsigned long lastPotRead = 0;
  if (millis() - lastPotRead > 60) {
    lastPotRead = millis();

    // Фильтрация шумов АЦП (экспоненциальное сглаживание)
    static int smoothWpm = -1;
    int rawWpm = analogRead(PIN_POT_WPM);
    if (smoothWpm == -1) smoothWpm = rawWpm;
    smoothWpm = (smoothWpm * 3 + rawWpm) / 4;
    int newWpm = map(smoothWpm, 0, 1023, 10, 35);

    static int smoothPitch = -1;
    int rawPitch = analogRead(PIN_POT_PITCH);
    if (smoothPitch == -1) smoothPitch = rawPitch;
    smoothPitch = (smoothPitch * 3 + rawPitch) / 4;
    int newPitch = map(smoothPitch, 0, 1023, 450, 850);
    newPitch = (newPitch / 25) * 25;

    bool wpmChanged = (newWpm != currentWpm);
    bool pitchChanged = (abs(newPitch - currentPitch) >= 25);

    if (wpmChanged || pitchChanged) {
      currentWpm = newWpm;
      ditMs = 1200 / currentWpm;
      dahMs = ditMs * 3;
      currentPitch = newPitch;

      if (hasOled) updateScreen();

      // Выводим в Serial аккуратную строчку с текущими параметрами
      Serial.print(F("\n[KNOB] Speed: "));
      Serial.print(currentWpm);
      Serial.print(F(" WPM (dit: "));
      Serial.print(ditMs);
      Serial.print(F(" ms) | Tone: "));
      Serial.print(currentPitch);
      Serial.println(F(" Hz"));
    }
  }
}

// =====================================================================
//  АЛГОРИТМ ЧИСТОГО IAMBIC A (CURTIS 8044)
// =====================================================================
void handleKeyer() {
  unsigned long now = millis();
  bool ditPressed = (digitalRead(PIN_DIT) == LOW);
  bool dahPressed = (digitalRead(PIN_DAH) == LOW);

  // Отслеживаем сжатие обоих лепестков (squeeze)
  if (ditPressed && dahPressed) {
    wasSqueezed = true;
  }

  // Запоминание противоположного лепестка (Dot / Dash Memory)
  if (state == STATE_DIT || (state == STATE_PAUSE && lastElement == STATE_DIT)) {
    if (dahPressed) dahMemory = true;
  }
  if (state == STATE_DAH || (state == STATE_PAUSE && lastElement == STATE_DAH)) {
    if (ditPressed) ditMemory = true;
  }

  // Правило Curtis Mode A:
  // Если оба лепестка были сжаты, а затем оба отпущены до окончания элемента/паузы,
  // память сбрасывается, чтобы не приписывался лишний паразитный элемент!
  if (wasSqueezed && !ditPressed && !dahPressed) {
    ditMemory = false;
    dahMemory = false;
    wasSqueezed = false;
  }

  switch (state) {
    case STATE_IDLE:
      if (ditPressed) {
        startDit();
      } else if (dahPressed) {
        startDah();
      }
      break;

    case STATE_DIT:
      if (now - stateStartTime >= ditMs) {
        stopToneOutput();
        state = STATE_PAUSE;
        lastElement = STATE_DIT;
        stateStartTime = now;
      }
      break;

    case STATE_DAH:
      if (now - stateStartTime >= dahMs) {
        stopToneOutput();
        state = STATE_PAUSE;
        lastElement = STATE_DAH;
        stateStartTime = now;
      }
      break;

    case STATE_PAUSE:
      // Межэлементная пауза равна ровно 1 длительности точки (ditMs)
      if (now - stateStartTime >= ditMs) {
        // ВОТ ЗДЕСЬ (спустя полную длительность паузы!) принимаем решение:
        if (lastElement == STATE_DIT) {
          // После точки: в приоритете тире (память или зажатие)
          if (dahMemory || dahPressed) {
            dahMemory = false;
            wasSqueezed = false;
            startDah();
          } else if (ditPressed) {
            // Точка ВСЁ ЕЩЁ зажата пальцем (честный автоповтор)
            wasSqueezed = false;
            startDit();
          } else {
            // Ничего не зажато -> знак закончен
            state = STATE_IDLE;
            ditMemory = false;
            dahMemory = false;
            wasSqueezed = false;
            lastSymbolEndTime = millis();
          }
        } else if (lastElement == STATE_DAH) {
          // После тире: в приоритете точка (память или зажатие)
          if (ditMemory || ditPressed) {
            ditMemory = false;
            wasSqueezed = false;
            startDit();
          } else if (dahPressed) {
            // Тире ВСЁ ЕЩЁ зажато пальцем (честный автоповтор)
            wasSqueezed = false;
            startDah();
          } else {
            // Ничего не зажато -> знак закончен
            state = STATE_IDLE;
            ditMemory = false;
            dahMemory = false;
            wasSqueezed = false;
            lastSymbolEndTime = millis();
          }
        }
      }
      break;
  }
}

void startDit() {
  state = STATE_DIT;
  stateStartTime = millis();
  tone(PIN_AUDIO, currentPitch);
  digitalWrite(PIN_LED_KEY, HIGH);

  currentMorseChar += ".";
  Serial.print(".");
  if (hasOled) updateScreen();
}

void startDah() {
  state = STATE_DAH;
  stateStartTime = millis();
  tone(PIN_AUDIO, currentPitch);
  digitalWrite(PIN_LED_KEY, HIGH);

  currentMorseChar += "-";
  Serial.print("-");
  if (hasOled) updateScreen();
}

void stopToneOutput() {
  noTone(PIN_AUDIO);
  digitalWrite(PIN_LED_KEY, LOW);
}

void handleDecodedPauses() {
  if (state != STATE_IDLE || currentMorseChar.length() == 0) return;

  unsigned long pause = millis() - lastSymbolEndTime;

  // Пауза между знаками (3 точки) -> распознаем букву
  if (pause > ditMs * 3) {
    char letter = decodeMorse(currentMorseChar);
    decodedLine += letter;
    if (decodedLine.length() > 14) {
      decodedLine = decodedLine.substring(decodedLine.length() - 14);
    }

    Serial.print(" [");
    Serial.print(letter);
    Serial.print("] ");

    currentMorseChar = "";
    if (hasOled) updateScreen();
  }

  // Пауза между словами (7 точек) -> пробел
  if (pause > ditMs * 7 && decodedLine.length() > 0 && !decodedLine.endsWith(" ")) {
    decodedLine += " ";
    Serial.println();
    if (hasOled) updateScreen();
  }
}

void updateScreen() {
  if (!hasOled) return;

  oled.setScale(1);
  oled.setCursor(0, 0);
  oled.print(currentWpm);
  oled.print(F("WPM "));
  oled.print(currentPitch);
  oled.print(F("Hz IAM-A "));

  oled.setScale(2);
  oled.setCursor(10, 3);
  oled.print(F("          "));
  oled.setCursor(10, 3);
  oled.print(currentMorseChar.length() > 0 ? currentMorseChar : F("_"));

  oled.setScale(1);
  oled.setCursor(0, 6);
  oled.print(F("TXT: "));
  oled.print(decodedLine);
}
