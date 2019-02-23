import RPi.GPIO as GPIO
import time, sys
import json
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BOARD)
inpt = 11
inpt1 = 7
GPIO.setup(inpt1, GPIO.OUT)
GPIO.setup(inpt, GPIO.IN)
GPIO.output(inpt1, 1)
rate_cnt = 0
tot_cnt = 0
time_zero = 0.0
time_start = 0.0
time_end = 0.0
gpio_last = 0
pulses = 0
constant = 1.79
ml_constant = 16.6
time_zero = time.time()
rate_cnt = 0


try:
    while True:
        # pulses = 0
        time_start= time.time()
        # while pulses <= 5:
        #     gpio_cur = GPIO.input(inpt)
        #     if gpio_cur != 0 and gpio_cur != gpio_last:
        #         pulses += 1
        #     gpio_last = gpio_cur
        # rate_cnt += 1
        # tot_cnt += 1
        time_end = time.time()
        time_elapsed = time_end - time_start
        if time_elapsed >= 1:
            counter += 1
            total_liters = round(ml_constant * counter, 1)
            print(json.dumps({'LMin':lmin,'Total':total_liters}))
            sys.stdout.flush()

        # lmin = round((rate_cnt * constant)/(time_end-time_start),2)
except KeyboardInterrupt:
    GPIO.cleanup()
    sys.exit
