import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../state/AuthContext';
import { usePushTokenRegistration } from '../state/usePushTokenRegistration';
import { TabNavigator } from './TabNavigator';
import { LoginScreen } from '../screens/LoginScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { ProfielScreen } from '../screens/ProfielScreen';
import { LedenScreen } from '../screens/LedenScreen';
import { AdminRolesScreen } from '../screens/admin/AdminRolesScreen';
import { AdminMembersScreen } from '../screens/admin/AdminMembersScreen';
import { AdminAgendaScreen } from '../screens/admin/AdminAgendaScreen';
import { AdminNotificationsScreen } from '../screens/admin/AdminNotificationsScreen';
import { AdminEventRegistrationScreen } from '../screens/admin/AdminEventRegistrationScreen';
import { EventRegistrationScreen } from '../screens/EventRegistrationScreen';
import { colors, surface } from '../theme/tokens';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { firebaseUser, profile, loading } = useAuth();
  usePushTokenRegistration(profile?.uid);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: surface.page }}>
        <ActivityIndicator color={colors.blue600} size="large" />
      </View>
    );
  }

  const isAuthenticated = !!firebaseUser && !!profile;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
        ) : profile.mustChangePassword ? (
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ animation: 'fade' }} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen name="Profiel" component={ProfielScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Leden" component={LedenScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="AdminRoles" component={AdminRolesScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="AdminMembers" component={AdminMembersScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="AdminAgenda" component={AdminAgendaScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="AdminNotifications" component={AdminNotificationsScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="AdminEventRegistration" component={AdminEventRegistrationScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="EventRegistration" component={EventRegistrationScreen} options={{ presentation: 'modal' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
