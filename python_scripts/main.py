# import RPi.GPIO as GPIO
import json
import time
import socketio
import sys
sio = socketio.Client()
sio.connect('http://localhost:3000')
# GPIO.setwarnings(False)
# GPIO.setmode(GPIO.BOARD)
inpt = 11
inpt1 = 7
# GPIO.setup(inpt1, GPIO.OUT)
# GPIO.setup(inpt, GPIO.IN)
mode_manual = False
mode_auto = False
temp_hot = False
temp_cold = False
auto_amount  = 0



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
        command = data['command']
        print(data)
        sys.stdout.flush()
        if command == 'Toggle_Auto':
                mode_auto = True
                mode_manual = False
        elif command == 'Toggle_Manual':
                mode_auto = False
                mode_manual = True
                print(mode_manual)
                sys.stdout.flush()
        elif command == 'Toggle_Hot':
                temp_cold = False
                temp_hot = True
        elif command == 'Toggle_Cold':
                temp_cold = True
                temp_hot = False
        elif command == 'Set_Amount':
                auto_amount = data['amount']
                
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
        amount_requested = getRequestedAmount()
        if(command == 'Dispense_Hot'):
                # dispense hot here
                automaticDispense('HOT',amount_requested)
        elif(command == 'Dispense_Cold'):
                # dispense cold here
                automaticDispense('COLD',amount_requested)


def manualDispense(command):
        rate_cnt = 0
        tot_cnt = 0
        time_zero = 0.0
        time_start = 0.0
        time_end = 0.0
        gpio_last = 0
        pulses = 0
        constant = 1.79
        time_zero = time.time()
        # GPIO.output(7, 1)
        while checkCommand() != 'Standby':
                rate_cnt = 0
                pulses = 0
                time_start= time.time()
                while pulses <= 5:
                        # gpio_cur = GPIO.input(11)
                        if gpio_cur != 0 and gpio_cur != gpio_last:
                                pulses += 1
                        gpio_last = gpio_cur
                rate_cnt += 1
                tot_cnt += 1
                time_end = time.time()
                lmin = round((rate_cnt * constant)/(time_end-time_start),2)
                total_liters = round(tot_cnt * constant, 1)
                print(json.dumps({'LMin':lmin,'Total':total_liters}))
                sys.stdout.flush()
                time.sleep(0.5)
        # GPIO.output(7, 0)

def automaticDispense(command,amount_requested):
        counter = 0
        # GPIO.output(inpt1, 1)
        while amount_requested != counter:
                if command == 'HOT':
                        #dispensing hot here
                        counter = counter + 1
                        print(counter)
                        sys.stdout.flush()
                else:
                        #dispensing cold here
                        counter = counter + 1
                        print(counter)
                        sys.stdout.flush()
                
                time.sleep(1)
        # GPIO.output(inpt1, 0)
        print('Dispense Done')
        sys.stdout.flush()
        # dispenseIsDoneAutomatic(command)

def dispenseIsDoneManual(mode):
        # write json file here   
        with open('/home/pi/Documents/ReQuench/MachineApp/operations.json') as outfile:  
                json_data = json.load(outfile)
                if mode=='HOT':
                        json_data['Command_Variable']['Dispense_Hot'] = 0
                else:
                        json_data['Command_Variable']['Dispense_Cold'] = 0
        with open('/home/pi/Documents/ReQuench/MachineApp/operations.json', 'w') as file:
                json.dump(json_data, file, indent=6)

def dispenseIsDoneAutomatic(mode):
        # write json file here   
        with open('/home/pi/Documents/ReQuench/MachineApp/operations.json') as outfile:  
                json_data = json.load(outfile)
                if mode=='HOT':
                        json_data['Command_Variable']['Dispense_Hot'] = 0
                else:
                        json_data['Command_Variable']['Dispense_Cold'] = 0
                json_data['Operation_Variables']['Requested_Amount'] = 0
        with open('/home/pi/Documents/ReQuench/MachineApp/operations.json', 'w') as file:
                json.dump(json_data, file, indent=6)
  


# runs continuously after instantiated from javascript
while True:
        # mode  = check_operation()
        # if (mode == 'Manual'):
        #         command = checkCommand()
        #         manualMode(command)
        # else :
        #         command = checkCommand()
        #         automaticMode(command)
        
        operation = {
                'mode_manual':mode_manual,
                'mode_auto':mode_auto,
                'temp_hot':temp_hot,
                'temp_cold':temp_cold,
                'auto_amount':auto_amount
        }
        sio.emit('socket-event', operation)
        time.sleep(1)
