import pandas as pd

xlsx_path = r"d:\compliBear\ARM\backend\Audit Plan.xlsx"
df = pd.read_excel(xlsx_path)
row_7 = df.iloc[6]
print("Row 7 content:")
print(row_7.to_dict())
