# import RPi.GPIO as GPIO
import json
import time
import socketio
import sys
import os
sio = socketio.Client()
sio.connect('http://localhost:3000')
# GPIO.setwarnings(False)
# GPIO.setmode(GPIO.BOARD)
inpt = 11
inpt1 = 7
pump_1 = 11
solenoid_1 = 15
pump_2 = 13
solenoid_2 = 19
compressor = 21 
heater = 22 
# GPIO.setup(inpt1, GPIO.OUT)
# GPIO.setup(pump_1, GPIO.OUT)
# GPIO.setup(solenoid_1, GPIO.OUT)
# GPIO.setup(pump_2, GPIO.OUT)
# GPIO.setup(solenoid_2, GPIO.OUT)
# GPIO.setup(compressor, GPIO.OUT)
# GPIO.setup(heater, GPIO.OUT)
auto_amount = 0
terminate_flag = False
# GPIO.output(pump_1,1)
# GPIO.output(solenoid_1,1)
# GPIO.output(pump_2,1)
# GPIO.output(solenoid_2,1)
# GPIO.output(compressor,0) 
# GPIO.output(heater,0)
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
            # GPIO.output(pump_1,0)
            # GPIO.output(pump_2,0)
            # GPIO.output(solenoid_1,0)
            # GPIO.output(solenoid_2,0)
        elif command == 'Stop_Drain':
            print("Stopped Draining")
            sys.stdout.flush()
            # GPIO.output(pump_1,1)
            # GPIO.output(pump_2,1)
            # GPIO.output(solenoid_1,1)
            # GPIO.output(solenoid_2,1)
        elif command == 'Shutdown':
            os.system('sudo shutdown -h now')
        elif command == 'Reboot':
            os.system('sudo reboot')
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
