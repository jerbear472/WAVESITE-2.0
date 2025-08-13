import { Theme } from '../constants/theme';

declare module '../constants/theme' {
  interface ThemeType {
    colors: typeof Theme.colors;
    spacing: typeof Theme.spacing & {
      full?: number;
    };
    borderRadius: typeof Theme.borderRadius & {
      full?: number;
    };
    gradients?: {
      primary: string[];
      secondary: string[];
      success: string[];
    };
  }
}
