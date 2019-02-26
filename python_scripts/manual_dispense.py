import time,sys
import random


# insert here manual dispensing
mldispensed =int(sys.argv[1])
random_num = random.randint(1,21)


while mldispensed == random_num:
    random_num = random.randint(1,21)

print(random_num)
