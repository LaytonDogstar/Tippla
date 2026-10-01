// Screens not built yet. Each route still goes somewhere and says what will be there (non-negotiable 7).
export const placeholders: Record<string, { title: string; body: string; phase: number }> = {
};
export const placeholderNote = (phase: number) => `This screen is being built (phase ${phase}).`;
export const devLinks = { components: "Component library", selectors: "Selector figures", onboarding: "Start onboarding" };
