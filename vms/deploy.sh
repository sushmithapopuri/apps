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
    info "Ensuring Docker & Compose v2 are installed on the remote server…"

    ssh ${SSH_OPTS} "${REMOTE}" bash -s <<'REMOTE_SETUP'
set -euo pipefail

if ! command -v docker &>/dev/null; then
    echo "[REMOTE] Installing Docker…"
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker.io
    sudo systemctl enable --now docker
    sudo usermod -aG docker "$USER"
    echo "[REMOTE] Docker installed."
else
    echo "[REMOTE] Docker is already installed."
fi

# Ensure Docker Compose v2 plugin is available
# docker-compose v1 has a known 'ContainerConfig' KeyError bug with newer Docker engines
if docker compose version &>/dev/null; then
    echo "[REMOTE] Docker Compose v2 plugin OK: $(docker compose version)"
else
    echo "[REMOTE] Installing Docker Compose v2 plugin…"
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -oP '"tag_name": "\K[^"]+' || echo "v2.29.1")
    sudo mkdir -p /usr/local/lib/docker/cli-plugins
    sudo curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    echo "[REMOTE] Docker Compose v2 installed: $(docker compose version)"
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

    # rsync exit code 23 = partial transfer (e.g. permission denied on some deletes)
    # This is non-fatal — all source files still sync correctly.
    local rc=0
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
        --exclude '.dev-pids' \
        --exclude 'storage' \
        -e "ssh ${SSH_OPTS}" \
        "${PROJECT_DIR}/" "${REMOTE}:${REMOTE_DIR}/" || rc=$?

    if [[ $rc -eq 0 ]]; then
        success "Files synced."
    elif [[ $rc -eq 23 ]]; then
        warn "Files synced (some remote-only files could not be deleted — this is OK)."
    else
        error "rsync failed with exit code ${rc}"
    fi
}

# ---------------------------------------------------------------------------
#  Build & deploy containers on the remote
# ---------------------------------------------------------------------------
deploy() {
    info "Building and starting containers on the remote server…"

    # First, clean up old v1 containers that may conflict
    ssh ${SSH_OPTS} "${REMOTE}" bash -s <<REMOTE_CLEANUP
cd ${REMOTE_DIR}
# Stop and remove everything from previous docker-compose v1 runs
docker-compose down --remove-orphans 2>/dev/null || true
# Remove any leftover containers with vms in the name (including hash-prefixed v1 names)
docker ps -a --format '{{.Names}}' | grep -i vms | xargs -r docker rm -f 2>/dev/null || true
REMOTE_CLEANUP

    ssh ${SSH_OPTS} "${REMOTE}" bash -s <<REMOTE_DEPLOY
set -euo pipefail
cd ${REMOTE_DIR}

echo "[REMOTE] Pulling base images…"
docker compose pull --ignore-pull-failures 2>/dev/null || true

echo "[REMOTE] Building images…"
docker compose build --no-cache

echo "[REMOTE] Starting services…"
docker compose up -d --force-recreate --remove-orphans

echo ""
echo "[REMOTE] === Container Status ==="
docker compose ps
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
docker compose restart
docker compose ps
REMOTE_RESTART

    success "Containers restarted."
}

# ---------------------------------------------------------------------------
#  Tail remote logs
# ---------------------------------------------------------------------------
logs() {
    info "Tailing logs from ${REMOTE} (Ctrl+C to stop)…"
    ssh ${SSH_OPTS} -t "${REMOTE}" \
        "cd ${REMOTE_DIR} && docker compose logs -f --tail 100"
}

# ---------------------------------------------------------------------------
#  Show remote container status
# ---------------------------------------------------------------------------
status() {
    info "Container status on ${REMOTE}:"
    ssh ${SSH_OPTS} "${REMOTE}" \
        "cd ${REMOTE_DIR} && docker compose ps"
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
