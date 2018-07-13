# server/

API server. Entry point is `app.ts`.

Should not directly refer to stuff in `client/`—any code shared between them
ought to be in `shared/`.
