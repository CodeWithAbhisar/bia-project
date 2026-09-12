import pandas as pd
try:
    df = pd.DataFrame({'date': ['2/24/2003 0:00']})
    df['date'] = pd.to_datetime(df['date'], format='mixed', dayfirst=True)
    print(df['date'])
except Exception as e:
    import traceback
    traceback.print_exc()
