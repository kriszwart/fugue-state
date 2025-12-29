# Local Google Cloud Credentials (DO NOT COMMIT)

This folder is **gitignored** and intended only for local development.

## Where to put your service account key

Put your JSON key here:

- `.gcp/keys/fuguestate-service-account.json`

## How to use it locally

Export this environment variable in your shell (recommended in `~/.zshrc`):

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/.gcp/keys/fuguestate-service-account.json"
```

Then restart your dev server.

## Notes

- Never commit the JSON key.
- For Cloud Run, you typically **do not** use JSON key files; Cloud Run uses a service account identity.


