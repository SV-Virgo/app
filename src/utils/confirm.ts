import { Alert } from 'react-native';

// Shared "are you sure?" dialog for every destructive action, so nothing is
// removed on a single (possibly accidental) tap.
export function confirmDestructive(
  title: string,
  onConfirm: () => void | Promise<void>,
  {
    message = 'Dit kan niet ongedaan worden gemaakt.',
    confirmText = 'Verwijderen',
    cancelText = 'Annuleren',
  }: { message?: string; confirmText?: string; cancelText?: string } = {},
) {
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: () => void onConfirm() },
  ]);
}
