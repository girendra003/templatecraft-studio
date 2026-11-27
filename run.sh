#!/usr/bin/env bash
# ==============================================================================
# TemplateCraft Studio - Unified Project Launcher
# ==============================================================================
# Usage:
#   ./run.sh            Run the full application (builds UI if needed, serves on http://localhost:8008)
#   ./run.sh dev        Run backend (port 8008) & Vite dev server (port 5173) with hot reload
#   ./run.sh build      Install frontend dependencies and build production assets
#   ./run.sh install    Install Python and Node dependencies
#   ./run.sh test       Run Python regressions and frontend typecheck
#   ./run.sh 8080       Run on custom port (e.g. 8080)
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Determine Python command
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
else
    echo -e "${RED}❌ Python 3 is not installed or not in PATH.${NC}"
    exit 1
fi

check_python_deps() {
    if ! $PYTHON_CMD -c "import fastapi, uvicorn, fitz, pypdf" 2>/dev/null; then
        echo -e "${YELLOW}⚠️ Missing Python dependencies. Installing from requirements.txt...${NC}"
        $PYTHON_CMD -m pip install -r requirements.txt
    fi
}

check_node_deps() {
    if ! command -v npm >/dev/null 2>&1; then
        echo -e "${RED}❌ Node.js / npm is not installed or not in PATH.${NC}"
        exit 1
    fi
    if [ ! -d "frontend/node_modules" ]; then
        echo -e "${YELLOW}📦 Installing frontend dependencies (npm install)...${NC}"
        (cd frontend && npm install)
    fi
}

build_frontend() {
    check_node_deps
    echo -e "${BLUE}🔨 Building frontend...${NC}"
    (cd frontend && npm run build)
    echo -e "${GREEN}✓ Frontend build complete.${NC}"
}

run_install() {
    echo -e "${BLUE}📦 Installing all project dependencies...${NC}"
    check_python_deps
    check_node_deps
    echo -e "${GREEN}✓ All dependencies installed successfully.${NC}"
}

run_test() {
    check_python_deps
    check_node_deps
    echo -e "${BLUE}🧪 Running frontend typecheck...${NC}"
    (cd frontend && npm run typecheck)
    echo -e "${BLUE}🧪 Running Python test suite...${NC}"
    $PYTHON_CMD tests/test_pdf_import.py
    $PYTHON_CMD tests/test_document_edit.py
    $PYTHON_CMD tests/test_stamp_editor.py
    echo -e "${GREEN}✓ All tests passed successfully!${NC}"
}

run_dev() {
    check_python_deps
    check_node_deps
    local PORT="${2:-8008}"

    echo -e "${BLUE}======================================================${NC}"
    echo -e "${GREEN}🚀 Starting TemplateCraft Studio in DEVELOPMENT MODE${NC}"
    echo -e "   - Backend API:       ${YELLOW}http://localhost:${PORT}${NC}"
    echo -e "   - Frontend UI (Vite): ${YELLOW}http://localhost:5173${NC}"
    echo -e "   - Press ${RED}Ctrl+C${NC} to stop all servers"
    echo -e "${BLUE}======================================================${NC}"

    # Kill both processes on exit
    trap 'echo -e "\n🛑 Stopping servers..."; kill 0; exit' SIGINT SIGTERM EXIT

    # Start FastAPI backend
    $PYTHON_CMD run_server.py "$PORT" &
    BACKEND_PID=$!

    # Start Vite frontend dev server
    (cd frontend && npm run dev) &
    FRONTEND_PID=$!

    wait
}

run_prod() {
    local PORT="${1:-8008}"

    # If argument is numeric, use it as port
    if [[ "$1" =~ ^[0-9]+$ ]]; then
        PORT="$1"
    fi

    check_python_deps

    # Build frontend if react_dist does not exist or index.html is missing
    if [ ! -f "app/react_dist/index.html" ]; then
        echo -e "${YELLOW}ℹ️  React distribution not found. Building frontend first...${NC}"
        build_frontend
    fi

    echo -e "${BLUE}======================================================${NC}"
    echo -e "${GREEN}🚀 Starting TemplateCraft Studio${NC}"
    echo -e "   - App & API: ${YELLOW}http://localhost:${PORT}${NC}"
    echo -e "   - Press ${RED}Ctrl+C${NC} to stop server"
    echo -e "${BLUE}======================================================${NC}"

    exec $PYTHON_CMD run_server.py "$PORT"
}

# --- Command routing ---
MODE="${1:-}"

case "$MODE" in
    dev|--dev|-d)
        run_dev "$@"
        ;;
    build|--build|-b)
        build_frontend
        ;;
    install|--install|-i)
        run_install
        ;;
    test|--test|-t)
        run_test
        ;;
    help|--help|-h)
        echo "TemplateCraft Studio - Launcher"
        echo ""
        echo "Commands:"
        echo "  ./run.sh          Run full app on http://localhost:8008 (auto-builds UI if needed)"
        echo "  ./run.sh [PORT]   Run full app on custom port (e.g. ./run.sh 3000)"
        echo "  ./run.sh dev      Run backend + frontend dev server with hot-reload"
        echo "  ./run.sh build    Build frontend into app/react_dist"
        echo "  ./run.sh install  Install both Python and Node dependencies"
        echo "  ./run.sh test     Run Python regression tests and TypeScript typecheck"
        ;;
    *)
        run_prod "$@"
        ;;
esac
