import pandas as pd
df = pd.DataFrame({'a': [1,2,3]})
row = df.iloc[0]
print(row.get(None))
