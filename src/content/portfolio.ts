import socialProfiles from "@/apps/social-links.json";

export const socialLinks = socialProfiles.map(({ name, url }) => [name, url] as const);

export const postSummaries = [
  {
    title: "Versioning The Right Way",
    date: "2023-07-04",
    path: "/versioning-the-right-way/",
    tags: ["Build In Public", "Guide", "Versioning"],
  },
  {
    title: "How to fix Expo EAS build fastlane bitcode error",
    date: "2023-04-20",
    path: "/how-to-fix-expo-eas-build-fastlane-bitcode-error/",
    tags: ["EAS Build", "Expo", "React Native", "iOS"],
  },
  {
    title: "How to fix Android Emulator request audio permission on launch",
    date: "2023-03-30",
    path: "/how-to-fix-android-emulator-request-audio-permission-on-launch/",
    tags: ["Android Studio", "Emulator", "fix"],
  },
  {
    title: "Use pnpm with Gatsby",
    date: "2023-03-22",
    path: "/use-pnpm-with-gatsby/",
    tags: ["pnpm", "gatsby"],
  },
  {
    title: "Hello World",
    date: "2023-01-11",
    path: "/hello-world/",
    tags: [],
  },
] as const;

export const learningResources = [
  [
    "Web Dev Simplified",
    "https://youtube.com/@WebDevSimplified",
    "Easy-to-learn React and JavaScript videos.",
  ],
  ["Fireship", "https://youtube.com/@Fireship", "Fast, useful introductions to new technology."],
  ["Jack Herrington", "https://youtube.com/@jherr", "High-quality web engineering videos."],
  ["Theo — t3.gg", "https://youtube.com/@t3dotgg", "Technology commentary grounded in experience."],
] as const;

export const usesSummary = {
  hardware: [
    "MacBook Air (M1, 2020)",
    "Dell P2715Q 27-inch 4K monitor",
    "Keychron K2v2",
    "MX Master 3",
    "iPhone 13",
  ],
  software: [
    "Arc browser",
    "Visual Studio Code",
    "Warp and Terminal",
    "Git and Homebrew",
    "Node.js with pnpm",
  ],
} as const;

export const tilEntries = [
  {
    date: "2023-01-14",
    text: "A 2.4 GHz mouse receiver can interfere with 2.4 GHz Wi-Fi; Bluetooth or a 5 GHz network can reduce the conflict.",
  },
  {
    date: "2023-01-13",
    text: "Started this TIL page and learned the word “revere,” with thanks to bobby_dreamer.",
  },
] as const;
