pnpm --filter @workspace/mobile dev

cd artifacts/api-server && pnpm run build && (set -a; source ../../.env; set +a; NODE_ENV=development node --enable-source-maps ./dist/index.mjs)

cd /home/ptspl03/Downloads/Health-Companion && export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20.20.2 && pnpm --filter @workspace/mobile dev