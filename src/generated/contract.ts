// Generated from contract/events.json by scripts/generate.ts. Do not edit:
// change the source and run `pnpm run generate`.

import type { DashboardInsight, ListedEvent, SuperProperty } from "../contract-types.js";

/** The taxonomy version this release of the package sends. */
export const CURRENT_VERSION = 2;
/** As sent in the `taxonomy_version` property: a string. */
export const TAXONOMY_VERSION = "2";
export const VERSIONS = [1, 2] as const;
export type TaxonomyVersion = (typeof VERSIONS)[number];

/** The page types at the current version. */
export const PAGE_TYPES = ["home","service","product","case_study","about","contact","article","listing","legal","other"] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export interface BrowserEventsV1 {
  cta_clicked: {
    cta_id: string;
    cta_text: string;
    cta_location?: string;
  };
  contact_link_clicked: {
    channel: "phone" | "email" | "whatsapp";
    cta_location?: string;
  };
  file_downloaded: {
    file_name: string;
    file_type: string;
  };
  outbound_link_clicked: {
    link_domain: string;
  };
  scroll_depth_reached: {
    depth_percent: 25 | 50 | 75 | 100;
  };
  video_played: {
    video_id: string;
  };
  form_started: {
    form_id: string;
  };
  form_error_shown: {
    form_id: string;
    field_name: string;
    error_type: "required" | "format" | "too_long" | "server";
  };
  form_abandoned: {
    form_id: string;
    last_field: string | null;
    fields_completed: number;
  };
  form_submitted: {
    form_id: string;
  };
}

export interface ServerEventsV1 {
  lead_submitted: {
    form_id: string;
    lead_type: string;
  };
  lead_qualified: {
    lead_type: string;
    form_id: string;
  };
  deal_won: {
    lead_type: string;
    value: number;
    currency: string;
  };
}

export interface BrowserEventsV2 {
  cta_clicked: {
    cta_id: string;
    cta_text: string;
    cta_location?: string;
  };
  contact_link_clicked: {
    channel: "phone" | "email" | "whatsapp";
    cta_location?: string;
  };
  file_downloaded: {
    file_name: string;
    file_type: string;
  };
  outbound_link_clicked: {
    link_domain: string;
  };
  scroll_depth_reached: {
    depth_percent: 25 | 50 | 75 | 100;
  };
  video_played: {
    video_id: string;
  };
  form_started: {
    form_id: string;
  };
  form_error_shown: {
    form_id: string;
    field_name: string;
    error_type: "required" | "format" | "too_long" | "server";
  };
  form_abandoned: {
    form_id: string;
    last_field: string | null;
    fields_completed: number;
  };
  form_submitted: {
    form_id: string;
  };
  consent_updated: {
    advertising: boolean;
    recordings: boolean;
    source: "banner" | "settings";
  };
}

export interface ServerEventsV2 {
  lead_submitted: {
    form_id: string;
    lead_type: string;
  };
  lead_qualified: {
    lead_type: string;
    form_id: string;
  };
  deal_won: {
    lead_type: string;
    value: number;
    currency: string;
  };
}

/** Browser events at the current version. */
export type BrowserEvents = BrowserEventsV2;
/** Server events at the current version. */
export type ServerEvents = ServerEventsV2;

/** Every version's events, as published. Never edited once published. */
export const EVENT_LISTS: Readonly<Record<TaxonomyVersion, readonly ListedEvent[]>> = {
  1: [
    {
      "name": "cta_clicked",
      "stage": "intent",
      "origin": "browser",
      "properties": [
        {
          "name": "cta_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "cta_text",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "cta_location",
          "type": {
            "kind": "string"
          },
          "required": false,
          "nullable": false
        }
      ]
    },
    {
      "name": "contact_link_clicked",
      "stage": "intent",
      "origin": "browser",
      "properties": [
        {
          "name": "channel",
          "type": {
            "kind": "enum",
            "values": [
              "phone",
              "email",
              "whatsapp"
            ]
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "cta_location",
          "type": {
            "kind": "string"
          },
          "required": false,
          "nullable": false
        }
      ]
    },
    {
      "name": "file_downloaded",
      "stage": "intent",
      "origin": "browser",
      "properties": [
        {
          "name": "file_name",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "file_type",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "outbound_link_clicked",
      "stage": "intent",
      "origin": "browser",
      "properties": [
        {
          "name": "link_domain",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "scroll_depth_reached",
      "stage": "intent",
      "origin": "browser",
      "properties": [
        {
          "name": "depth_percent",
          "type": {
            "kind": "enum",
            "values": [
              25,
              50,
              75,
              100
            ]
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "video_played",
      "stage": "intent",
      "origin": "browser",
      "properties": [
        {
          "name": "video_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "form_started",
      "stage": "action",
      "origin": "browser",
      "properties": [
        {
          "name": "form_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "form_error_shown",
      "stage": "action",
      "origin": "browser",
      "properties": [
        {
          "name": "form_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "field_name",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "error_type",
          "type": {
            "kind": "enum",
            "values": [
              "required",
              "format",
              "too_long",
              "server"
            ]
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "form_abandoned",
      "stage": "action",
      "origin": "browser",
      "properties": [
        {
          "name": "form_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "last_field",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": true
        },
        {
          "name": "fields_completed",
          "type": {
            "kind": "integer"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "form_submitted",
      "stage": "action",
      "origin": "browser",
      "properties": [
        {
          "name": "form_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "lead_submitted",
      "stage": "action",
      "origin": "server",
      "properties": [
        {
          "name": "form_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "lead_type",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "lead_qualified",
      "stage": "revenue",
      "origin": "server",
      "properties": [
        {
          "name": "lead_type",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "form_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "deal_won",
      "stage": "revenue",
      "origin": "server",
      "properties": [
        {
          "name": "lead_type",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "value",
          "type": {
            "kind": "integer"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "currency",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    }
  ],
  2: [
    {
      "name": "cta_clicked",
      "stage": "intent",
      "origin": "browser",
      "properties": [
        {
          "name": "cta_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "cta_text",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "cta_location",
          "type": {
            "kind": "string"
          },
          "required": false,
          "nullable": false
        }
      ]
    },
    {
      "name": "contact_link_clicked",
      "stage": "intent",
      "origin": "browser",
      "properties": [
        {
          "name": "channel",
          "type": {
            "kind": "enum",
            "values": [
              "phone",
              "email",
              "whatsapp"
            ]
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "cta_location",
          "type": {
            "kind": "string"
          },
          "required": false,
          "nullable": false
        }
      ]
    },
    {
      "name": "file_downloaded",
      "stage": "intent",
      "origin": "browser",
      "properties": [
        {
          "name": "file_name",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "file_type",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "outbound_link_clicked",
      "stage": "intent",
      "origin": "browser",
      "properties": [
        {
          "name": "link_domain",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "scroll_depth_reached",
      "stage": "intent",
      "origin": "browser",
      "properties": [
        {
          "name": "depth_percent",
          "type": {
            "kind": "enum",
            "values": [
              25,
              50,
              75,
              100
            ]
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "video_played",
      "stage": "intent",
      "origin": "browser",
      "properties": [
        {
          "name": "video_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "form_started",
      "stage": "action",
      "origin": "browser",
      "properties": [
        {
          "name": "form_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "form_error_shown",
      "stage": "action",
      "origin": "browser",
      "properties": [
        {
          "name": "form_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "field_name",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "error_type",
          "type": {
            "kind": "enum",
            "values": [
              "required",
              "format",
              "too_long",
              "server"
            ]
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "form_abandoned",
      "stage": "action",
      "origin": "browser",
      "properties": [
        {
          "name": "form_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "last_field",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": true
        },
        {
          "name": "fields_completed",
          "type": {
            "kind": "integer"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "form_submitted",
      "stage": "action",
      "origin": "browser",
      "properties": [
        {
          "name": "form_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "lead_submitted",
      "stage": "action",
      "origin": "server",
      "properties": [
        {
          "name": "form_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "lead_type",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "consent_updated",
      "stage": "consent",
      "origin": "browser",
      "properties": [
        {
          "name": "advertising",
          "type": {
            "kind": "boolean"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "recordings",
          "type": {
            "kind": "boolean"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "source",
          "type": {
            "kind": "enum",
            "values": [
              "banner",
              "settings"
            ]
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "lead_qualified",
      "stage": "revenue",
      "origin": "server",
      "properties": [
        {
          "name": "lead_type",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "form_id",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    },
    {
      "name": "deal_won",
      "stage": "revenue",
      "origin": "server",
      "properties": [
        {
          "name": "lead_type",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "value",
          "type": {
            "kind": "integer"
          },
          "required": true,
          "nullable": false
        },
        {
          "name": "currency",
          "type": {
            "kind": "string"
          },
          "required": true,
          "nullable": false
        }
      ]
    }
  ],
};

export const SUPER_PROPERTIES: Readonly<Record<TaxonomyVersion, readonly SuperProperty[]>> = {
  1: [
    {
      "name": "site",
      "type": {
        "kind": "string"
      },
      "origin": "both"
    },
    {
      "name": "taxonomy_version",
      "type": {
        "kind": "string"
      },
      "origin": "both"
    },
    {
      "name": "page_type",
      "type": {
        "kind": "string"
      },
      "origin": "browser"
    }
  ],
  2: [
    {
      "name": "site",
      "type": {
        "kind": "string"
      },
      "origin": "both"
    },
    {
      "name": "taxonomy_version",
      "type": {
        "kind": "string"
      },
      "origin": "both"
    },
    {
      "name": "page_type",
      "type": {
        "kind": "string"
      },
      "origin": "browser"
    },
    {
      "name": "ad_consent",
      "type": {
        "kind": "enum",
        "values": [
          "granted",
          "denied",
          "unset"
        ]
      },
      "origin": "browser"
    }
  ],
};

export const PAGE_TYPES_BY_VERSION: Readonly<Record<TaxonomyVersion, readonly string[]>> = {
  1: [
    "home",
    "service",
    "product",
    "case_study",
    "about",
    "contact",
    "article",
    "listing",
    "legal",
    "other"
  ],
  2: [
    "home",
    "service",
    "product",
    "case_study",
    "about",
    "contact",
    "article",
    "listing",
    "legal",
    "other"
  ],
};

export const BASELINE_DASHBOARD_NAME = "Digital Dividend baseline";

/** The baseline dashboard at each version. Insights are matched by key. */
export const BASELINE_DASHBOARDS: Readonly<Record<TaxonomyVersion, readonly DashboardInsight[]>> = {
  1: [
    {
      "key": "attention.visitors_and_page_views",
      "stage": "attention",
      "title": "Unique visitors and page views by week",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "$pageview",
          "math": "unique_visitors"
        },
        {
          "event": "$pageview",
          "math": "total"
        }
      ]
    },
    {
      "key": "attention.visitors_by_channel",
      "stage": "attention",
      "title": "Visitors by channel type",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "$pageview",
          "math": "unique_visitors"
        }
      ],
      "breakdown": {
        "property": "$channel_type",
        "scope": "session"
      }
    },
    {
      "key": "attention.visitors_by_referring_domain",
      "stage": "attention",
      "title": "Visitors by referring domain",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "$pageview",
          "math": "unique_visitors"
        }
      ],
      "breakdown": {
        "property": "$entry_referring_domain",
        "scope": "session"
      }
    },
    {
      "key": "attention.top_landing_pages",
      "stage": "attention",
      "title": "Top landing pages",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "$pageview",
          "math": "unique_visitors"
        }
      ],
      "breakdown": {
        "property": "$entry_pathname",
        "scope": "session"
      }
    },
    {
      "key": "attention.visitors_by_device",
      "stage": "attention",
      "title": "Visitors by device",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "$pageview",
          "math": "unique_visitors"
        }
      ],
      "breakdown": {
        "property": "$device_type",
        "scope": "event"
      }
    },
    {
      "key": "intent.cta_clicked_by_cta_id",
      "stage": "intent",
      "title": "`cta_clicked` by `cta_id`",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "cta_clicked",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "cta_id",
        "scope": "event"
      }
    },
    {
      "key": "intent.contact_link_clicked_by_channel",
      "stage": "intent",
      "title": "`contact_link_clicked` by `channel`",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "contact_link_clicked",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "channel",
        "scope": "event"
      }
    },
    {
      "key": "intent.file_downloaded_by_file_name",
      "stage": "intent",
      "title": "`file_downloaded` by `file_name`",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "file_downloaded",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "file_name",
        "scope": "event"
      }
    },
    {
      "key": "intent.scroll_75_by_page_type",
      "stage": "intent",
      "title": "Share of page views reaching 75% scroll, by `page_type`",
      "kind": "ratio",
      "interval": "week",
      "series": [
        {
          "event": "scroll_depth_reached",
          "math": "total",
          "where": {
            "depth_percent": 75
          }
        },
        {
          "event": "$pageview",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "page_type",
        "scope": "event"
      }
    },
    {
      "key": "action.form_funnel",
      "stage": "action",
      "title": "Funnel: `$pageview` → `form_started` → `form_submitted`, split by `form_id`",
      "kind": "funnel",
      "series": [
        {
          "event": "$pageview",
          "math": "total"
        },
        {
          "event": "form_started",
          "math": "total"
        },
        {
          "event": "form_submitted",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "form_id",
        "scope": "event"
      }
    },
    {
      "key": "action.lead_submitted_by_week",
      "stage": "action",
      "title": "`lead_submitted` by week",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "lead_submitted",
          "math": "total"
        }
      ]
    },
    {
      "key": "action.form_abandoned_by_last_field",
      "stage": "action",
      "title": "`form_abandoned` by `last_field`",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "form_abandoned",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "last_field",
        "scope": "event"
      }
    },
    {
      "key": "action.form_error_shown_by_field_name",
      "stage": "action",
      "title": "`form_error_shown` by `field_name`",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "form_error_shown",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "field_name",
        "scope": "event"
      }
    },
    {
      "key": "revenue.lead_qualified_by_month",
      "stage": "revenue",
      "title": "`lead_qualified` count by month",
      "kind": "trend",
      "interval": "month",
      "series": [
        {
          "event": "lead_qualified",
          "math": "total"
        }
      ]
    },
    {
      "key": "revenue.deal_won_by_month",
      "stage": "revenue",
      "title": "`deal_won` count and value by month",
      "kind": "trend",
      "interval": "month",
      "series": [
        {
          "event": "deal_won",
          "math": "total"
        },
        {
          "event": "deal_won",
          "math": "sum",
          "property": "value"
        }
      ]
    }
  ],
  2: [
    {
      "key": "attention.visitors_and_page_views",
      "stage": "attention",
      "title": "Unique visitors and page views by week",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "$pageview",
          "math": "unique_visitors"
        },
        {
          "event": "$pageview",
          "math": "total"
        }
      ]
    },
    {
      "key": "attention.visitors_by_channel",
      "stage": "attention",
      "title": "Visitors by channel type",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "$pageview",
          "math": "unique_visitors"
        }
      ],
      "breakdown": {
        "property": "$channel_type",
        "scope": "session"
      }
    },
    {
      "key": "attention.visitors_by_referring_domain",
      "stage": "attention",
      "title": "Visitors by referring domain",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "$pageview",
          "math": "unique_visitors"
        }
      ],
      "breakdown": {
        "property": "$entry_referring_domain",
        "scope": "session"
      }
    },
    {
      "key": "attention.top_landing_pages",
      "stage": "attention",
      "title": "Top landing pages",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "$pageview",
          "math": "unique_visitors"
        }
      ],
      "breakdown": {
        "property": "$entry_pathname",
        "scope": "session"
      }
    },
    {
      "key": "attention.visitors_by_device",
      "stage": "attention",
      "title": "Visitors by device",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "$pageview",
          "math": "unique_visitors"
        }
      ],
      "breakdown": {
        "property": "$device_type",
        "scope": "event"
      }
    },
    {
      "key": "intent.cta_clicked_by_cta_id",
      "stage": "intent",
      "title": "`cta_clicked` by `cta_id`",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "cta_clicked",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "cta_id",
        "scope": "event"
      }
    },
    {
      "key": "intent.contact_link_clicked_by_channel",
      "stage": "intent",
      "title": "`contact_link_clicked` by `channel`",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "contact_link_clicked",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "channel",
        "scope": "event"
      }
    },
    {
      "key": "intent.file_downloaded_by_file_name",
      "stage": "intent",
      "title": "`file_downloaded` by `file_name`",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "file_downloaded",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "file_name",
        "scope": "event"
      }
    },
    {
      "key": "intent.scroll_75_by_page_type",
      "stage": "intent",
      "title": "Share of page views reaching 75% scroll, by `page_type`",
      "kind": "ratio",
      "interval": "week",
      "series": [
        {
          "event": "scroll_depth_reached",
          "math": "total",
          "where": {
            "depth_percent": 75
          }
        },
        {
          "event": "$pageview",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "page_type",
        "scope": "event"
      }
    },
    {
      "key": "action.form_funnel",
      "stage": "action",
      "title": "Funnel: `$pageview` → `form_started` → `form_submitted`, split by `form_id`",
      "kind": "funnel",
      "series": [
        {
          "event": "$pageview",
          "math": "total"
        },
        {
          "event": "form_started",
          "math": "total"
        },
        {
          "event": "form_submitted",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "form_id",
        "scope": "event"
      }
    },
    {
      "key": "action.lead_submitted_by_week",
      "stage": "action",
      "title": "`lead_submitted` by week",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "lead_submitted",
          "math": "total"
        }
      ]
    },
    {
      "key": "action.form_abandoned_by_last_field",
      "stage": "action",
      "title": "`form_abandoned` by `last_field`",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "form_abandoned",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "last_field",
        "scope": "event"
      }
    },
    {
      "key": "action.form_error_shown_by_field_name",
      "stage": "action",
      "title": "`form_error_shown` by `field_name`",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "form_error_shown",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "field_name",
        "scope": "event"
      }
    },
    {
      "key": "revenue.lead_qualified_by_month",
      "stage": "revenue",
      "title": "`lead_qualified` count by month",
      "kind": "trend",
      "interval": "month",
      "series": [
        {
          "event": "lead_qualified",
          "math": "total"
        }
      ]
    },
    {
      "key": "revenue.deal_won_by_month",
      "stage": "revenue",
      "title": "`deal_won` count and value by month",
      "kind": "trend",
      "interval": "month",
      "series": [
        {
          "event": "deal_won",
          "math": "total"
        },
        {
          "event": "deal_won",
          "math": "sum",
          "property": "value"
        }
      ]
    },
    {
      "key": "consent.page_views_by_ad_consent",
      "stage": "consent",
      "title": "Share of `$pageview` by `ad_consent`, by week",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "$pageview",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "ad_consent",
        "scope": "event"
      }
    },
    {
      "key": "consent.consent_updated_by_advertising",
      "stage": "consent",
      "title": "`consent_updated` by `advertising`",
      "kind": "trend",
      "interval": "week",
      "series": [
        {
          "event": "consent_updated",
          "math": "total"
        }
      ],
      "breakdown": {
        "property": "advertising",
        "scope": "event"
      }
    }
  ],
};
