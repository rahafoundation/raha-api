export const config = {
  apiBase: "https://raha-5395e.appspot.com/api/",
  appBase: "https://web.raha.app",
  privateVideoBucket: "raha-5395e.appspot.com",
  publicVideoBucket: "raha-video",
  firebase: {
    apiKey: "AIzaSyBXuACowZcLcr1wlhM53LHtibFwa59EmAY",
    authDomain: "web.raha.app",
    databaseURL: "https://raha-5395e.firebaseio.com",
    projectId: "raha-5395e",
    storageBucket: "raha-5395e.appspot.com",
    messagingSenderId: "677137485282"
  },
  twilio: {
    accountSid: "ACbc19d0bd410b8850b3172e3230ade426",
    messagingServiceSid: "MG90714479d4b405a524a4a6ccd2f9bf7d",
    fromNumber: "+16572377242"
  },
  debugNumbers: ["+14255555555"]
};
export type Config = typeof config;
