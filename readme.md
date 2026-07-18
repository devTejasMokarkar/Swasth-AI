# Health Companion

## Setup

```bash
cd /home/ptspl03/Downloads/Health-Companion
pnpm install
```

## Run the mobile app

```bash
pnpm --filter ./artifacts/mobile dev
```

## Run the API server

```bash
pnpm --filter ./artifacts/api-server dev
```

## Testing the Chat endpoint (Swasthai)

Quick curl example (server must be running locally on port 3000):

```bash
curl -X POST http://localhost:3000/api/chat \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer dev_test_user" \
	-d '{"message":"Hi Swasthai, any tips for staying hydrated?"}'
```

Or use the provided helper script:

```bash
./scripts/test-chat.sh "Hi Swasthai, any tips for staying hydrated?" http://localhost:3000 dev_test_user
```

The endpoint returns JSON: `{ "reply": "...", "tokensUsed": 123 }` on success.

## Notes

- Use `pnpm install` from the repo root.
- The mobile app lives in `artifacts/mobile`.
- The backend API server lives in `artifacts/api-server`.
- The root workspace does not have a top-level `dev` command, so run package scripts from the package folders.
