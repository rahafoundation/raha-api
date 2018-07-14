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
  twilioSid: "ACbc19d0bd410b8850b3172e3230ade426",
  debugNumbers: []
};
