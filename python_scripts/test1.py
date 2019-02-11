import RPi.GPIO as GPIO
import sys
import json
import time
GPIO.setwarnings(False) # Ignore warning for now
GPIO.setmode(GPIO.BOARD) # Use physical pin numbering
GPIO.setup(10, GPIO.IN) # Set pin 10 to be an input pin and set initial value to be pulled low (off)
message = "Hello Javascript, love Python"


# for line in sys.stdin:
#   print(line[:-1])
while True:
	if GPIO.input(10) == GPIO.HIGH:
		print('Print')
		sys.stdout.flush()
		time.sleep(1)
