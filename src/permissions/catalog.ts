// The full catalog of permission keys the app understands.
// Every screen and every sensitive action checks one of these keys against
// the current user's role via `usePermissions()` — nothing is hardcoded to
// a role name, so Bestuur can create new roles and grant/revoke any of
// these per role from the "Rollen beheren" admin screen.

export type PermissionKey =
  | 'screens.home'
  | 'screens.ruimtes'
  | 'screens.soos'
  | 'screens.planning'
  | 'screens.agenda'
  | 'screens.profiel'
  | 'screens.adminRoles'
  | 'screens.adminMembers'
  | 'feed.postMembers'
  | 'feed.postMain'
  | 'feed.moderate'
  | 'ruimtes.book'
  | 'ruimtes.linkMembers'
  | 'ruimtes.bookFysio'
  | 'ruimtes.cancelAnyBooking'
  | 'planning.submitPreferences'
  | 'planning.plannable'
  | 'planning.setSlots'
  | 'planning.assignMembers'
  | 'planning.publish'
  | 'agenda.manage'
  | 'agenda.manageRegistration'
  | 'soos.managePrices'
  | 'notifications.sendCustom'
  | 'notifications.sendSoosOpen'
  | 'members.manage'
  | 'roles.manage';

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  description: string;
  group: 'Schermen' | 'Home' | 'Ruimtes' | 'Planning' | 'Soos' | 'Agenda' | 'Meldingen' | 'Beheer';
}

export const PERMISSIONS: PermissionDef[] = [
  { key: 'screens.home', label: 'Home', description: 'De feed met aankondigingen en updates zien', group: 'Schermen' },
  { key: 'screens.ruimtes', label: 'Ruimtes', description: 'De Ruimtes-tab zien en gebruiken', group: 'Schermen' },
  { key: 'screens.soos', label: 'Soos', description: 'Openingstijden, bardienst en prijzen zien', group: 'Schermen' },
  { key: 'screens.planning', label: 'Planning', description: 'De Planning-tab zien', group: 'Schermen' },
  { key: 'screens.agenda', label: 'Agenda', description: 'De agenda met evenementen zien', group: 'Schermen' },
  { key: 'screens.profiel', label: 'Profiel', description: 'Het eigen profiel zien', group: 'Schermen' },
  { key: 'screens.adminRoles', label: 'Rollen beheren', description: 'Rollen aanmaken en permissies aanpassen', group: 'Beheer' },
  { key: 'screens.adminMembers', label: 'Leden beheren', description: 'Leden zien en rollen aan leden toewijzen', group: 'Beheer' },

  { key: 'feed.postMembers', label: 'Plaatsen in ledenfeed', description: 'Berichten plaatsen in de ledenfeed (casual, voor alle leden)', group: 'Home' },
  { key: 'feed.postMain', label: 'Plaatsen als Bestuur', description: 'Updates plaatsen in de hoofdfeed onder de naam "Bestuur"', group: 'Home' },
  { key: 'feed.moderate', label: 'Feed modereren', description: 'Andermans berichten en reacties verwijderen in beide feeds', group: 'Home' },

  { key: 'ruimtes.book', label: 'Ruimte reserveren', description: 'Een nieuwe reservering maken', group: 'Ruimtes' },
  { key: 'ruimtes.linkMembers', label: 'Leden koppelen', description: 'Andere leden aan een reservering koppelen', group: 'Ruimtes' },
  { key: 'ruimtes.bookFysio', label: 'Fysio ruimte boeken', description: 'De afgesloten Fysio ruimte mogen reserveren', group: 'Ruimtes' },
  { key: 'ruimtes.cancelAnyBooking', label: 'Reserveringen van anderen annuleren', description: 'Ook reserveringen van andere leden kunnen annuleren', group: 'Ruimtes' },

  { key: 'planning.submitPreferences', label: 'Voorkeuren doorgeven', description: 'Ja/Kan/Nee doorgeven voor open tijdvakken', group: 'Planning' },
  { key: 'planning.plannable', label: 'Inplanbaar voor bardienst', description: 'Deze rol staat in de lijst waaruit de Hoofd Soos leden voor een bardienst kan inplannen', group: 'Planning' },
  { key: 'planning.setSlots', label: 'Tijdvakken openzetten', description: 'Nieuwe tijdvakken voor een week openzetten', group: 'Planning' },
  { key: 'planning.assignMembers', label: 'Leden inplannen', description: 'Leden toevoegen aan een tijdvak in de conceptplanning', group: 'Planning' },
  { key: 'planning.publish', label: 'Planning publiceren', description: 'De weekplanning publiceren voor alle leden', group: 'Planning' },

  { key: 'soos.managePrices', label: 'Soos-info beheren', description: 'De prijslijst en openingstijden van de Soos aanpassen', group: 'Soos' },

  { key: 'agenda.manage', label: 'Agenda beheren', description: 'Evenementen toevoegen, aanpassen of verwijderen', group: 'Agenda' },
  { key: 'agenda.manageRegistration', label: 'Aanmeldingen beheren', description: 'Een aanmeldformulier toevoegen aan een bestaande activiteit en aanmeldingen inzien', group: 'Agenda' },

  { key: 'notifications.sendCustom', label: 'Losse melding sturen', description: 'Een eigen pushmelding sturen naar leden die dat type melding aan hebben staan', group: 'Meldingen' },
  { key: 'notifications.sendSoosOpen', label: '"Soos is open" melden', description: 'De pushmelding sturen dat de Soos open is', group: 'Meldingen' },

  { key: 'members.manage', label: 'Leden beheren', description: 'Leden uitnodigen en rollen toewijzen', group: 'Beheer' },
  { key: 'roles.manage', label: 'Rollen beheren', description: 'Rollen aanmaken, hernoemen en permissies wijzigen', group: 'Beheer' },
];

export const PERMISSION_GROUPS = [
  'Schermen',
  'Home',
  'Ruimtes',
  'Planning',
  'Soos',
  'Agenda',
  'Meldingen',
  'Beheer',
] as const;

// Seed data for the two built-in roles. Bestuur is intentionally granted
// every permission; Lid gets a sensible baseline that Bestuur can still
// edit later like any other role.
export const DEFAULT_ROLE_SEED: Record<string, Partial<Record<PermissionKey, boolean>>> = {
  Bestuur: Object.fromEntries(PERMISSIONS.map((p) => [p.key, true])),
  Lid: {
    'screens.home': true,
    'screens.soos': true,
    'screens.agenda': true,
    'screens.profiel': true,
    'screens.ruimtes': false,
    'screens.planning': false,
    'screens.adminRoles': false,
    'screens.adminMembers': false,
    'feed.postMembers': true,
    'feed.postMain': false,
    'feed.moderate': false,
    'ruimtes.book': false,
    'ruimtes.linkMembers': false,
    'ruimtes.bookFysio': false,
    'ruimtes.cancelAnyBooking': false,
    'planning.submitPreferences': false,
    'planning.plannable': false,
    'planning.setSlots': false,
    'planning.assignMembers': false,
    'planning.publish': false,
    'soos.managePrices': false,
    'agenda.manage': false,
    'agenda.manageRegistration': false,
    'notifications.sendCustom': false,
    'notifications.sendSoosOpen': false,
    'members.manage': false,
    'roles.manage': false,
  },
};
