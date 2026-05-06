import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const SEEN_KEY = "code-explainer:tour-seen-v1";

interface Step {
  selector: string;
  title: string;
  description: string;
  side?: "left" | "right" | "top" | "bottom";
}

const STEPS: Step[] = [
  {
    selector: '[data-tour="review-summary"]',
    title: "Review",
    description: "Title and high-level summary of the change.",
    side: "bottom",
  },
  {
    selector: '[data-tour="file-overview"]',
    title: "File overview",
    description: "What this file does and why.",
    side: "bottom",
  },
  {
    selector: '[data-tour="diff"]',
    title: "Side-by-side diff",
    description: "Old on the left, new on the right. Changed words are highlighted.",
    side: "top",
  },
  {
    selector: '[data-tour="explanation"]',
    title: "Explanations",
    description: "What changed, and why. Click a card to outline its lines.",
    side: "left",
  },
  {
    selector: '[data-tour="file-tree"]',
    title: "Files",
    description: "Click a file to jump there. Folders collapse.",
    side: "right",
  },
  {
    selector: '[data-tour="settings"]',
    title: "Settings",
    description: "Switch highlight modes or replay this tour.",
    side: "bottom",
  },
];

export function runTour(): void {
  if (typeof window === "undefined") return;

  const steps = STEPS.filter((s) => document.querySelector(s.selector));
  if (steps.length === 0) return;

  const d = driver({
    showProgress: true,
    allowClose: true,
    overlayOpacity: 0.6,
    stagePadding: 4,
    popoverClass: "code-explainer-tour",
    steps: steps.map((s) => ({
      element: s.selector,
      popover: { title: s.title, description: s.description, side: s.side },
    })),
    onDestroyed: () => {
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* private mode etc — fine to ignore */
      }
    },
  });
  d.drive();
}

export function hasSeenTour(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}
