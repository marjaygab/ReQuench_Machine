#!/usr/bin/python3

import RPi.GPIO as GPIO
from hx711 import HX711
import time
hx = HX711(17,27)
hx.set_reading_format("MSB","MSB")
hx.set_reference_unit(-1)
hx.reset()
val = hx.get_weight_A(5)
baseline = val
#GPIO.setup(21,GPIO.OUT)
print "Calculated Base line: " +  str(baseline)
#GPIO.output(21,1)
def main():
        time.sleep(5)
        hx.tare()
	while True:
                time.sleep(1)
		raw_weight = hx.get_weight_A(5)
                # computed_weight = (raw_weight // float(1000)) * 1000
                computed_weight = raw_weight
                current_val = (computed_weight) / 183
		current_mL = current_val
		#current_mL = current_val
                if current_mL < 0:
			current_mL = 0
		print "Current mL: " + str(current_mL)
		time.sleep(0.1)
try:
	main()
except KeyboardInterrupt:
	pass
except Exception as exception:
	print exception
finally:
	print "Cleaning GPIOs"
	GPIO.cleanup()
	print"Good Bye!"
