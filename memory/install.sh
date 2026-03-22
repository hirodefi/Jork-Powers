#!/bin/bash
# Install dependencies for memory power

cd "$(dirname "$0")"
npm install --no-package-lock 2>/dev/null

echo "Memory power dependencies installed"
