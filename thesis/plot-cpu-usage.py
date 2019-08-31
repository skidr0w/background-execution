import sys
import csv
import math
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

if len(sys.argv) < 2:
    print('Usage: {} <input-file>'.format(sys.argv[0]))
    sys.exit(1)

infile = sys.argv[1]

@ticker.FuncFormatter
def time_formatter(x, pos):
    min = math.floor(x / 60)
    sec = int(round(x - (min * 60)))
    return "{:02}:{:02}".format(min, sec)

x = []
y = []

with open(infile, 'r') as f:
    reader = csv.reader(f, delimiter='\t')
    for row in reader:
        x.append(float(row[0]) / 1000)
        y.append(float(row[1]) * 100)

f = plt.figure()
ax = plt.axes()

plt.step(x, y)
plt.grid(axis='y')
ax.yaxis.set_major_formatter(ticker.PercentFormatter())
ax.xaxis.set_major_formatter(time_formatter)
plt.xlabel('Time in background [mm:ss]')
plt.ylabel('CPU usage')
top, bottom = plt.ylim()
plt.ylim(bottom = min(bottom, 0), top = max(top, 100))
f.savefig(infile + '.pgf')
f.savefig(infile + '.pdf')
plt.show()
