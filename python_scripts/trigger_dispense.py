# import RPi.GPIO as GPIO
import time, sys
# GPIO.setmode(GPIO.BOARD)
# inpt1 = 15
# GPIO.setup(inpt1, GPIO.OUT)

command = sys.argv[1]

if command == 'start':
    # GPIO.output(inpt1, 1)
    print('Start')
else:
    # GPIO.output(inpt1, 0)
    print('Stop')
