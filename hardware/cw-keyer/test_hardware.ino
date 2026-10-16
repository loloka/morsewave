/*
 * ТЕСТОВЫЙ СКЕТЧ ДИАГНОСТИКИ (БЕЗ ДИСПЛЕЯ)
 * Проверяем только железо: Звук (D6), Светодиод (D8) и Весло (D2, D3)
 */

const int PIN_DIT     = 2; // Точки (указательный)
const int PIN_DAH     = 3; // Тире (большой)
const int PIN_AUDIO   = 6; // Динамик
const int PIN_LED_KEY = 8; // Красный светодиод

void setup() {
  Serial.begin(115200);

  pinMode(PIN_DIT, INPUT_PULLUP);
  pinMode(PIN_DAH, INPUT_PULLUP);
  pinMode(PIN_AUDIO, OUTPUT);
  pinMode(PIN_LED_KEY, OUTPUT);

  // ТЕСТОВЫЙ ЗВУК ПРИ СТАРТЕ (чтобы сразу услышать динамик):
  digitalWrite(PIN_LED_KEY, HIGH);
  tone(PIN_AUDIO, 650);
  delay(300);
  noTone(PIN_AUDIO);
  digitalWrite(PIN_LED_KEY, LOW);

  Serial.println(F("--- TEST CW KEYER READY ---"));
}

void loop() {
  bool dit = (digitalRead(PIN_DIT) == LOW);
  bool dah = (digitalRead(PIN_DAH) == LOW);

  if (dit || dah) {
    digitalWrite(PIN_LED_KEY, HIGH);
    tone(PIN_AUDIO, 650);

    if (dit) Serial.print(".");
    if (dah) Serial.print("-");
    delay(80);
  } else {
    digitalWrite(PIN_LED_KEY, LOW);
    noTone(PIN_AUDIO);
  }
}
