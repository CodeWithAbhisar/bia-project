import pandas as pd
try:
    pd.read_csv('test.csv')
    print('Success')
except Exception as e:
    print(type(e).__name__, str(e))
