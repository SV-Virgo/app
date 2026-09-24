import { httpsCallable } from 'firebase/functions';
import { functions } from './config';

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

// Called after the in-app card widget reports success — the widget callback
// alone isn't proof of payment, so this asks the Cloud Function to re-check
// the checkout's real status with SumUp before the UI trusts it.
export async function confirmSumupPayment(eventId: string, installmentIndex?: number): Promise<ConfirmPaymentResult['paymentStatus']> {
  const call = httpsCallable<{ eventId: string; installmentIndex?: number }, ConfirmPaymentResult>(functions, 'confirmSumupPayment');
  const { data } = await call({ eventId, installmentIndex });
  return data.paymentStatus;
}
