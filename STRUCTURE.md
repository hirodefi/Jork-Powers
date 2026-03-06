# Power Structure Standard

Each power follows this structure:

```
power-name/
  README.md      - Description, usage, examples
  config.json    - Default configuration
  index.js       - Main entry point (or index.py)
  lib/           - Helper modules (optional)
  install.sh     - Dependencies installer (optional)
```

## Required exports/functions

- `run(args)` - Main function called by Jork
- `help()` - Returns usage info

## Config format

```json
{
  "name": "power-name",
  "version": "1.0.0",
  "description": "What this power does",
  "requires": ["dependency1", "dependency2"]
}
```
