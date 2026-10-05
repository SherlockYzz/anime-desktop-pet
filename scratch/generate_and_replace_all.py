# -*- coding: utf-8 -*-
import subprocess
import os
import shutil

TARGET_DIRS = [
    {
        'megumin': '角色-惠惠/音频素材',
        'megumi': '角色-加藤惠/音频素材',
        'miku': '角色-初音未来/音频素材'
    },
    {
        'megumin': 'dist/win-unpacked/resources/app/角色-惠惠/音频素材',
        'megumi': 'dist/win-unpacked/resources/app/角色-加藤惠/音频素材',
        'miku': 'dist/win-unpacked/resources/app/角色-初音未来/音频素材'
    }
]

TEMP_DIR = 'scratch/fixed_final_voices'
os.makedirs(f'{TEMP_DIR}/megumin', exist_ok=True)
os.makedirs(f'{TEMP_DIR}/megumi', exist_ok=True)
os.makedirs(f'{TEMP_DIR}/miku', exist_ok=True)

def process_audio(src, dst, start=None, dur=None, fade_out=0.2):
    cmd = ['ffmpeg', '-y']
    if start is not None:
        cmd += ['-ss', f'{start:.3f}']
    cmd += ['-i', src]
    if dur is not None:
        cmd += ['-t', f'{dur:.3f}']
    
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
        print(f'Generated {dst}')

print('=== 1. Generating Megumin Voices (惠惠) ===')
process_audio('scratch/source_audio/megumin_ep2.mp3', f'{TEMP_DIR}/megumin/01.mp3', start=28.00, dur=14.00, fade_out=0.50)
process_audio('角色-惠惠/音频素材/02.mp3', f'{TEMP_DIR}/megumin/02.mp3')
process_audio('角色-惠惠/音频素材/03.mp3', f'{TEMP_DIR}/megumin/03.mp3')
process_audio('scratch/source_audio/megumin_raw.mp3', f'{TEMP_DIR}/megumin/04.mp3', start=6.80, dur=2.90, fade_out=0.20)
process_audio('scratch/source_audio/megumin_raw.mp3', f'{TEMP_DIR}/megumin/05.mp3', start=25.95, dur=3.25, fade_out=0.20)
process_audio('scratch/source_audio/megumin_raw.mp3', f'{TEMP_DIR}/megumin/06.mp3', start=20.15, dur=2.85, fade_out=0.20)
process_audio('角色-惠惠/音频素材/07.mp3', f'{TEMP_DIR}/megumin/07.mp3')
process_audio('角色-惠惠/音频素材/08.mp3', f'{TEMP_DIR}/megumin/08.mp3')
process_audio('角色-惠惠/音频素材/09.mp3', f'{TEMP_DIR}/megumin/09.mp3')
process_audio('角色-惠惠/音频素材/10.mp3', f'{TEMP_DIR}/megumin/10.mp3')

print('\n=== 2. Generating Kato Megumi Voices (加藤惠) ===')
process_audio('scratch/source_audio/kato_alarm.mp3', f'{TEMP_DIR}/megumi/01.mp3', start=42.50, dur=2.05, fade_out=0.20)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{TEMP_DIR}/megumi/02.mp3', start=105.00, dur=3.10, fade_out=0.20)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{TEMP_DIR}/megumi/03.mp3', start=112.10, dur=4.30, fade_out=0.20)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{TEMP_DIR}/megumi/04.mp3', start=118.00, dur=3.10, fade_out=0.20)
process_audio('scratch/source_audio/kato_heroine.mp3', f'{TEMP_DIR}/megumi/05.mp3')
process_audio('scratch/source_audio/kato_alarm.mp3', f'{TEMP_DIR}/megumi/06.mp3', start=124.10, dur=3.30, fade_out=0.20)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{TEMP_DIR}/megumi/07.mp3', start=122.60, dur=1.50, fade_out=0.20)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{TEMP_DIR}/megumi/08.mp3', start=132.70, dur=2.20, fade_out=0.20)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{TEMP_DIR}/megumi/09.mp3', start=138.75, dur=2.90, fade_out=0.20)
process_audio('scratch/source_audio/kato_alarm.mp3', f'{TEMP_DIR}/megumi/10.mp3', start=142.20, dur=6.30, fade_out=0.30)

print('\n=== 3. Generating Hatsune Miku Voices (初音未来) ===')
process_audio('scratch/source_audio/miku_voices.mp3', f'{TEMP_DIR}/miku/01.mp3', start=29.10, dur=1.90, fade_out=0.20)
process_audio('scratch/source_audio/miku_voices.mp3', f'{TEMP_DIR}/miku/02.mp3', start=1.90, dur=1.90, fade_out=0.20)
process_audio('scratch/source_audio/miku_voices.mp3', f'{TEMP_DIR}/miku/03.mp3', start=8.95, dur=1.95, fade_out=0.20)
process_audio('scratch/source_audio/miku_voices.mp3', f'{TEMP_DIR}/miku/04.mp3', start=43.60, dur=6.20, fade_out=0.30)
process_audio('scratch/source_audio/miku_voices.mp3', f'{TEMP_DIR}/miku/05.mp3', start=35.35, dur=3.95, fade_out=0.25)
process_audio('scratch/source_audio/miku_voices.mp3', f'{TEMP_DIR}/miku/06.mp3', start=30.95, dur=2.30, fade_out=0.20)
process_audio('scratch/source_audio/miku_voices.mp3', f'{TEMP_DIR}/miku/07.mp3', start=11.80, dur=2.05, fade_out=0.20)
process_audio('scratch/source_audio/miku_voices.mp3', f'{TEMP_DIR}/miku/08.mp3', start=18.50, dur=2.45, fade_out=0.20)
process_audio('scratch/source_audio/miku_voices.mp3', f'{TEMP_DIR}/miku/09.mp3', start=23.95, dur=1.90, fade_out=0.20)
process_audio('scratch/source_audio/miku_voices.mp3', f'{TEMP_DIR}/miku/10.mp3', start=37.45, dur=1.85, fade_out=0.20)

# Overwrite target directories
print('\n=== 4. Overwriting Production Directories ===')
for tmap in TARGET_DIRS:
    for char, dest_path in tmap.items():
        if not os.path.exists(dest_path):
            continue
        print(f'Updating {dest_path}...')
        for i in range(1, 11):
            src_f = f'{TEMP_DIR}/{char}/{i:02d}.mp3'
            dst_f = f'{dest_path}/{i:02d}.mp3'
            shutil.copy2(src_f, dst_f)
print('All character voice files updated successfully!')
