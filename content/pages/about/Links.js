import * as React from "react";
import { Flex, Box, Link, Image } from "theme-ui";

export default function Links() {
  return (
    <Flex
      sx={{
        flexDirection: ["column", "row"],
        alignItems: ["flex-start", "center"],
        gap: "1em",
      }}
    >
      <Image
        src="https://github.com/hxutixnnn.png?size=200"
        width={200}
        height={200}
        alt="My Github Avatar"
        sx={{ flex: "0 0 auto", width: 200, height: 200 }}
      />
      <Box>
        <p>
          You can find me (mostly with <code>@hxutixnnn</code>) on:
        </p>
        <ul>
          {[
            ["Twitter", "https://twitter.com/hxutixnnn"],
            ["Facebook", "https://www.facebook.com/hxutixnnn"],
            ["Github", "https://github.com/hxutixnnn"],
            ["LinkedIn", "https://www.linkedin.com/in/tiennguyenhuu"],
            ["Instagram", "https://www.instagram.com/hxutixnnn"],
            ["Email", "mailto:work@nguyenhuutien.com"],
          ].map(([name, url]) => (
            <li key={name}>
              <Link target="_blank" href={url}>
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </Box>
    </Flex>
  );
}
