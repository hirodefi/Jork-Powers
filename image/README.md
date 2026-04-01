# Image Power

Read and analyze images using AI vision. Prepares images for the LLM provider's native vision capability.

## Usage

```bash
# Validate image and get info
node index.js read screenshot.png

# Get base64 data (for passing to LLM)
node index.js base64 screenshot.png
```

## Supported formats

JPG, JPEG, PNG, WEBP, GIF

## How it works

This is a thin wrapper. The actual vision analysis happens through the LLM provider (Claude, GPT-4, Gemini all support vision natively). This power handles:

- File validation (exists, supported format)
- Base64 encoding for API providers
- File path passthrough for Claude CLI (uses --image flag)

## Use cases

- Screenshot of a Solana Explorer error - agent diagnoses the issue
- UI mockup - agent builds it
- Architecture diagram - agent implements it
- Error terminal output - agent debugs it
