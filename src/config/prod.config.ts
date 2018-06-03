const prodConfig = {
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
  }
};
export default prodConfig;
export type Config = typeof prodConfig;
