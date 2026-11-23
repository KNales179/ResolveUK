// Made by the device-demo capture script: the pages each About-page device walks through, and
// where each tap lands (x as a fraction of the width; y in CSS px, from the top of the screen
// for fixed bars, or of the page for page content).
export const DEMO = {
  "laptop": {
    "cssW": 1440,
    "pages": {
      "home": {
        "h": 2700,
        "top": 65,
        "bot": 0,
        "whole": false
      },
      "reports": {
        "h": 1800,
        "top": 65,
        "bot": 0,
        "whole": false
      },
      "community": {
        "h": 1800,
        "top": 65,
        "bot": 0,
        "whole": false
      }
    },
    "steps": [
      {
        "page": "home",
        "tap": {
          "x": 0.357,
          "y": 32,
          "fixed": true
        }
      },
      {
        "page": "reports",
        "tap": {
          "x": 0.447,
          "y": 32,
          "fixed": true
        }
      },
      {
        "page": "community",
        "tap": {
          "x": 0.109,
          "y": 32,
          "fixed": true
        }
      }
    ]
  },
  "tablet": {
    "cssW": 820,
    "pages": {
      "reports": {
        "h": 2219,
        "top": 65,
        "bot": 63,
        "whole": false
      },
      "report": {
        "h": 1180,
        "top": 0,
        "bot": 0,
        "whole": true
      },
      "map": {
        "h": 1180,
        "top": 0,
        "bot": 0,
        "whole": true
      }
    },
    "steps": [
      {
        "page": "reports",
        "tap": {
          "x": 0.259,
          "y": 887,
          "fixed": false
        }
      },
      {
        "page": "report",
        "tap": {
          "x": 0.945,
          "y": 37,
          "fixed": true
        }
      },
      {
        "page": "reports",
        "tap": {
          "x": 0.5,
          "y": 1146,
          "fixed": true
        }
      },
      {
        "page": "map",
        "tap": {
          "x": 0.359,
          "y": 1146,
          "fixed": true
        }
      }
    ]
  },
  "phone": {
    "cssW": 390,
    "pages": {
      "home": {
        "h": 2532,
        "top": 65,
        "bot": 63,
        "whole": false
      },
      "map": {
        "h": 844,
        "top": 0,
        "bot": 0,
        "whole": true
      },
      "report": {
        "h": 844,
        "top": 0,
        "bot": 0,
        "whole": true
      },
      "community": {
        "h": 1688,
        "top": 65,
        "bot": 63,
        "whole": false
      }
    },
    "steps": [
      {
        "page": "home",
        "tap": {
          "x": 0.5,
          "y": 810,
          "fixed": true
        }
      },
      {
        "page": "map",
        "tap": {
          "x": 0.351,
          "y": 491,
          "fixed": true
        }
      },
      {
        "page": "report",
        "tap": {
          "x": 0.885,
          "y": 117,
          "fixed": true
        }
      },
      {
        "page": "map",
        "tap": {
          "x": 0.7,
          "y": 810,
          "fixed": true
        }
      },
      {
        "page": "community",
        "tap": {
          "x": 0.1,
          "y": 810,
          "fixed": true
        }
      }
    ]
  }
} as const
