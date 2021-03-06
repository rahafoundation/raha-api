import { Config } from "./prod.config";

export const config: Config = {
  apiBase: "https://raha-test.appspot.com/api/",
  appBase: "https://next.raha.app",
  privateVideoBucket: "raha-test.appspot.com",
  publicVideoBucket: "raha-video-test",
  firebase: {
    apiKey: "AIzaSyDz4sg33FdGUEAawsbnJDf6GKs8TPt5inU",
    authDomain: "raha-test.firebaseapp.com",
    databaseURL: "https://raha-test.firebaseio.com",
    projectId: "raha-test",
    storageBucket: "raha-test.appspot.com",
    messagingSenderId: "148482003030"
  },
  twilio: {
    accountSid: "ACbc19d0bd410b8850b3172e3230ade426",
    messagingServiceSid: "MG90714479d4b405a524a4a6ccd2f9bf7d",
    fromNumber: "+16572377242"
  },
  sendGrid: {
    appRegistrationListId: "5460644",
    updateNewsletterListId: "5460649"
  },
  debugNumbers: [
    "+14405555555",
    "+14406231005",
    "+14255555555",
    "+15555555555",
    "+16505555555"
  ],
  discourseBase: "https://discuss.raha.app/"
};

export { Config } from "./prod.config";
