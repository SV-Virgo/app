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

## Pushmeldingen setup

Voordat pushmeldingen iets doen, eenmalig:

```
npm install -g eas-cli
eas login
eas init
```
`eas init` schrijft een `extra.eas.projectId` in `app.json` — zonder dat ID slaat het ophalen van een pushtoken stil over (geen crash, gewoon geen meldingen op dat toestel).

**Belangrijk**: Expo Go op dit SDK ondersteunt geen remote pushmeldingen meer. Testen moet via een EAS development of production build (`eas build`), niet via `npm start` + Expo Go.

Er zijn vier meldingscategorieën, elk lid zet ze aan/uit onder Profiel → Meldingen (standaard allemaal aan):
- **Aankondigingen** — een hoofdfeed-post die als aankondiging (pinned) is geplaatst
- **Hoofdfeed** — een gewone (niet-pinned) hoofdfeed-post
- **Losse meldingen** — vrije tekst die Bestuur stuurt (permissie `notifications.sendCustom`, scherm "Melding versturen" via Profiel)
- **Soos is open** — vaste melding die de Sooscommissie stuurt (permissie `notifications.sendSoosOpen`, knop op het Soos-scherm)

Het versturen gebeurt rechtstreeks vanuit de app naar Expo's push-endpoint (`src/firebase/notifications.ts`) — er is geen Cloud Function voor nodig, in tegenstelling tot de e-mailflow. Dat heeft wel een keerzijde: elk ingelogd lid kan via de Firestore SDK sowieso alle `pushTokens` uitlezen (nodig voor bv. de ledenlijst elders in de app) en zou dus, met wat technische kennis, buiten de app om rechtstreeks naar Expo's endpoint kunnen posten — de permissies hierboven bepalen alleen welke knop je in de app ziet, ze zijn geen harde garantie. Voor een kleine, vertrouwde vereniging is dat een aanvaardbaar risico; een waterdichte oplossing vereist een Cloud Function (dezelfde Blaze-afweging als bij de e-mailflow) die als enige de pushtokens leest en verstuurt.

## Aanmeldingen & betalen (SumUp)

Een activiteit kan, ná aanmaken, een aanmeldformulier krijgen (permissie `agenda.manageRegistration`, knop "Aanmelding" bij het evenement in Agenda beheren). Elke aanmelding vraagt altijd naam/adres/postcode/woonplaats, plus optionele custom vragen (tekst, meerkeuze, ja/nee). Is er een bedrag ingesteld, dan betaalt het lid na het aanmelden via SumUp.

De SumUp-integratie staat in `functions/` (Cloud Functions), niet in de app zelf: een SumUp API-key/merchant-secret in de mobiele app zou uit de gebundelde code te halen zijn, dus een checkout aanmaken en een betaling bevestigen gebeurt altijd server-side.

**Eenmalige setup** (vereist het betaalde **Blaze**-plan voor dit Firebase-project — Cloud Functions draaien niet op het gratis Spark-plan; dit moet je zelf aanzetten in de Firebase console, ik kan dat niet voor je doen):

```
cd functions && npm install && cd ..
npx firebase-tools login
npx firebase-tools use <jouw-project-id>
npx firebase-tools functions:secrets:set SUMUP_API_KEY
npx firebase-tools functions:secrets:set SUMUP_MERCHANT_CODE
npx firebase-tools deploy --only functions
npx firebase-tools deploy --only firestore:rules
```

`SUMUP_API_KEY` is de personal API key uit je SumUp-dashboard (Developers → API keys), `SUMUP_MERCHANT_CODE` de merchant code die daarbij hoort. Na `deploy` staat er ook een webhook-URL in de output voor `sumupWebhook` — zet die in het SumUp-dashboard onder Webhooks, zodat een betaling die binnenkomt terwijl iemand de app al gesloten heeft alsnog verwerkt wordt.

De app roept twee callable functions aan (`src/firebase/payments.ts`): `createSumupCheckout` (maakt de checkout aan, servert het bedrag zelf op uit de aanmelding — de client stuurt nooit een bedrag mee) en `confirmSumupPayment` (herbevestigt de betaalstatus bij SumUp zelf, ná het in-app kaart-widget succes meldt — de widget-callback alleen is geen bewijs van betaling). Het kaart-invoerformulier zelf is SumUp's eigen gehoste widget, geladen in een WebView (`src/components/SumupCheckoutModal.tsx`) — er komt dus nooit een kaartnummer door de app of de Cloud Function heen.

`registrationSubmissions.paymentStatus` mag van clientside nooit rechtstreeks op `'paid'` gezet worden (zie `firestore.rules`) — alleen de Cloud Function mag dat, via de Admin SDK, en pas nadat die zelf bij SumUp heeft geverifieerd dat de betaling ook echt gelukt is.

## App-icoon

`assets/icon.png`, `assets/android-icon-*.png` en `assets/splash-icon.png` zijn nog de standaard Expo-placeholders. Vervang deze door een icoon gebaseerd op `assets/brand/logo-ink.png` / `logo-white.png` voordat je een build voor de stores maakt.

## Bundle identifiers

`app.json` gebruikt voorlopig `nl.svvirgo.app` als iOS bundle identifier / Android package. Pas dit aan naar wat past bij jullie (bijv. gebaseerd op een eigen domein) voordat je naar de App Store / Play Store publiceert — dit kan achteraf niet meer wijzigen zonder de app opnieuw te registreren.

## Projectstructuur

```
src/
  theme/          design tokens (kleuren, typografie, spacing) — 1:1 uit het Claude Design export
  permissions/     de permissie-catalogus (screens.*, feed.*, ruimtes.*, planning.*, soos.*, agenda.*, roles.*, members.*)
  types/           gedeelde TypeScript-types
  firebase/        Firebase config + service-laag (auth, roles, users, feed, rooms, planning, soos, agenda, registrations, payments, notifications)
  state/           AuthContext (huidige gebruiker, rol, hasPermission()) + usePushTokenRegistration
  navigation/      RootNavigator (auth-gate) + TabNavigator (tabs gefilterd op screens.* permissie)
  components/      gedeelde UI-componenten
  screens/         Login, Home, Ruimtes, Planning, Soos, Agenda, EventRegistration, Profiel
  screens/admin/   Rollen beheren, Leden beheren, Agenda beheren, EventRegistration (formulier + aanmeldingen)
scripts/
  seed.mjs          seedt rollen (Bestuur/Lid), ruimtes en prijslijst
  create-admin.mjs  maakt een Bestuur-account aan
functions/          Cloud Functions — SumUp checkout/betaalstatus (zie "Aanmeldingen & betalen" hierboven)
firestore.rules     server-side spiegel van de permissiechecks
```

## Openstaande keuzes / vervolgstappen

- **Foto's / avatars**: Firebase Storage is al geconfigureerd (`src/firebase/config.ts`) maar er is nog geen upload-UI; feed-foto's en profielfoto's zijn nu een `photoUrl`/`avatarUrl` string-veld.
- **Server-side pushmeldingen**: zie de beveiligingskanttekening onder "Pushmeldingen setup" hierboven — een Cloud Function zou dit sluitend maken.
