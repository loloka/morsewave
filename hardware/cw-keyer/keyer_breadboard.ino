/*
 * =====================================================================
 *  MorseWave Pro Keyer v1.2 (Single-Lever / Iambic with Type-Ahead FIFO)
 *  - Аппаратная буферизация элементов (FIFO очередь на 8 знаков, как в TX-500):
 *      * Можно отбивать "R" (.-.) или "A" (.-) рукой быстро (на своей скорости),
 *        а ключ плавно и красиво воспроизведет их на медленной скорости крутилки!
 *      * Защита от дребезга механических контактов (15 мс антидребезг).
 *      * Честный автоповтор при удержании весла в сторону точек или тире.
 *      * Идеально работает с однорычажным манипулятором (веслом) и двухрычажным!
 *  - Раскладка СРТ (Точки = D2 указательный, Тире = D3 большой палец)
 *  - Плавные крутилки A0 (WPM: 10..35) и A2 (PITCH: 450..850 Гц)
 *  - Мгновенный вывод параметров в Serial Monitor при повороте крутилок
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

// --- БУФЕР ВВОДА ЭЛЕМЕНТОВ (FIFO ОЧЕРЕДЬ, КАК В ТРАНСИВЕРАХ) ---
enum Element {
  ELEM_NONE = 0,
  ELEM_DIT  = 1,
  ELEM_DAH  = 2
};

const int QUEUE_MAX = 8;
Element elementQueue[QUEUE_MAX];
int qHead = 0;
int qTail = 0;
int qCount = 0;

void enqueue(Element elem) {
  if (qCount < QUEUE_MAX) {
    elementQueue[qTail] = elem;
    qTail = (qTail + 1) % QUEUE_MAX;
    qCount++;
  }
}

Element dequeue() {
  if (qCount == 0) return ELEM_NONE;
  Element elem = elementQueue[qHead];
  qHead = (qHead + 1) % QUEUE_MAX;
  qCount--;
  return elem;
}

// --- АВТОМАТ СОСТОЯНИЙ ГЕНЕРАТОРА CW ---
enum KeyerState {
  STATE_IDLE,
  STATE_ELEMENT,    // Звучит элемент (точка или тире)
  STATE_PAUSE       // Межэлементная пауза (длительность 1 точка)
};

KeyerState state = STATE_IDLE;
Element currentPlaying = ELEM_NONE;
unsigned long stateStartTime = 0;
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
    oled.print(F("Mode: BUFFERED"));
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
  Serial.println(F("  MorseWave Pro Keyer v1.2 (TX-500 Type-Ahead)    "));
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
  Serial.println(F("Очередь элементов активна: можно отбивать быстрее "));
  Serial.println(F("выставленной скорости, ключ всё четко воспроизведет!"));
  Serial.println(F("=================================================="));
  Serial.println();
}

void loop() {
  samplePaddle();
  readPots();
  handleKeyer();
  handleDecodedPauses();
}

// --- СКАНИРОВАНИЕ ВЕСЛА С АНТИДРЕБЕЗГОМ И БУФЕРИЗАЦИЕЙ ---
void samplePaddle() {
  const unsigned long DEBOUNCE_MS = 15;
  static unsigned long lastDitEdge = 0;
  static unsigned long lastDahEdge = 0;
  static bool prevDitPin = HIGH;
  static bool prevDahPin = HIGH;

  unsigned long now = millis();
  bool curDit = digitalRead(PIN_DIT);
  bool curDah = digitalRead(PIN_DAH);

  // Нажатие ТОЧКИ (перепад HIGH -> LOW)
  if (curDit == LOW && prevDitPin == HIGH) {
    if (now - lastDitEdge > DEBOUNCE_MS) {
      lastDitEdge = now;
      enqueue(ELEM_DIT);
    }
  }

  // Нажатие ТИРЕ (перепад HIGH -> LOW)
  if (curDah == LOW && prevDahPin == HIGH) {
    if (now - lastDahEdge > DEBOUNCE_MS) {
      lastDahEdge = now;
      enqueue(ELEM_DAH);
    }
  }

  prevDitPin = curDit;
  prevDahPin = curDah;
}

// --- ЧТЕНИЕ ПОТЕНЦИОМЕТРОВ С УСРЕДНЕНИЕМ ---
void readPots() {
  static unsigned long lastPotRead = 0;
  if (millis() - lastPotRead > 60) {
    lastPotRead = millis();

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

// --- АВТОМАТ СОСТОЯНИЙ ГЕНЕРАЦИИ МОРЗЕ ---
void handleKeyer() {
  unsigned long now = millis();

  switch (state) {
    case STATE_IDLE:
      // Если в очереди есть буферизированные клики:
      if (qCount > 0) {
        startElement(dequeue());
      } else if (digitalRead(PIN_DIT) == LOW) {
        // Удержание точки
        startElement(ELEM_DIT);
      } else if (digitalRead(PIN_DAH) == LOW) {
        // Удержание тире
        startElement(ELEM_DAH);
      }
      break;

    case STATE_ELEMENT: {
      unsigned long duration = (currentPlaying == ELEM_DIT) ? ditMs : dahMs;
      if (now - stateStartTime >= duration) {
        stopToneOutput();
        state = STATE_PAUSE;
        stateStartTime = now;
      }
      break;
    }

    case STATE_PAUSE:
      if (now - stateStartTime >= ditMs) {
        // Пауза завершена. Что играть дальше?
        if (qCount > 0) {
          // Берем следующий элемент из очереди!
          startElement(dequeue());
        } else if (digitalRead(PIN_DIT) == LOW) {
          // Точка всё еще зажата (автоповтор)
          startElement(ELEM_DIT);
        } else if (digitalRead(PIN_DAH) == LOW) {
          // Тире всё еще зажато (автоповтор)
          startElement(ELEM_DAH);
        } else {
          // Очередь пуста и лепесток отпущен в нейтраль -> знак завершен!
          state = STATE_IDLE;
          currentPlaying = ELEM_NONE;
          lastSymbolEndTime = millis();
        }
      }
      break;
  }
}

void startElement(Element elem) {
  currentPlaying = elem;
  state = STATE_ELEMENT;
  stateStartTime = millis();

  tone(PIN_AUDIO, currentPitch);
  digitalWrite(PIN_LED_KEY, HIGH);

  if (elem == ELEM_DIT) {
    currentMorseChar += ".";
    Serial.print(".");
  } else {
    currentMorseChar += "-";
    Serial.print("-");
  }

  if (hasOled) updateScreen();
}

void stopToneOutput() {
  noTone(PIN_AUDIO);
  digitalWrite(PIN_LED_KEY, LOW);
}

void handleDecodedPauses() {
  // Пока звучит элемент или в очереди еще есть знаки — паузу не считаем!
  if (state != STATE_IDLE || qCount > 0 || currentMorseChar.length() == 0) return;

  unsigned long pause = millis() - lastSymbolEndTime;

  // Межзнаковая пауза (3 точки) -> распознаем букву
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
  oled.print(F("Hz BUF "));

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
