export type ThemeId = 'forest' | 'ocean' | 'plum' | 'sunset' | 'midnight';

export type ThemeColors = {
  isDark: boolean;
  text: string;
  tint: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  successSurface: string;
  warningSurface: string;
  dangerSurface: string;
  border: string;
  input: string;
};

export type ThemeDefinition = {
  name: string;
  swatches: string[];
  light: ThemeColors;
  dark: ThemeColors;
};

const forestLight: ThemeColors = {
  isDark: false,
  text: '#1B2923',
  tint: '#194B3B',
  background: '#F5F6F1',
  foreground: '#1B2923',
  card: '#FFFFFF',
  cardForeground: '#1B2923',
  primary: '#194B3B',
  primaryForeground: '#FFFFFF',
  secondary: '#E9EEE7',
  secondaryForeground: '#194B3B',
  muted: '#EDF0EA',
  mutedForeground: '#65736B',
  accent: '#D7EE9B',
  accentForeground: '#233B2D',
  destructive: '#B44338',
  destructiveForeground: '#FFFFFF',
  successSurface: '#EAF2E8',
  warningSurface: '#F5F0E4',
  dangerSurface: '#FBEDEA',
  border: '#E4E8E1',
  input: '#DEE4DC',
};

const forestDark: ThemeColors = {
  isDark: true,
  text: '#EFF5F0',
  tint: '#9CCDB3',
  background: '#111A16',
  foreground: '#EFF5F0',
  card: '#1A2720',
  cardForeground: '#EFF5F0',
  primary: '#9CCDB3',
  primaryForeground: '#122018',
  secondary: '#26372D',
  secondaryForeground: '#D6E8DC',
  muted: '#202E26',
  mutedForeground: '#A2B0A7',
  accent: '#D7EE9B',
  accentForeground: '#233B2D',
  destructive: '#FF9B8D',
  destructiveForeground: '#29110E',
  successSurface: '#20392B',
  warningSurface: '#3A321F',
  dangerSurface: '#3F2723',
  border: '#2B3A30',
  input: '#33443A',
};

export const themePalettes: Record<ThemeId, ThemeDefinition> = {
  forest: {
    name: 'Forest',
    swatches: ['#194B3B', '#D7EE9B', '#F5F6F1'],
    light: forestLight,
    dark: forestDark,
  },
  ocean: {
    name: 'Ocean',
    swatches: ['#135B7A', '#9FE3DC', '#F1F7FA'],
    light: {
      ...forestLight,
      tint: '#135B7A',
      background: '#F1F7FA',
      primary: '#135B7A',
      secondary: '#E2EEF4',
      secondaryForeground: '#164B64',
      muted: '#EAF1F5',
      mutedForeground: '#617783',
      accent: '#9FE3DC',
      accentForeground: '#123C45',
      successSurface: '#E6F3EE',
      warningSurface: '#F5F0E4',
      dangerSurface: '#FBEDEA',
      border: '#DDE8ED',
      input: '#D3E1E7',
    },
    dark: {
      ...forestDark,
      tint: '#83C7E4',
      primary: '#83C7E4',
      primaryForeground: '#102834',
      secondary: '#213744',
      secondaryForeground: '#D3E9F2',
      muted: '#1D2D36',
      mutedForeground: '#A2B7C1',
      accent: '#9FE3DC',
      accentForeground: '#123C45',
      successSurface: '#203A35',
      warningSurface: '#3A321F',
      dangerSurface: '#3F2723',
      border: '#2B3D47',
      input: '#334955',
    },
  },
  plum: {
    name: 'Plum',
    swatches: ['#6B3F7A', '#E5C5E8', '#FAF5FB'],
    light: {
      ...forestLight,
      tint: '#6B3F7A',
      background: '#FAF5FB',
      primary: '#6B3F7A',
      secondary: '#F0E6F2',
      secondaryForeground: '#603A6B',
      muted: '#F2EDF3',
      mutedForeground: '#786D7C',
      accent: '#E5C5E8',
      accentForeground: '#4E3154',
      successSurface: '#EAF2E8',
      warningSurface: '#F5F0E4',
      dangerSurface: '#FBEDEA',
      border: '#E9DFEB',
      input: '#DED3E1',
    },
    dark: {
      ...forestDark,
      tint: '#D7A9DF',
      primary: '#D7A9DF',
      primaryForeground: '#2A1730',
      secondary: '#382B3C',
      secondaryForeground: '#EAD9ED',
      muted: '#2B2430',
      mutedForeground: '#B7AABD',
      accent: '#E5C5E8',
      accentForeground: '#4E3154',
      successSurface: '#20392B',
      warningSurface: '#3A321F',
      dangerSurface: '#3F2723',
      border: '#403448',
      input: '#4D3E55',
    },
  },
  sunset: {
    name: 'Sunset',
    swatches: ['#9D4D2F', '#FFD7AE', '#FFF7F0'],
    light: {
      ...forestLight,
      tint: '#9D4D2F',
      background: '#FFF7F0',
      primary: '#9D4D2F',
      secondary: '#F8E9DA',
      secondaryForeground: '#86432B',
      muted: '#F5EEE7',
      mutedForeground: '#7D6E63',
      accent: '#FFD7AE',
      accentForeground: '#60371F',
      successSurface: '#EAF2E8',
      warningSurface: '#F7EEDF',
      dangerSurface: '#FBEDEA',
      border: '#EFE2D5',
      input: '#E6D6C7',
    },
    dark: {
      ...forestDark,
      tint: '#F0A27D',
      primary: '#F0A27D',
      primaryForeground: '#351C14',
      secondary: '#3B2A24',
      secondaryForeground: '#F3DDD0',
      muted: '#30251F',
      mutedForeground: '#BBA99B',
      accent: '#FFD7AE',
      accentForeground: '#60371F',
      successSurface: '#20392B',
      warningSurface: '#3D321D',
      dangerSurface: '#3F2723',
      border: '#49362C',
      input: '#594337',
    },
  },
  midnight: {
    name: 'Midnight',
    swatches: ['#111827', '#75B7FF', '#283449'],
    light: {
      ...forestDark,
      tint: '#75B7FF',
      primary: '#75B7FF',
      primaryForeground: '#102139',
      secondary: '#283449',
      secondaryForeground: '#DCE7F5',
      muted: '#202B3A',
      mutedForeground: '#A8B5C7',
      accent: '#A8D2FF',
      accentForeground: '#1D3450',
      border: '#334157',
      input: '#3D4B62',
    },
    dark: {
      ...forestDark,
      tint: '#75B7FF',
      primary: '#75B7FF',
      primaryForeground: '#102139',
      secondary: '#283449',
      secondaryForeground: '#DCE7F5',
      muted: '#202B3A',
      mutedForeground: '#A8B5C7',
      accent: '#A8D2FF',
      accentForeground: '#1D3450',
      border: '#334157',
      input: '#3D4B62',
    },
  },
};

const colors = {
  light: forestLight,
  dark: forestDark,
  radius: 16,
};

export default colors;
