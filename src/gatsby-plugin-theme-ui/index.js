import { merge } from "theme-ui";
import originalTheme from "@lekoarts/gatsby-theme-minimal-blog/src/gatsby-plugin-theme-ui/index";
import tailwind from "@theme-ui/preset-tailwind";

const theme = merge(originalTheme, {
  fonts: {
    heading: `system-ui, monospace`,
    body: `system-ui, monospace`,
  },
  colors: {
    primary: tailwind.colors.blue[7],
    modes: {
      dark: {
        primary: tailwind.colors.blue[5],
      },
    },
  },
});

export default theme;
