import type { SocialObjects } from "./types";

export const SITE = {
  website: "https://lucas.rs/",
  author: "Lucas Rodrigues",
  desc: "My personal website.",
  title: "lucas.rs",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerPage: 3,
};

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/plutaniano",
    linkTitle: "GitHub",
    active: true,
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/in/lucasrs001",
    linkTitle: "LinkedIn",
    active: true,
  },
  {
    name: "Mail",
    href: "mailto:site@lucas.rs",
    linkTitle: "Email",
    active: true,
  },
];
