import * as admin from "firebase-admin";

// tslint:disable-next-line:no-var-requires
const config = require("./config/config.json");

export function getAdmin(credentialsPath?: string) {
  if (process.env.NODE_ENV === "test" && credentialsPath) {
    const serviceAccount = require(credentialsPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      ...config.firebase
    });
  } else {
    admin.initializeApp(config.firebase);
  }
  return admin;
}
