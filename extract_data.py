import pandas as pd
import json
import re

excel_file = '/Users/andy/AI_Project/homeRate/全國建物移轉棟數.xlsx'
df = pd.read_excel(excel_file, engine='calamine')

data = []
current_year = None

for index, row in df.iterrows():
    if index < 4:
        continue
    
    col_0 = str(row.iloc[0]).strip()
    
    # 買賣 Column 5
    # 拍賣 Column 7
    # 繼承 Column 9
    # 贈與 Column 11
    val_transaction = row.iloc[5]
    val_auction = row.iloc[7]
    val_inheritance = row.iloc[9]
    val_gift = row.iloc[11]
    
    year_match = re.search(r'(\d{4})', col_0)
    if year_match and '月' not in col_0:
        current_year = year_match.group(1)
        continue
    
    if '月' in col_0 and current_year:
        month_match = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)', col_0, re.IGNORECASE)
        month_map = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
            'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        }
        
        month_str = None
        if month_match:
            month_str = month_map[month_match.group(1).lower()]
        else:
            zh_num_map = {'一': '01', '二': '02', '三': '03', '四': '04', '五': '05', '六': '06',
                          '七': '07', '八': '08', '九': '09', '十': '10', '十一': '11', '十二': '12',
                          '1': '01', '2': '02', '3': '03', '4': '04', '5': '05', '6': '06',
                          '7': '07', '8': '08', '9': '09', '10': '10', '11': '11', '12': '12'}
            for zh, num in zh_num_map.items():
                if zh in col_0.replace(' ', ''):
                    month_str = num
                    break

        if month_str:
            def safe_int(val):
                try:
                    return int(val)
                except:
                    return 0
                    
            data.append({
                "date": f"{current_year}-{month_str}",
                "transaction": safe_int(val_transaction),
                "auction": safe_int(val_auction),
                "inheritance": safe_int(val_inheritance),
                "gift": safe_int(val_gift)
            })

output_file = '/Users/andy/AI_Project/homeRate/data.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Successfully extracted {len(data)} records with multi-category to {output_file}")
