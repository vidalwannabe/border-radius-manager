/**
 * @file Export, import and reset of the extension settings.
 *
 * The exported file is JSON with every setting the preferences window shows,
 * including custom corners and the blacklist. Importing validates each value
 * and falls back to the defaults for anything missing or malformed.
 */
import Gio from 'gi://Gio';
import { getPref, prefs, setPref } from './settings.js';
const FORMAT = 'border-radius-manager';
const VERSION = 1;
/**
 * Write all settings to a JSON file.
 *
 * @param file - Destination Gio.File.
 */
export function exportSettings(file) {
    const data = {
        format: FORMAT,
        version: VERSION,
        settings: {
            'global-rounded-corner-settings': cleanCornerSettings(getPref('global-rounded-corner-settings')),
            'custom-rounded-corner-settings': Object.fromEntries(Object.entries(getPref('custom-rounded-corner-settings'))
                .map(([wmClass, cfg]) => [wmClass, cleanCornerSettings(cfg)])),
            blacklist: getPref('blacklist'),
            'border-width': getPref('border-width'),
            'border-mode': getPref('border-mode'),
            'round-shell-elements': getPref('round-shell-elements'),
            'round-circular-elements': getPref('round-circular-elements'),
            'enable-preferences-entry': getPref('enable-preferences-entry'),
        },
    };
    const bytes = new TextEncoder().encode(`${JSON.stringify(data, null, 2)}\n`);
    file.replace_contents(bytes, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
}
/**
 * Read settings from a JSON file made by {@link exportSettings} and apply them.
 * Nothing is changed if the file can't be read or isn't a settings export.
 *
 * @param file - Source Gio.File.
 */
export function importSettings(file) {
    const [, contents] = file.load_contents(null);
    let data;
    try {
        data = JSON.parse(new TextDecoder().decode(contents));
    }
    catch (_e) {
        throw new Error('the file is not valid JSON');
    }
    if (!isObject(data) || data.format !== FORMAT || !isObject(data.settings)) {
        throw new Error('the file is not a Border Radius Manager export');
    }
    const s = data.settings;
    const defaultGlobal = defaultCornerSettings();
    const global = toCornerSettings(s['global-rounded-corner-settings'], defaultGlobal);
    const custom = {};
    if (isObject(s['custom-rounded-corner-settings'])) {
        for (const [wmClass, cfg] of Object.entries(s['custom-rounded-corner-settings'])) {
            if (wmClass !== '') {
                custom[wmClass] = toCornerSettings(cfg, global);
            }
        }
    }
    const blacklist = Array.isArray(s.blacklist)
        ? [...new Set(s.blacklist.filter(v => typeof v === 'string' && v !== ''))]
        : [];
    // Everything is validated before the first write, so a bad file
    // never leaves the settings half imported.
    setPref('global-rounded-corner-settings', global);
    setPref('custom-rounded-corner-settings', custom);
    setPref('blacklist', blacklist);
    setPref('border-width', toInt(s['border-width'], 0, -40, 40));
    setPref('border-mode', s['border-mode'] === 'cut' ? 'cut' : 'paint');
    setPref('round-shell-elements', toBool(s['round-shell-elements'], false));
    setPref('round-circular-elements', toBool(s['round-circular-elements'], false));
    setPref('enable-preferences-entry', toBool(s['enable-preferences-entry'], false));
}
/** Reset every setting to its default value. */
export function resetSettings() {
    for (const key of prefs.settings_schema.list_keys()) {
        if (key !== 'settings-version') {
            prefs.reset(key);
        }
    }
}
/** Default global corner settings from the schema. */
function defaultCornerSettings() {
    return cleanCornerSettings(prefs
        .get_default_value('global-rounded-corner-settings')
        .recursiveUnpack());
}
/** Keep only the fields that are still in use, with a fresh copy of each. */
function cleanCornerSettings(cfg) {
    return {
        padding: {
            left: cfg.padding.left,
            right: cfg.padding.right,
            top: cfg.padding.top,
            bottom: cfg.padding.bottom,
        },
        borderRadius: cfg.borderRadius,
        smoothing: cfg.smoothing,
        borderColor: [...cfg.borderColor],
        enabled: cfg.enabled,
    };
}
/**
 * Validate corner settings from a file.
 *
 * @param value - Value read from the file.
 * @param fallback - Settings used for anything missing or invalid.
 */
function toCornerSettings(value, fallback) {
    const v = isObject(value) ? value : {};
    const p = isObject(v.padding) ? v.padding : {};
    const color = Array.isArray(v.borderColor) &&
        v.borderColor.length === 4 &&
        v.borderColor.every(c => typeof c === 'number' && c >= 0 && c <= 1)
        ? [...v.borderColor]
        : [...fallback.borderColor];
    return {
        padding: {
            left: toInt(p.left, fallback.padding.left, 0, 1000),
            right: toInt(p.right, fallback.padding.right, 0, 1000),
            top: toInt(p.top, fallback.padding.top, 0, 1000),
            bottom: toInt(p.bottom, fallback.padding.bottom, 0, 1000),
        },
        borderRadius: toInt(v.borderRadius, fallback.borderRadius, 0, 1000),
        smoothing: typeof v.smoothing === 'number' && v.smoothing >= 0 && v.smoothing <= 1
            ? v.smoothing
            : fallback.smoothing,
        borderColor: color,
        enabled: toBool(v.enabled, fallback.enabled),
    };
}
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function toInt(value, fallback, min, max) {
    return Number.isInteger(value) && value >= min && value <= max
        ? value
        : fallback;
}
function toBool(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
}
