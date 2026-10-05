# -*- coding: utf-8 -*-
import os
import subprocess
import json
import re

chars = ['角色-高木同学', '角色-雪之下雪乃', '角色-零二', '角色-土间埋']

for c in chars:
    print("=" * 40)
    print(f"=== {c} ===")
    p = os.path.join(c, '音频素材')
    if os.path.exists(p):
        files = sorted([f for f in os.listdir(p) if f.endswith(('.mp3', '.wav'))])
        print(f"音频素材文件数: {len(files)}")
        for f in files[:4]:
            fp = os.path.join(p, f)
            cmd = ['ffprobe', '-v', 'quiet', '-show_streams', '-show_format', '-of', 'json', fp]
            res = subprocess.run(cmd, capture_output=True, text=True)
            data = json.loads(res.stdout)
            fmt = data.get('format', {})
            st = data.get('streams', [{}])[0]
            dur = float(fmt.get('duration', 0))
            sr = st.get('sample_rate')
            ch = st.get('channels')
            codec = st.get('codec_name')
            tags = fmt.get('tags', {})
            print(f"  {f}: {codec}, {sr}Hz, ch={ch}, dur={dur:.2f}s, tags={tags}")
    
    sf = os.path.join(c, '角色设定.js')
    if os.path.exists(sf):
        with open(sf, 'r', encoding='utf-8', errors='ignore') as fp:
            text = fp.read()
            # print dialogs if any
            lines = [l.strip() for l in text.splitlines() if any(k in l for k in ['voice', 'bubble', 'dialogue', '台词', '01', '02', 'text'])]
            print(f"  角色设定台词相关配置 ({len(lines)} 行):")
            for l in lines[:6]:
                print(f"    {l[:80]}")
