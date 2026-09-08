import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../state/AuthContext';
import { TabNavigator } from './TabNavigator';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfielScreen } from '../screens/ProfielScreen';
import { AdminRolesScreen } from '../screens/admin/AdminRolesScreen';
import { AdminMembersScreen } from '../screens/admin/AdminMembersScreen';
import { colors, surface } from '../theme/tokens';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { firebaseUser, profile, loading } = useAuth();

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
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen name="Profiel" component={ProfielScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="AdminRoles" component={AdminRolesScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="AdminMembers" component={AdminMembersScreen} options={{ presentation: 'modal' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
