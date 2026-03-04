#!/usr/bin/env bash
# ============================================================================
#  VMS Deploy Script
#  Deploys the Visitor Management System to a remote server via Docker Compose.
#
#  Usage:
#    ./deploy.sh              # Full deploy (sync + build + up)
#    ./deploy.sh --sync-only  # Only sync files, don't rebuild
#    ./deploy.sh --restart    # Restart containers without rebuilding
#    ./deploy.sh --logs       # Tail live logs from the remote server
#    ./deploy.sh --status     # Show container status on remote server
#    ./deploy.sh --ssh        # Open an SSH session to the server
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
#  Configuration
# ---------------------------------------------------------------------------
REMOTE_USER="ubuntu"
REMOTE_HOST="54.147.174.234"
SSH_KEY="$HOME/Downloads/vms.pem"
REMOTE_DIR="/home/ubuntu/vms"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# SSH / SCP common options
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no -o ConnectTimeout=10"
REMOTE="${REMOTE_USER}@${REMOTE_HOST}"

# ---------------------------------------------------------------------------
#  Colors & helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ---------------------------------------------------------------------------
#  Pre‑flight checks
# ---------------------------------------------------------------------------
preflight() {
    info "Running pre-flight checks…"

    # Check SSH key exists
    if [[ ! -f "${SSH_KEY}" ]]; then
        error "SSH key not found at ${SSH_KEY}"
    fi

    # Ensure correct permissions on the key
    local perms
    perms=$(stat -f "%Lp" "${SSH_KEY}" 2>/dev/null || stat -c "%a" "${SSH_KEY}" 2>/dev/null)
    if [[ "${perms}" != "400" && "${perms}" != "600" ]]; then
        warn "Fixing SSH key permissions (${perms} → 400)"
        chmod 400 "${SSH_KEY}"
    fi

    # Check rsync is available
    command -v rsync >/dev/null 2>&1 || error "rsync is required but not installed."

    # Quick SSH connectivity test
    info "Testing SSH connection to ${REMOTE}…"
    ssh ${SSH_OPTS} "${REMOTE}" "echo 'connection ok'" >/dev/null 2>&1 \
        || error "Cannot connect to ${REMOTE}. Check your key and security group."

    success "Pre-flight checks passed."
}

# ---------------------------------------------------------------------------
#  Ensure Docker & Docker Compose are installed on the remote
# ---------------------------------------------------------------------------
setup_remote() {
    info "Ensuring Docker is installed on the remote server…"

    ssh ${SSH_OPTS} "${REMOTE}" bash -s <<'REMOTE_SETUP'
set -euo pipefail

if ! command -v docker &>/dev/null; then
    echo "[REMOTE] Installing Docker…"
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker.io docker-compose-plugin
    sudo systemctl enable --now docker
    sudo usermod -aG docker "$USER"
    echo "[REMOTE] Docker installed. You may need to re-login for group changes."
else
    echo "[REMOTE] Docker is already installed."
fi

# Ensure docker compose (v2 plugin) or docker-compose (v1) is available
if docker compose version &>/dev/null; then
    echo "[REMOTE] Docker Compose v2 plugin detected."
elif command -v docker-compose &>/dev/null; then
    echo "[REMOTE] docker-compose v1 detected."
else
    echo "[REMOTE] Installing docker-compose…"
    sudo apt-get install -y -qq docker-compose-plugin 2>/dev/null \
        || sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
            -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose
fi
REMOTE_SETUP

    success "Remote Docker setup verified."
}

# ---------------------------------------------------------------------------
#  Sync project files to the remote server
# ---------------------------------------------------------------------------
sync_files() {
    info "Syncing project files to ${REMOTE}:${REMOTE_DIR}…"

    # Create remote directory if it doesn't exist
    ssh ${SSH_OPTS} "${REMOTE}" "mkdir -p ${REMOTE_DIR}"

    rsync -avz --progress --delete \
        --exclude '.git' \
        --exclude 'node_modules' \
        --exclude '__pycache__' \
        --exclude '.venv' \
        --exclude 'venv' \
        --exclude '.env' \
        --exclude '*.db' \
        --exclude 'dist' \
        --exclude '.DS_Store' \
        --exclude '.idea' \
        --exclude '.vscode' \
        --exclude 'app/storage/faces/*' \
        -e "ssh ${SSH_OPTS}" \
        "${PROJECT_DIR}/" "${REMOTE}:${REMOTE_DIR}/"

    success "Files synced."
}

# ---------------------------------------------------------------------------
#  Build & deploy containers on the remote
# ---------------------------------------------------------------------------
deploy() {
    info "Building and starting containers on the remote server…"

    ssh ${SSH_OPTS} "${REMOTE}" bash -s <<REMOTE_DEPLOY
set -euo pipefail
cd ${REMOTE_DIR}

# Use whichever compose command is available
if docker compose version &>/dev/null; then
    COMPOSE="docker compose"
else
    COMPOSE="docker-compose"
fi

echo "[REMOTE] Pulling base images…"
\$COMPOSE pull --ignore-pull-failures 2>/dev/null || true

echo "[REMOTE] Building images…"
\$COMPOSE build --no-cache

echo "[REMOTE] Starting services…"
\$COMPOSE up -d --force-recreate --remove-orphans

echo ""
echo "[REMOTE] === Container Status ==="
\$COMPOSE ps
echo ""
echo "[REMOTE] Deploy complete! 🚀"
REMOTE_DEPLOY

    success "Deployment finished."
    echo ""
    info "Your app should be available at:"
    echo -e "  ${GREEN}https://smartvisit.io${NC}"
    echo ""
}

# ---------------------------------------------------------------------------
#  Restart containers (no rebuild)
# ---------------------------------------------------------------------------
restart() {
    info "Restarting containers on the remote server…"

    ssh ${SSH_OPTS} "${REMOTE}" bash -s <<REMOTE_RESTART
set -euo pipefail
cd ${REMOTE_DIR}
if docker compose version &>/dev/null; then
    docker compose restart
    docker compose ps
else
    docker-compose restart
    docker-compose ps
fi
REMOTE_RESTART

    success "Containers restarted."
}

# ---------------------------------------------------------------------------
#  Tail remote logs
# ---------------------------------------------------------------------------
logs() {
    info "Tailing logs from ${REMOTE} (Ctrl+C to stop)…"
    ssh ${SSH_OPTS} -t "${REMOTE}" \
        "cd ${REMOTE_DIR} && (docker compose logs -f --tail 100 2>/dev/null || docker-compose logs -f --tail 100)"
}

# ---------------------------------------------------------------------------
#  Show remote container status
# ---------------------------------------------------------------------------
status() {
    info "Container status on ${REMOTE}:"
    ssh ${SSH_OPTS} "${REMOTE}" \
        "cd ${REMOTE_DIR} && (docker compose ps 2>/dev/null || docker-compose ps)"
}

# ---------------------------------------------------------------------------
#  Open SSH session
# ---------------------------------------------------------------------------
ssh_session() {
    info "Opening SSH session to ${REMOTE}…"
    ssh ${SSH_OPTS} -t "${REMOTE}"
}

# ---------------------------------------------------------------------------
#  Main
# ---------------------------------------------------------------------------
main() {
    local cmd="${1:-deploy}"

    case "${cmd}" in
        --sync-only)
            preflight
            sync_files
            ;;
        --restart)
            preflight
            restart
            ;;
        --logs)
            preflight
            logs
            ;;
        --status)
            preflight
            status
            ;;
        --ssh)
            preflight
            ssh_session
            ;;
        --help|-h)
            head -n 12 "$0" | tail -n +2 | sed 's/^#/ /g'
            ;;
        deploy|*)
            preflight
            setup_remote
            sync_files
            deploy
            ;;
    esac
}

main "$@"
