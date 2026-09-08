import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../state/AuthContext';
import { colors, fontFamily } from '../theme/tokens';
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
  const { hasPermission } = useAuth();
  const visibleTabs = TAB_DEFS.filter((t) => hasPermission(t.permission));

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
