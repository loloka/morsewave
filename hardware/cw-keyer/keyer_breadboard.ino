/*
 * =====================================================================
 *  MorseWave Pro Keyer v1.3 (Classic Curtis 8044 / TX-500 Single-Lever)
 *  - Классический аппаратный алгоритм Curtis 8044 (как в трансивере TX-500):
 *      * Защита от дребезга: во время звучания точки контакт точки полностью
 *        игнорируется (слушается только тире), и наоборот!
 *      * Память элементов (Dot/Dash Memory): можно отбивать знак быстрее
 *        выставленной скорости, ключ чисто и ритмично его доиграет.
 *      * Никаких очередей, ложных повторов и каши!
 *  - Блокировка крутилок во время передачи:
 *      * Потенциометры опрашиваются ТОЛЬКО в тишине (IDLE), поэтому просадка
 *        питания от динамика больше не сбивает WPM и не спамит в Serial!
 *  - Раскладка СРТ (Точки = D2 указательный, Тире = D3 большой палец)
 *  - Плавные крутилки A0 (WPM: 10..35) и A2 (PITCH: 450..850 Гц)
 *  - Автоопределение OLED 0.96" по I2C
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

// --- ПАРАМЕТРЫ СКОРОСТИ И ТОНА ---
int currentWpm = 18;
int currentPitch = 650;
unsigned long ditMs = 1200 / 18;
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

void setup() {
  Serial.begin(115200);

  pinMode(PIN_DIT, INPUT_PULLUP);
  pinMode(PIN_DAH, INPUT_PULLUP);
  pinMode(PIN_AUDIO, OUTPUT);
  pinMode(PIN_LED_KEY, OUTPUT);

  noTone(PIN_AUDIO);
  digitalWrite(PIN_LED_KEY, LOW);

  // Проверка I2C OLED
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
    oled.print(F("Mode: CURTIS 8044"));
  }

  // Первоначальное чтение крутилок
  int rawWpm = analogRead(PIN_POT_WPM);
  currentWpm = map(rawWpm, 0, 1023, 10, 35);
  ditMs = 1200 / currentWpm;
  dahMs = ditMs * 3;

  int rawPitch = analogRead(PIN_POT_PITCH);
  currentPitch = map(rawPitch, 0, 1023, 450, 850);
  currentPitch = (currentPitch / 25) * 25;

  Serial.println();
  Serial.println(F("=================================================="));
  Serial.println(F("  MorseWave Pro Keyer v1.3 (Curtis 8044 / TX500)  "));
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

  // Запоминание противоположного контакта (Dot/Dash Memory):
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
      // В покое: приоритет у нажатого лепестка
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
        // Пауза точки окончена: что передавать дальше?
        if (dahMemory || dahPin) {
          // Было нажато тире -> передаем тире!
          dahMemory = false;
          startDah();
        } else if (ditPin) {
          // Точка ВСЁ ЕЩЁ зажата -> автоповтор точки!
          startDit();
        } else {
          // Ничего не нажато -> завершаем передачу
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
        // Пауза тире окончена: что передавать дальше?
        if (ditMemory || ditPin) {
          // Была нажата точка -> передаем точку!
          ditMemory = false;
          startDit();
        } else if (dahPin) {
          // Тире ВСЁ ЕЩЁ зажато -> автоповтор тире!
          startDah();
        } else {
          // Ничего не нажато -> завершаем передачу
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
  if (hasOled) updateScreen();
}

void startDah() {
  state = STATE_PLAY_DAH;
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

// --- ЧТЕНИЕ ПОТЕНЦИОМЕТРОВ (ТОЛЬКО В СОСТОЯНИИ ПОКОЯ) ---
void readPots() {
  // КРИТИЧЕСКИ ВАЖНО: не читать АЦП во время передачи звука!
  // Ток динамика просаживает питание, что вызывало ложные скачки WPM!
  if (state != STATE_IDLE) return;

  static unsigned long lastPotRead = 0;
  if (millis() - lastPotRead > 100) {
    lastPotRead = millis();

    // Чтение WPM с мертвой зоной (deadband)
    static int lastRawWpm = -1;
    int rawWpm = analogRead(PIN_POT_WPM);
    if (lastRawWpm == -1) lastRawWpm = rawWpm;

    if (abs(rawWpm - lastRawWpm) > 20) {
      lastRawWpm = rawWpm;
      int newWpm = map(rawWpm, 0, 1023, 10, 35);
      if (newWpm != currentWpm) {
        currentWpm = newWpm;
        ditMs = 1200 / currentWpm;
        dahMs = ditMs * 3;
        if (hasOled) updateScreen();

        Serial.print(F("\n[KNOB] Speed: "));
        Serial.print(currentWpm);
        Serial.print(F(" WPM (dit: "));
        Serial.print(ditMs);
        Serial.print(F(" ms) | Tone: "));
        Serial.print(currentPitch);
        Serial.println(F(" Hz"));
      }
    }

    // Чтение PITCH с мертвой зоной
    static int lastRawPitch = -1;
    int rawPitch = analogRead(PIN_POT_PITCH);
    if (lastRawPitch == -1) lastRawPitch = rawPitch;

    if (abs(rawPitch - lastRawPitch) > 30) {
      lastRawPitch = rawPitch;
      int newPitch = map(rawPitch, 0, 1023, 450, 850);
      newPitch = (newPitch / 25) * 25;
      if (abs(newPitch - currentPitch) >= 25) {
        currentPitch = newPitch;
        if (hasOled) updateScreen();

        Serial.print(F("\n[KNOB] Speed: "));
        Serial.print(currentWpm);
        Serial.print(F(" WPM | Tone: "));
        Serial.print(currentPitch);
        Serial.println(F(" Hz"));
      }
    }
  }
}

// --- ДЕКОДЕР БУКВ И ПАУЗ ---
void handleDecodedPauses() {
  if (state != STATE_IDLE || currentMorseChar.length() == 0) return;

  unsigned long pause = millis() - lastSymbolEndTime;

  // Межзнаковая пауза (3 длительности точки) -> декодируем букву
  if (pause >= ditMs * 3) {
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

  // Межсловная пауза (7 длительностей точки) -> пробел и перенос строки
  if (pause >= ditMs * 7 && decodedLine.length() > 0 && !decodedLine.endsWith(" ")) {
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
  oled.print(F("Hz KEY "));

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
