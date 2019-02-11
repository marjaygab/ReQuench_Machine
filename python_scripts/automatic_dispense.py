import sys,time

entered_ml = int(sys.argv[1])
dispensed = 0

for value in range(entered_ml):
    # check flow meter
    dispensed = dispensed + 10
    print(dispensed)
    sys.stdout.flush()
    time.sleep(1)
