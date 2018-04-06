const admin = require('firebase-admin');
admin.initializeApp(require('./config/firebase.config.json'));

export {
    admin
};