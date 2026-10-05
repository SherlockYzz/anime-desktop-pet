import urllib.request
import json
import re

headers = {'User-Agent': 'Mozilla/5.0'}
bvs_found = set()

for kw in ['加藤惠 经典台词', '加藤惠 原声', '加藤惠 语音 纯享', '加藤惠 角色歌 独白', '加藤惠 告白 台词']:
    url = f"https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword={urllib.parse.quote(kw)}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            for item in data.get('data', {}).get('result', []):
                bvid = item.get('bvid')
                title = re.sub(r'<[^>]+>', '', item.get('title', ''))
                dur = item.get('duration', '')
                if bvid and bvid not in bvs_found:
                    bvs_found.add(bvid)
                    print(f"[{bvid}] ({dur}) {title}")
    except Exception as e:
        print(f"Error {kw}: {e}")
