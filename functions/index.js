const { setGlobalOptions } = require('firebase-functions/v2');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { randomInt } = require('node:crypto');
const nodemailer = require('nodemailer');
const logger = require('firebase-functions/logger');

// Must match the region the client passes to getFunctions() in
// src/firebase/config.ts, or calls 404 against the wrong default region.
setGlobalOptions({ region: 'europe-west1' });

initializeApp();
const db = getFirestore();

// Set with: firebase functions:secrets:set SUMUP_API_KEY
//           firebase functions:secrets:set SUMUP_MERCHANT_CODE
// Never put these in app.json/.env — this is the whole reason this logic
// lives in a Cloud Function instead of the mobile app.
const SUMUP_API_KEY = defineSecret('SUMUP_API_KEY');
const SUMUP_MERCHANT_CODE = defineSecret('SUMUP_MERCHANT_CODE');

const SUMUP_BASE_URL = 'https://api.sumup.com';

// SumUp has no dashboard/account-level webhook setting — it's passed per
// checkout as return_url when the checkout is created (see createSumupCheckout
// below), so sumupWebhook only ever gets called for checkouts this function
// itself created. Must match this project's deployed function URL exactly
// (region + project id), so update it if either ever changes.
const SUMUP_WEBHOOK_URL = 'https://europe-west1-virgo-app-67c89.cloudfunctions.net/sumupWebhook';

async function sumupFetch(apiKey, path, options = {}) {
  const res = await fetch(`${SUMUP_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    logger.error('SumUp API error', { path, status: res.status, body });
    throw new Error(`SumUp API error (${res.status}): ${body.message || res.statusText}`);
  }
  return body;
}

// Parses the "€12,50" format used throughout the app's admin UI into the
// plain numeric amount SumUp's API expects.
function parseEuroAmount(text) {
  const cleaned = String(text).replace(/[^\d,.-]/g, '').replace(',', '.');
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value <= 0) {
    throw new HttpsError('failed-precondition', 'Ongeldig bedrag ingesteld op dit aanmeldformulier.');
  }
  return Math.round(value * 100) / 100;
}

function mapCheckoutStatus(sumupStatus) {
  return sumupStatus === 'PAID' ? 'paid' : sumupStatus === 'FAILED' || sumupStatus === 'EXPIRED' ? 'failed' : 'pending';
}

// Maps a SumUp checkout status onto this app's own PaymentStatus vocabulary,
// then writes it — always re-derived from SumUp's API response, never from
// a client-supplied value, so a submission can only become "paid" once
// SumUp itself confirms it. installmentIndex targets one termijn instead of
// the submission's single top-level payment; the aggregate paymentStatus is
// then recomputed from every termijn, so it stays a true "everything's
// settled" signal for the badge AdminEventRegistrationScreen already shows.
async function refreshPaymentStatus(apiKey, submissionRef, checkoutId, installmentIndex) {
  const checkout = await sumupFetch(apiKey, `/v0.1/checkouts/${checkoutId}`);
  const paymentStatus = mapCheckoutStatus(checkout.status);

  if (installmentIndex === undefined) {
    await submissionRef.update({ paymentStatus });
    return paymentStatus;
  }

  const snap = await submissionRef.get();
  const installments = snap.data().installments;
  installments[installmentIndex] = { ...installments[installmentIndex], paymentStatus };
  const aggregate = installments.every((i) => i.paymentStatus === 'paid') ? 'paid' : 'pending';
  await submissionRef.update({ installments, paymentStatus: aggregate });
  return paymentStatus;
}

// Callable from the app once a member has filled in the registration form
// and needs to pay. Creates a SumUp checkout for the exact amount configured
// on that event's form (or, with installmentIndex, for just that termijn's
// share) and stores the checkout id on the submission.
exports.createSumupCheckout = onCall({ secrets: [SUMUP_API_KEY, SUMUP_MERCHANT_CODE] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Log in om je aan te melden.');
  const eventId = request.data?.eventId;
  if (!eventId) throw new HttpsError('invalid-argument', 'eventId ontbreekt.');
  const installmentIndex = request.data?.installmentIndex;

  const uid = request.auth.uid;
  const submissionId = `${eventId}_${uid}`;
  const submissionRef = db.collection('registrationSubmissions').doc(submissionId);
  const submissionSnap = await submissionRef.get();
  if (!submissionSnap.exists) throw new HttpsError('failed-precondition', 'Meld je eerst aan voor deze activiteit.');
  const submission = submissionSnap.data();

  if (!submission.amount) throw new HttpsError('failed-precondition', 'Deze aanmelding heeft geen bedrag om te betalen.');

  let amountText;
  let description;
  if (installmentIndex !== undefined) {
    const installments = submission.installments;
    if (!Array.isArray(installments) || !installments[installmentIndex]) {
      throw new HttpsError('invalid-argument', 'Ongeldige termijn.');
    }
    if (installments[installmentIndex].paymentStatus === 'paid') {
      throw new HttpsError('failed-precondition', 'Deze termijn is al betaald.');
    }
    amountText = installments[installmentIndex].amount;
    description = `Aanmelding ${eventId} (termijn ${installmentIndex + 1})`;
  } else {
    if (submission.paymentStatus === 'paid') throw new HttpsError('failed-precondition', 'Deze aanmelding is al betaald.');
    amountText = submission.amount;
    description = `Aanmelding ${eventId}`;
  }

  const amount = parseEuroAmount(amountText);
  const checkout = await sumupFetch(SUMUP_API_KEY.value(), '/v0.1/checkouts', {
    method: 'POST',
    body: JSON.stringify({
      checkout_reference: `${submissionId}_${installmentIndex ?? 'full'}_${Date.now()}`,
      amount,
      currency: 'EUR',
      merchant_code: SUMUP_MERCHANT_CODE.value(),
      description,
      return_url: SUMUP_WEBHOOK_URL,
    }),
  });

  if (installmentIndex !== undefined) {
    const installments = submission.installments;
    installments[installmentIndex] = { ...installments[installmentIndex], checkoutId: checkout.id, paymentStatus: 'pending' };
    await submissionRef.update({ installments, installmentCheckoutIds: FieldValue.arrayUnion(checkout.id) });
  } else {
    await submissionRef.update({ checkoutId: checkout.id, paymentStatus: 'pending' });
  }
  return { checkoutId: checkout.id };
});

// Callable right after the in-app SumUp card widget reports success — the
// widget's own callback is just a UI signal, not proof of payment, so this
// re-checks the checkout's real status server-side before trusting it.
exports.confirmSumupPayment = onCall({ secrets: [SUMUP_API_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Log in om te betalen.');
  const eventId = request.data?.eventId;
  if (!eventId) throw new HttpsError('invalid-argument', 'eventId ontbreekt.');
  const installmentIndex = request.data?.installmentIndex;

  const uid = request.auth.uid;
  const submissionId = `${eventId}_${uid}`;
  const submissionRef = db.collection('registrationSubmissions').doc(submissionId);
  const submissionSnap = await submissionRef.get();
  if (!submissionSnap.exists) throw new HttpsError('not-found', 'Aanmelding niet gevonden.');
  const submission = submissionSnap.data();

  const checkoutId = installmentIndex !== undefined ? submission.installments?.[installmentIndex]?.checkoutId : submission.checkoutId;
  if (!checkoutId) throw new HttpsError('failed-precondition', 'Nog geen betaling gestart voor deze termijn.');

  const paymentStatus = await refreshPaymentStatus(SUMUP_API_KEY.value(), submissionRef, checkoutId, installmentIndex);
  return { paymentStatus };
});

// Register this function's URL as a webhook in the SumUp merchant dashboard
// so a payment that completes after the app is closed still gets recorded.
// SumUp's webhook payload shape has changed across API versions, so this
// only trusts it for the checkout id and re-fetches the real status —
// never trusts a status value straight out of the webhook body.
exports.sumupWebhook = onRequest({ secrets: [SUMUP_API_KEY] }, async (req, res) => {
  try {
    const checkoutId = req.body?.payload?.id || req.body?.id;
    if (!checkoutId) {
      res.status(400).send('missing checkout id');
      return;
    }

    const singleSnap = await db.collection('registrationSubmissions').where('checkoutId', '==', checkoutId).limit(1).get();
    if (!singleSnap.empty) {
      await refreshPaymentStatus(SUMUP_API_KEY.value(), singleSnap.docs[0].ref, checkoutId);
      res.status(200).send('ok');
      return;
    }

    // Not a single-payment checkoutId — check whether it belongs to one of
    // a submission's installments instead (denormalized into
    // installmentCheckoutIds specifically so this array-contains query is
    // possible; Firestore can't query inside an array of objects directly).
    const installmentSnap = await db
      .collection('registrationSubmissions')
      .where('installmentCheckoutIds', 'array-contains', checkoutId)
      .limit(1)
      .get();
    if (!installmentSnap.empty) {
      const doc = installmentSnap.docs[0];
      const installmentIndex = doc.data().installments.findIndex((i) => i.checkoutId === checkoutId);
      await refreshPaymentStatus(SUMUP_API_KEY.value(), doc.ref, checkoutId, installmentIndex);
      res.status(200).send('ok');
      return;
    }

    // Not one of ours — acknowledge anyway so SumUp stops retrying.
    res.status(200).send('ok');
  } catch (err) {
    logger.error('sumupWebhook failed', err);
    res.status(500).send('error');
  }
});

// ---------------------------------------------------------------------------
// Account mails (invite + wachtwoord vergeten)
// ---------------------------------------------------------------------------

// Sent from the association's own Gmail/Workspace mailbox instead of
// Firebase Auth's built-in emails. GMAIL_APP_PASSWORD is a Google "app
// password" (Google account → Beveiliging → App-wachtwoorden, needs 2FA on),
// not the mailbox's normal password.
// Set with: firebase functions:secrets:set GMAIL_USER
//           firebase functions:secrets:set GMAIL_APP_PASSWORD
const GMAIL_USER = defineSecret('GMAIL_USER');
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');

// Minimum time between two "wachtwoord vergeten" requests for the same
// account — the endpoint is callable without being logged in and resets the
// password immediately, so without this anyone knowing a member's email
// could keep invalidating their password.
const RESET_COOLDOWN_MS = 5 * 60 * 1000;

// No look-alike characters (0/O, 1/l/I), since members type this over from
// the mail by hand. One of each class is always included because the
// project's Firebase Auth password policy rejects passwords without a digit
// or a special character (createUser/updateUser then fail with
// PASSWORD_DOES_NOT_MEET_REQUIREMENTS).
const PASSWORD_CLASSES = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%&*?+-'];
const PASSWORD_ALPHABET = PASSWORD_CLASSES.join('');

function pick(chars) {
  return chars[randomInt(chars.length)];
}

function generatePassword(length = 12) {
  const chars = PASSWORD_CLASSES.map(pick);
  while (chars.length < length) chars.push(pick(PASSWORD_ALPHABET));
  // Fisher–Yates, so the guaranteed characters aren't always up front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// Served from Firebase Hosting (hosting/email/logo-white.png) — mail clients
// need a public URL, they can't load images bundled in the app. The alt text
// keeps the old "VIRGO" header look when a client blocks images.
const EMAIL_LOGO_URL = 'https://virgo-app-67c89.web.app/email/logo-white.png';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Same look as scripts/email-templates/password-reset.html, with the
// temporary password in place of the reset link.
function passwordMailHtml({ name, intro, email, password }) {
  return `
<table cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f2e9db;padding:32px 0;" width="100%">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;" width="480">
        <tr>
          <td style="background-color:#2563a8;padding:32px 40px;text-align:center;">
            <img src="${EMAIL_LOGO_URL}" width="160" height="75" alt="VIRGO" style="display:inline-block;border:0;width:160px;height:75px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:24px;letter-spacing:1px;color:#ffffff;" />
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 8px 40px;">
            <p style="margin:0 0 16px 0;font-size:20px;line-height:1.3;font-weight:bold;color:#241f1c;">Hoi ${escapeHtml(name)},</p>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#4a4038;">${intro}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 24px 40px;">
            <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background-color:#f7f2ea;border-radius:12px;">
              <tr><td style="padding:16px 20px 4px 20px;font-size:13px;color:#6b5f55;">E-mailadres</td></tr>
              <tr><td style="padding:0 20px 12px 20px;font-size:15px;color:#241f1c;">${escapeHtml(email)}</td></tr>
              <tr><td style="padding:0 20px 4px 20px;font-size:13px;color:#6b5f55;">Wachtwoord</td></tr>
              <tr><td style="padding:0 20px 16px 20px;font-family:Menlo,Consolas,monospace;font-size:20px;font-weight:bold;letter-spacing:1px;color:#153e63;">${escapeHtml(password)}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px 40px;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#4a4038;">Na het inloggen vraagt de app je om meteen een eigen wachtwoord in te stellen.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #dcd1c2;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:#a89c8e;">Heb je dit niet aangevraagd? Log dan in met het wachtwoord hierboven en stel een nieuw wachtwoord in, of neem contact op met het bestuur.</p>
          </td>
        </tr>
      </table>
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a89c8e;margin-top:20px;">Studentenvereniging Virgo &middot; Breda</p>
    </td>
  </tr>
</table>`;
}

async function sendPasswordMail({ to, name, subject, intro, password }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER.value(), pass: GMAIL_APP_PASSWORD.value() },
  });
  await transporter.sendMail({
    from: `"Virgo" <${GMAIL_USER.value()}>`,
    to,
    subject,
    text: `Hoi ${name},\n\n${intro}\n\nE-mailadres: ${to}\nWachtwoord: ${password}\n\nNa het inloggen vraagt de app je om meteen een eigen wachtwoord in te stellen.\n\nStudentenvereniging Virgo`,
    html: passwordMailHtml({ name, intro, email: to, password }),
  });
}

async function callerHasPermission(uid, key) {
  const userSnap = await db.collection('users').doc(uid).get();
  const roleId = userSnap.data()?.roleId;
  if (!roleId) return false;
  const roleSnap = await db.collection('roles').doc(roleId).get();
  return roleSnap.data()?.permissions?.[key] === true;
}

// Replaces the old client-side invite (Firebase's own "set your password"
// mail): creates the Auth account with a generated password, writes the
// profile with mustChangePassword so the app forces a new password on first
// login, and mails the password from our own Gmail. Rolls the account back
// if the mail can't be sent, so the admin can simply retry.
exports.inviteMember = onCall({ secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Log in om leden uit te nodigen.');
  if (!(await callerHasPermission(request.auth.uid, 'members.manage'))) {
    throw new HttpsError('permission-denied', 'Je hebt geen rechten om leden uit te nodigen.');
  }

  const name = String(request.data?.name ?? '').trim();
  const email = String(request.data?.email ?? '').trim().toLowerCase();
  const roleId = String(request.data?.roleId ?? '').trim();
  const functie = request.data?.functie ? String(request.data.functie).trim() : '';
  if (!name || !email || !roleId) throw new HttpsError('invalid-argument', 'Naam, e-mailadres en rol zijn verplicht.');

  const password = generatePassword();
  let user;
  try {
    user = await getAuth().createUser({ email, password, displayName: name });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'Er bestaat al een account met dit e-mailadres.');
    if (err.code === 'auth/invalid-email') throw new HttpsError('invalid-argument', 'Dit e-mailadres is ongeldig.');
    throw err;
  }

  const profile = {
    uid: user.uid,
    name,
    email,
    roleId,
    active: true,
    mustChangePassword: true,
    ...(functie ? { functie } : {}),
  };

  try {
    await db.collection('users').doc(user.uid).set(profile);
    await sendPasswordMail({
      to: email,
      name,
      subject: 'Je account voor de Virgo App',
      intro: 'Je account voor de Virgo App is aangemaakt. Hieronder staan je inloggegevens.',
      password,
    });
  } catch (err) {
    logger.error('inviteMember failed, rolling back account', { email, err });
    await db.collection('users').doc(user.uid).delete().catch(() => {});
    await getAuth().deleteUser(user.uid).catch(() => {});
    throw new HttpsError('internal', 'De uitnodiging kon niet worden verstuurd. Probeer het nog eens.');
  }

  return profile;
});

// "Wachtwoord vergeten": generates a new password, mails it and forces a
// change on next login. Callable without being logged in, so it never
// reveals whether an address has an account (always the same response) and
// is rate-limited per account via RESET_COOLDOWN_MS.
exports.resetPassword = onCall({ secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async (request) => {
  const email = String(request.data?.email ?? '').trim().toLowerCase();
  if (!email) throw new HttpsError('invalid-argument', 'Vul je e-mailadres in.');

  let user;
  try {
    user = await getAuth().getUserByEmail(email);
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') return { ok: true };
    throw err;
  }

  const profileRef = db.collection('users').doc(user.uid);
  const profileSnap = await profileRef.get();
  const profile = profileSnap.data();
  if (!profile || profile.active === false) return { ok: true };

  const resetRef = db.collection('passwordResets').doc(user.uid);
  const allowed = await db.runTransaction(async (tx) => {
    const last = (await tx.get(resetRef)).data()?.lastResetAt ?? 0;
    if (Date.now() - last < RESET_COOLDOWN_MS) return false;
    tx.set(resetRef, { lastResetAt: Date.now() });
    return true;
  });
  if (!allowed) return { ok: true };

  const password = generatePassword();
  await getAuth().updateUser(user.uid, { password });
  await profileRef.update({ mustChangePassword: true });
  try {
    await sendPasswordMail({
      to: email,
      name: profile.name || user.displayName || '',
      subject: 'Je nieuwe wachtwoord voor de Virgo App',
      intro: 'Je hebt een nieuw wachtwoord aangevraagd voor de Virgo App. Je oude wachtwoord werkt niet meer.',
      password,
    });
  } catch (err) {
    // The password has already changed at this point — log it loudly and
    // let the member retry right away instead of waiting out the cooldown.
    logger.error('resetPassword mail failed', { email, err });
    await resetRef.delete().catch(() => {});
    throw new HttpsError('internal', 'De e-mail kon niet worden verstuurd. Probeer het nog eens.');
  }
  return { ok: true };
});

// Removes a member completely: their Auth account (so they can't log in any
// more) and their profile. Registrations, bookings and shifts that reference
// them are left alone on purpose — those are history (and payment records),
// not part of the account.
exports.deleteMember = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Log in om leden te verwijderen.');
  if (!(await callerHasPermission(request.auth.uid, 'members.manage'))) {
    throw new HttpsError('permission-denied', 'Je hebt geen rechten om leden te verwijderen.');
  }
  const uid = String(request.data?.uid ?? '');
  if (!uid) throw new HttpsError('invalid-argument', 'Geen lid opgegeven.');
  if (uid === request.auth.uid) throw new HttpsError('failed-precondition', 'Je kunt je eigen account niet verwijderen.');

  try {
    await getAuth().deleteUser(uid);
  } catch (err) {
    // Profile without an Auth account (e.g. created by hand) — still remove the profile.
    if (err.code !== 'auth/user-not-found') throw err;
  }
  await db.collection('users').doc(uid).delete();
  await db.collection('passwordResets').doc(uid).delete().catch(() => {});
  return { ok: true };
});

// A push token belongs to a device, not a person. When someone logs in on a
// device that was previously used by another account (logout didn't clean
// up, app was reinstalled, …), that other account still lists the token and
// the device would get both accounts' notifications. Called right after the
// app registers its token, this strips it from every other profile — which
// the client can't do itself, since rules only let members edit their own.
exports.claimPushToken = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Niet ingelogd.');
  const token = String(request.data?.token ?? '');
  if (!token) throw new HttpsError('invalid-argument', 'Geen token opgegeven.');

  const snap = await db.collection('users').where('pushTokens', 'array-contains', token).get();
  const others = snap.docs.filter((d) => d.id !== request.auth.uid);
  await Promise.all(others.map((d) => d.ref.update({ pushTokens: FieldValue.arrayRemove(token) })));
  return { removed: others.length };
});
