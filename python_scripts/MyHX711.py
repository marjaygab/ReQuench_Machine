#!/usr/bin/python3

import RPi.GPIO as GPIO
from hx711 import HX711
import time
hx = HX711(5,6)
hx.set_reading_format("MSB","MSB")
hx.set_reference_unit(-1)
hx.reset()
val = hx.get_weight_A(5)
baseline = (val // 1000) * 1000
print "Calculated Base line: " +  str(baseline)

def main():
	print "Please put your container"
	time.sleep(5)
	container_weight = ((hx.get_weight_A(5) - baseline) / 200) - 4
	if container_weight < 0:
		container_weight = 0

	print "Container Weight: " + str(container_weight)

	while True:
		current_val = ((hx.get_weight_A(5) - baseline) / 200) - 4
		if container_weight < 0:
			container_weight = 0
		current_mL = current_val - container_weight
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
