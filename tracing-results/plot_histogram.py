import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import math

df = pd.read_excel('./redone/processed-0.xlsx')
print(df.columns)
print('95% quantile\n', df.quantile(.95))
print()
print('99% quantile\n', df.quantile(.99))
print()

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

max_percentage = df['globalScriptingScore'].max()
bins = np.arange(0, max_percentage + 0.2, 0.2)


f, (ax2) = plt.subplots(1, 1, sharex=True)

#data = df['globalScriptingScore']
data = df[(df['worker'] == 'WORKER') | (df['webSocket'] == 'WEBSOCKET') | (df['postMessageCount'] > 500)]['globalScriptingScore']

#ax.hist(data, bins=bins)
ax2.hist(data, bins=bins)

min, max = plt.ylim()

#ax.set_ylim(50, max)  # outliers only
ax2.set_ylim(0, 50)  # most of the data

#ax.spines['bottom'].set_visible(False)
#ax2.spines['top'].set_visible(False)
ax2.xaxis.set_ticks_position('both')
#ax.tick_params(labeltop=False)  # don't put tick labels at the top
#ax2.xaxis.tick_bottom()
plt.xlabel(r'\textbf{CPU usage score}')
#ax.xaxis.set_major_formatter(ticker.PercentFormatter(decimals=0))
ax2.xaxis.set_major_formatter(ticker.PercentFormatter(decimals=0))
#ax.xaxis.set_major_locator(ticker.MultipleLocator(2))
ax2.xaxis.set_major_locator(ticker.MultipleLocator(2))
#ax.xaxis.set_minor_locator(ticker.MultipleLocator(0.2))
ax2.xaxis.set_minor_locator(ticker.MultipleLocator(0.2))

d = .015  # how big to make the diagonal lines in axes coordinates
# arguments to pass to plot, just so we don't keep repeating them
# kwargs = dict(transform=ax.transAxes, color='k', clip_on=False)
# ax.plot((-d, +d), (-d, +d), **kwargs)        # top-left diagonal
# ax.plot((1 - d, 1 + d), (-d, +d), **kwargs)  # top-right diagonal
#
# kwargs.update(transform=ax2.transAxes)  # switch to the bottom axes
# ax2.plot((-d, +d), (1 - d, 1 + d), **kwargs)  # bottom-left diagonal
# ax2.plot((1 - d, 1 + d), (1 - d, 1 + d), **kwargs)  # bottom-right diagonal

f.savefig('histogram.pdf')

plt.show()