const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();

/**
 * Initialize Firebase Admin SDK using environment variables.
 * Required for verifying Google Sign-In ID tokens.
 */
function initializeFirebase() {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.warn('⚠️  Firebase credentials not configured — Firebase auth will use Google OAuth client fallback');
      return;
    }

    if (admin.getApps && admin.getApps().length > 0) return;

    // Handle escaped newlines and quotes in private key
    if (typeof privateKey === 'string') {
      privateKey = privateKey.trim();
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    const credentialObj = admin.credential
      ? admin.credential.cert({ projectId, clientEmail, privateKey })
      : null;

    if (credentialObj) {
      admin.initializeApp({ credential: credentialObj });
    } else {
      admin.initializeApp({
        projectId,
        clientEmail,
        privateKey,
      });
    }
  } catch (error) {
    console.warn('⚠️  Firebase Admin Init Warning:', error.message);
  }
}

/**
 * Verify a Google ID token from Google Sign-In.
 * Supports standard Google OAuth2 ID tokens as well as Firebase tokens.
 * @param {string} idToken - The Google ID token
 * @returns {Promise<{ uid: string, email: string, name?: string, picture?: string }>}
 */
async function verifyGoogleToken(idToken) {
  // First attempt: Standard Google ID Token verification (works with Flutter google_sign_in)
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
    });
    const payload = ticket.getPayload();
    if (payload && payload.sub && payload.email) {
      return {
        uid: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
    }
  } catch (googleErr) {
    // If standard verification fails, fallback to Firebase Admin Auth
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      };
    } catch {
      throw googleErr;
    }
  }
  throw new Error('Gagal memverifikasi token Google');
}

module.exports = { initializeFirebase, verifyGoogleToken };

