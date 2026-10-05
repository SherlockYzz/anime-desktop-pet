import urllib.request
import os

base_navi = "https://raw.githubusercontent.com/HaiKonofanDesu/konofan-audio/main/Voice/Navi/voice_navi_102/"
base_battle = "https://raw.githubusercontent.com/HaiKonofanDesu/konofan-audio/main/Voice/Battle/voice_battle_102/"

os.makedirs("scratch/test_dl/konofan_megumin", exist_ok=True)

# Let's download a selected set of files
navi_files = [
    "navi102_voice_1.wav",
    "navi102_voice_2.wav",
    "navi102_voice_3.wav",
    "navi102_voice_4.wav",
    "navi102_voice_5.wav",
    "navi102_voice_6.wav",
    "navi102_voice_7.wav",
    "navi102_voice_11.wav",
    "navi102_voice_12.wav",
    "navi102_voice_17.wav",
    "navi102_voice_19.wav",
    "navi102_voice_21.wav",
    "navi102_voice_31.wav",
    "navi102_voice_59.wav",
    "navi102_voice_61.wav",
    "navi102_voice_88.wav",
    "navi102_voice_108.wav",
    "navi102_voice_149.wav",
    "navi102_voice_160.wav"
]

battle_files = [
    "battle102_voice_103.wav",
    "battle102_voice_112.wav",
    "battle102_voice_113.wav",
    "battle102_voice_121.wav",
    "battle102_voice_107.wav",
    "battle102_voice_39.wav",
    "battle102_voice_22.wav",
    "battle102_voice_105.wav"
]

for f in navi_files:
    dest = os.path.join("scratch/test_dl/konofan_megumin", f)
    if not os.path.exists(dest):
        try:
            urllib.request.urlretrieve(base_navi + f, dest)
            print(f"Downloaded {f} ({os.path.getsize(dest)} bytes)")
        except Exception as e:
            print(f"Error {f}: {e}")

for f in battle_files:
    dest = os.path.join("scratch/test_dl/konofan_megumin", f)
    if not os.path.exists(dest):
        try:
            urllib.request.urlretrieve(base_battle + f, dest)
            print(f"Downloaded {f} ({os.path.getsize(dest)} bytes)")
        except Exception as e:
            print(f"Error {f}: {e}")
