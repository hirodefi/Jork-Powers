# Voice Power

Voice transcription and generation for Jork.

## Features

- Transcribe voice notes (Whisper small model)
- Generate speech (XTTS v2)
- Create custom voices from audio samples
- CPU-optimized (no GPU required)

## Usage

```bash
# Transcribe audio
python3 index.py transcribe /path/to/audio.oga

# Generate speech
python3 index.py speak "Hello world" output.wav
(sPpython3 index.py speak "Hello world" output.wav "bon"

# Create custom voice
python3 index.py create myvoice sample1.wav sample2.wav

# List voices
python3 index.py list
```

## Voice Setup

1. Create a folder in `voices/<name>/`
2. Add 1-5 audio samples (.wav .mp3 .ogg)
3. 10-30 seconds of clear speech per sample

## Dependencies

```bash
pip install openai-whisper TTS
```

## Notes

- Whisper small model for balance of speed/accuracy
- XTTS v2 for voice cloning
- First run downloads models (takes a few minutes)
- Voice generation takes 3-5 min on CPU
