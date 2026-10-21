/**
 * @file Applies the window corner radius to GNOME Shell elements (menus,
 * calendar, notifications, quick settings, dash...) through a stylesheet.
 */
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// Containers, cards, pills and buttons. Changed by "Round shell elements".
const ELEMENTS = [
    // Menus
    '.popup-menu-content',
    '.candidate-popup-content',
    '.popup-menu-item',
    '.popup-sub-menu',
    // Top bar
    '.panel-button',
    // Calendar and notifications
    '.datemenu-popover',
    '.calendar',
    '.datemenu-today-button',
    '.events-button',
    '.world-clocks-button',
    '.weather-button',
    '.message',
    '.media-message',
    '.notification-banner',
    '.message-list-clear-button',
    // Dialogs, OSD and tooltips
    '.modal-dialog',
    '.app-folder-dialog',
    '.osd-window',
    '.dash-label',
    '.window-caption',
    // Overview
    '#dash .dash-background',
    '.overview-tile',
    '.grid-search-result',
    '.search-section-content',
    '.search-entry',
    '.workspace-thumbnail',
    // Alt+Tab
    '.switcher-list',
    '.switcher-list .item-box',
    // Screenshot UI
    '.screenshot-ui-panel',
    '.screenshot-ui-type-button',
    // Quick settings
    '.quick-settings',
    '.quick-toggle-menu',
    '.quick-settings-system-item .power-item',
];

// Elements that are perfect circles by design. Changed by "Round circular elements".
const CIRCULAR_ELEMENTS = [
    '.icon-button',
    '.quick-settings-system-item .icon-button',
    '.quick-toggle-menu .header .icon',
    '.message-close-button',
    '.message-expand-button',
    '.calendar-day',
    '.calendar-today',
    '.pager-button',
    '.toggle-switch',
    '.window-close',
    '.screenshot-ui-close-button',
    '.screenshot-ui-capture-button',
];

// Toggles with a menu arrow are two halves; their inner corners stay square.
const toggleRules = r => [
    ['.quick-toggle, .quick-toggle-has-menu', `${r}px`],
    ['.quick-toggle-has-menu .quick-toggle:ltr', `${r}px 0 0 ${r}px`],
    ['.quick-toggle-has-menu .quick-toggle:rtl', `0 ${r}px ${r}px 0`],
    ['.quick-toggle-has-menu .quick-toggle-menu-button:ltr', `0 ${r}px ${r}px 0`],
    ['.quick-toggle-has-menu .quick-toggle-menu-button:rtl', `${r}px 0 0 ${r}px`],
    ['.quick-toggle-has-menu .quick-toggle:ltr:last-child, .quick-toggle-has-menu .quick-toggle:rtl:last-child', `${r}px`],
];

// Settings that change the generated stylesheet.
const KEYS = new Set([
    'round-shell-elements',
    'round-circular-elements',
    'global-rounded-corner-settings',
]);

// !important so these win over the shell theme and other extensions' stylesheets.
const rule = (selector, radius) => `${selector} {\n  border-radius: ${radius} !important;\n}\n`;

export class ShellElements {
    #settings;
    #settingsId = 0;
    #applyId = 0;
    #file = null;
    #css = '';

    constructor(settings) {
        this.#settings = settings;
    }

    enable() {
        this.#settingsId = this.#settings.connect('changed', (_, key) => {
            if (!KEYS.has(key))
                return;
            if (this.#applyId)
                GLib.Source.remove(this.#applyId);
            this.#applyId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                this.#applyId = 0;
                this.#apply();
                return GLib.SOURCE_REMOVE;
            });
        });
        this.#apply();
    }

    disable() {
        if (this.#applyId)
            GLib.Source.remove(this.#applyId);
        this.#applyId = 0;
        this.#settings.disconnect(this.#settingsId);
        this.#unload();
        this.#css = '';
    }

    buildCss() {
        if (!this.#settings.get_boolean('round-shell-elements'))
            return '';
        const radius = this.#settings
            .get_value('global-rounded-corner-settings')
            .recursiveUnpack().borderRadius;
        let css = rule(ELEMENTS.join(',\n'), `${radius}px`);
        css += toggleRules(radius).map(([selector, r]) => rule(selector, r)).join('');
        if (this.#settings.get_boolean('round-circular-elements'))
            css += rule(CIRCULAR_ELEMENTS.join(',\n'), `${radius}px`);
        return css;
    }

    #apply() {
        const css = this.buildCss();
        // Other window settings (paddings, color...) don't change the
        // stylesheet, so there's nothing to reload.
        if (css === this.#css)
            return;
        this.#css = css;
        this.#unload();
        if (!css)
            return;
        try {
            const dir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'border-radius-manager']);
            GLib.mkdir_with_parents(dir, 0o755);
            const file = Gio.File.new_for_path(GLib.build_filenamev([dir, `radius-${Date.now()}.css`]));
            file.replace_contents(new TextEncoder().encode(css), null, false,
                Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            St.ThemeContext.get_for_stage(global.stage).get_theme().load_stylesheet(file);
            this.#file = file;
        } catch (e) {
            console.error(`[Border Radius Manager] ${e.message}`);
        }
    }

    #unload() {
        if (!this.#file)
            return;
        try {
            St.ThemeContext.get_for_stage(global.stage).get_theme().unload_stylesheet(this.#file);
            this.#file.delete(null);
        } catch (e) {
            // The file may already be gone; nothing else to clean.
        }
        this.#file = null;
    }
}
