import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  // S2P Academy - Main learning content
  academySidebar: [
    'academy/intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'academy/platform-overview',
        'academy/user-roles',
        'academy/job-lifecycle',
      ],
    },
    {
      type: 'category',
      label: 'Sales & Pipeline',
      items: [
        'academy/sales-pipeline',
        'academy/buyer-personas',
        'academy/staleness-engine',
      ],
    },
    {
      type: 'category',
      label: 'CPQ Quote Builder',
      items: [
        'academy/cpq-quote-builder',
        'academy/building-types',
        'academy/disciplines-lod',
        'academy/risk-factors',
        'academy/travel-pricing',
        'academy/margin-gates',
      ],
    },
    {
      type: 'category',
      label: 'Proposals',
      items: [
        'academy/proposal-builder',
        'academy/templates-variables',
        'academy/case-studies',
      ],
    },
    {
      type: 'category',
      label: 'Production',
      items: [
        'academy/production-workflow',
        'academy/sqft-variance',
        'academy/production-gates',
      ],
    },
    {
      type: 'category',
      label: 'FieldHub Mobile',
      items: [
        'academy/fieldhub-mobile',
        'academy/voice-notes',
        'academy/gps-tracking',
      ],
    },
    {
      type: 'category',
      label: 'AI Features',
      items: [
        'academy/ai-features',
        'academy/ai-assistant',
      ],
    },
  ],

  // User Manual - Reference documentation
  manualSidebar: [
    'manual/overview',
    {
      type: 'category',
      label: 'Integrations',
      items: [
        'manual/quickbooks',
        'manual/pandadoc',
        'manual/google-workspace',
      ],
    },
    {
      type: 'category',
      label: 'Settings',
      items: [
        'manual/business-defaults',
        'manual/lead-sources',
        'manual/team-management',
      ],
    },
    {
      type: 'category',
      label: 'Financial Module',
      items: [
        'manual/profit-first',
        'manual/invoicing',
      ],
    },
  ],

  // FAQ - Troubleshooting
  faqSidebar: [
    'faq/troubleshooting',
    'faq/common-issues',
    'faq/mobile-issues',
  ],
};

export default sidebars;
