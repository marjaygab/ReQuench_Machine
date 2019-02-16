import RPi.GPIO as GPIO
import json
import time
import sys
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BOARD)
inpt = 11
inpt1 = 7
GPIO.setup(inpt1, GPIO.OUT)
GPIO.setup(inpt, GPIO.IN)

def check_operation():
        with open('/home/pi/Documents/ReQuench/MachineApp/operations.json') as json_file:
                data = json.load(json_file)
                temp_manual = data['Operation_Variables']['Manual']
                temp_automatic = data['Operation_Variables']['Automatic']
                if temp_manual == 1 and temp_automatic == 0:
                        return 'Manual'
                elif temp_manual == 0 and temp_automatic == 1:
                        return 'Automatic'
                else:
                        return 'Error'

def checkCommand():
        with open('/home/pi/Documents/ReQuench/MachineApp/operations.json') as json_file:
                data = json.load(json_file)
                temp_hot = data['Command_Variable']['Dispense_Hot']
                temp_cold = data['Command_Variable']['Dispense_Cold']
                if temp_hot == 1 and temp_cold == 0:
                        return  'Dispense_Hot'
                elif temp_hot == 0 and temp_cold == 1:
                        return 'Dispense_Cold'
                elif temp_hot == 0 and temp_cold == 0:
                        return 'Standby'
                else:
                        return 'Error'

def getRequestedAmount():
        with open('/home/pi/Documents/ReQuench/MachineApp/operations.json') as json_file:
                data = json.load(json_file)
                temp_amount = data['Operation_Variables']['Requested_Amount']
        return temp_amount

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
        GPIO.output(7, 1)
        while checkCommand() != 'Standby':
                rate_cnt = 0
                pulses = 0
                time_start= time.time()
                while pulses <= 5:
                        gpio_cur = GPIO.input(11)
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
        GPIO.output(7, 0)

def automaticDispense(command,amount_requested):
        counter = 0
        GPIO.output(inpt1, 1)
        rate_cnt = 0
        tot_cnt = 0
        time_zero = 0.0
        time_start = 0.0
        time_end = 0.0
        gpio_last = 0
        pulses = 0
        constant = 1.79
        total_liters = 0
        time_zero = time.time()
        GPIO.output(7, 1)
        while amount_requested <= total_liters:
                rate_cnt = 0
                pulses = 0
                time_start= time.time()
                while pulses <= 5:
                        gpio_cur = GPIO.input(11)
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
        GPIO.output(7, 0)
        dispenseIsDoneAutomatic(command)

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
        mode  = check_operation()
        if (mode == 'Manual'):
                command = checkCommand()
                manualMode(command)
        else :
                command = checkCommand()
                automaticMode(command)
        time.sleep(1)
