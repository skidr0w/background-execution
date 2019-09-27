import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import math

df = pd.read_excel('merged-patched-process.xlsx', sheet_name='processing output')
print(df.columns)
print('75% quantile\n', df.quantile(.75))
print()
print('90% quantile\n', df.quantile(.9))
print()
print('99% quantile\n', df.quantile(.99))
print()

max_percentage = df['Global Scripting %'].max()
bins = np.arange(0, max_percentage + 0.005, 0.005)


f, (ax, ax2) = plt.subplots(2, 1, sharex=True)

ax.hist(df['Global Scripting %'], bins=bins)
ax2.hist(df['Global Scripting %'], bins=bins)

min, max = plt.ylim()

ax.set_ylim(35, max)  # outliers only
ax2.set_ylim(0, 35)  # most of the data

ax.spines['bottom'].set_visible(False)
ax2.spines['top'].set_visible(False)
ax.xaxis.tick_top()
ax.tick_params(labeltop=False)  # don't put tick labels at the top
ax2.xaxis.tick_bottom()
d = .015  # how big to make the diagonal lines in axes coordinates
# arguments to pass to plot, just so we don't keep repeating them
kwargs = dict(transform=ax.transAxes, color='k', clip_on=False)
ax.plot((-d, +d), (-d, +d), **kwargs)        # top-left diagonal
ax.plot((1 - d, 1 + d), (-d, +d), **kwargs)  # top-right diagonal

kwargs.update(transform=ax2.transAxes)  # switch to the bottom axes
ax2.plot((-d, +d), (1 - d, 1 + d), **kwargs)  # bottom-left diagonal
ax2.plot((1 - d, 1 + d), (1 - d, 1 + d), **kwargs)  # bottom-right diagonal
plt.show()