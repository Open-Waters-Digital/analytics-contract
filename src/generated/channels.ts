// Generated from contract/channels.json by scripts/generate.ts. Do not edit:
// change the source and run `pnpm run generate`.

/** Which sources, mediums and domains belong to which channel. */
export const CHANNEL_TABLE = {
  "paid": {
    "mediums": [
      "cpc",
      "cpm",
      "cpv",
      "cpa",
      "ppc",
      "retargeting"
    ],
    "mediumPrefix": "paid",
    "crossNetworkCampaign": "cross-network"
  },
  "directSources": [
    "direct",
    "(direct)",
    "$direct"
  ],
  "mediums": {
    "email": [
      "email",
      "e-mail",
      "e_mail",
      "e mail"
    ],
    "social": [
      "social",
      "sm",
      "social media",
      "social-media",
      "social network",
      "social-network"
    ],
    "video": [
      "video"
    ],
    "referral": [
      "referral",
      "app",
      "affiliate",
      "partnership",
      "partnerships"
    ]
  },
  "sources": {
    "ai": [
      "chatgpt",
      "openai",
      "claude",
      "gemini",
      "copilot",
      "deepseek",
      "perplexity",
      "grok",
      "kimi"
    ],
    "search": [
      "google",
      "bing",
      "baidu",
      "yahoo",
      "ask",
      "yandex",
      "duckduckgo",
      "aol",
      "msn",
      "daum",
      "naver",
      "sogou",
      "coccoc",
      "brave",
      "qwant",
      "ecosia",
      "dogpile",
      "lycos",
      "excite",
      "hotbot",
      "gigablast",
      "mojeek",
      "kagi",
      "startpage"
    ],
    "social": [
      "facebook",
      "fb",
      "twitter",
      "x",
      "instagram",
      "ig",
      "tiktok",
      "linkedin",
      "pinterest",
      "snapchat",
      "reddit",
      "tumblr",
      "discord",
      "quora",
      "mastodon",
      "bluesky",
      "bsky",
      "threads",
      "nextdoor",
      "medium",
      "flickr",
      "deviantart",
      "myspace",
      "badoo",
      "meetup",
      "goodreads",
      "ravelry",
      "blogger",
      "wordpress"
    ],
    "video": [
      "youtube",
      "netflix",
      "hulu",
      "twitch",
      "vimeo",
      "dailymotion",
      "iqiyi"
    ],
    "shopping": [
      "amazon",
      "ebay",
      "etsy",
      "alibaba",
      "shopify",
      "mercadolibre"
    ]
  },
  "domains": {
    "chatgpt.com": "ai",
    "chat.openai.com": "ai",
    "claude.ai": "ai",
    "gemini.google.com": "ai",
    "bard.google.com": "ai",
    "copilot.microsoft.com": "ai",
    "perplexity.ai": "ai",
    "www.perplexity.ai": "ai",
    "chat.deepseek.com": "ai",
    "grok.com": "ai",
    "t.co": "social",
    "x.com": "social",
    "lnkd.in": "social",
    "l.facebook.com": "social",
    "lm.facebook.com": "social",
    "m.facebook.com": "social",
    "l.instagram.com": "social",
    "out.reddit.com": "social",
    "bsky.app": "social",
    "youtu.be": "video",
    "search.brave.com": "search",
    "startpage.com": "search"
  }
} as const;
