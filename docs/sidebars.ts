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
      items: ['adapters', 'built-in-adapters', 'custom-adapters'],
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
