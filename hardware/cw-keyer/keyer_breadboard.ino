/*
 * =====================================================================
 *  MorseWave Pro Keyer v1.0 (Breadboard Edition)
 *  Контроллер: Arduino Uno / Nano (ATmega328P)
 *  Библиотека дисплея: GyverOLED (OLED_NO_BUFFER - ультралегкий режим!)
 *  
 *  - Аппаратный Iambic B с памятью точек и тире + Squeeze
 *  - Раскладка СРТ (Точки = D2 указательный, Тире = D3 большой)
 *  - Динамическая ручка скорости WPM (Аналоговый вход A0: 10-45 WPM)
 *  - Динамическая ручка тона звука PITCH (Аналоговый вход A2: 450-850 Гц)
 *  - Управление NPN-усилителем и овальным динамиком (Пин D6)
 *  - Светодиодная индикация передачи KEY (Красный LED на пине D8)
 *  - Вывод на дисплей OLED 0.96" I2C (GyverOLED, SSD1306 128x64)
 *  - Мгновенный стрим символов в WebSerial (115200 бод) для MorseWave
 * =====================================================================
 */

#include <Wire.h>
#include <GyverOLED.h>

// Режим без буфера (OLED_NO_BUFFER): экономит 1024 байта ОЗУ!
GyverOLED<SSD1306_128x64, OLED_NO_BUFFER> oled;

// --- ПИНЫ УСТРОЙСТВА ---
const int PIN_DIT       = 2;    // Точки (Указательный палец, INT0)
const int PIN_DAH       = 3;    // Тире (Большой палец, INT1)
const int PIN_AUDIO     = 6;    // Звуковой выход PWM на базу транзистора BC547
const int PIN_LED_KEY   = 8;    // Красный светодиод передачи (KEY / TX)
const int PIN_POT_WPM   = A0;   // Потенциометр скорости
const int PIN_POT_PITCH = A2;   // Потенциометр частоты тона

// --- ПАРАМЕТРЫ КЕЙЕРА ---
int currentWpm = 20;
int currentPitch = 650;
unsigned long dotDurationMs = 60; // 1200 / WPM

// Состояние Iambic B
bool ditPressed = false;
bool dahPressed = false;
bool ditMemory = false;
bool dahMemory = false;
bool isSending = false;

char currentElement = 0; // '.' или '-'
unsigned long elementStartTime = 0;
unsigned long elementLength = 0;
unsigned long pauseLength = 0;
unsigned long lastSymbolEndTime = 0;

// Декодер текста Морзе
String currentMorseChar = "";
String decodedLine = "";

// Таблица символов Морзе
struct MorseCode {
  const char* code;
  char letter;
};

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

  // Настройка входов весла и выходов
  pinMode(PIN_DIT, INPUT_PULLUP);
  pinMode(PIN_DAH, INPUT_PULLUP);
  pinMode(PIN_AUDIO, OUTPUT);
  pinMode(PIN_LED_KEY, OUTPUT);

  noTone(PIN_AUDIO);
  digitalWrite(PIN_LED_KEY, LOW);

  // Инициализация дисплея без буфера
  oled.init();
  oled.clear();
  oled.setScale(1);
  oled.setCursor(15, 1);
  oled.print(F("MorseWave Keyer"));
  oled.setCursor(15, 3);
  oled.print(F("R8OA & R9OGL Ed."));
  oled.setCursor(15, 5);
  oled.print(F("Ready..."));
  delay(1000);

  oled.clear();
  drawLayout();
  updateScreen();
}

void loop() {
  readPotentiometers();
  handleKeyer();
  handleDecodedPauses();
}

// Чтение аналоговых крутилок
void readPotentiometers() {
  static unsigned long lastPotRead = 0;
  if (millis() - lastPotRead > 80) {
    lastPotRead = millis();

    // 1. Скорость WPM (пин A0): от 10 до 45 WPM
    int rawWpm = analogRead(PIN_POT_WPM);
    int newWpm = map(rawWpm, 0, 1023, 10, 45);
    if (abs(newWpm - currentWpm) >= 1) {
      currentWpm = newWpm;
      dotDurationMs = 1200 / currentWpm;
      updateScreen();
      Serial.print("W:");
      Serial.println(currentWpm);
    }

    // 2. Тон звука (пин A2): от 450 до 850 Гц
    int rawPitch = analogRead(PIN_POT_PITCH);
    int newPitch = map(rawPitch, 0, 1023, 450, 850);
    if (abs(newPitch - currentPitch) >= 10) {
      currentPitch = newPitch;
      updateScreen();
    }
  }
}

// Логика формирования Iambic B
void handleKeyer() {
  ditPressed = (digitalRead(PIN_DIT) == LOW);
  dahPressed = (digitalRead(PIN_DAH) == LOW);

  if (ditPressed) ditMemory = true;
  if (dahPressed) dahMemory = true;

  unsigned long now = millis();

  if (!isSending) {
    if (ditMemory) {
      startElement('.', dotDurationMs);
      ditMemory = false;
    } else if (dahMemory) {
      startElement('-', dotDurationMs * 3);
      dahMemory = false;
    }
  } else {
    unsigned long elapsed = now - elementStartTime;

    if (elapsed < elementLength) {
      // Идет посылка: включаем звук и красный светодиод передачи
      tone(PIN_AUDIO, currentPitch);
      digitalWrite(PIN_LED_KEY, HIGH);
    } else if (elapsed < elementLength + pauseLength) {
      // Межэлементная пауза
      noTone(PIN_AUDIO);
      digitalWrite(PIN_LED_KEY, LOW);
    } else {
      isSending = false;
      noTone(PIN_AUDIO);
      digitalWrite(PIN_LED_KEY, LOW);
      lastSymbolEndTime = millis();

      // Squeeze чередование
      if (currentElement == '.') {
        if (dahPressed || dahMemory) {
          startElement('-', dotDurationMs * 3);
          dahMemory = false;
        }
      } else if (currentElement == '-') {
        if (ditPressed || ditMemory) {
          startElement('.', dotDurationMs);
          ditMemory = false;
        }
      }
    }
  }
}

void startElement(char sym, unsigned long duration) {
  isSending = true;
  currentElement = sym;
  elementStartTime = millis();
  elementLength = duration;
  pauseLength = dotDurationMs;

  currentMorseChar += sym;
  Serial.print(sym);
  updateScreen();
}

void handleDecodedPauses() {
  if (isSending || currentMorseChar.length() == 0) return;

  unsigned long pause = millis() - lastSymbolEndTime;

  // Межзнаковая пауза (3 точки)
  if (pause > dotDurationMs * 3) {
    char letter = decodeMorse(currentMorseChar);
    decodedLine += letter;
    if (decodedLine.length() > 14) {
      decodedLine = decodedLine.substring(decodedLine.length() - 14);
    }

    Serial.print("[");
    Serial.print(letter);
    Serial.print("]");

    currentMorseChar = "";
    updateScreen();
  }

  // Межсловная пауза (7 точек)
  if (pause > dotDurationMs * 7 && decodedLine.length() > 0 && !decodedLine.endsWith(" ")) {
    decodedLine += " ";
    Serial.println();
    updateScreen();
  }
}

void drawLayout() {
  oled.setScale(1);
  oled.setCursor(0, 0);
  oled.print(F("                "));
  oled.setCursor(0, 7);
  oled.print(F("TXT:            "));
}

void updateScreen() {
  // Верхняя статусная строка
  oled.setScale(1);
  oled.setCursor(0, 0);
  oled.print(currentWpm);
  oled.print(F("WPM "));
  oled.print(currentPitch);
  oled.print(F("Hz IAM-B "));

  // Текущий знак Морзе (крупный шрифт)
  oled.setScale(2);
  oled.setCursor(10, 3);
  oled.print(F("          ")); // Очищаем строку знака
  oled.setCursor(10, 3);
  oled.print(currentMorseChar.length() > 0 ? currentMorseChar : F("_"));

  // Распознанный текст
  oled.setScale(1);
  oled.setCursor(30, 7);
  oled.print(decodedLine);
}
