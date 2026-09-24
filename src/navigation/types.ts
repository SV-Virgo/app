export type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
  Profiel: undefined;
  Leden: undefined;
  AdminRoles: undefined;
  AdminMembers: undefined;
  AdminAgenda: undefined;
  AdminNotifications: undefined;
  AdminEventRegistration: { eventId: string; eventTitle: string };
  EventRegistration: { eventId: string; eventTitle: string };
};

export type TabParamList = {
  Home: undefined;
  Ruimtes: undefined;
  Soos: undefined;
  Planning: undefined;
  Agenda: undefined;
};
