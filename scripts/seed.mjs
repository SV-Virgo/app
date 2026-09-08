// One-time / idempotent seed for a fresh Firebase project.
// Usage: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/seed.mjs
// See README.md "Firebase project setup" for how to get that key.
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'node:fs';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './serviceAccountKey.json';
const app = existsSync(keyPath)
  ? initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) })
  : initializeApp({ credential: applicationDefault() });

const db = getFirestore(app);
const now = Date.now();

const ALL_PERMISSIONS = [
  'screens.home', 'screens.ruimtes', 'screens.soos', 'screens.planning', 'screens.agenda',
  'screens.profiel', 'screens.adminRoles', 'screens.adminMembers',
  'feed.post', 'ruimtes.book', 'ruimtes.linkMembers', 'ruimtes.bookFysio', 'ruimtes.cancelAnyBooking',
  'planning.submitPreferences', 'planning.setSlots', 'planning.assignMembers', 'planning.publish',
  'soos.managePrices', 'agenda.manage', 'members.manage', 'roles.manage',
];

const roles = {
  bestuur: {
    id: 'bestuur',
    name: 'Bestuur',
    builtIn: true,
    permissions: Object.fromEntries(ALL_PERMISSIONS.map((k) => [k, true])),
    createdAt: now,
    updatedAt: now,
  },
  lid: {
    id: 'lid',
    name: 'Lid',
    builtIn: true,
    permissions: {
      'screens.home': true,
      'screens.soos': true,
      'screens.agenda': true,
      'screens.profiel': true,
      'screens.ruimtes': false,
      'screens.planning': false,
      'screens.adminRoles': false,
      'screens.adminMembers': false,
      'feed.post': false,
      'ruimtes.book': false,
      'ruimtes.linkMembers': false,
      'ruimtes.bookFysio': false,
      'ruimtes.cancelAnyBooking': false,
      'planning.submitPreferences': false,
      'planning.setSlots': false,
      'planning.assignMembers': false,
      'planning.publish': false,
      'soos.managePrices': false,
      'agenda.manage': false,
      'members.manage': false,
      'roles.manage': false,
    },
    createdAt: now,
    updatedAt: now,
  },
};

const rooms = [
  { id: 'bestuurskamer', name: 'Bestuurskamer', meta: 'Max 8 personen', bestuurOnly: false },
  { id: 'soos', name: 'Soos', meta: 'Max 120 personen · bar aanwezig', bestuurOnly: false },
  { id: 'fysio', name: 'Fysio ruimte', meta: 'Max 4 personen', bestuurOnly: true },
];

const priceCategories = [
  { id: 'bier', name: 'Bier', order: 0, items: [{ name: 'Pils', price: '€1,25' }, { name: 'Speciaalbier', price: '€1,75' }] },
  { id: 'fris', name: 'Fris', order: 1, items: [{ name: 'Frisdrank', price: '€1,25' }] },
  { id: 'sterk', name: 'Sterk', order: 2, items: [{ name: 'Shot', price: '€2,50' }, { name: 'Bozu', price: '€2,50' }] },
];

async function seed() {
  const batch = db.batch();
  for (const role of Object.values(roles)) batch.set(db.collection('roles').doc(role.id), role);
  for (const room of rooms) batch.set(db.collection('rooms').doc(room.id), room);
  for (const cat of priceCategories) batch.set(db.collection('priceCategories').doc(cat.id), cat);
  await batch.commit();
  console.log('Seeded roles (Bestuur, Lid), rooms and price categories.');
  console.log('Next: create your first Bestuur user — see README.md "First admin user".');
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
