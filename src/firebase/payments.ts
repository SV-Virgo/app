import { AppState, Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { httpsCallable } from 'firebase/functions';
import { functions } from './config';
import { surface } from '../theme/tokens';

interface CreateCheckoutResult {
  checkoutId: string;
}

interface ConfirmPaymentResult {
  paymentStatus: 'not_required' | 'pending' | 'paid' | 'failed';
}

// Creates a SumUp checkout for the signed-in member's own registration —
// the Cloud Function looks up the submission and its amount server-side, so
// nothing about price or merchant credentials is ever sent from the client.
// installmentIndex selects which termijn to pay when the submission has
// installments (see RegistrationSubmission.installments); omit it to pay
// the full amount in one go.
export async function createSumupCheckout(eventId: string, installmentIndex?: number): Promise<string> {
  const call = httpsCallable<{ eventId: string; installmentIndex?: number }, CreateCheckoutResult>(functions, 'createSumupCheckout');
  const { data } = await call({ eventId, installmentIndex });
  return data.checkoutId;
}

// Called once the member is back from the checkout page — nothing the page
// or browser reports is proof of payment, so this asks the Cloud Function to
// re-check the checkout's real status with SumUp before the UI trusts it.
export async function confirmSumupPayment(eventId: string, installmentIndex?: number): Promise<ConfirmPaymentResult['paymentStatus']> {
  const call = httpsCallable<{ eventId: string; installmentIndex?: number }, ConfirmPaymentResult>(functions, 'confirmSumupPayment');
  const { data } = await call({ eventId, installmentIndex });
  return data.paymentStatus;
}

// Hosted on Firebase Hosting (hosting/checkout.html) so it runs on a real,
// verified domain — required for Apple Pay and Google Pay.
const CHECKOUT_PAGE_URL = 'https://virgo-app-67c89.web.app/checkout.html';
const RETURN_URL_PREFIX = 'virgo://betaling';

/**
 * Opens the SumUp card widget in an in-app browser (SFSafariViewController
 * on iOS, a Chrome Custom Tab on Android) rather than a WebView, since
 * Apple Pay / Google Pay don't work inside a WebView. Resolves once the
 * member is back in the app — either the page sent them back via
 * virgo://betaling after paying, or they closed the browser themselves.
 * Deliberately doesn't report *how* it ended: the caller always asks
 * confirmSumupPayment for the real status.
 */
export function openHostedCheckout(checkoutId: string): Promise<void> {
  const url = `${CHECKOUT_PAGE_URL}?checkoutId=${encodeURIComponent(checkoutId)}`;
  return new Promise((resolve) => {
    const subscriptions: { remove: () => void }[] = [];
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      subscriptions.forEach((s) => s.remove());
      resolve();
    };

    subscriptions.push(
      Linking.addEventListener('url', ({ url: incoming }) => {
        if (!incoming.startsWith(RETURN_URL_PREFIX)) return;
        // Only iOS can close the browser programmatically; on Android the
        // virgo:// intent brings the app's own task back to the front.
        if (Platform.OS === 'ios') WebBrowser.dismissBrowser().catch(() => {});
        finish();
      }),
    );

    if (Platform.OS === 'android') {
      // openBrowserAsync resolves as soon as the Custom Tab is launched on
      // Android, so "back in the app" is detected from the app returning to
      // the foreground instead.
      let leftApp = false;
      subscriptions.push(
        AppState.addEventListener('change', (state) => {
          if (state !== 'active') leftApp = true;
          else if (leftApp) finish();
        }),
      );
    }

    WebBrowser.openBrowserAsync(url, {
      toolbarColor: surface.brand,
      controlsColor: '#ffffff',
      dismissButtonStyle: 'close',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      enableBarCollapsing: true,
      showTitle: false,
      // Keeps the Custom Tab inside the app's own task, so it disappears
      // when virgo://betaling brings the app back instead of lingering in
      // recents.
      createTask: false,
    })
      .then(() => {
        // iOS: resolves when the sheet is closed (by the member or by
        // dismissBrowser above). Android: resolves immediately — ignore.
        if (Platform.OS === 'ios') finish();
      })
      .catch((err) => {
        console.error('openBrowserAsync failed:', err);
        finish();
      });
  });
}
