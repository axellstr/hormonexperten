/** Shared motion curves for scripted scrolling (the services row and the hero gallery). */

/** Starts and ends gently: for moves the visitor asks for with a button. */
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** Only slows into place: for a track that is already moving, as after a drag. */
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
