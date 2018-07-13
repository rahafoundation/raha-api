# server/

API server. Entry point is `app.ts`.

Should not directly refer to stuff in `client/`—any code shared between them
ought to be in `shared/`.

## Setup

### Make sure you have gcloud installed

1.  Install gcloud: `brew cask install google-cloud-sdk`
1.  Initialize gcloud: `gcloud init`

### Install Node deps

```bash
yarn install
```

## Running locally

1.  Run server: `yarn build && yarn test <path to service account credentials>`
1.  If you don't have service account credentials, follow the instructions at:
    https://firebase.google.com/docs/admin/setup#add_firebase_to_your_app. DO NOT
    COMMIT THESE CREDENTIALS.
1.  If you receive an error about default application credentials:
    `gcloud auth application-default login`

## Acquiring Coconut API key

We use [Coconut](https://app.coconut.co) to handle encoding our videos. Coconut
requires an API key which we include in the `./src/data/DO_NOT_COMMIT.secrets.config.ts`
file with the following structure:

```
{
    "coconutApiKey": <api_key>
}
```

This file must be present to deploy raha-api or run it locally. Until we have
a better key management system, you will have to create this file yourself.
Ask @rahulgi for the key.

## Deploy Instructions

1.  Deploy: `yarn deploy-<prod/test>`