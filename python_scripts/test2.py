import RPi.GPIO as GPIO
import sys
import json
import time
GPIO.setwarnings(False) # Ignore warning for now
GPIO.setmode(GPIO.BOARD) # Use physical pin numbering
GPIO.setup(12, GPIO.OUT) # Set pin 10 to be an input pin and set initial value to be pulled low (off)


# for line in sys.stdin:
#   print(line[:-1])
while True:
	GPIO.output(12,GPIO.HIGH)
	time.sleep(2)
    GPIO.output(12,GPIO.LOW)
	time.sleep(2)
