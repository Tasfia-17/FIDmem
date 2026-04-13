#!/usr/bin/env bash
# FIDmem quick setup — run this once to go from zero to running
set -e

echo ""
echo "FIDmem Setup"
echo "============"
echo ""

# 1. Check dependencies
command -v node >/dev/null || { echo "ERROR: Node.js 22+ required"; exit 1; }
command -v pnpm >/dev/null || npm install -g pnpm

if ! command -v turso >/dev/null 2>&1; then
  echo "Installing Turso CLI..."
  curl -sSfL https://get.tur.so/install.sh | bash
  # Source the updated PATH so turso is available in this script
  export PATH="$HOME/.turso:$PATH"
fi

# 2. Install packages
echo "Installing packages..."
pnpm install

# 3. Create Turso DB
echo ""
echo "Creating Turso database..."
turso db create fidmem 2>/dev/null || echo "DB already exists"
turso db shell fidmem < schema.sql
DB_URL=$(turso db show fidmem --url)
DB_TOKEN=$(turso db tokens create fidmem)

# 4. Write API .env
cat > api/.env << EOF
TURSO_DATABASE_URL=$DB_URL
TURSO_AUTH_TOKEN=$DB_TOKEN
NEYNAR_API_KEY=${NEYNAR_API_KEY:-your_neynar_key_here}
BASE_RPC_URL=https://mainnet.base.org
PAYMENT_WALLET=${PAYMENT_WALLET:-0x0000000000000000000000000000000000000001}
ENVIRONMENT=development
EOF

# 5. Write Snap .env
cat > snap/.env << EOF
FIDMEM_API_URL=http://localhost:8787
SNAP_PUBLIC_BASE_URL=http://localhost:3003
SKIP_JFS_VERIFICATION=1
PORT=3003
EOF

echo ""
echo "Done! api/.env and snap/.env are configured."
echo ""

if [ "${NEYNAR_API_KEY:-}" = "" ]; then
  echo "⚠️  IMPORTANT: Edit api/.env and set your NEYNAR_API_KEY"
  echo "   Get one free at: https://dev.neynar.com"
  echo ""
fi

echo "Next steps:"
echo "  1. Run the API and Snap (in separate terminals or use pnpm dev):"
echo "     pnpm dev"
echo ""
echo "  2. Grant demo agent access (replace 12345 with your FID):"
echo "     # Grant Agent Alice (agent_id=1) read+write access:"
echo "     curl -X POST http://localhost:8787/memory/12345/access \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -H 'x-agent-id: self' \\"
echo "       -H 'x-agent-fid: 12345' \\"
echo "       -d '{\"agent_id\":\"1\",\"can_read\":true,\"can_write\":true}'"
echo ""
echo "     # Grant Agent Bob (agent_id=2) read+write access:"
echo "     curl -X POST http://localhost:8787/memory/12345/access \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -H 'x-agent-id: self' \\"
echo "       -H 'x-agent-fid: 12345' \\"
echo "       -d '{\"agent_id\":\"2\",\"can_read\":true,\"can_write\":true}'"
echo ""
echo "  3. Run Agent Alice:"
echo "     cd demo-agents/agent-alice"
echo "     OWNER_FID=12345 AGENT_ID=1 AGENT_FID=99999 pnpm start"
echo ""
echo "  4. Run Agent Bob (reads Alice's memories via cross-agent sharing):"
echo "     cd demo-agents/agent-bob"
echo "     OWNER_FID=12345 AGENT_ID=2 AGENT_FID=88888 pnpm start"
echo ""
echo "  5. Deploy to production:"
echo "     cd api && wrangler deploy --env production"
echo "     (Set secrets first: wrangler secret put TURSO_DATABASE_URL --env production, etc.)"
