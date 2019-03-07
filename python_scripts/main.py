# import RPi.GPIO as GPIO
import json
import time
import socketio
import threading
import sys
import hx711
sio = socketio.Client()
sio.connect('http://localhost:3000')
# GPIO.setwarnings(False)
# GPIO.setmode(GPIO.BOARD)
pump_1 = 11
pump_2 = 13
solenoid_1 = 15
solenoid_2 = 19
compressor = 21 
heater = 23 
flowmeter = 40
cold_probe_path = '/sys/bus/w1/devices/28-0417824753ff/w1_slave'
hot_probe_path = '/sys/bus/w1/devices/28-0316856147ff/w1_slave'
# GPIO.setup(inpt1, GPIO.OUT)
# GPIO.setup(pump_1, GPIO.OUT)
# GPIO.setup(solenoid_1, GPIO.OUT)
# GPIO.setup(pump_2, GPIO.OUT)
# GPIO.setup(solenoid_2, GPIO.OUT)
# GPIO.setup(compressor, GPIO.OUT)
# GPIO.setup(heater, GPIO.OUT)
# GPIO.setup(flowmeter, GPIO.IN)
mode_manual = False
mode_auto = False
temp_hot = False
temp_cold = False
cooling = True
heating = True

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
    global mode_manual
    global mode_auto
    global temp_hot
    global temp_cold
    global auto_amount
    global terminate_flag
    destination = data['destination']
    if destination == 'Python':
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
        elif command == 'Compressor On':
            cooling = True
            # GPIO.output(compressor,0)
        elif command == 'Compressor Off':
            cooling = False
            # GPIO.output(compressor,1)
        elif command == 'Heater On':
            heating = True
            # GPIO.output(heater,0)
        elif command == 'Heater Off':
            heating = False
            # GPIO.output(heater,1)
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
        return 'Standby'
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
            automaticDispense('HOT', amount_requested)
        elif(command == 'Dispense_Cold'):
            # dispense cold here
            automaticDispense('COLD', amount_requested)


def stop_dispense():
    global temp_hot
    global temp_cold
    temp_cold = False
    temp_hot = False


def manualDispense(command):

        rate_cnt = 0
        tot_cnt = 0
        time_zero = 0.0
        time_start = 0.0
        time_end = 0.0
        lmin = 0
        total_liters = 0
        gpio_last = 0
        pulses = 0
        constant = 1.79
        time_zero = time.time()
        gpio_cur = 0
        # if command == 'COLD':
        #         GPIO.output(pump_1,0)
        #         GPIO.output(solenoid_1,0)
        # else:
        #         GPIO.output(pump_2,0)
        #         GPIO.output(solenoid_2,0)        
        time_start = time.time()
        while checkCommand() != 'Standby':
                time_end = time.time()
                time_duration =time_end - time_start
                time_duration = round(time_duration,2)
                if time_duration == 1:
                        total_liters = total_liters + 20
                        time_start= time.time()
                        sio.emit('socket-event',{"destination":"JS","content":{"type":"DISPENSE_READING","body":{"Total":total_liters}}})
                if checkCommand() == 'Standby':
                        total_liters = 0
                        stop_dispense()
                        break
        # GPIO.output(pump_1,1)
        # GPIO.output(solenoid_1,1)
        # GPIO.output(pump_2,1)
        # GPIO.output(solenoid_2,1)


def automaticDispense(command, amount_requested):
    counter = 0
    while counter < amount_requested:
        counter = counter + 1
        time.sleep(0.5)
    sio.emit('socket-event', {"destination": 'JS',
                              "content": {"type":"DISPENSE_CONTROL","body":'Stopped Dispense'}})
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



def readTemp():
    global sio     
    global cold_probe_path
    global hot_probe_path
    global compressor
    global heater
    while True:
        f = open(cold_probe_path,'r')
        cold_temp = ""
        lines = f.readlines()
        f.close()
        equal_pos = lines[1].find('t=')
        if equal_pos != 1:
            cold_temp = float(lines[1][equal_pos+2:])/1000.0
        f = open(hot_probe_path,'r')
        hot_temp = ""
        lines = f.readlines()
        f.close()
        equal_pos = lines[1].find('t=')
        if equal_pos != 1:
            hot_temp = float(lines[1][equal_pos+2:])/1000.0
        
        if cold_temp <= 6:
            cooling = False
            # GPIO.output(compressor,1)
        elif cold_temp >= 11:
            cooling = True
            # GPIO.output(compressor,0)
        if hot_temp <= 55:
            heating = True
            # GPIO.output(heater,0)
        elif hot_temp >= 70:
            heating = False
            # GPIO.output(heater,1)
        sio.emit('socket-event',{"destination":"JS","content":{"type":"TEMP_READING","body":{"Cold":cold_temp,"Hot":hot_temp}}})
        time.sleep(1)

def controller():
    global mode_manual
    global mode_auto
    global temp_hot
    global temp_cold
    global auto_amount
    global terminate_flag
    while True:
        mode = check_operation()
        if (mode == 'Manual'):
            command = checkCommand()
            manualMode(command)
        else:
            command = checkCommand()
            automaticMode(command)
        if terminate_flag:
            break
        time.sleep(1)



def main():
    print('Ready')
    sys.stdout.flush()

    threading.Thread(target=controller).start()
    threading.Thread(target=readTemp).start()

    while True:
        pass
try:
    main()
except KeyboardInterrupt:
    pass
except Exception as exception:
    print(exception)
finally:
    # GPIO.cleanup()
    sio.disconnect()
    sys.exit()
