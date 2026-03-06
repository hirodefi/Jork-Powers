#!/usr/bin/env python3
import sys, json, os, base64

def read_image(image_path, question='What is in this image?'):
    """Read and describe an image using Claude"""
    import anthropic
    with open(image_path, 'rb') as f:
        img_data = base64.b64encode(f.read()).decode()
    ext = os.path.splitext(image_path)[1].lower()
    media_type = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif'}.get(ext, 'image/jpeg')
    client = anthropic.Anthropic()
    msg = client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1024,
        messages=[{
            'role': 'user',
            'content': [{
                'type': 'image',
                'source': {'type': 'base64', 'media_type': media_type, 'data': img_data}
            }, {'type': 'text', 'text': question}]
        }]
    )
    return msg.content[0].text

def read_url(url, question='What is in this image?'):
    """Read image from URL"""
    import anthropic
    client = anthropic.Anthropic()
    msg = client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1024,
        messages=[{
+            'role': 'user',
            'content': [{
                'type': 'image',
                'source': {'type': 'url', 'url': url}
            }, {'type': 'text', 'text': question}]
        }]
    )
    return msg.content[0].text

def create_image(prompt, output_path):
    """Generate image via OpenAI DALL-E or compatible API"""
    import requests
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        return {'error': 'OPENAI_API_KEY not set'}
    r = requests.post('https://api.openai.com/v1/images/generations',
        headers={'Authorization': f'Bearer {api_key}'},
        json={'prompt': prompt, 'n': 1, 'size': '1024x1024'})
    url = r.json()['data'][0]['url']
    img_data = requests.get(url).content
    with open(output_path, 'wb') as f: f.write(img_data)
    return {'path': output_path, 'url': url}

def run(args):
    cmd = args[0] if args else 'help'
    if cmd == 'read':
        q = args[2] if len(args) > 2 else 'Describe this image in detail'
        if args[1].startswith('http'): return read_url(args[1], q)
        return read_image(args[1], q)
    if cmd == 'create': return create_image(' '.join(args[1:-1]), args[-1])
    return help()

def help():
    return 'Vision Power\nCommands:\n  read <image_or_url> [question] - Read and describe image\n  create <prompt> <output.png> - Generate image'

if __name__ == '__main__':
    result = run(sys.argv[1:])
    print(result)
