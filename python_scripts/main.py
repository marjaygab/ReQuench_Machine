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
    "green_led": 14,
    "red_led": 15,
    "yellow_red": 18,
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
calibration_constant = 0


GPIO.output(output_devices['pump_1'],1)
GPIO.output(output_devices['solenoid_1'],1)
GPIO.output(output_devices['pump_2'],1)
GPIO.output(output_devices['solenoid_2'],1)


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
    destination = data["destination"]
    if destination == "Python":
        command = data["content"]["command"]
        if command == "New_Transaction":
            total_liters = 0
            container_weight = 0
            current_weight = 0
            current_baseline = 0
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
            time.sleep(1);
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
            hx.reset()
            hx.tare()
        elif command == "Get_Container":
            container_weight = getContainerWeight()
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
        elif command == "Start_Drain":
            print("Started Draining")
            sys.stdout.flush()
            GPIO.output(output_devices['pump_1'],0)
            GPIO.output(output_devices['pump_2'],0)
            GPIO.output(output_devices['solenoid_1'],0)
            GPIO.output(output_devices['solenoid_2'],0)
        elif command == "Stop_Drain":
            print("Stopped Draining")
            sys.stdout.flush()
            GPIO.output(output_devices['pump_1'],1)
            GPIO.output(output_devices['pump_2'],1)
            GPIO.output(output_devices['solenoid_1'],1)
            GPIO.output(output_devices['solenoid_2'],1)
        elif command == "Shutdown":
            os.system('sudo shutdown now')
        elif command == "Reboot":
            os.system('sudo reboot')
        elif command == "Terminate":
            GPIO.cleanup()
            terminate_flag = True


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

    tareNow()
    total_liters = getCurrentWeight()
    
    if total_liters < 0:
       total_liters = 0
    
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

    if command == "COLD":
        GPIO.output(output_devices['pump_1'],0)
        GPIO.output(output_devices['solenoid_1'],0)
    else:
        GPIO.output(output_devices['pump_2'],0)
        GPIO.output(output_devices['solenoid_2'],0)

    time_start = time.time()
    while checkCommand() != "Standby":
        total_liters = getCurrentWeight()

        if total_liters < 0:
            total_liters = 0
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

        if checkCommand() == "Standby":
            stop_dispense()
            break
    GPIO.output(output_devices['pump_1'],1)
    GPIO.output(output_devices['solenoid_1'],1)
    GPIO.output(output_devices['pump_2'],1)
    GPIO.output(output_devices['solenoid_2'],1)
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

        tareNow()

        total_liters = getCurrentWeight()

        if total_liters < 0:
            total_liters = 0

        if command == "HOT":   
            GPIO.output(output_devices['pump_2'],0)
            GPIO.output(output_devices['solenoid_2'],0)
        else:
            GPIO.output(output_devices['pump_1'],0)
            GPIO.output(output_devices['solenoid_1'],0)
        
        time_start = time.time()
        while (total_liters + calibration_constant) < auto_amount:
            total_liters = getCurrentWeight()

            if total_liters < 0:
                total_liters = 0
            # sio.emit(
            #     "socket-event",
            #     {
            #         "destination": "JS",
            #         "content": {
            #             "type": "DISPENSE_READING",
            #             "body": {"Total": total_liters},
            #         },
            #     },
            # )
            if total_liters >= auto_amount:
                stop_dispense()
                break

        GPIO.output(output_devices['pump_1'],1)
        GPIO.output(output_devices['solenoid_1'],1)
        GPIO.output(output_devices['pump_2'],1)
        GPIO.output(output_devices['solenoid_2'],1)

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
        print(exception)
        sys.stdout.flush()

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
            elif cold_temp >= 11:
                cooling = True
                GPIO.output(output_devices['compressor'],0)
            if hot_temp <= 65:
                heating = True
                GPIO.output(output_devices['heater'],0)
            elif hot_temp >= 80:
                heating = False
                GPIO.output(output_devices['heater'],1)
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
