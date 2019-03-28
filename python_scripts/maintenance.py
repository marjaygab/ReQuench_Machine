# import RPi.GPIO as GPIO
import json
import time
import socketio
import sys
import os
sio = socketio.Client()
sio.connect('http://localhost:3000')
# GPIO.setwarnings(False)
# GPIO.setmode(GPIO.BCM)
output_devices = {
    'pump_1': 21,
    'pump_2': 20,
    'solenoid_1': 16,
    'solenoid_2': 12,
    'compressor': 7,
    'heater': 24,
    'screen_backlight': 18,
    'green_led': 14,
    'red_led': 15,
    'yellow_red': 18
}
# for index,value in enumerate(output_devices):
#     GPIO.setup(output_devices[value],GPIO.OUT)
auto_amount = 0
terminate_flag = False
# GPIO.output(output_devices['pump_1'],1)
# GPIO.output(output_devices['solenoid_1'],1)
# GPIO.output(output_devices['pump_2'],1)
# GPIO.output(output_devices['solenoid_2'],1)
# GPIO.output(output_devices['compressor'],0)
# GPIO.output(output_devices['compressor'],0)

@sio.on('connect')
def on_connect():
    print("I'm connected!")
    sys.stdout.flush()


@sio.on('socket-event')
def on_message(data):
    global mode_drain
    destination = data['destination']
    if destination == 'Python':
        command = data['content']['command']
        if command == 'Start_Drain':
            print("Started Draining")
            sys.stdout.flush()
            # GPIO.output(output_devices['pump_1'],0)
            # GPIO.output(output_devices['pump_2'],0)
            # GPIO.output(output_devices['solenoid_1'],0)
            # GPIO.output(output_devices['solenoid_2'],0)
        elif command == 'Stop_Drain':
            print("Stopped Draining")
            sys.stdout.flush()
            # GPIO.output(output_devices['pump_1'],1)
            # GPIO.output(output_devices['pump_2'],1)
            # GPIO.output(output_devices['solenoid_1'],1)
            # GPIO.output(output_devices['solenoid_2'],1)
        elif command == 'Shutdown':
            print("Shutting Down")
            sys.stdout.flush()
            # os.system('sudo shutdown -h now')
        elif command == 'Reboot':
            print("Reboot")
            sys.stdout.flush()
            # os.system('sudo reboot')
        elif command == 'Terminate':
            # GPIO.cleanup()
            terminate_flag = True


@sio.on('disconnect')
def on_disconnect():
    print("I'm disconnected!")
    sys.stdout.flush()


print('Ready')
sys.stdout.flush()
# runs continuously after instantiated from javascript
while True:
    if terminate_flag:
        break
    time.sleep(1)
sio.disconnect()
sys.exit()
