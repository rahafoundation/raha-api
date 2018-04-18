import admin from "firebase-admin";

const config = require("./config/firebase.config.json");

function getAdmin(credentialsPath?: string) {
  if (process.env.NODE_ENV === "test" && credentialsPath) {
    const serviceAccount = require(credentialsPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      ...config
    });
  } else {
    admin.initializeApp(config);
  }
  return admin;
}

export { getAdmin };
