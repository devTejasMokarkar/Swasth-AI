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

## Notes

- Use `pnpm install` from the repo root.
- The mobile app lives in `artifacts/mobile`.
- The backend API server lives in `artifacts/api-server`.
- The root workspace does not have a top-level `dev` command, so run package scripts from the package folders.
