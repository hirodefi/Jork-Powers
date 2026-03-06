PrivateIP Power (Tor)

Anonymous requests via Tor network with IP rotation.

## Features

- Check/start Tor automatically
- Get current Tor IP
- Rotate to a new IP on demand
- Fetch any URL anonymously

## Requirements

```bash
apt-get install tor
pip install requests PySocks
```

## Usage

```bash
python3 index.py check
python3 index.py start
python3 index.py ip
python3 index.py rotate
python3 index.py fetch https://example.com
python3 index.py fetch https://example.com --rotate
```
