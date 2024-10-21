#include <TroykaTextLCD.h>

String EMPTY_STRING = "                ";

TroykaTextLCD lcd;

void setup() {
  Serial.begin(9600);

  lcd.begin(16, 2);
  lcd.setContrast(27);
  lcd.setBrightness(255);
  lcd.setCursor(0, 0);
}

void loop() {
  if (Serial.available()) {
    String data = Serial.readString();
    lcd.setCursor(0, 0);
    lcd.print(getValue(data, ';', 0));
    lcd.setCursor(0, 1);
    lcd.print(getValue(data, ';', 1));
  }
}

String getValue(String data, char separator, int index) {
  int found = 0;
  int strIndex[] = { 0, -1 };
  int maxIndex = data.length();

  for (int i = 0; i <= maxIndex && found <= index; i++) {
    if (data.charAt(i) == separator || i == maxIndex) {
      found++;
      strIndex[0] = strIndex[1] + 1;
      strIndex[1] = (i == maxIndex) ? i + 1 : i;
    }
  }
  return found > index ? data.substring(strIndex[0], strIndex[1]) : EMPTY_STRING;
}