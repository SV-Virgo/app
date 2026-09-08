# Virgo App

De ledenapp van de studentenvereniging: updates van het bestuur, ruimtes reserveren, bardienstplanning voor de Soos, openingstijden & prijzen, agenda en profiel. Gebouwd met Expo (React Native) zodat één codebase zowel iOS als Android oplevert, met Firebase als backend.

Geïmplementeerd vanuit de Claude Design export in `../` (zie `README.md`, `chats/chat1.md` en `project/Virgo App.dc.html` voor het originele ontwerp en de besluiten die daartoe hebben geleid).

## Rollen & permissies

Geen enkel scherm of actie is hardcoded aan een rolnaam. Elk scherm en elke gevoelige actie checkt een permissie-key (zie `src/permissions/catalog.ts`) tegen de rol van de ingelogde gebruiker via `useAuth().hasPermission(key)`. Bestuur kan op het scherm **Rollen beheren** (Profiel → Rollen beheren):

- nieuwe rollen aanmaken (bijv. "Sooscommissie", "Hoofd Soos", "Activiteitencommissie")
- per rol precies aanvinken welke schermen zichtbaar zijn (`screens.*`) en welke acties toegestaan zijn (reserveren, leden koppelen, tijdvakken openzetten, planning publiceren, prijzen beheren, etc.)
- rollen aan leden toewijzen via **Leden beheren**

Er zijn twee ingebouwde rollen die niet verwijderd kunnen worden: **Bestuur** (alle permissies) en **Lid** (basistoegang: Home, Soos, Agenda, Profiel). Alle andere rollen — en welke permissies ze precies krijgen — richt je zelf in via de app.

Deze permissies worden **niet alleen client-side verborgen**: `firestore.rules` herhaalt exact dezelfde checks server-side, dus een lid kan nooit meer dan zijn/haar rol toestaat, ook niet door de app te omzeilen.

## Firebase project setup

1. Maak een Firebase project aan op https://console.firebase.google.com (gratis Spark-plan volstaat ruim).
2. **Authentication** → Sign-in method → zet **E-mail/wachtwoord** aan. (Zelf-registratie staat uit in de app — leden loggen in met een account dat het bestuur voor ze aanmaakt, zie hieronder.)
3. **Firestore Database** → maak een database aan (production mode).
4. **Project settings** → **Your apps** → voeg een Web-app toe (ja, ook voor de Expo-app — Firebase JS SDK gebruikt de web-config) en kopieer de config naar `.env`:
   ```
   cp .env.example .env
   ```
   Vul `EXPO_PUBLIC_FIREBASE_*` in met de waarden uit de Firebase console.
5. Deploy de security rules (of plak `firestore.rules` in de Firebase console → Firestore → Rules):
   ```
   npx firebase-tools deploy --only firestore:rules
   ```
6. Genereer een service-account key voor de setup-scripts: **Project settings** → **Service accounts** → **Generate new private key** → sla op als `serviceAccountKey.json` in deze map (staat al in `.gitignore`, commit 'm niet).
7. Seed de standaardrollen, ruimtes en prijslijst:
   ```
   npm run seed
   ```
8. Maak het eerste Bestuur-account aan:
   ```
   npm run create-admin -- "Jouw naam" jij@voorbeeld.nl eenSterkWachtwoord
   ```
   Verdere leden voeg je op dezelfde manier toe (`create-admin.mjs`), of bouw je een uitnodigingsflow via een Cloud Function die dezelfde stappen doet — clients kunnen zelf geen Firebase Auth-accounts voor anderen aanmaken.

## Lokaal draaien

```
npm install
npm start
```
Scan de QR-code met de Expo Go-app, of druk `i` / `a` voor de iOS-simulator / Android-emulator.

## iOS & Android builds

Deze app gebruikt [EAS Build](https://docs.expo.dev/build/introduction/) voor installeerbare builds op beide platforms vanuit één codebase:

```
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas build --platform android
```
Voor een TestFlight/Play Store-release: `eas submit --platform ios` / `eas submit --platform android` (vereist een Apple Developer- en Google Play Console-account).

## App-icoon

`assets/icon.png`, `assets/android-icon-*.png` en `assets/splash-icon.png` zijn nog de standaard Expo-placeholders. Vervang deze door een icoon gebaseerd op `assets/brand/logo-ink.png` / `logo-white.png` voordat je een build voor de stores maakt.

## Bundle identifiers

`app.json` gebruikt voorlopig `nl.svvirgo.app` als iOS bundle identifier / Android package. Pas dit aan naar wat past bij jullie (bijv. gebaseerd op een eigen domein) voordat je naar de App Store / Play Store publiceert — dit kan achteraf niet meer wijzigen zonder de app opnieuw te registreren.

## Projectstructuur

```
src/
  theme/          design tokens (kleuren, typografie, spacing) — 1:1 uit het Claude Design export
  permissions/     de permissie-catalogus (screens.*, feed.*, ruimtes.*, planning.*, soos.*, roles.*, members.*)
  types/           gedeelde TypeScript-types
  firebase/        Firebase config + service-laag (auth, roles, users, feed, rooms, planning, soos, agenda)
  state/           AuthContext (huidige gebruiker, rol, hasPermission())
  navigation/      RootNavigator (auth-gate) + TabNavigator (tabs gefilterd op screens.* permissie)
  components/      gedeelde UI-componenten
  screens/         Login, Home, Ruimtes, Planning, Soos, Agenda, Profiel
  screens/admin/   Rollen beheren, Leden beheren
scripts/
  seed.mjs          seedt rollen (Bestuur/Lid), ruimtes en prijslijst
  create-admin.mjs  maakt een Bestuur-account aan
firestore.rules     server-side spiegel van de permissiechecks
```

## Openstaande keuzes / vervolgstappen

- **Ledenuitnodigingen**: nu via `create-admin.mjs` (CLI, service-account). Voor een prettigere flow: een Cloud Function die "Leden beheren" kan aanroepen om direct vanuit de app een account + e-mailuitnodiging aan te maken.
- **Foto's / avatars**: Firebase Storage is al geconfigureerd (`src/firebase/config.ts`) maar er is nog geen upload-UI; feed-foto's en profielfoto's zijn nu een `photoUrl`/`avatarUrl` string-veld.
- **Pushmeldingen** voor nieuwe updates/aankondigingen: nog niet aangesloten (Expo Notifications + een Cloud Function trigger op nieuwe `feed`-documenten zou dit afmaken).
