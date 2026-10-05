import urllib.request
import json
import re

bvs = ['BV1va4y177pm', 'BV1PBx4zYEEj', 'BV1ap4y1z7zL', 'BV1eHoNYpEKu', 'BV1mP411S7Fs', 'BV1DZ4y1A7pp', 'BV1ZL411Z7xx', 'BV19j411w7ML', 'BV1Ka4y1t7VB', 'BV1MZ4y1c78X', 'BV1H24y187Ko', 'BV1K7411A7VJ', 'BV1nm4y1B7Bj', 'BV1Jm4y1V78W', 'BV1SG411K7BP', 'BV19p8Q6VEpC', 'BV1uV4y1U7m8', 'BV1n7411L7t2', 'BV1AkHp6bE3R', 'BV1Ge4y1D77z', 'BV1Mz411b7rV', 'BV1eT411x7Fk', 'BV1HgLgznE7e', 'BV1iHGc6cEjn', 'BV1tP411C73Q', 'BV1ga411S7gP', 'BV16V4y1R7Ue', 'BV168411n7Yd', 'BV1Jx411q7W7', 'BV1sSivBYEHn', 'BV1Hc411P752', 'BV1p1bmzFEPo', 'BV1r8411e7GG', 'BV1wmTe69Et5', 'BV1q7411V7MS', 'BV1Tx411n7oB', 'BV1HK421y7Xh', 'BV1rK4y1b7LC', 'BV1He4y1871G', 'BV1C3icBhEsv', 'BV1k84y1e7hM', 'BV1jJ411y72z', 'BV1MeHs6kE94', 'BV1Pg4y1i735', 'BV1ThGHzREtS']

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for bvid in bvs[:20]:
    url = f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            vdata = data.get('data', {})
            title = vdata.get('title', '')
            duration = vdata.get('duration', 0)
            desc = (vdata.get('desc', '') or '')[:100].replace('\n', ' ')
            print(f"[{bvid}] ({duration}s) {title}")
            if desc:
                print(f"    Desc: {desc}")
    except Exception as e:
        print(f"[{bvid}] Error: {e}")
