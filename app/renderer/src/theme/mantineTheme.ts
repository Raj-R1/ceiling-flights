import { createTheme } from '@mantine/core';
import { GLASS_SURFACE_TOKENS, RADIUS_TOKENS } from './glassTokens';

export const mantineTheme = createTheme({
  primaryColor: 'gray',
  defaultRadius: 'md',
  shadows: {
    md: GLASS_SURFACE_TOKENS.shadow
  },
  components: {
    Paper: {
      defaultProps: {
        shadow: 'md',
        radius: RADIUS_TOKENS.card
      },
      styles: {
        root: {
          background: GLASS_SURFACE_TOKENS.background,
          border: `1px solid ${GLASS_SURFACE_TOKENS.border}`,
          backdropFilter: `blur(${GLASS_SURFACE_TOKENS.blurPanel}) saturate(162%) contrast(1.1)`,
          WebkitBackdropFilter: `blur(${GLASS_SURFACE_TOKENS.blurPanel}) saturate(162%) contrast(1.1)`
        }
      }
    },
    Modal: {
      styles: {
        content: {
          background: 'rgba(16, 19, 24, 0.82)',
          border: `1px solid ${GLASS_SURFACE_TOKENS.border}`,
          backdropFilter: `blur(${GLASS_SURFACE_TOKENS.blurPanel}) saturate(150%)`,
          WebkitBackdropFilter: `blur(${GLASS_SURFACE_TOKENS.blurPanel}) saturate(150%)`
        },
        header: {
          background: 'transparent'
        },
        overlay: {
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(2px)'
        }
      }
    }
  }
});
