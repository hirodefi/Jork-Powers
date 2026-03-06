#!/usr/bin/env python3
import os
import sys
import json

CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'config.json')
VOICES_DIR = os.path.join(os.path.dirname(__file__), 'voices')

def load_config():
    with open(CONFIG_FILE) as f:
        return json.load(f)

def transcribe(audio_path):
    """Transcribe audio using Whisper small model"""
    import whisper
    cfg = load_config()
    model = whisper.load_model(cfg.get('whisper_model', 'small'))
    result = model.transcribe(audio_path)
    return result['text']

def speak(text, output_path, voice=None):
    """Generate speech using XTTS v2"""
    os.environ['COQUI_TOS_AGREED'] = '1'
    from TTS.api import TTS
    
    cfg = load_config()
    voice_name = voice or cfg.get('default_voice', 'default')
    voice_dir = os.path.join(VOICES_DIR, voice_name)
    
    # Get voice samples
    samples = []
    if os.path.exists(voice_dir):
        for f in os.listdir(voice_dir):
            if f.endswith(('.wav', '.mp3', '.ogg')):
                samples.append(os.path.join(voice_dir, f))
    
    if not samples:
        raise Exception(f'No voice samples found for {voice_name}')
    
    tts = TTS(cfg.get('tts_model', 'tts_models/multilingual/multi-dataset/xtts_v2'), gpu=False)
    tts.tts_to_file(
        text=text,
        speaker_wav=samples,
        language=cfg.get('language', 'en'),
        file_path=output_path,
        speed=cfg.get('speed', 1.2)
    )
    return output_path

def create_voice(name, sample_paths):
    """Create custom voice from audio samples"""
    import shutil
    voice_dir = os.path.join(VOICES_DIR, name)
    os.makedirs(voice_dir, exist_ok=True)
    
    for i,path in enumerate(sample_paths):
        ext = os.path.splitext(path)[1]
        shutil.copy(path, os.path.join(voice_dir, f'sample_{i}{ext}'))
    
    return {'msg': f'Created voice {name} with {len(sample_paths)} samples', 'path': voice_dir}

def list_voices():
    """List available voices"""
    if not os.path.exists(VOICES_DIR):
        return []
    return [d for d in os.listdir(VOICES_DIR) if os.path.isdir(os.path.join(VOICES_DIR, d))]

def run(args):
    cmd = args[0] if args else 'help'
    
    if cmd == 'transcribe':
        return transcribe(args[1])
    
    if cmd == 'speak':
        voice = args[3] if len(args) > 3 else None
        return speak(args[1], args[2], voice)
    
    if cmd == 'create':
        return create_voice(args[1], args[2:])
    
    if cmd == 'list':
        return list_voices()
    
    return help()

def help():
    return '''Voice Power
Commands:
  transcribe <audio_file> - Convert speech to text
  speak <text> <output.wav> [voice] - Generate speech
  create <name> <sample1> [sample2] ... - Create custom voice
  list - List available voices'''

if __name__ == '__main__':
    result = run(sys.argv[1:])
    print(result)
