import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'getting-started',
    'api-comparison',
    'navigation-modes',
    'scale-animation',
    'context-preservation',
    'type-safe-ids',
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      items: ['api/components', 'api/hooks', 'api/types'],
    },
  ],
};

export default sidebars;
