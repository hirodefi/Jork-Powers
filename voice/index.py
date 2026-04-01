#!/usr/bin/env python3
"""Voice power - transcribe voice messages. Whisper tiny, CPU, minimal."""
import sys, os, json

CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'config.json')

def load_config():
    try:
        with open(CONFIG_FILE) as f:
            return json.load(f)
    except:
        return {}

# Common Solana terms that Whisper gets wrong
SOLANA_CORRECTIONS = {
    'anchor': ['anker', 'ankhor', 'anchar'],
    'solana': ['solanna', 'salana', 'sulana'],
    'devnet': ['devnit', 'dev net', 'def net'],
    'mainnet': ['main net', 'mainet'],
    'token': ['tokin', 'tocken'],
    'wallet': ['wallit', 'walet'],
    'deploy': ['deploi', 'de ploy'],
    'metaplex': ['meta plex', 'metapleks'],
    'jupiter': ['jupeter', 'jupitor'],
    'airdrop': ['air drop', 'airdop'],
    'keypair': ['key pair', 'keep air'],
    'pubkey': ['pub key', 'pub ki'],
}

def correct_solana_terms(text):
    lower = text.lower()
    for correct, variants in SOLANA_CORRECTIONS.items():
        for variant in variants:
            if variant in lower:
                # Case-insensitive replace
                import re
                text = re.sub(re.escape(variant), correct, text, flags=re.IGNORECASE)
    return text

def transcribe(audio_path):
    import whisper
    cfg = load_config()
    model_name = cfg.get('whisper_model', 'tiny')
    model = whisper.load_model(model_name)
    result = model.transcribe(audio_path, language=cfg.get('language', 'en'))
    text = result['text'].strip()
    return correct_solana_terms(text)

def run(args):
    cmd = args[0] if args else 'help'
    if cmd == 'transcribe':
        if len(args) < 2:
            return 'Usage: transcribe <audio_file>'
        return transcribe(args[1])
    return 'Voice Power\nCommands:\n  transcribe <audio_file> - Convert speech to text'

if __name__ == '__main__':
    result = run(sys.argv[1:])
    print(result)
