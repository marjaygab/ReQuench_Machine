import RPi.GPIO as GPIO
import time, sys
import json
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BOARD)
pump_1 = 11
solenoid_1 = 15
flowmeter = 40
GPIO.setup(pump_1, GPIO.OUT)
GPIO.setup(solenoid_1, GPIO.OUT)
GPIO.setup(flowmeter, GPIO.IN)
GPIO.output(pump_1, 1)
GPIO.output(solenoid_1, 1)
rate_cnt = 0
tot_cnt = 0
time_zero = 0.0
time_start = 0.0
time_end = 0.0
gpio_last = 0
pulses = 0
constant = 1.79

time_zero = time.time()


try:
    while True:
        # rate_cnt = 0
        # pulses = 0
        # time_start= time.time()
        # while pulses <= 5:
        #     gpio_cur = GPIO.input(inpt)
        #     if gpio_cur != 0 and gpio_cur != gpio_last:
        #         pulses += 1
        #     gpio_last = gpio_cur
        # rate_cnt += 1
        # tot_cnt += 1
        # time_end = time.time()
        # lmin = round((rate_cnt * constant)/(time_end-time_start),1)
        # total_liters = lmin / 60
        # print(json.dumps({'LMin':lmin,'Total':total_liters}))
        # sys.stdout.flush()
        gpio_cur = GPIO.input(flowmeter)
        print(json.dumps(gpio_cur)
        time.sleep(1)
except KeyboardInterrupt:
    GPIO.cleanup()
    sys.exit
