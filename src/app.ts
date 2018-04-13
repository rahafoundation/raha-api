#!/usr/bin/env node

import path from 'path';

import Koa from 'koa';
import cors from '@koa/cors';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';

import { getAdmin } from './firebaseAdmin';
import  { verifyFirebaseIdToken } from './verifyFirebaseIdToken';
import { firestore } from 'firebase-admin';

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
app.use(bodyParser());

const publicRouter = new Router()
    .get('/api/operations', async ctx => {
        // TODO: Do we need to paginate?
        const ops = await operations.orderBy('created_at').get();
        const parsedOps: Array<Object> = [];
        ops.forEach(op => parsedOps.push({
            id: op.id,
            creator_mid: op.get('creator_mid'),
            creator_uid: op.get('creator_uid'),
            op_code: op.get('op_code'),
            data: op.get('data'),
        }));
        ctx.body = JSON.stringify(parsedOps);
        ctx.status = 200;
        return;
    });

app.use(publicRouter.routes());
app.use(publicRouter.allowedMethods());

// Put endpoints that don't need the user to be authenticated above this.
app.use(verifyFirebaseIdToken(admin));
// Put endpoints that do need the user to be authenticated below this.

const authenticatedRouter = new Router()
    .param('uid', async (uid, ctx, next) => {
        const uidDoc = (await members.doc(uid).get());
        if (!uidDoc.exists) {
            ctx.status = 404;
            return;
        }
        ctx.state.toMember = uidDoc;
        return await next();
    })
    .post('/api/members/:uid/request_invite', async ctx => {
        const authUid = ctx.state.user.uid;
        const authMember = await members.doc(authUid).get();
        try {
            const newOperation = {
                creator_mid: authMember.get('mid'),
                creator_uid: authUid,
                op_code: 'REQUEST_INVITE',
                data: {
                    full_name: ctx.request.body.fullName,
                    to_mid: ctx.state.toMember.get('mid'),
                    to_uid: ctx.state.toMember.id,
                    video_url: ctx.request.body.videoUrl,
                },
                created_at: firestore.FieldValue.serverTimestamp(),
            };
            const newOperationDoc = await operations.add(newOperation);
            ctx.body = {
                ...(await newOperationDoc.get()).data(),
                id: newOperationDoc.id,
            }
            ctx.status = 201;
            return;
        } catch (error) {
            ctx.body = "An error occurred while creating this operation.";
            ctx.status = 500;
        }
    })
    .post('/api/members/:uid/trust', async ctx => {
        const authUid = ctx.state.user.uid;
        const authMember = await members.doc(authUid).get();
        try {
            const newOperation = {
                creator_mid: authMember.get('mid'),
                creator_uid: authUid,
                op_code: 'TRUST',
                data: {
                    to_mid: ctx.state.toMember.get('mid'),
                    to_uid: ctx.state.toMember.id,
                },
                created_at: firestore.FieldValue.serverTimestamp(),
            };
            const newOperationDoc = await operations.add(newOperation);
            ctx.body = {
                ...(await newOperationDoc.get()).data(),
                id: newOperationDoc.id,
            }
            ctx.status = 201;
            return;
        } catch (error) {
            ctx.body = "An error occurred while creating this operation.";
            ctx.status = 500;
        }
    });

app.use(authenticatedRouter.routes());
app.use(authenticatedRouter.allowedMethods());

app.listen(process.env.PORT || 3000);
