"""Run inside an already-built Docker image with --network none; stdlib only."""
import subprocess
import sys
import time
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests'))
from test_container import main as smoke, request


def main():
    process = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8020', '--workers', '1', '--no-access-log'], cwd=str(ROOT))
    try:
        for _ in range(100):
            if process.poll() is not None:
                raise RuntimeError('Server failed to start')
            try:
                request('/api/health').close()
                break
            except OSError:
                time.sleep(.1)
        else:
            raise RuntimeError('Server readiness timed out')
        response = request('/')
        assert "connect-src 'self'" in response.headers['Content-Security-Policy']
        response.close()
        smoke()
        print('Offline container passed with Docker networking disabled: no external runtime service is required.')
    finally:
        process.terminate()
        process.wait(timeout=10)

if __name__ == '__main__':
    main()
