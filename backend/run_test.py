import pandas as pd
from services.etl_service import process_and_load_csv
try:
    print(process_and_load_csv('test_data.csv', 1, 1))
except Exception as e:
    import traceback
    traceback.print_exc()
