#!/usr/bin/env bash
# ============================================================================
#  VMS Local Development Script
#  Starts both backend (FastAPI) and frontend (Vite) for local development.
#
#  Usage:
#    ./dev.sh              # Start both backend & frontend
#    ./dev.sh --backend    # Start backend only
#    ./dev.sh --frontend   # Start frontend only
#    ./dev.sh --setup      # First-time setup (install all dependencies)
#    ./dev.sh --stop       # Stop all running dev processes
#
#  Default credentials:
#    Email:    admin@vms.com
#    Password: admin123
# ============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="${PROJECT_DIR}/backend"
FRONTEND_DIR="${PROJECT_DIR}/frontend"
PID_DIR="${PROJECT_DIR}/.dev-pids"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── Dependency checks ────────────────────────────────────────────────

check_python() {
    if command -v python3 &>/dev/null; then
        PYTHON=python3
    elif command -v python &>/dev/null; then
        PYTHON=python
    else
        error "Python 3 is not installed. Please install Python 3.11+."
    fi

    local ver
    ver=$($PYTHON --version 2>&1 | awk '{print $2}')
    info "Python: $ver"
}

check_node() {
    if ! command -v node &>/dev/null; then
        error "Node.js is not installed. Please install Node.js 18+."
    fi
    info "Node: $(node --version)"
}

check_poetry() {
    if ! command -v poetry &>/dev/null; then
        warn "Poetry not found. Installing poetry..."
        pip3 install poetry 2>/dev/null || $PYTHON -m pip install poetry
    fi
    info "Poetry: $(poetry --version 2>&1)"
}

# ─── Setup ─────────────────────────────────────────────────────────────

setup() {
    info "Setting up development environment..."
    echo ""

    check_python
    check_node
    check_poetry

    echo ""
    info "Installing backend dependencies..."
    cd "${BACKEND_DIR}"
    poetry install --no-root
    success "Backend dependencies installed."

    echo ""
    info "Installing frontend dependencies..."
    cd "${FRONTEND_DIR}"
    npm install
    success "Frontend dependencies installed."

    echo ""
    info "Running database migrations..."
    cd "${BACKEND_DIR}"
    poetry run $PYTHON migrate.py
    success "Database ready."

    echo ""
    echo -e "  ${GREEN}${BOLD}Setup complete!${NC}"
    echo ""
    echo -e "  Run ${CYAN}./dev.sh${NC} to start the app."
    echo -e "  Default login: ${BOLD}admin@vms.com${NC} / ${BOLD}admin123${NC}"
    echo ""
}

# ─── Process management ───────────────────────────────────────────────

mkdir -p "${PID_DIR}" 2>/dev/null || true

save_pid() {
    echo "$2" > "${PID_DIR}/$1.pid"
}

stop_all() {
    info "Stopping dev processes..."
    local stopped=0

    for pidfile in "${PID_DIR}"/*.pid; do
        [ -f "$pidfile" ] || continue
        local pid
        pid=$(cat "$pidfile")
        local name
        name=$(basename "$pidfile" .pid)
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            # Also kill child processes
            pkill -P "$pid" 2>/dev/null || true
            success "Stopped ${name} (pid ${pid})"
            stopped=$((stopped + 1))
        fi
        rm -f "$pidfile"
    done

    # Also stop any lingering uvicorn/vite processes for this project
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "vite.*${FRONTEND_DIR}" 2>/dev/null || true

    if [ $stopped -eq 0 ]; then
        info "No running dev processes found."
    fi
}

# ─── Start backend ────────────────────────────────────────────────────

start_backend() {
    info "Starting backend (FastAPI + Uvicorn) on port 8000..."

    cd "${BACKEND_DIR}"

    # Run migrations first
    poetry run $PYTHON migrate.py 2>&1 | while IFS= read -r line; do
        echo -e "  ${CYAN}[migrate]${NC} $line"
    done

    # Export API keys for local development
    export FAST2SMS_API_KEY="${FAST2SMS_API_KEY:-GYsRM628eDIrtinLE1NaWSlz0FBZCg7pyPJdcT3mxAuvVXfhUkxLGXP6Ja8tpFMHfjOABgskINw7leUi}"

    # Start uvicorn in background
    poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    local pid=$!
    save_pid "backend" "$pid"

    # Wait a moment for startup
    sleep 2

    if kill -0 "$pid" 2>/dev/null; then
        success "Backend running at ${BOLD}http://localhost:8000${NC}  (pid ${pid})"
        echo -e "        API docs: ${CYAN}http://localhost:8000/docs${NC}"
    else
        error "Backend failed to start. Check the output above."
    fi
}

# ─── Start frontend ───────────────────────────────────────────────────

start_frontend() {
    info "Starting frontend (Vite) on port 5173..."

    cd "${FRONTEND_DIR}"

    npm run dev &
    local pid=$!
    save_pid "frontend" "$pid"

    sleep 2

    if kill -0 "$pid" 2>/dev/null; then
        success "Frontend running at ${BOLD}http://localhost:5173${NC}  (pid ${pid})"
    else
        error "Frontend failed to start. Check the output above."
    fi
}

# ─── Main ──────────────────────────────────────────────────────────────

main() {
    local cmd="${1:-all}"

    echo ""
    echo -e "  ${BOLD}╔══════════════════════════════════════╗${NC}"
    echo -e "  ${BOLD}║   VMS Local Development Server       ║${NC}"
    echo -e "  ${BOLD}╚══════════════════════════════════════╝${NC}"
    echo ""

    case "${cmd}" in
        --setup|setup)
            setup
            ;;
        --backend|backend)
            check_python
            check_poetry
            stop_all
            start_backend
            echo ""
            info "Press Ctrl+C to stop."
            wait
            ;;
        --frontend|frontend)
            check_node
            stop_all
            start_frontend
            echo ""
            info "Press Ctrl+C to stop."
            wait
            ;;
        --stop|stop)
            stop_all
            ;;
        --help|-h)
            head -n 17 "$0" | tail -n +2 | sed 's/^#/ /g'
            ;;
        all|*)
            check_python
            check_node
            check_poetry

            # Stop any previous instances
            stop_all 2>/dev/null || true

            echo ""
            start_backend
            echo ""
            start_frontend

            echo ""
            echo -e "  ${GREEN}${BOLD}Both services are running!${NC}"
            echo ""
            echo -e "  Frontend:  ${BOLD}http://localhost:5173${NC}"
            echo -e "  Backend:   ${BOLD}http://localhost:8000${NC}"
            echo -e "  API Docs:  ${CYAN}http://localhost:8000/docs${NC}"
            echo ""
            echo -e "  Login with: ${BOLD}admin@vms.com${NC} / ${BOLD}admin123${NC}"
            echo ""
            echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services."
            echo ""

            # Handle Ctrl+C gracefully
            trap 'echo ""; info "Shutting down..."; stop_all; exit 0' INT TERM

            # Wait for background processes
            wait
            ;;
    esac
}

main "$@"
