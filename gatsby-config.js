require(`dotenv`).config();

const shouldAnalyseBundle = process.env.ANALYSE_BUNDLE;
const googleAnalyticsTrackingId = process.env.GOOGLE_ANALYTICS_ID;

module.exports = {
  pathPrefix: "/",
  siteMetadata: {
    siteTitle: `Nguyễn Hữu Tiền`,
    siteTitleAlt: `Tien Nguyen - My Personal Website`,
    siteHeadline: `Tien's Personal Website`,
    siteUrl: `https://nguyenhuutien.com`,
    siteDescription: `Hi, my name is Tien. Here, I will write about things I am learning, learned, and will learn in the future.`,
    siteLanguage: `en`,
    siteImage: `/banner.jpg`,
    author: `@hxutixnnn`,
  },
  plugins: [
    "gatsby-plugin-pnpm",
    {
      resolve: `@lekoarts/gatsby-theme-minimal-blog`,
      // See the theme's README for all available options
      options: {
        navigation: [
          {
            title: `about`,
            slug: `/about`,
          },
          {
            title: `blog`,
            slug: `/blog`,
          },
          {
            title: `uses`,
            slug: `/uses`,
          },
          {
            title: `resume`,
            slug: `/resume.pdf`,
          },
        ],
        externalLinks: [],
      },
    },
    {
      resolve: `gatsby-omni-font-loader`,
      options: {
        enableListener: true,
        preconnect: [`https://fonts.gstatic.com`],
        interval: 300,
        timeout: 30000,
        // If you plan on changing the font you'll also need to adjust the Theme UI config to edit the CSS
        // See: https://github.com/LekoArts/gatsby-themes/tree/master/examples/minimal-blog#changing-your-fonts
        web: [],
      },
    },
    {
      resolve: `gatsby-plugin-google-gtag`,
      options: {
        // You can add multiple tracking ids and a pageview event will be fired for all of them.
        trackingIds: [
          googleAnalyticsTrackingId, // Google Analytics / GA
        ],
        // This object gets passed directly to the gtag config command
        // This config will be shared across all trackingIds
        gtagConfig: {
          optimize_id: "OPT_CONTAINER_ID",
          anonymize_ip: true,
          cookie_expires: 0,
        },
        // This object is used for configuration specific to this plugin
        pluginConfig: {
          // Puts tracking script in the head instead of the body
          head: true,
          // Setting this parameter is also optional
          respectDNT: true,
          // Avoids sending pageview hits from custom paths
          exclude: ["/preview/**", "/do-not-track/me/too/"],
          // Defaults to https://www.googletagmanager.com
          origin: "nguyenhuutien.com",
          // Delays processing pageview events on route update (in milliseconds)
          delayOnRouteUpdate: 0,
        },
      },
    },
    `gatsby-plugin-sitemap`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `Tien Nguyen - My Personal Website`,
        short_name: `Nguyễn Hữu Tiền`,
        description: `Hi, my name is Tien. Here, I will write about things I am learning, learned, and will learn in the future.`,
        start_url: `/`,
        background_color: `#fff`,
        theme_color: `#2b6cb0`,
        display: `standalone`,
        icons: [
          {
            src: `/android-chrome-192x192.png`,
            sizes: `192x192`,
            type: `image/png`,
          },
          {
            src: `/android-chrome-512x512.png`,
            sizes: `512x512`,
            type: `image/png`,
          },
        ],
      },
    },
    {
      resolve: `gatsby-plugin-feed`,
      options: {
        query: `
          {
            site {
              siteMetadata {
                title: siteTitle
                description: siteDescription
                siteUrl
                site_url: siteUrl
              }
            }
          }
        `,
        feeds: [
          {
            serialize: ({ query: { site, allPost } }) =>
              allPost.nodes.map((post) => {
                const url = site.siteMetadata.siteUrl + post.slug;
                const content = `<p>${post.excerpt}</p><div style="margin-top: 50px; font-style: italic;"><strong><a href="${url}">Keep reading</a>.</strong></div><br /> <br />`;

                return {
                  title: post.title,
                  date: post.date,
                  excerpt: post.excerpt,
                  url,
                  guid: url,
                  custom_elements: [{ "content:encoded": content }],
                };
              }),
            query: `
              {
                allPost(sort: { fields: date, order: DESC }) {
                  nodes {
                    title
                    date(formatString: "MMMM D, YYYY")
                    excerpt
                    slug
                  }
                }
              }
            `,
            output: `rss.xml`,
            title: `Tien Nguyen - My Personal Website`,
          },
        ],
      },
    },
    shouldAnalyseBundle && {
      resolve: `gatsby-plugin-webpack-bundle-analyser-v2`,
      options: {
        analyzerMode: `static`,
        reportFilename: `_bundle.html`,
        openAnalyzer: false,
      },
    },
  ].filter(Boolean),
};
