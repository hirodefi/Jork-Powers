# Voice Power

Transcribe voice messages via Whisper tiny. CPU-optimized, no GPU needed.

## Usage

```bash
# Transcribe audio
python3 index.py transcribe /path/to/audio.oga
```

## Features

- Whisper tiny model (fast, small, good enough for commands)
- Solana term correction (fixes common misrecognitions)
- Supports OGG, WAV, MP3 formats
- Requires ffmpeg for non-WAV formats

## Dependencies

```bash
pip install openai-whisper
apt install ffmpeg
```
