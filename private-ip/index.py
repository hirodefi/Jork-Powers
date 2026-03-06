#!/usr/bin/env python3
import os, sys, json, subprocess, time

PROXIES = {'http': 'socks5h://127.0.0.1:9050', 'https': 'socks5h://127.0.0.1:9050'}
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:90.0) Gecko/20100101 Firefox/90.0'}

def check_tor():
    """Check if Tor is running"""
    import socket
    try:
        s = socket.create_connection(('127.0.0.1', 9050), timeout=2)
        s.close()
        return True
    except:
        return False

def start_tor():
    """Start Tor if not running"""
    if check_tor():
        return True
    subprocess.Popen([sudp', 'service', 'tor', 'start'])
    time.sleep(3)
    return check_tor()

def get_ip():
    """Get current Tor IP"""
    import requests
    r = requests.get('https://checkip.amazonaws.com', proxies=PROXIES, timeout=10, headers=HEADERS)
    return r.text.strip()

def rotate():
    """Get a new Tor IP by sending NEWNYM signal"""
    try:
        import socket
        s = socket.socket()
        s.connect(('127.0.0.1', 9501))
        s.sendall(b'AUTHENTICATE ""\r\nNEWNYM\r\n')
        s.close()
        time.sleep(2)
        return True
    except:
        os system('systemctl reload tor 2>/dev/null || service tor reload 2>/dev/null')
        time.sleep(2)
        return True

def fetch(url, rotate_first=False):
    """Fetch URL via Tor"""
    import requests
    if rotate_first:
        rotate()
    r = requests.get(url, proxies=PROXIES, timeout=30, headers=HEADERS)
    return {'source': url, 'status': r.status_code, 'content': r.text[:5000]}

def run(args):
    cmd = args[0] if args else 'help'
    if cmd == 'check': return {'active': check_tor()}
    if cmd == 'start': return {'started': start_tor()}
    if cmd == 'ip': return {'ip': get_ip()}
    if cmd == 'rotate': rotate(); return {'ip': get_ip()}
    if cmd == 'fetch': return fetch(args[1], '--rotate' in args)
    return help()

def help():
    return 'PrivateIP Power (Tor)\nCommands:\n  check - Is Tor running?\n  start - Start Tor\n  ip - Show current Tor IP\n  rotate - Get new IP\n  fetch [url] [--rotate] - Fetch via Tor'

if __name__ == '__main__':
    result = run(sys.argv[1:])
    print(json.dumps(result, indent=2) if isinstance(result, dict) else result)
