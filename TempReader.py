import threading
import sys
import time
def readTemp(path,path1,interval):
    while True:
        f = open(path,'r')
        temperature = ""
        lines = f.readlines()
        f.close()
        equal_pos = lines[1].find('t=')
        if equal_pos != 1:
            temperature = float(lines[1][equal_pos+2:])/1000.0
        f = open(path1,'r')
        temperature1 = ""
        lines = f.readlines()
        f.close()
        equal_pos = lines[1].find('t=')
        if equal_pos != 1:
            temperature1 = float(lines[1][equal_pos+2:])/1000.0

        print(str(temperature) + ' ' + str(temperature1))
        time.sleep(interval)
    return temperature





try:
    t = threading.Thread(target = readTemp("test.txt","test1.txt",1))
    t.start()
    # while True:
    #     pass
except KeyboardInterrupt:
    pass
except Exception as exception:
    print(exception)
finally:
    sys.exit()