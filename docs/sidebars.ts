import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'getting-started',
    'api-comparison',
    'navigation-modes',
    'scale-animation',
    'context-preservation',
    'persistent-sheets',
    'close-interception',
    'type-safe-ids',
    {
      type: 'category',
      label: 'Adapters',
      collapsed: false,
      items: [
        'adapters',
        {
          type: 'category',
          label: 'Built-in Adapters',
          collapsed: false,
          link: { type: 'doc', id: 'built-in-adapters/index' },
          items: [
            'built-in-adapters/gorhom',
            'built-in-adapters/swmansion',
            'built-in-adapters/custom-modal',
            'built-in-adapters/react-native-modal',
            'built-in-adapters/actions-sheet',
          ],
        },
        'custom-adapters',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      items: ['api/components', 'api/hooks', 'api/types'],
    },
  ],
};

export default sidebars;
