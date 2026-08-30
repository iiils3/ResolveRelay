# Netlify migration status

ResolveRelay is being migrated away from AppDeploy runtime dependencies.

- Frontend API compatibility shim: added.
- Netlify Function routes: added under `netlify/functions/api.mts`.
- Supabase remains the persistent data/auth backend.
- AI functions use `OPENAI_API_KEY` from Netlify environment variables and default to `gpt-5.6-luna` unless `OPENAI_MODEL` is changed.
- Netlify build output: `dist`.

The legacy `backend/` folder is retained temporarily as migration reference and is not used by the Netlify runtime.
