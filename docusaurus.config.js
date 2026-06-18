// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'i3X Docs',
  tagline: 'A common API for contextualized manufacturing information platforms',
  //favicon: 'img/favicon.ico',
  favicon: 'img/i3X_circle.png',
  
  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://i3x.dev',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/sdk/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'cesmii', // Usually your GitHub org/user name.
  projectName: 'i3x-sdk-docs', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/cesmii/i3x-sdk-docs/blob/main/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/i3X_circle.png',
      metadata: [
        {property: 'og:type', content: 'website'},
        {property: 'og:site_name', content: 'i3X Developer Docs'},
        {property: 'og:description', content: 'Developer documentation for i3X, a common API for contextualized manufacturing information platforms'},
        {property: 'og:image', content: 'https://i3x.dev/docs/img/SDKPreview.png'},
        {name: 'twitter:card', content: 'summary_large_image'},
        {name: 'twitter:description', content: 'Developer documentation for i3X, a common API for contextualized manufacturing information platforms'},
        {name: 'twitter:image', content: 'https://i3x.dev/docs/img/SDKPreview.png'},
      ],
      colorMode: {
        disableSwitch: true,
        // respectPrefersColorScheme: true,
      },
      navbar: {
        //title: 'i3X',
        logo: {
          alt: 'i3X Logo',
          src: 'img/i3X_circle.png',
          href: 'https://www.i3x.dev',
          target: '_self',
        },
        items: [
          {
            href: '/quickstart',
            label: 'Quick Start',
            position: 'left',
          },
          {
            href: '/faq',
            label: 'FAQ',
            position: 'left',
          },
          {
            href: '/gotchas',
            label: 'Gotchas',
            position: 'left',
          },
          {
            href: 'https://acetechnologies.net/i3X',
            label: 'i3X Explorer',
            position: 'left',
          },
          {
            href: 'https://github.com/cesmii/i3X',
            label: 'i3X GitHub',
            position: 'left',
          }
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Places',
            items: [
              {
                href: 'https://www.i3x.dev',
                label: 'i3X Home',
                target: '_self'
              },
              {
                label: 'Quick Start',
                to: '/quickstart',
              },
              {
                label: 'FAQ',
                to: '/faq',
              },
              {
                label: 'Server Developers',
                to: '/Server-Developers/overview',
              },
              {
                label: 'Client Developers',
                to: '/Client-Developers/overview',
              }
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'YouTube',
                href: 'https://www.youtube.com/channel/UCzfo1qx-6ExYGdW-S8A3HAA',
              },
              {
                label: 'iTunes',
                href: 'https://podcasts.apple.com/us/podcast/smart-manufacturing-mindset/id1694727743',
              },
              {
                label: 'Spotify',
                href: 'https://open.spotify.com/show/2EYduePF6JsI37pRDtDaGz?si=6a3bcb806bb94233&nd=1&dlsi=39d0101bfc2140d8',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'LinkedIn',
                href: 'https://www.linkedin.com/company/the-smart-manufacturing-institute/',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/cesmii/i3X',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} CESMII`,
      },
/*      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
*/
      }),
};

export default config;
