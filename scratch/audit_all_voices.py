# -*- coding: utf-8 -*-
import os
import subprocess

targets = [
    ('高木同学', '角色-高木同学/音频素材/01.mp3'),
    ('雪之下雪乃', '角色-雪之下雪乃/音频素材/01.mp3'),
    ('零二(02)', '角色-零二/音频素材/01.mp3'),
    ('土间埋', '角色-土间埋/音频素材/01.wav'),
    ('蕾姆', '角色-蕾姆/音频素材/01.wav'),
    ('若曦', '角色-若曦/音频素材/01.mp3'),
    ('惠惠', '角色-惠惠/音频素材/01.mp3'),
    ('加藤惠', '角色-加藤惠/音频素材/01.mp3'),
    ('初音未来', '角色-初音未来/音频素材/01.mp3'),
]

print(f"{'角色名':<8} | {'文件':<8} | {'编码格式':<8} | {'采样率':<8} | {'声道':<4} | {'时长':<6} | {'码率':<8}")
print("-" * 70)

for name, path in targets:
    if os.path.exists(path):
        cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'stream=codec_name,sample_rate,channels:format=duration,bit_rate', '-of', 'default=noprint_wrappers=1', path]
        res = subprocess.check_output(cmd).decode().replace('\r', '').split('\n')
        info = {l.split('=')[0]: l.split('=')[1] for l in res if '=' in l}
        codec = info.get('codec_name', 'N/A')
        sr = info.get('sample_rate', 'N/A')
        ch = info.get('channels', 'N/A')
        dur = float(info.get('duration', 0))
        br = int(info.get('bit_rate', 0)) // 1000 if info.get('bit_rate') else 0
        print(f"{name:<8} | {os.path.basename(path):<8} | {codec:<8} | {sr:<6}Hz | {ch:<4}ch | {dur:5.2f}s | {br:4d}kbps")
