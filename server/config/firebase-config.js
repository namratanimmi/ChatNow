import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Parse the Firebase service account JSON from the environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

const app = initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth(app);
export default auth;