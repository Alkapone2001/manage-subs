Fly.io deployment (recommended)

1) Install `flyctl`: https://fly.io/docs/getting-started/installing-flyctl/

2) Login and create app (pick a region):

```bash
flyctl auth login
flyctl launch --name subscription-manager --no-deploy
```

3) Create a persistent volume for SQLite (1 GB recommended):

```bash
flyctl volumes create data --size 1 --region <your-region> --app subscription-manager
```

4) Set secrets (SMTP, admin, session secret) — do NOT commit these to the repo:

```bash
flyctl secrets set EMAIL_HOST=... EMAIL_PORT=587 EMAIL_USER=... EMAIL_PASS=... \
  EMAIL_FROM=... ADMIN_EMAIL=... SESSION_SECRET=... ADMIN_USER=admin ADMIN_PASS=secret --app subscription-manager
```

5) Deploy:

```bash
flyctl deploy --app subscription-manager
```

6) View logs and open the app:

```bash
flyctl logs --app subscription-manager
flyctl open --app subscription-manager
```

Notes:
- The `fly.toml` in the repo includes a `[[mounts]]` entry that expects a volume named `data`.
- If you prefer another host, see README for alternatives. Fly.io is recommended because it supports always-on processes and persistent volumes.
