/** @file Defines the constants used in this extension. */
/** Name of the rounded corners effect */
export const ROUNDED_CORNERS_EFFECT = 'Rounded Corners Effect';
/** Name of the shadow clipping effect  */
export const CLIP_SHADOW_EFFECT = 'Clip Shadow Effect';
/** Padding of shadow actors */
export const SHADOW_PADDING = 80;
/**
 * Shadows drawn behind rounded windows. Rounding clips the window's own
 * shadow, so these replace it with values that match GNOME's defaults.
 */
export const FOCUSED_SHADOW = {
    horizontalOffset: 0,
    verticalOffset: 4,
    blurOffset: 28,
    spreadRadius: 4,
    opacity: 60,
};
export const UNFOCUSED_SHADOW = {
    horizontalOffset: 0,
    verticalOffset: 2,
    blurOffset: 12,
    spreadRadius: -1,
    opacity: 65,
};
/** Name of shadow actor to be added in overview */
export const OVERVIEW_SHADOW_ACTOR = 'Shadow Actor (Overview)';
