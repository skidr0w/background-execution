import sys
import csv
import math
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import matplotlib.texmanager as TexManager

if len(sys.argv) < 2:
    print('Usage: {} <title of plot> <input-files>'.format(sys.argv[0]))
    sys.exit(1)

infiles = sys.argv[1:]

width = 3.487
height = width / 1.618

@ticker.FuncFormatter
def time_formatter(x, pos):
    min = math.floor(x / 60)
    sec = int(round(x - (min * 60)))
    return "{:02}:{:02}".format(min, sec)

plt.style.use(['science'])

plt.rc('font', **{
    'family': 'sans-serif',
    'sans-serif': ['Charter', 'Helvetica']
})
plt.rc('text', usetex=True)

plt.rc('xtick', labelsize=8)
plt.rc('ytick', labelsize=8)
plt.rc('axes', labelsize=8)

fig = plt.figure(figsize=(width, height), dpi=150)
fig.subplots_adjust(left=.15, bottom=.16, right=.99, top=.97)
ax = plt.axes()

max_y = 100

browser = [
    'Chrome',
    'Firefox',
    'Safari',
    'Edge',
]

for i, infile in enumerate(infiles):
    x = []
    y = []
    with open(infile, 'r') as f:
        reader = csv.reader(f, delimiter='\t')
        for row in reader:
            new_y = float(row[1]) * 100
            x.append(float(row[0]) / 1000)
            y.append(new_y)
            if new_y > max_y:
                max_y = new_y
    plt.step(x, y, label=browser[i])

plt.grid(axis='y')
ax.legend(title='Browser')
ax.yaxis.set_major_formatter(ticker.PercentFormatter())
ax.xaxis.set_major_formatter(time_formatter)
plt.xlabel('Time in background [mm:ss]')
plt.ylabel('CPU usage')
plt.ylim(bottom = 0, top = max(max_y * 1.05, 100))
fig.savefig(infile + '.pdf')
plt.show()
