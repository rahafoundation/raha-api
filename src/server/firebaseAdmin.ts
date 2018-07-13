import * as admin from "firebase-admin";
import { config } from "./config/config";

export function getAdmin(credentialsPath?: string) {
  if (process.env.NODE_ENV === "test" && credentialsPath) {
    const serviceAccount = require(credentialsPath);
    const adminConfig = {
      credential: admin.credential.cert(serviceAccount),
      ...config.firebase
    };
    admin.initializeApp(adminConfig);
  } else {
    admin.initializeApp(config.firebase);
  }
  return admin;
}
