import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'react-native-bottom-sheet-stack',
  tagline:
    'Stack manager for @gorhom/bottom-sheet with push, switch, replace navigation and iOS-style scale animations',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://arekkubaczkowski.github.io',
  baseUrl: '/react-native-bottom-sheet-stack/',

  organizationName: 'arekkubaczkowski',
  projectName: 'react-native-bottom-sheet-stack',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl:
            'https://github.com/arekkubaczkowski/react-native-bottom-sheet-stack/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Bottom Sheet Stack',
      hideOnScroll: true,
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/arekkubaczkowski/react-native-bottom-sheet-stack',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/getting-started',
            },
            {
              label: 'API Reference',
              to: '/api/components',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/arekkubaczkowski/react-native-bottom-sheet-stack',
            },
            {
              label: '@gorhom/bottom-sheet',
              href: 'https://github.com/gorhom/react-native-bottom-sheet',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Arek Kubaczkowski. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
