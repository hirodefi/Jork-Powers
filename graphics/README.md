Vision Power

Read images and generate images.

## Features

- Read and describe images (local file or URL)
- Ask questions about images
- Generate images via DALL-E or compatible API

## Requirements

```bash
pip install anthropic Pillow requests
```

## Usage

```bash
python3 index.py read /screenshot.png
python3 index.py read https://example.com/image.jpg "What text is in this?"
python3 index.py create "a futuristic city" output.png
```

## Notes

- Reading uses Claude Sonnet (vision capability)
- Generating requires OPENAI_API_KEY (or compatible)
