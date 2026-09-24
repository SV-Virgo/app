import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors, fontFamily, fontSize, surface, text } from '../theme/tokens';

interface Props {
  visible: boolean;
  checkoutId: string | null;
  amount: string;
  onClose: () => void;
  onSuccess: () => void;
  onFailure: () => void;
}

// Loads SumUp's own hosted Card Widget inside a WebView, mounted against a
// checkout id the Cloud Function already created server-side — the app
// itself never sees a card number. See functions/index.js for why the
// checkout has to be created server-side in the first place.
function widgetHtml(checkoutId: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    body { margin: 0; padding: 16px; font-family: -apple-system, sans-serif; background: #ffffff; }
    #sumup-card { min-height: 300px; }
  </style>
</head>
<body>
  <div id="sumup-card"></div>
  <script src="https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js"></script>
  <script>
    function post(message) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
    try {
      SumUpCard.mount({
        id: 'sumup-card',
        checkoutId: '${checkoutId}',
        onResponse: function (type, body) {
          post({ type: type, body: body });
        },
      });
    } catch (e) {
      post({ type: 'error', body: String(e) });
    }
  </script>
</body>
</html>`;
}

export function SumupCheckoutModal({ visible, checkoutId, amount, onClose, onSuccess, onFailure }: Props) {
  const [webviewReady, setWebviewReady] = useState(false);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'success') onSuccess();
      else if (message.type === 'error' || message.type === 'fail') onFailure();
    } catch {
      // Ignore anything that isn't the JSON we posted ourselves.
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={styles.header}>
        <Text style={styles.title}>Betalen · {amount}</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={styles.close}>Sluiten</Text>
        </Pressable>
      </View>
      {checkoutId ? (
        <View style={{ flex: 1 }}>
          {!webviewReady && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.blue600} size="large" />
            </View>
          )}
          <WebView
            source={{ html: widgetHtml(checkoutId) }}
            onMessage={handleMessage}
            onLoadEnd={() => setWebviewReady(true)}
            style={{ flex: 1 }}
          />
        </View>
      ) : (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.blue600} size="large" />
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink150,
    backgroundColor: surface.page,
  },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.md, color: text.heading },
  close: { fontFamily: fontFamily.bodySemibold, fontSize: fontSize.sm, color: colors.blue600 },
  loadingOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: surface.page },
});
