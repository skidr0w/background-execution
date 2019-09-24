import sys
import csv
import math
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

if len(sys.argv) < 3:
    print('Usage: {} <outfile> <input-files>'.format(sys.argv[0]))
    sys.exit(1)

outfile = sys.argv[1]
infiles = sys.argv[2:]

fig_width_pt = 418.25555 * 0.5
inches_per_pt = 1.0 / 72.27
golden_mean = (math.sqrt(5) - 1.0) / 2.0

width = fig_width_pt * inches_per_pt
height = width * golden_mean

@ticker.FuncFormatter
def time_formatter(x, pos):
    min = math.floor(x / 60)
    sec = int(round(x - (min * 60)))
    return "{:02}:{:02}".format(min, sec)

plt.style.use(['science', 'tuda-ci'])
plt.rc('font', **{
    'family': 'sans-serif',
    'sans-serif': 'Roboto',
})

plt.rc('xtick', labelsize=9)
plt.rc('ytick', labelsize=9)
plt.rc('axes', labelsize=9)
plt.rc('legend', fontsize=9)
plt.rcParams['text.latex.preamble'] = [
    r'\usepackage{roboto}',
]

fig = plt.figure(figsize=(width, height), dpi=300)
fig.subplots_adjust(left=.15, bottom=.16, right=.99, top=.97)
ax = plt.axes()

max_y = 100

browser = [
    'Chrome',
    'Firefox',
    'Safari',
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
leg = ax.legend()
leg.get_frame().set_linewidth(.5)
ax.set_xlim(0,180)
ax.yaxis.set_major_formatter(ticker.PercentFormatter())
ax.xaxis.set_major_formatter(time_formatter)
plt.xlabel(r'\textbf{Time in background [mm:ss]}')
plt.ylabel(r'\textbf{CPU usage}')
#plt.ylim(bottom = 90, top = max(max_y * 1.05, 100))
fig.savefig(outfile + '.pdf')
plt.show()
