import sys
import csv
import math
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import matplotlib.texmanager as TexManager

if len(sys.argv) < 3:
    print('Usage: {} <outfile> <input-files>'.format(sys.argv[0]))
    sys.exit(1)

outfile = sys.argv[1]
infiles = sys.argv[2:]

width = 3.1
height = width / 1.618

@ticker.FuncFormatter
def time_formatter(x, pos):
    min = math.floor(x / 60)
    sec = int(round(x - (min * 60)))
    return "{:02}:{:02}".format(min, sec)

plt.style.use(['science', 'tud'])

plt.rc('font', **{
    'family': 'sans-serif',
    'weight': 700,
    'sans-serif': 'FrontPage Pro',
})
plt.rc('text', usetex=True)

plt.rc('xtick', labelsize=8)
plt.rc('ytick', labelsize=8)
plt.rc('axes', labelsize=10)
plt.rc('legend', fontsize=8)
#plt.rc('text.latex', preamble=r'\usepackage{5fpr8r}')

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

dashes = [
[5, 2],
[2, 2,],
[10, 2]
]

for i, infile in enumerate(infiles):
    x = []
    y = []
    with open(infile, 'r') as f:
        reader = csv.reader(f, delimiter=',')
        next(reader)
        for row in reader:
            new_y = float(row[2]) * 100
            x.append(float(row[0]) / 1000)
            y.append(new_y)
            if new_y > max_y:
                max_y = new_y
    plt.step(x, y, label=browser[i], linewidth=1, alpha=1)

plt.grid(axis='y')
ax.legend(title='Browser')
ax.set_xlim(0,150)
ax.yaxis.set_major_formatter(ticker.PercentFormatter())
ax.xaxis.set_major_formatter(time_formatter)
plt.xlabel('Time in background [mm:ss]')
plt.ylabel('CPU usage')
plt.ylim(bottom = 90, top = max(max_y * 1.05, 100))
fig.savefig(outfile + '.pdf')
plt.show()
