import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../state/AuthContext';
import { colors, fontFamily, fontSize, surface, text } from '../theme/tokens';
import { HomeIcon, RuimtesIcon, SoosIcon, PlanningIcon, AgendaIcon } from '../components/TabIcons';
import { HomeScreen } from '../screens/HomeScreen';
import { RuimtesScreen } from '../screens/RuimtesScreen';
import { SoosScreen } from '../screens/SoosScreen';
import { PlanningScreen } from '../screens/PlanningScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import type { TabParamList } from './types';
import type { PermissionKey } from '../permissions/catalog';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_DEFS: {
  name: keyof TabParamList;
  label: string;
  permission: PermissionKey;
  component: React.ComponentType<any>;
  Icon: React.ComponentType<{ color: string; size?: number }>;
}[] = [
  { name: 'Home', label: 'Home', permission: 'screens.home', component: HomeScreen, Icon: HomeIcon },
  { name: 'Ruimtes', label: 'Ruimtes', permission: 'screens.ruimtes', component: RuimtesScreen, Icon: RuimtesIcon },
  { name: 'Soos', label: 'Soos', permission: 'screens.soos', component: SoosScreen, Icon: SoosIcon },
  { name: 'Planning', label: 'Planning', permission: 'screens.planning', component: PlanningScreen, Icon: PlanningIcon },
  { name: 'Agenda', label: 'Agenda', permission: 'screens.agenda', component: AgendaScreen, Icon: AgendaIcon },
];

// Tabs are filtered per the signed-in user's role permissions — this is the
// mechanism that keeps a screen from being hardcoded to a role: Bestuur
// flips `screens.*` for any role from the Rollen beheren admin screen and
// the tab bar (and the routes behind it) reacts immediately.
export function TabNavigator() {
  const { hasPermission, role, logout } = useAuth();
  const visibleTabs = TAB_DEFS.filter((t) => hasPermission(t.permission));

  // A role with every screens.* permission off is a valid (if unusual) admin
  // configuration — react-navigation crashes if a navigator has zero screens,
  // so this has to be handled explicitly rather than left to blow up.
  if (visibleTabs.length === 0) {
    return (
      <SafeAreaView style={styles.emptyScreen}>
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>Nog geen toegang</Text>
          <Text style={styles.emptyBody}>
            Je rol{role?.name ? ` (${role.name})` : ''} heeft nog geen toegang tot een scherm. Vraag het bestuur om
            rechten toe te voegen bij Rollen beheren.
          </Text>
          <Pressable onPress={() => logout()}>
            <Text style={styles.emptyLogout}>Uitloggen</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue600,
        tabBarInactiveTintColor: colors.ink300,
        tabBarStyle: { backgroundColor: colors.cream50, borderTopColor: colors.ink150, borderTopWidth: 1.5, height: 82, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: fontFamily.bodySemibold, fontSize: 11 },
      }}
    >
      {visibleTabs.map(({ name, label, component, Icon }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarLabel: label,
            tabBarIcon: ({ color, size }) => <Icon color={color} size={size} />,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  emptyScreen: { flex: 1, backgroundColor: surface.page },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  emptyTitle: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: text.heading },
  emptyBody: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted, textAlign: 'center', lineHeight: fontSize.sm * 1.5 },
  emptyLogout: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.sm, color: colors.error, marginTop: 6 },
});
