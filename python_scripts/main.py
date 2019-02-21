import RPi.GPIO as GPIO
import json
import time
import socketio
import sys
sio = socketio.Client()
sio.connect('http://localhost:3000')
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BOARD)
inpt = 11
inpt1 = 7
pump_1 = 11
solenoid_1 = 15
# GPIO.setup(inpt1, GPIO.OUT)
GPIO.setup(pump_1, GPIO.OUT)
GPIO.setup(solenoid_1, GPIO.OUT)
# GPIO.setup(inpt, GPIO.IN)
mode_manual = False
mode_auto = False
temp_hot = False
temp_cold = False
auto_amount  = 0
terminate_flag = False
GPIO.output(pump_1,1)
GPIO.output(solenoid_1,1)

@sio.on('connect')
def on_connect():
        print("I'm connected!")
        sys.stdout.flush()

@sio.on('socket-event')
def on_message(data):
        global mode_manual
        global mode_auto
        global temp_hot
        global temp_cold
        global auto_amount
        global terminate_flag
        destination = data['destination']
        if destination == 'Python' :
                command = data['content']['command']
                if command == 'Toggle_Auto':
                        mode_auto = True
                        mode_manual = False
                elif command == 'Toggle_Manual':
                        mode_auto = False
                        mode_manual = True
                elif command == 'Toggle_Hot':
                        temp_cold = False
                        temp_hot = True
                elif command == 'Toggle_Cold':
                        temp_cold = True
                        temp_hot = False
                elif command == 'Set_Amount':
                        auto_amount = data['amount']
                elif command == 'Stop_Dispense':
                        temp_cold = False
                        temp_hot = False
                elif command == 'Terminate':
                        # GPIO.cleanup()
                        terminate_flag = True
                
@sio.on('disconnect')
def on_disconnect():
        print("I'm disconnected!")
        sys.stdout.flush()


def check_operation():
        if mode_manual:
                return 'Manual'
        else:
                return 'Automatic'

def checkCommand():
        if temp_hot and not temp_cold:
                return 'Dispense_Hot'
        elif temp_cold and not temp_hot:
                return 'Dispense_Cold'
        elif not temp_cold and not temp_hot:
                return  'Standby'
        else:
                return 'Error'

def getRequestedAmount():
        return auto_amount

def manualMode(command):
        if(command == 'Dispense_Hot'):
                # dispense hot here
                manualDispense('HOT')
        elif(command == 'Dispense_Cold'):
                # dispense cold here
                manualDispense('COLD')

def automaticMode(command):
        amount_requested = auto_amount
        if amount_requested != 0:        
                if(command == 'Dispense_Hot'):
                        # dispense hot here
                        automaticDispense('HOT',amount_requested)
                elif(command == 'Dispense_Cold'):
                        # dispense cold here
                        automaticDispense('COLD',amount_requested)


def stop_dispense():
        global temp_hot
        global temp_cold
        temp_cold = False
        temp_hot = False



def manualDispense(command):
        # rate_cnt = 0
        # tot_cnt = 0
        # time_zero = 0.0
        # time_start = 0.0
        # time_end = 0.0
        # gpio_last = 0
        # pulses = 0
        # constant = 1.79
        # time_zero = time.time()
        # # GPIO.output(7, 1)
        # while checkCommand() != 'Standby':
        #         rate_cnt = 0
        #         pulses = 0
        #         time_start= time.time()
        #         while pulses <= 5:
        #                 # gpio_cur = GPIO.input(11)
        #                 if gpio_cur != 0 and gpio_cur != gpio_last:
        #                         pulses += 1
        #                 gpio_last = gpio_cur
        #         rate_cnt += 1
        #         tot_cnt += 1
        #         time_end = time.time()
        #         lmin = round((rate_cnt * constant)/(time_end-time_start),2)
        #         total_liters = round(tot_cnt * constant, 1)
        #         print(json.dumps({'LMin':lmin,'Total':total_liters}))
        #         sys.stdout.flush()
        GPIO.output(pump_1,0)
        GPIO.output(solenoid_1,0)
        command = checkCommand()
        while checkCommand() != 'Standby':
                sio.emit('socket-event',{"destination":'JS',"content":command})
                time.sleep(0.5)
        sio.emit('socket-event', {"destination":'JS',"content":'Stopped Dispense'})
        GPIO.output(pump_1,0)
        GPIO.output(solenoid_1,0)
        # GPIO.output(7, 0)

def automaticDispense(command,amount_requested):
        counter = 0
        while counter < amount_requested:
                sio.emit('socket-event',{"destination":'JS',"content":command})
                counter = counter + 1
                time.sleep(0.5)
        sio.emit('socket-event',{"destination":'JS',"content":'Stopped Dispense'})
        stop_dispense()
        # rate_cnt = 0
        # tot_cnt = 0
        # time_zero = 0.0
        # time_start = 0.0
        # time_end = 0.0
        # gpio_last = 0
        # pulses = 0
        # constant = 1.79
        # total_liters = 0
        # time_zero = time.time()
        # GPIO.output(7, 1)
        # while amount_requested <= total_liters:
        #         rate_cnt = 0
        #         pulses = 0
        #         time_start= time.time()
        #         while pulses <= 5:
        #                 gpio_cur = GPIO.input(11)
        #                 if gpio_cur != 0 and gpio_cur != gpio_last:
        #                         pulses += 1
        #                 gpio_last = gpio_cur
        #         rate_cnt += 1
        #         tot_cnt += 1
        #         time_end = time.time()
        #         lmin = round((rate_cnt * constant)/(time_end-time_start),2)
        #         total_liters = round(tot_cnt * constant, 1)
        #         print(json.dumps({'LMin':lmin,'Total':total_liters}))
        #         sys.stdout.flush()
        #         time.sleep(0.5)
        # GPIO.output(7, 0)
        # dispenseIsDoneAutomatic(command)

# runs continuously after instantiated from javascript
while True:
        mode  = check_operation()
        if (mode == 'Manual'):
                command = checkCommand()
                manualMode(command)
        else :
                command = checkCommand()
                automaticMode(command)
        
        if terminate_flag:
                break

        time.sleep(1)

sio.disconnect()
sys.exit()

