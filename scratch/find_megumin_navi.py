import urllib.request
import json

url = 'https://api.github.com/repos/HaiKonofanDesu/konofan-audio/git/trees/ff6a7c7a02f3efb561ed48e866d8c68f542d3290'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    tree = json.loads(resp.read().decode('utf-8')).get('tree', [])
    navi_sha = [it['sha'] for it in tree if it['path'] == 'Navi'][0]
    
url2 = f'https://api.github.com/repos/HaiKonofanDesu/konofan-audio/git/trees/{navi_sha}'
with urllib.request.urlopen(urllib.request.Request(url2, headers={'User-Agent': 'Mozilla/5.0'})) as resp2:
    tree2 = json.loads(resp2.read().decode('utf-8')).get('tree', [])
    vn102_sha = [it['sha'] for it in tree2 if it['path'] == 'voice_navi_102'][0]
    
url3 = f'https://api.github.com/repos/HaiKonofanDesu/konofan-audio/git/trees/{vn102_sha}'
with urllib.request.urlopen(urllib.request.Request(url3, headers={'User-Agent': 'Mozilla/5.0'})) as resp3:
    tree3 = json.loads(resp3.read().decode('utf-8')).get('tree', [])
    tree3.sort(key=lambda x: x.get('size', 0), reverse=True)
    print('Top 20 largest Navi voice files:')
    for it in tree3[:20]:
        print(f"  {it['path']} -> size: {it.get('size')} bytes")
