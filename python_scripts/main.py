# !/usr/bin/python2

import RPi.GPIO as GPIO
import json
import time
import socketio
import threading
import sys
import os
from hx711 import HX711
hx = HX711(17, 27)
hx.set_reading_format("MSB", "MSB")
hx.set_reference_unit(-193)
sio = socketio.Client()
sio.connect("http://localhost:3000")

output_devices = {
    "pump_1": 21,
    "pump_2": 20,
    "solenoid_1": 16,
    "solenoid_2": 12,
    "compressor": 7,
    "heater": 24,
    "screen_backlight": 18,
    "blue_led": 18,
    "red_led": 14,
    "yellow_led": 15
}


for index,value in enumerate(output_devices):
    GPIO.setup(output_devices[value],GPIO.OUT)

cold_probe_path = '/sys/bus/w1/devices/28-0417824753ff/w1_slave'
hot_probe_path = '/sys/bus/w1/devices/28-0316856147ff/w1_slave'

enable_temp = True
mode_manual = False
mode_auto = True
temp_hot = False
temp_cold = False
cooling = True
heating = True
current_baseline = 0
current_weight = 0
container_weight = 0
auto_amount = 0
total_liters = 0
base_weight = 0
terminate_flag = False
calibration_constant = 30
remaining_balance = 0


GPIO.output(output_devices['pump_1'],1)
GPIO.output(output_devices['solenoid_1'],1)
GPIO.output(output_devices['pump_2'],1)
GPIO.output(output_devices['solenoid_2'],1)
GPIO.output(output_devices['blue_led'],1)
GPIO.output(output_devices['red_led'],1)
GPIO.output(output_devices['yellow_led'],0)



@sio.on("connect")
def on_connect():
    print("I'm connected!")
    sys.stdout.flush()


@sio.on("socket-event")
def on_message(data):
    global hx
    global mode_manual
    global mode_auto
    global temp_hot
    global temp_cold
    global auto_amount
    global terminate_flag
    global current_baseline
    global container_weight
    global enable_temp
    global remaining_balance
    destination = data["destination"]
    if destination == "Python":
        command = data["content"]["command"]
        if command == "New_Transaction":
            total_liters = 0
            container_weight = 0
            current_weight = 0
            current_baseline = 0
            mode_auto = True
            mode_manual = False
            hx.reset()
        elif command == "End_Transaction":
            hx.power_down()
            # del hx
        elif command == "Toggle_Auto":
            mode_auto = True
            mode_manual = False
        elif command == "Toggle_Manual":
            mode_auto = False
            mode_manual = True
        elif command == "Toggle_Hot":
            temp_cold = False
            temp_hot = True
        elif command == "Toggle_Cold":
            temp_cold = True
            temp_hot = False
        elif command == "Enable_Temp":
            enable_temp = True
        elif command == "Disable_Temp":
            enable_temp = False
        elif command == "Set_Amount":
            auto_amount = int(data["content"]["amount"])
            time.sleep(1)
        elif command == "Set_Remaining_Balance":
            remaining_balance = int(data["content"]["amount"])
            time.sleep(1)
        elif command == "Stop_Dispense":
            temp_cold = False
            temp_hot = False
        elif command == "Compressor On":
            cooling = True
            GPIO.output(output_devices['compressor'],0)
        elif command == "Compressor Off":
            cooling = False
            GPIO.output(output_devices['compressor'],1)
        elif command == "Heater On":
            heating = True
            GPIO.output(output_devices['heater'],0)
        elif command == "Heater Off":
            heating = False
            GPIO.output(output_devices['heater'],1)
        elif command == "Get_Baseline":
            tareNow()
        elif command == "Get_Container":
            container_weight = getCurrentWeight()
            container_weight = round(container_weight)
            print("Current Container Weight: " + str(container_weight))
            sys.stdout.flush()

            if container_weight > 0:
                sio.emit(
                    "socket-event",
                    {
                        "destination": "JS",
                        "content": {
                            "type": "CONTAINER_STATUS",
                            "body": "Container Present",
                        },
                    },
                )          
            else:
                sio.emit(
                    "socket-event",
                    {
                        "destination": "JS",
                        "content": {
                            "type": "CONTAINER_STATUS",
                            "body": "Container Absent",
                        },
                    },
                )

            
        elif command == "Finalize_Container":
            if container_weight > 0:
                # getContainerWeight()
                # time.sleep(3)
                sio.emit(
                    "socket-event",
                    {
                        "destination": "JS",
                        "content": {
                            "type": "CONTAINER_STATUS",
                            "body": "Container Present",
                        },
                    },
                )
                tareNow()               
            else:
                sio.emit(
                    "socket-event",
                    {
                        "destination": "JS",
                        "content": {
                            "type": "CONTAINER_STATUS",
                            "body": "Container Absent",
                        },
                    },
                )
        elif command == "Start_Drain_Hot":
            print("Started Draining")
            sys.stdout.flush()
            GPIO.output(output_devices['pump_2'],0)
            GPIO.output(output_devices['solenoid_2'],0)
        elif command == "Stop_Drain_Hot":
            print("Stopped Draining")
            sys.stdout.flush()
            GPIO.output(output_devices['pump_2'],1)
            GPIO.output(output_devices['solenoid_2'],1)
        elif command == "Start_Drain_Cold":
            print("Started Draining")
            sys.stdout.flush()
            GPIO.output(output_devices['pump_1'],0)
            GPIO.output(output_devices['solenoid_1'],0)
        elif command == "Stop_Drain_Cold":
            print("Stopped Draining")
            sys.stdout.flush()
            GPIO.output(output_devices['pump_1'],1)
            GPIO.output(output_devices['solenoid_1'],1)
        elif command == "Shutdown":
            os.system('sudo shutdown now')
        elif command == "Reboot":
            os.system('sudo reboot')
        elif command == "Terminate":
            pass
            # GPIO.cleanup()
            # terminate_flag = True


@sio.on("disconnect")
def on_disconnect():
    print("I'm disconnected!")
    sys.stdout.flush()


def check_operation():
    if mode_manual:
        return "Manual"
    else:
        return "Automatic"


def getBaseline():
    global hx
    global current_baseline
    pass
    
    
def tareNow():
    global hx
    hx.reset()
    hx.tare()


def getCurrentWeight():
    global hx
    global current_weight
    global current_baseline
    val = hx.get_weight(5)
    hx.power_down()
    hx.power_up()
    time.sleep(0.01)
    current_weight = val
    return current_weight

def getContainerWeight():
    global hx
    global current_baseline
    global container_weight
    try:
        current_weight = hx.get_weight(5)
        container_weight = current_weight
        if container_weight < 0:
    	    container_weight = 0
        print('Container Weight: ' + str(container_weight))
        sys.stdout.flush()
    except Exception as exception:
        print('Error here: ' + exception)
        sys.stdout.flush()


def checkCommand():
    global temp_cold
    global temp_hot
    if temp_hot and not temp_cold:
        return "Dispense_Hot"
    elif temp_cold and not temp_hot:
        return "Dispense_Cold"
    elif not temp_cold and not temp_hot:
        return "Standby"
    else:
        return "Error"


def getRequestedAmount():
    return auto_amount


def manualMode(command):
    if command == "Dispense_Hot":
        manualDispense("HOT")
    elif command == "Dispense_Cold":
        manualDispense("COLD")


def automaticMode(command):
    global auto_amount
    amount_requested = auto_amount
    if amount_requested != 0:
        if command == "Dispense_Hot":
            automaticDispense("HOT", amount_requested)
        elif command == "Dispense_Cold":
            automaticDispense("COLD", amount_requested)


def stop_dispense():
    global temp_hot
    global temp_cold
    temp_cold = False
    temp_hot = False


def manualDispense(command):
    global hx
    global current_weight
    global container_weight
    global total_liters
    global base_weight
    global calibration_constant
    global remaining_balance
    no_container = False

    print("Manual Dispensing Start")
    sys.stdout.flush()

    print("Remaining Balance Received: " + str(remaining_balance))
    sys.stdout.flush()

    tareNow()

    total_liters = getCurrentWeight()
    if total_liters < 0:
       total_liters = 0
    

    if command == "COLD":
        GPIO.output(output_devices['pump_1'],0)
        GPIO.output(output_devices['solenoid_1'],0)
        calibration_constant = 0
    else:
        GPIO.output(output_devices['pump_2'],0)
        GPIO.output(output_devices['solenoid_2'],0)
        calibration_constant = 0
    

    time.sleep(0.1)
    total_liters = getCurrentWeight()
    if total_liters < 0:
       total_liters = 0
    previous = total_liters
    

    time_start = time.time()
    while checkCommand() != "Standby":
        total_liters = getCurrentWeight()
        if total_liters < 0:
            total_liters = 0
        if previous > total_liters:
            stop_dispense()
            total_liters = previous
            print("No container Detected")
            sys.stdout.flush()
            no_container = True
            break
        previous = total_liters
        sio.emit(
            "socket-event",
            {
                "destination": "JS",
                "content": {
                    "type": "DISPENSE_READING",
                    "body": {"Total": total_liters + calibration_constant},
                },
            },
        )   

        if remaining_balance < (total_liters + calibration_constant):
            total_liters = remaining_balance
            stop_dispense()
            break

        if checkCommand() == "Standby":
            stop_dispense()
            break
    GPIO.output(output_devices['pump_1'],1)
    GPIO.output(output_devices['solenoid_1'],1)
    GPIO.output(output_devices['pump_2'],1)
    GPIO.output(output_devices['solenoid_2'],1)
    if no_container == False:            
            sio.emit(
                        "socket-event",
                        {
                            "destination": "JS",
                            "content": {
                                "type": "DISPENSE_READING",
                                "body": {"Total": total_liters + calibration_constant},
                            },
                        },
                    )
    else:
        sio.emit(
                    "socket-event",
                    {
                        "destination": "JS",
                        "content": {
                            "type": "DISPENSE_READING",
                            "body": {"Total": total_liters + (2*calibration_constant)},
                        },
                    },
                )
    total_liters = 0
    sio.emit(
        "socket-event",
        {
            "destination": "JS",
            "content": {"type": "DISPENSE_CONTROL", "body": "Stopped_Dispense"},
        },
    )
    


def automaticDispense(command, amount_requested):
    try:
        global hx
        global current_weight
        global container_weight
        global total_liters
        global auto_amount
        global calibration_constant

        no_container = False
        
        tareNow()

        total_liters = getCurrentWeight()

        print('Amount Received: ' + str(amount_requested))
        sys.stdout.flush()
        
        if total_liters < 0:
            total_liters = 0

        if command == "HOT":   
            GPIO.output(output_devices['pump_2'],0)
            GPIO.output(output_devices['solenoid_2'],0)
            calibration_constant = 0
        else:
            GPIO.output(output_devices['pump_1'],0)
            GPIO.output(output_devices['solenoid_1'],0)
            calibration_constant = 0

        print('Calibration Constant: ' + str(calibration_constant))        
        sys.stdout.flush()

        time.sleep(0.1)
        total_liters = getCurrentWeight()
        if total_liters < 0:
            total_liters = 0
        previous = total_liters

        time_start = time.time()
        while (total_liters + calibration_constant) < amount_requested:
            total_liters = getCurrentWeight()
            
            if total_liters < 0:
                total_liters = 0

            if previous > total_liters:
                print("No container detected! Previous: " + str(previous) + " " + "Liters: " + str(total_liters))
                sys.stdout.flush()
                stop_dispense()
                total_liters = previous
                no_container = True
                break
            previous = total_liters    
            sio.emit(
                "socket-event",
                {
                    "destination": "JS",
                    "content": {
                        "type": "DISPENSE_READING",
                        "body": {"Total": total_liters},
                    },
                },
            )
            print("Computed Liters: " + str(total_liters + calibration_constant))
            sys.stdout.flush()
            if (total_liters + calibration_constant) > amount_requested:
                stop_dispense()
                break

            if checkCommand() == "Standby":
                auto_amount = total_liters + calibration_constant
                stop_dispense()
                break

        GPIO.output(output_devices['pump_1'],1)
        GPIO.output(output_devices['solenoid_1'],1)
        GPIO.output(output_devices['pump_2'],1)
        GPIO.output(output_devices['solenoid_2'],1)

        print('Actual_Liters' + str(total_liters))
        sys.stdout.flush()
        if no_container == False:            
            sio.emit(
                        "socket-event",
                        {
                            "destination": "JS",
                            "content": {
                                "type": "DISPENSE_READING",
                                "body": {"Total": auto_amount},
                            },
                        },
                    )
        else:
            sio.emit(
                        "socket-event",
                        {
                            "destination": "JS",
                            "content": {
                                "type": "DISPENSE_READING",
                                "body": {"Total": total_liters + (2*calibration_constant)},
                            },
                        },
                    )
        
        total_liters = 0
        auto_amount = 0
        
        sio.emit(
            "socket-event",
            {
                "destination": "JS",
                "content": {"type": "DISPENSE_CONTROL", "body": "Stopped_Dispense"},
            },
        )
    except Exception as exception:
        print("Error!")
        sys.stdout.flush()
        print(exception)
        sys.stdout.flush()
        GPIO.output(output_devices['pump_1'],1)
        GPIO.output(output_devices['solenoid_1'],1)
        GPIO.output(output_devices['pump_2'],1)
        GPIO.output(output_devices['solenoid_2'],1)
        

def readTemp():
    global sio
    global cold_probe_path
    global hot_probe_path
    global compressor
    global heater
    global enable_temp
    while True:
        if(enable_temp):
            f = open(cold_probe_path, "r")
            cold_temp = ""
            lines = f.readlines()
            f.close()
            equal_pos = lines[1].find("t=")
            if equal_pos != 1:
                cold_temp = float(lines[1][equal_pos + 2 :]) / 1000.0

            f = open(hot_probe_path, "r")
            hot_temp = ""
            lines = f.readlines()
            f.close()
            equal_pos = lines[1].find("t=")
            if equal_pos != 1:
                hot_temp = float(lines[1][equal_pos + 2 :]) / 1000.0

            if cold_temp <= 6:
                cooling = False
                GPIO.output(output_devices['compressor'],1)
                GPIO.output(output_devices['blue_led'],1)
                #if (heating == False):
                #    GPIO.output(output_devices['yellow_led'],0)
            elif cold_temp >= 11:
                cooling = True
                GPIO.output(output_devices['compressor'],0)
                GPIO.output(output_devices['blue_led'],0)
                GPIO.output(output_devices['yellow_led'],1)
            else:
                pass
            
            if hot_temp <= 65:
                heating = True
                GPIO.output(output_devices['heater'],0)
                GPIO.output(output_devices['red_led'],0)
                #GPIO.output(output_devices['yellow_led'],1)
            elif hot_temp >= 80:
                heating = False
                GPIO.output(output_devices['heater'],1)
                GPIO.output(output_devices['red_led'],1)
                #if (cooling == False):
                #    GPIO.output(output_devices['yellow_led'],0)
            else:
                pass
            
            #yellow_output = heating or cooling
            
            #if(yellow_output == True):
            #GPIO.output(output_devices['yellow_led'],0)
            #else:
            #    GPIO.output(output_devices['yellow_led'],0)
                
            sio.emit(
                "socket-event",
                {
                    "destination": "JS",
                    "content": {
                        "type": "TEMP_READING",
                        "body": {"Cold": cold_temp, "Hot": hot_temp},
                    },
                },
            )
            
        else:
            GPIO.output(output_devices['compressor'],1)
            GPIO.output(output_devices['heater'],1)

        time.sleep(0.5)


def controller():
    global mode_manual
    global mode_auto
    global temp_hot
    global temp_cold
    global auto_amount
    global terminate_flag
    # global hx
    while True:
        mode = check_operation()
        if mode == "Manual":
            command = checkCommand()
            manualMode(command)
        else:
            command = checkCommand()
            automaticMode(command)
        if terminate_flag:
            break
        time.sleep(1)


def main():
    print("Ready")
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
    GPIO.cleanup()
    sio.disconnect()
    sys.exit()
