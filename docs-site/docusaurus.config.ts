import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Scan2Plan Academy',
  tagline: 'Official Documentation for Scan2Plan OS',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.scan2plan.io',
  baseUrl: '/',

  organizationName: 'CPTV27',
  projectName: 'Scan2Plan_OS',

  onBrokenLinks: 'warn',

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
          editUrl: 'https://github.com/CPTV27/Scan2Plan_OS/tree/main/docs-site/',
          routeBasePath: '/', // Serve docs at root
        },
        blog: false, // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Scan2Plan Academy',
      logo: {
        alt: 'Scan2Plan Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'academySidebar',
          position: 'left',
          label: 'Academy',
        },
        {
          type: 'docSidebar',
          sidebarId: 'manualSidebar',
          position: 'left',
          label: 'User Manual',
        },
        {
          type: 'docSidebar',
          sidebarId: 'faqSidebar',
          position: 'left',
          label: 'FAQ',
        },
        {
          href: 'https://github.com/CPTV27/Scan2Plan_OS',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Getting Started', to: '/' },
            { label: 'Sales Pipeline', to: '/academy/sales-pipeline' },
            { label: 'CPQ Builder', to: '/academy/cpq-quote-builder' },
          ],
        },
        {
          title: 'Features',
          items: [
            { label: 'Proposal Builder', to: '/academy/proposal-builder' },
            { label: 'FieldHub Mobile', to: '/academy/fieldhub-mobile' },
            { label: 'AI Features', to: '/academy/ai-features' },
          ],
        },
        {
          title: 'Resources',
          items: [
            { label: 'User Manual', to: '/manual/overview' },
            { label: 'Troubleshooting', to: '/faq/troubleshooting' },
            { label: 'API Docs', href: '/api-docs' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Scan2Plan. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'json'],
    },
    algolia: undefined, // Remove if you don't use Algolia search
  } satisfies Preset.ThemeConfig,
};

export default config;
