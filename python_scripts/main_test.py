import json
import time
import sys






def check_operation():
        with open('C:/xampp/htdocs/ReQuench/MachineApp/operations.json') as json_file:
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
        with open('C:/xampp/htdocs/ReQuench/MachineApp/operations.json') as json_file:
                data = json.load(json_file)
                temp_hot = data['Command_Variable']['Dispense_Hot']
                temp_cold = data['Command_Variable']['Dispense_Cold']
                if temp_hot == 1 and temp_cold == 0:
                        return  'Dispense_Hot'
                elif temp_hot == 0 and temp_cold == 1:
                        return 'Dispense_Cold'
                elif temp_hot == 0 and temp_cold == 0:
                        return 'Standby'
   
                        return 'Error'

def getRequestedAmount():
        with open('C:/xampp/htdocs/ReQuench/MachineApp/operations.json') as json_file:
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
        counter = 0
        while checkCommand() != 'Standby':
                counter = counter + 1
                print(json.dumps({'Total':counter,'Lmin':1}))
                sys.stdout.flush()
                time.sleep(1)
        

def automaticDispense(command,amount_requested):
        counter = 0
        while amount_requested != counter:
                if command == 'HOT':
                        #dispensing hot here
                        counter = counter + 1
                        print(json.dumps({'Total':counter,'Lmin':1}))
                        sys.stdout.flush()
                else:
                        #dispensing cold here
                        counter = counter + 1
                        print(json.dumps({'Total':counter,'Lmin':1}))
                        sys.stdout.flush()
                time.sleep(1)
        dispenseIsDoneAutomatic(command)

def dispenseIsDoneManual(mode):
        # write json file here   
        with open('C:/xampp/htdocs/ReQuench/MachineApp/operations.json') as outfile:  
                json_data = json.load(outfile)
                if mode=='HOT':
                        json_data['Command_Variable']['Dispense_Hot'] = 0
                else:
                        json_data['Command_Variable']['Dispense_Cold'] = 0
        with open('C:/xampp/htdocs/ReQuench/MachineApp/operations.json', 'w') as file:
                json.dump(json_data, file, indent=6)

def dispenseIsDoneAutomatic(mode):
        # write json file here   
        with open('C:/xampp/htdocs/ReQuench/MachineApp/operations.json') as outfile:  
                json_data = json.load(outfile)
                if mode=='HOT':
                        json_data['Command_Variable']['Dispense_Hot'] = 0
                else:
                        json_data['Command_Variable']['Dispense_Cold'] = 0
                json_data['Operation_Variables']['Requested_Amount'] = 0
        with open('C:/xampp/htdocs/ReQuench/MachineApp/operations.json', 'w') as file:
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
