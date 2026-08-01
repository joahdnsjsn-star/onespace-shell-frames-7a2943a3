import { haptic } from "./haptics";
import { playCue } from "./sound";

/**
 * One call for both channels of feedback. Every interactive surface should use
 * this instead of calling haptics or sound directly — each channel independently
 * respects its own Settings switch.
 */
export const fx = {
  tap: () => {
    haptic("tap");
    playCue("tap");
  },
  select: () => {
    haptic("select");
    playCue("select");
  },
  open: () => {
    haptic("select");
    playCue("open");
  },
  close: () => {
    haptic("tap");
    playCue("close");
  },
  success: () => {
    haptic("success");
    playCue("success");
  },
  warn: () => {
    haptic("warn");
    playCue("warn");
  },
  boot: () => {
    haptic("success");
    playCue("boot");
  },
};
