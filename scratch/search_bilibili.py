import urllib.request
import urllib.parse
import json
import re

def search(keyword):
    encoded = urllib.parse.quote(keyword)
    url = f"https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword={encoded}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com/'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            results = data.get('data', {}).get('result', [])
            print(f"=== Keyword: {keyword} ({len(results)} found) ===")
            for v in results[:10]:
                title = re.sub(r'<[^>]+>', '', v.get('title', ''))
                bvid = v.get('bvid', '')
                duration = v.get('duration', '')
                print(f"[{bvid}] ({duration}) {title}")
    except Exception as e:
        print(f"Error for {keyword}: {e}")

if __name__ == '__main__':
    search("惠惠 爆裂魔法 原声")
    search("加藤惠 台词 纯享")
    search("初音未来 经典名台词")
