#!/usr/bin/env python3
"""
Launcher script for Signzy TemplateCraft Studio Web Application
"""

import sys
import uvicorn

if __name__ == "__main__":
    port = 8008
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    print(f"🚀 Starting TemplateCraft Studio on http://localhost:{port}")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
