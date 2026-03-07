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
          background: 'rgba(14, 17, 22, 0.38)',
          border: `1px solid ${GLASS_SURFACE_TOKENS.border}`,
          borderRadius: RADIUS_TOKENS.card,
          backdropFilter: 'blur(20px) saturate(180%) contrast(1.05)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%) contrast(1.05)',
          overflow: 'hidden',
          boxShadow: [
            'inset 1px 1px 0 rgba(255, 255, 255, 0.14)',
            'inset -1px -1px 0 rgba(255, 255, 255, 0.04)',
            GLASS_SURFACE_TOKENS.shadow,
          ].join(', ')
        },
        header: {
          background: 'transparent'
        },
        overlay: {
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(3px)'
        }
      }
    }
  }
});
