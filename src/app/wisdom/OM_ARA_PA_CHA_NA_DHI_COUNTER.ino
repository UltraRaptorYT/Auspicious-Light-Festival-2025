int redPin   = 9;
int greenPin = 10;
int bluePin  = 11;

// Each entry is {R, G, B}
const byte colors[][3] = {
  {255,   0,   0}, // Red
  {  0, 255,   0}, // Green
  {  0,   0, 255}, // Blue
  {255, 255, 255}, // White
  {170,   0, 255}, // Purple
  {127, 127, 127}  // Light blue / gray-ish
};

const int NUM_COLORS = sizeof(colors) / sizeof(colors[0]);

int currentColorIndex = 0;   // pointer into the array
long lastCount = 0;          // last number we saw from serial (e.g. 的 count)

void setup() {
  Serial.begin(9600);

  pinMode(redPin,   OUTPUT);
  pinMode(greenPin, OUTPUT);
  pinMode(bluePin,  OUTPUT);

  // Start with the first color
  applyCurrentColor();
}

void loop() {
  // Example: read a number from Serial (like "3\n" from your browser)
  if (Serial.available() > 0) {
    long newCount = Serial.parseInt();  // reads an integer
    if (newCount >= 0) {
      // For every increment in the count, move to the next color
      if (newCount > lastCount) {
        long steps = newCount - lastCount;
        for (long i = 0; i < steps; i++) {
          nextColor();
        }
      }
      // Optional: if count goes backwards, reset or handle differently
      else if (newCount < lastCount) {
        // Example: reset to first color when count is reset
        currentColorIndex = 0;
        applyCurrentColor();
      }

      lastCount = newCount;

      Serial.print("Count: ");
      Serial.print(newCount);
      Serial.print(" | color index: ");
      Serial.println(currentColorIndex);
    }

    // Consume any leftover newline
    if (Serial.peek() == '\n') {
      Serial.read();
    }
  }
}


void applyCurrentColor() {
  byte r = colors[currentColorIndex][0];
  byte g = colors[currentColorIndex][1];
  byte b = colors[currentColorIndex][2];
  setColor(r, g, b);
}

void nextColor() {
  currentColorIndex++;
  if (currentColorIndex >= NUM_COLORS) {
    currentColorIndex = 0;  // loop pointer back to start
  }
  applyCurrentColor();
}

void setColor(byte redValue, byte greenValue, byte blueValue) {
  analogWrite(redPin,   redValue);
  analogWrite(greenPin, greenValue);
  analogWrite(bluePin,  blueValue);
}
