// Creates the first Bestuur account (Firebase Auth user + Firestore profile).
// Run this once after `npm run seed`. Every account after this one can be
// created the same way, or by a Bestuur member from the "Leden beheren"
// screen once you build out an invite Cloud Function (see README).
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
//     node scripts/create-admin.mjs "Naam" naam@voorbeeld.nl wachtwoord123
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'node:fs';

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password) {
  console.error('Usage: node scripts/create-admin.mjs "Naam" email@voorbeeld.nl wachtwoord');
  process.exit(1);
}

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './serviceAccountKey.json';
const app = existsSync(keyPath)
  ? initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) })
  : initializeApp({ credential: applicationDefault() });

const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  const user = await auth.createUser({ email, password, displayName: name });
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    name,
    email,
    roleId: 'bestuur',
    active: true,
  });
  console.log(`Created Bestuur account for ${name} <${email}> (uid: ${user.uid}).`);
}

run().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
