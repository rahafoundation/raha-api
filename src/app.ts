#!/usr/bin/env node

import path from 'path';

import Koa from 'koa';
import cors from '@koa/cors';
import Router from 'koa-router';

import { getAdmin } from './firebaseAdmin';
import  { verifyFirebaseIdToken } from './verifyFirebaseIdToken';

let admin;
if (process.env.NODE_ENV === 'test' && process.argv.length > 2) {
    const credentialsPathArg = process.argv[2];
    if (path.isAbsolute(credentialsPathArg)) {
        admin = getAdmin(credentialsPathArg);
    } else {
        // Resolve the path relative to the cwd.
        admin = getAdmin(path.resolve(path.join(process.cwd(), credentialsPathArg)));
    }
} else {
    admin = getAdmin();
}

const db = admin.firestore();
const members = db.collection('members');
const operations = db.collection('operations');

const app = new Koa();

app.use(cors());

// Put endpoints that don't need the user to be authenticated above this.
app.use(verifyFirebaseIdToken(admin));
// Put endpoints that do need the user to be authenticated below this.

const authenticatedRouter = new Router()
    .param('mid', async (mid, ctx, next) => {
        const midQuery = (await members.where('mid', '==', mid).get());
        if (midQuery.empty) {
            ctx.status = 404;
            return;
        }
        ctx.state.toMember = midQuery.docs[0];
        return await next();
    })
    .post('/api/members/:mid/trust', async ctx => {
        const authUid = ctx.state.user.uid;
        const authMember = await members.doc(authUid).get();
        try {
            const newOperation = await operations.add({
                creator_mid: authMember.get('mid'),
                creator_uid: authUid,
                op_code: 'TRUST',
                data: {
                    to_mid: ctx.state.toMember.get('mid'),
                    to_uid: ctx.state.toMember.id,
                },
            });
            ctx.body = newOperation;
            ctx.status = 201;
            return;
        } catch (error) {
            ctx.body = error;
            ctx.status = 500;
        }
    });

app.use(authenticatedRouter.routes());
app.use(authenticatedRouter.allowedMethods());

app.listen(process.env.PORT || 3000);
