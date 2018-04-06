const Koa = require('koa');
const cors = require('@koa/cors');

const { admin } = require('./firebaseAdmin');
const { verifyFirebaseIdToken } = require('./verifyFirebaseIdToken');

const app = new Koa();

app.use(cors());

app.use(verifyFirebaseIdToken);

app.use(async ctx => {
    // const db = admin.database();
    // const members = db.collections('members');
    ctx.body = ctx.url + ' ' + ctx.state.user; // + ' ' + members;
});

// app.use(async ctx => {
//     if (ctx.url === '/trust' && ctx.method === 'POST') {
//     }
// })

app.listen(process.env.PORT || 3000);