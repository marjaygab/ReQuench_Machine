import RPi.GPIO as GPIO
import json
import time
import socketio
import threading
import sys
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from hx711 import HX711
hx = HX711(17, 27)
hx.set_reading_format("MSB", "MSB")
hx.set_reference_unit(-1)
hx.reset()
sio = socketio.Client()
sio.connect("http://localhost:3000")

cred = credentials.Certificate('python_scripts/requenchweb2019-firebase-adminsdk-ix063-8738f90a17.json')
firebase_admin.initialize_app(cred)

db = firestore.client()
doc_ref = db.collection(u'Machines').document(u'1')
doc_ref.set({
      "location": "Mabini Building",
      "date_of_purchase": "2018-08-13",
      "last_maintenance_date": "2018-12-01",
      "Model_Number": "ABC123",
      "price_per_ml": "0.002",
      "current_water_level": 18000,
      "api_key": "566ee18ea4eebbc485074e045381ae98",
      "notify_admin": false,
      "critical_level": "20",
      "status": "online",
      "mu_id": 1
})

# GPIO.setwarnings(False)
# GPIO.setmode(GPIO.BOARD)
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

# Use this path for actual testing
cold_probe_path = '/sys/bus/w1/devices/28-0417824753ff/w1_slave'
hot_probe_path = '/sys/bus/w1/devices/28-0316856147ff/w1_slave'


# cold_probe_path = "test.txt"
# hot_probe_path = "test1.txt"

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
# GPIO.setup(output_devices['pump_1'],GPIO.OUT)

GPIO.output(output_devices['pump_1'],1)
GPIO.output(output_devices['solenoid_1'],1)
GPIO.output(output_devices['pump_2'],1)
GPIO.output(output_devices['solenoid_2'],1)
GPIO.output(output_devices['compressor'],1)
GPIO.output(output_devices['heater'],1)

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
    destination = data["destination"]
    if destination == "Python":
        command = data["content"]["command"]
        if command == "New_Transaction":
            total_liters = 0
            container_weight = 0
            current_weight = 0
            current_baseline = 0
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
        elif command == "Set_Amount":
            auto_amount = data["content"]["amount"]
            # print('Amount set to: ' + auto_amount)
            # sys.stdout.flush()
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
            getBaseline()
        elif command == "Get_Container":
            getContainerWeight()
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

            # base_weight = container_weight
        # elif command == 'Get_Current':
        #     current_weight = getCurrentWeight()
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
            print("Shutting Down")
            sys.stdout.flush()
            # Uncomment this for actual tests
            os.system('sudo shutdown -h now')
        elif command == "Reboot":
            print("Reboot")
            sys.stdout.flush()
            # Uncomment this for actual tests
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
    print("Getting Baseline")
    sys.stdout.flush()
    val = hx.get_weight_A(5)
    current_baseline = round(val // float(1000),1) * 1000
    hx.reset()
    print("Baseline: " + current_baseline)
    sys.stdout.flush()


def getCurrentWeight():
    global hx
    global current_weight
    global current_baseline
    print("Getting Current Weight")
    sys.stdout.flush()
    val = hx.get_weight_A(5)
    print('Raw Weight: ' + str(val))
    sys.stdout.flush()
    current_weight = round(val // float(1000),1) * 1000
    current_weight = (current_weight-current_baseline) / 200
    hx.reset()

def getContainerWeight():
    global hx
    global current_baseline
    global container_weight

    # Uncomment this after testing
    # container_weight = 10
    # print("Getting Container Weight")
    # sys.stdout.flush()

    # print('Current Baseline: ' + str(current_baseline))
    # sys.stdout.flush()
    try:
        current_weight = hx.get_weight_A(5)
        current_weight = round(current_weight // float(1000),1) * 1000
        container_weight = ((current_weight - current_baseline) / 200)
        if container_weight < 0:
    	    container_weight = 0
        hx.reset()
    except Exception as exception:
        print(exception)
        sys.stdout.flush()
    
    # print('Container Weight' + str((current_weight-current_baseline)/200))
    # sys.stdout.flush()
    # print('Container Weight: ' + container_weight)
    # sys.stdout.flush()
    # 	return False
    # else:
    # 	return str(container_weight)


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
        # dispense hot here
        manualDispense("HOT")
    elif command == "Dispense_Cold":
        # dispense cold here
        manualDispense("COLD")


def automaticMode(command):
    global auto_amount
    amount_requested = auto_amount
    if amount_requested != 0:
        if command == "Dispense_Hot":
            # dispense hot here
            automaticDispense("HOT", amount_requested)
        elif command == "Dispense_Cold":
            # dispense cold here
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
    if command == "COLD":
        # print("Opened COLD Valve, Opened COLD Pump")
        # sys.stdout.flush()
        GPIO.output(output_devices['pump_1'],0)
        GPIO.output(output_devices['solenoid_1'],0)
    else:
        # print("Opened HOT Valve, Opened HOT Pump")
        # sys.stdout.flush()
        GPIO.output(output_devices['pump_2'],0)
        GPIO.output(output_devices['solenoid_2'],0)
    time_duration = 0
    time_start = time.time()
    while checkCommand() != "Standby":
        time_end = time.time()
        time_duration = time_end - time_start
        if time_duration >= 0.1:
            # Use This Code for Actual Testing
            getCurrentWeight()
            total_liters = (current_weight)
            if total_liters < 0:
                total_liters = 0

            # Use this code if not actual testing
            total_liters = total_liters + 1
            time_start = time.time()
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
    # base_weight = total_liters
    total_liters = 0
    GPIO.output(output_devices['pump_1'],1)
    GPIO.output(output_devices['solenoid_1'],1)
    GPIO.output(output_devices['pump_2'],1)
    GPIO.output(output_devices['solenoid_2'],1)
    sio.emit(
        "socket-event",
        {
            "destination": "JS",
            "content": {"type": "DISPENSE_CONTROL", "body": "Stopped_Dispense"},
        },
    )
    # hx.reset()
    # hx.tare()
    getContainerWeight()
    
    # print("Closed ALL Valve, Closed ALL Pump")
    # sys.stdout.flush()
    


def automaticDispense(command, amount_requested):
    try:
        global current_weight
        global container_weight
        global total_liters
        global base_weight
        global auto_amount
        if command == "COLD":
            # print("Opened COLD Valve, Opened COLD Pump")
            # sys.stdout.flush()
            GPIO.output(output_devices['pump_1'],0)
            GPIO.output(output_devices['solenoid_1'],0)
        else:
            # print("Opened HOT Valve, Opened HOoooT Pump")
            # sys.stdout.flush()
            GPIO.output(output_devices['pump_2'],0)
            GPIO.output(output_devices['solenoid_2'],0)
        time_duration = 0
        time_start = time.time()
        while total_liters < int(auto_amount):
            time_end = time.time()
            time_duration = time_end - time_start
            if time_duration >= 0.1:
                # Use This Code for Actual Testing
                getCurrentWeight()
                total_liters = current_weight
                if total_liters < 0:
                    total_liters = 0

                # Use this code if not actual testing
                # total_liters = total_liters + 1
                time_start = time.time()
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
            if total_liters >= auto_amount:
                stop_dispense()
                break
        # base_weight = total_liters
        total_liters = 0
        auto_amount = 0
        GPIO.output(output_devices['pump_1'],1)
        GPIO.output(output_devices['solenoid_1'],1)
        GPIO.output(output_devices['pump_2'],1)
        GPIO.output(output_devices['solenoid_2'],1)
        sio.emit(
            "socket-event",
            {
                "destination": "JS",
                "content": {"type": "DISPENSE_CONTROL", "body": "Stopped_Dispense"},
            },
        )
        # hx.reset()
        # hx.tare()
        getContainerWeight()
        
        # print("Closed ALL Valve, Closed ALL Pump")
        # sys.stdout.flush()
    except Exception as exception:
        print(exception)
        sys.stdout.flush()

def readTemp():
    global sio
    global cold_probe_path
    global hot_probe_path
    global compressor
    global heater
    while True:
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
            # print("Compressor Off")
            # sys.stdout.flush()
            GPIO.output(output_devices['compressor'],1)
        elif cold_temp >= 11:
            cooling = True
            # print("Compressor On")
            # sys.stdout.flush()
            GPIO.output(output_devices['compressor'],0)
        if hot_temp <= 55:
            # print("Heater On")
            # sys.stdout.flush()
            heating = True
            GPIO.output(output_devices['heater'],0)
        elif hot_temp >= 70:
            # print("Heater Off")
            # sys.stdout.flush()
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
    # threading.Thread(target=readTemp).start()
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
