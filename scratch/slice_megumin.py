import subprocess
import os
import re

audio_path = "scratch/test_dl/megumin_raw_lines.mp3"
out_dir = "scratch/test_dl/megumin_sliced"
os.makedirs(out_dir, exist_ok=True)

cmd = ['ffmpeg', '-i', audio_path, '-af', 'silencedetect=noise=-25dB:d=0.3', '-f', 'null', '-']
p = subprocess.Popen(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
_, err = p.communicate()

starts = [float(m) for m in re.findall(r'silence_start: ([\d\.]+)', err)]
ends = [float(m) for m in re.findall(r'silence_end: ([\d\.]+)', err)]

print(f"Detected {len(starts)} silence segments.")

clips = []
for i in range(len(ends)):
    speech_start = ends[i]
    speech_end = starts[i+1] if i+1 < len(starts) else 380.0
    dur = speech_end - speech_start
    if 0.8 <= dur <= 12.0:
        clips.append((speech_start, speech_end, dur))

print(f"Found {len(clips)} valid speech clips.")
for idx, (s, e, d) in enumerate(clips[:20]):
    out_file = os.path.join(out_dir, f"megumin_{idx+1:02d}.mp3")
    pad_s = max(0, s - 0.05)
    pad_d = d + 0.1
    slice_cmd = [
        'ffmpeg', '-y', '-ss', f'{pad_s:.2f}', '-t', f'{pad_d:.2f}',
        '-i', audio_path, '-c:a', 'libmp3lame', '-q:a', '2', out_file
    ]
    subprocess.run(slice_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Saved megumin_{idx+1:02d}.mp3: {s:.2f}s -> {e:.2f}s (dur={d:.2f}s)")
