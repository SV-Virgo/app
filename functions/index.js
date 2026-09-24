const { setGlobalOptions } = require('firebase-functions/v2');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
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
