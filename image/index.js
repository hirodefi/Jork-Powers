'use strict';

// Image power - thin wrapper. The actual vision happens in llm.js
// via the provider's native vision capability (Claude, GPT-4, Gemini).
// This power handles image prep: read file, convert to base64, validate format.

const fs = require('fs');
const path = require('path');

const SUPPORTED = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function readImage(imagePath) {
    if (!imagePath || !fs.existsSync(imagePath)) {
        return { ok: false, error: 'File not found: ' + imagePath };
    }

    const ext = path.extname(imagePath).toLowerCase();
    if (!SUPPORTED.includes(ext)) {
        return { ok: false, error: 'Unsupported format: ' + ext + '. Use: ' + SUPPORTED.join(', ') };
    }

    const data = fs.readFileSync(imagePath);
    const base64 = data.toString('base64');
    const mimeTypes = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif'
    };

    return {
        ok: true,
        base64: base64,
        mimeType: mimeTypes[ext] || 'image/jpeg',
        size: data.length,
        path: imagePath
    };
}

function run(args) {
    const cmd = args[0];
    if (cmd === 'read') {
        const result = readImage(args[1]);
        if (!result.ok) return result.error;
        return JSON.stringify({ ok: true, size: result.size, mimeType: result.mimeType, path: result.path });
    }
    if (cmd === 'base64') {
        const result = readImage(args[1]);
        if (!result.ok) return result.error;
        return result.base64;
    }
    return help();
}

function help() {
    return 'Image Power\nCommands:\n  read <image_path> - Validate and get image info\n  base64 <image_path> - Get base64 encoded image data';
}

module.exports = { readImage, run, help };

if (require.main === module) {
    const args = process.argv.slice(2);
    console.log(run(args));
}
