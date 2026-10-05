# -*- coding: utf-8 -*-
import subprocess
import os

OUT_DIR = 'scratch/fixed_voices'
os.makedirs(f'{OUT_DIR}/megumin', exist_ok=True)
os.makedirs(f'{OUT_DIR}/megumi', exist_ok=True)
os.makedirs(f'{OUT_DIR}/miku', exist_ok=True)

def process_audio(src, dst, start=None, dur=None, fade_out=0.2):
    cmd = ['ffmpeg', '-y']
    if start is not None:
        cmd += ['-ss', f'{start:.3f}']
    cmd += ['-i', src]
    if dur is not None:
        cmd += ['-t', f'{dur:.3f}']
    
    # Audio filters:
    # 1. gentle fade in (0.04s)
    # 2. gentle fade out at end (fade_out seconds)
    # 3. loudnorm to broadcast standard (-16 LUFS)
    if dur is not None:
        st_out = max(0.0, dur - fade_out)
        af = f'loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:ss=0:d=0.04,afade=t=out:st={st_out:.3f}:d={fade_out:.3f}'
    else:
        af = 'loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:ss=0:d=0.04'
    
    cmd += ['-af', af, '-c:a', 'libmp3lame', '-b:a', '192k', dst]
    res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f'Error processing {dst}: {res.stderr[:200]}')
    else:
        print(f'Successfully generated {dst}')

print('=== 1. Processing Megumin Voices ===')
# 01: Explosion chant - full explosion with natural echo (13.8s)
process_audio('scratch/source_audio/megumin_ep2.mp3', f'{OUT_DIR}/megumin/01.mp3', start=28.00, dur=13.80, fade_out=0.35)
# 02: 我が名はめぐみん！ (from current 02.mp3, already clean studio WAV)
process_audio('角色-惠惠/音频素材/02.mp3', f'{OUT_DIR}/megumin/02.mp3')
# 03: 爆裂魔法！ (from current 03.mp3, clean studio WAV)
process_audio('角色-惠惠/音频素材/03.mp3', f'{OUT_DIR}/megumin/03.mp3')
# 04: さあ、今日もレッツ爆裂魔法！ (start=6.80, dur=2.90, voice ends at 9.27)
process_audio('scratch/source_audio/megumin_raw.mp3', f'{OUT_DIR}/megumin/04.mp3', start=6.80, dur=2.90, fade_out=0.20)
# 05: 爆裂魔法こそが最強の魔法！ (start=25.95, dur=3.25, voice ends at 28.76)
process_audio('scratch/source_audio/megumin_raw.mp3', f'{OUT_DIR}/megumin/05.mp3', start=25.95, dur=3.25, fade_out=0.20)
# 06: あなたも爆裂魔法の魅力に… (start=20.15, dur=2.85, voice ends at 22.44)
process_audio('scratch/source_audio/megumin_raw.mp3', f'{OUT_DIR}/megumin/06.mp3', start=20.15, dur=2.85, fade_out=0.20)
# 07-10: clean studio WAVs
process_audio('角色-惠惠/音频素材/07.mp3', f'{OUT_DIR}/megumin/07.mp3')
process_audio('角色-惠惠/音频素材/08.mp3', f'{OUT_DIR}/megumin/08.mp3')
process_audio('角色-惠惠/音频素材/09.mp3', f'{OUT_DIR}/megumin/09.mp3')
process_audio('角色-惠惠/音频素材/10.mp3', f'{OUT_DIR}/megumin/10.mp3')

print('\n=== 2. Processing Kato Megumi Voices ===')
# 01: 治愈问候 (42.50s -> 44.55s, dur=2.05s)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{OUT_DIR}/megumi/01.mp3', start=42.50, dur=2.05, fade_out=0.20)
# 02: 鼓嘴侧头 (105.00s -> 108.10s, dur=3.10s)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{OUT_DIR}/megumi/02.mp3', start=105.00, dur=3.10, fade_out=0.20)
# 03: 吃惊害羞 (112.10s -> 116.40s, dur=4.30s)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{OUT_DIR}/megumi/03.mp3', start=112.10, dur=4.30, fade_out=0.20)
# 04: 委屈低头 (118.00s -> 121.10s, dur=3.10s)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{OUT_DIR}/megumi/04.mp3', start=118.00, dur=3.10, fade_out=0.20)
# 05: 剧场版女主角告白 (kato_heroine.mp3 full)
process_audio('scratch/source_audio/kato_heroine.mp3', f'{OUT_DIR}/megumi/05.mp3')
# 06: 温柔注视 (124.10s -> 127.40s, dur=3.30s)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{OUT_DIR}/megumi/06.mp3', start=124.10, dur=3.30, fade_out=0.20)
# 07: 摸头反馈 (122.60s -> 124.10s, dur=1.50s)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{OUT_DIR}/megumi/07.mp3', start=122.60, dur=1.50, fade_out=0.20)
# 08: 戳身反应 (132.70s -> 134.90s, dur=2.20s)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{OUT_DIR}/megumi/08.mp3', start=132.70, dur=2.20, fade_out=0.20)
# 09: 暴走生气 (138.75s -> 141.65s, dur=2.90s)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{OUT_DIR}/megumi/09.mp3', start=138.75, dur=2.90, fade_out=0.20)
# 10: 晚安待机 (142.20s -> 148.10s, dur=5.90s)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{OUT_DIR}/megumi/10.mp3', start=142.20, dur=5.90, fade_out=0.25)

print('\n=== 3. Processing Hatsune Miku Voices ===')
# 01: 比心舞台 (29.10s -> 31.00s, dur=1.90s)
process_audio('scratch/source_audio/miku_voices.mp3', f'{OUT_DIR}/miku/01.mp3', start=29.10, dur=1.90, fade_out=0.20)
# 02: 甩双马尾 (1.90s -> 3.80s, dur=1.90s)
process_audio('scratch/source_audio/miku_voices.mp3', f'{OUT_DIR}/miku/02.mp3', start=1.90, dur=1.90, fade_out=0.20)
# 03: 元气招手 (8.95s -> 10.90s, dur=1.95s)
process_audio('scratch/source_audio/miku_voices.mp3', f'{OUT_DIR}/miku/03.mp3', start=8.95, dur=1.95, fade_out=0.20)
# 04: 舞台跃动 (43.60s -> 49.80s, dur=6.20s)
process_audio('scratch/source_audio/miku_voices.mp3', f'{OUT_DIR}/miku/04.mp3', start=43.60, dur=6.20, fade_out=0.25)
# 05: 轻柔微笑 (35.35s -> 39.30s, dur=3.95s)
process_audio('scratch/source_audio/miku_voices.mp3', f'{OUT_DIR}/miku/05.mp3', start=35.35, dur=3.95, fade_out=0.20)
# 06: 歌姬待机 (30.95s -> 33.25s, dur=2.30s)
process_audio('scratch/source_audio/miku_voices.mp3', f'{OUT_DIR}/miku/06.mp3', start=30.95, dur=2.30, fade_out=0.20)
# 07: 摸头反馈 (11.80s -> 13.85s, dur=2.05s)
process_audio('scratch/source_audio/miku_voices.mp3', f'{OUT_DIR}/miku/07.mp3', start=11.80, dur=2.05, fade_out=0.20)
# 08: 戳身反应 (18.50s -> 20.95s, dur=2.45s)
process_audio('scratch/source_audio/miku_voices.mp3', f'{OUT_DIR}/miku/08.mp3', start=18.50, dur=2.45, fade_out=0.20)
# 09: 暴走生气 (23.95s -> 25.85s, dur=1.90s)
process_audio('scratch/source_audio/miku_voices.mp3', f'{OUT_DIR}/miku/09.mp3', start=23.95, dur=1.90, fade_out=0.20)
# 10: 温暖陪伴 (37.45s -> 39.30s, dur=1.85s)
process_audio('scratch/source_audio/miku_voices.mp3', f'{OUT_DIR}/miku/10.mp3', start=37.45, dur=1.85, fade_out=0.20)
