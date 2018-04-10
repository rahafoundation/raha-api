
// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
const verifyFirebaseIdToken = admin => async (ctx, next) => {
    console.log('Check if request is authorized with Firebase ID token');

    const { headers, cookies } = ctx;

    if ((!headers.authorization || !headers.authorization.startsWith('Bearer ')) &&
            !cookies.__session) {
        console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.',
            'Make sure you authorize your request by providing the following HTTP header:',
            'Authorization: Bearer <Firebase ID Token>',
            'or by passing a "__session" cookie.');
        ctx.status = 403;
        ctx.body = 'Unauthorized.';
        return;
    }

    let idToken;
    if (headers.authorization && headers.authorization.startsWith('Bearer ')) {
        // Read the ID Token from the Authorization header.
        idToken = headers.authorization.split('Bearer ')[1];
    } else {
        // Read the ID Token from cookie.
        idToken = cookies.__session;
    }
    try {
        const decodedIdToken = await admin.auth().verifyIdToken(idToken);
        ctx.state.user = decodedIdToken;
        return await next();
    } catch (error) {
        console.error('Error while verifying Firebase ID token:', error);
        ctx.status = 403;
        ctx.body = 'Unauthorized.';
    }
};

export {
    verifyFirebaseIdToken,
};
