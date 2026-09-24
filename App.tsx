import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  useFonts as useMulish,
  Mulish_400Regular,
  Mulish_500Medium,
  Mulish_600SemiBold,
  Mulish_700Bold,
  Mulish_800ExtraBold,
} from '@expo-google-fonts/mulish';
import { useFonts as useShadows, ShadowsIntoLight_400Regular } from '@expo-google-fonts/shadows-into-light';
import { AuthProvider } from './src/state/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { surface } from './src/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Without this, a notification that arrives while the app is open in the
// foreground is received silently — no banner, no sound — which looks
// exactly like notifications being broken.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [spaceLoaded] = useSpaceGrotesk({ SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  const [mulishLoaded] = useMulish({ Mulish_400Regular, Mulish_500Medium, Mulish_600SemiBold, Mulish_700Bold, Mulish_800ExtraBold });
  const [scriptLoaded] = useShadows({ ShadowsIntoLight_400Regular });
  const fontsReady = spaceLoaded && mulishLoaded && scriptLoaded;

  const onLayoutRootView = useCallback(async () => {
    if (fontsReady) await SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <View style={{ flex: 1, backgroundColor: surface.page }} onLayout={onLayoutRootView}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="dark" />
    </View>
  );
}
