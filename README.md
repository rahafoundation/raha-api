# Make sure you have gcloud installed
1. Install gcloud: `brew cask install google-cloud-sdk`
1. Initialize gcloud: `gcloud init`

# Running locally
1. Run server: `yarn test <path to service account credentials>`
1. If you don't have service account credentials, follow the instructions at:
https://firebase.google.com/docs/admin/setup#add_firebase_to_your_app. DO NOT
COMMIT THESE CREDENTIALS.
1. If you receive an error about default application credentials:
`gcloud auth application-default login`

# Deploy Instructions
1. Deploy: `yarn deploy`
