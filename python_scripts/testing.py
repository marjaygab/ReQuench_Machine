import sys
import time

# def main():
while True:
    command = sys.stdin.readline()
    command = command.split('\n')[0]
    if command == "Hot":
        sys.stdout.write("Dispensing Hot\n")
        sys.stdout.flush()
    elif command == "Stop":
        sys.stdout.write("Stopping dispense\n")
        sys.stdout.flush()
    else:
        sys.stdout.write("Sorry, I didn't understand that.\n")
        sys.stdout.flush()

    sys.stdout.write("Code Running\n")
    sys.stdout.flush()
    time.sleep(1)



# if __name__ == '__main__':
#     main()
# while True:
# 	if GPIO.input(10) == GPIO.HIGH:
# 		print('Print')
# 		sys.stdout.flush()
# 		time.sleep(1)
