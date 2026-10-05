import subprocess
import os
import shutil

PREVIEW_DIR = "scratch/preview_voices"
os.makedirs(f"{PREVIEW_DIR}/megumin", exist_ok=True)
os.makedirs(f"{PREVIEW_DIR}/megumi", exist_ok=True)
os.makedirs(f"{PREVIEW_DIR}/miku", exist_ok=True)

def process_audio(src, dst, start=None, dur=None):
    cmd = ['ffmpeg', '-y']
    if start is not None:
        cmd += ['-ss', str(start)]
    cmd += ['-i', src]
    if dur is not None:
        cmd += ['-t', str(dur)]
    # Normalize volume and add gentle fade in/out
    cmd += [
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:ss=0:d=0.04',
        '-c:a', 'libmp3lame', '-b:a', '192k',
        dst
    ]
    res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Error processing {dst}: {res.stderr[:200]}")
    else:
        print(f"Generated {dst}")

print("=== Processing Megumin (惠惠) Voices ===")
# Megumin: 
# 01: Explosion chant from ep2 or battle
process_audio("scratch/test_dl/megumin_ep2_chant.mp3", f"{PREVIEW_DIR}/megumin/01.mp3", start=28.0, dur=11.5)
# 02: 我が名はめぐみん！ (from battle102_voice_103 or navi102_voice_108)
process_audio("scratch/test_dl/konofan_megumin/battle102_voice_103.wav", f"{PREVIEW_DIR}/megumin/02.mp3")
# 03: 爆裂魔法！(from battle102_voice_112)
process_audio("scratch/test_dl/konofan_megumin/battle102_voice_112.wav", f"{PREVIEW_DIR}/megumin/03.mp3")
# 04: さあ、今日もレッツ爆裂魔法！ (from megumin_sliced/megumin_03.mp3)
process_audio("scratch/test_dl/megumin_sliced/megumin_03.mp3", f"{PREVIEW_DIR}/megumin/04.mp3")
# 05: 爆裂魔法こそが最強の魔法！ (from megumin_sliced/megumin_10.mp3)
process_audio("scratch/test_dl/megumin_sliced/megumin_10.mp3", f"{PREVIEW_DIR}/megumin/05.mp3")
# 06: あなたも爆裂魔法の魅力に… (from megumin_sliced/megumin_08.mp3)
process_audio("scratch/test_dl/megumin_sliced/megumin_08.mp3", f"{PREVIEW_DIR}/megumin/06.mp3")
# 07: 摸头傲娇反抗 (from konofan_megumin/navi102_voice_19.wav)
process_audio("scratch/test_dl/konofan_megumin/navi102_voice_19.wav", f"{PREVIEW_DIR}/megumin/07.mp3")
# 08: 戳身反应 (from konofan_megumin/navi102_voice_1.wav)
process_audio("scratch/test_dl/konofan_megumin/navi102_voice_1.wav", f"{PREVIEW_DIR}/megumin/08.mp3")
# 09: 暴走生气 (from konofan_megumin/navi102_voice_31.wav)
process_audio("scratch/test_dl/konofan_megumin/navi102_voice_31.wav", f"{PREVIEW_DIR}/megumin/09.mp3")
# 10: 瘫软待机 (from konofan_megumin/navi102_voice_149.wav)
process_audio("scratch/test_dl/konofan_megumin/navi102_voice_149.wav", f"{PREVIEW_DIR}/megumin/10.mp3")

print("\n=== Processing Kato Megumi (加藤惠) Voices ===")
# Kato:
# 01: 治愈甜美问候 (from kato_sliced/kato_01.mp3)
process_audio("scratch/test_dl/kato_sliced/kato_01.mp3", f"{PREVIEW_DIR}/megumi/01.mp3")
# 02: 鼓嘴侧头 (from kato_sliced/kato_03.mp3)
process_audio("scratch/test_dl/kato_sliced/kato_03.mp3", f"{PREVIEW_DIR}/megumi/02.mp3")
# 03: 吃惊害羞 (from kato_sliced/kato_04.mp3)
process_audio("scratch/test_dl/kato_sliced/kato_04.mp3", f"{PREVIEW_DIR}/megumi/03.mp3")
# 04: 委屈低头 (from kato_sliced/kato_06.mp3)
process_audio("scratch/test_dl/kato_sliced/kato_06.mp3", f"{PREVIEW_DIR}/megumi/04.mp3")
# 05: 剧场版终极女主角告白 (from kato_heroine.mp3)
process_audio("scratch/test_dl/kato_heroine.mp3", f"{PREVIEW_DIR}/megumi/05.mp3")
# 06: 温柔注视 (from kato_sliced/kato_08.mp3)
process_audio("scratch/test_dl/kato_sliced/kato_08.mp3", f"{PREVIEW_DIR}/megumi/06.mp3")
# 07: 摸头反馈 (from kato_sliced/kato_09.mp3)
process_audio("scratch/test_dl/kato_sliced/kato_07.mp3", f"{PREVIEW_DIR}/megumi/07.mp3")
# 08: 戳身反应 (from kato_sliced/kato_10.mp3)
process_audio("scratch/test_dl/kato_sliced/kato_10.mp3", f"{PREVIEW_DIR}/megumi/08.mp3")
# 09: 暴走生气 (from kato_sliced/kato_12.mp3)
process_audio("scratch/test_dl/kato_sliced/kato_12.mp3", f"{PREVIEW_DIR}/megumi/09.mp3")
# 10: 晚安待机 (from kato_sliced/kato_13.mp3)
process_audio("scratch/test_dl/kato_sliced/kato_13.mp3", f"{PREVIEW_DIR}/megumi/10.mp3")

print("\n=== Processing Hatsune Miku (初音未来) Voices ===")
# Miku:
# 01: 元气舞台比心 (from miku_sliced/miku_10.mp3)
process_audio("scratch/test_dl/miku_sliced/miku_10.mp3", f"{PREVIEW_DIR}/miku/01.mp3")
# 02: 甩动双马尾 (from miku_sliced/miku_02.mp3 - "好慢！想早点见到你！")
process_audio("scratch/test_dl/miku_sliced/miku_02.mp3", f"{PREVIEW_DIR}/miku/02.mp3")
# 03: 元气招手 (from miku_sliced/miku_04.mp3 - "谢谢你能来！")
process_audio("scratch/test_dl/miku_sliced/miku_04.mp3", f"{PREVIEW_DIR}/miku/03.mp3")
# 04: 舞台跃动 (from miku_sliced/miku_15.mp3 - "想把歌曲传达给许多人")
process_audio("scratch/test_dl/miku_sliced/miku_15.mp3", f"{PREVIEW_DIR}/miku/04.mp3")
# 05: 轻柔微笑 (from miku_sliced/miku_12.mp3 - "一起跳舞吧")
process_audio("scratch/test_dl/miku_sliced/miku_12.mp3", f"{PREVIEW_DIR}/miku/05.mp3")
# 06: 歌姬待机 (from miku_sliced/miku_11.mp3 - "下一首曲子也请多指教")
process_audio("scratch/test_dl/miku_sliced/miku_11.mp3", f"{PREVIEW_DIR}/miku/06.mp3")
# 07: 摸头反馈 (from miku_sliced/miku_05.mp3)
process_audio("scratch/test_dl/miku_sliced/miku_05.mp3", f"{PREVIEW_DIR}/miku/07.mp3")
# 08: 戳身反应 (from miku_sliced/miku_07.mp3)
process_audio("scratch/test_dl/miku_sliced/miku_07.mp3", f"{PREVIEW_DIR}/miku/08.mp3")
# 09: 暴走生气 (from miku_sliced/miku_09.mp3)
process_audio("scratch/test_dl/miku_sliced/miku_09.mp3", f"{PREVIEW_DIR}/miku/09.mp3")
# 10: 温暖陪伴 (from miku_sliced/miku_13.mp3)
process_audio("scratch/test_dl/miku_sliced/miku_13.mp3", f"{PREVIEW_DIR}/miku/10.mp3")
