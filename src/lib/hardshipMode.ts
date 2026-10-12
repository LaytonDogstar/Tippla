// Hardship mode is off everywhere until compliance signs it off (flag hardship_mode_v1 is not built for anyone).
// Reviewers preview it with the dev state ?state=hardship_mode.
import { isOn } from "@/config/featureFlags";
import type { DevState } from "@/lib/dev/states";

export const hardshipModeOn = (persona: string, states: readonly DevState[] = []) => isOn("hardship_mode_v1", persona) || states.includes("hardship_mode");
