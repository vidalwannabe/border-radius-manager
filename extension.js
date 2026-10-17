import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// [setting key, selectors]. A value of -1 keeps the theme's own radius.
const RADII = [
    ['radius-popup', '.popup-menu-content, .candidate-popup-content'],
    ['radius-datemenu', '.datemenu-popover, .calendar, .datemenu-today-button, .events-button, .world-clocks-button, .weather-button'],
    ['radius-notification', '.message, .notification-banner, .message-list-clear-button'],
    ['radius-modal', '.modal-dialog'],
    ['radius-dash', '#dash .dash-background'],
    ['radius-switcher', '.switcher-list'],
    ['radius-tile', '.overview-tile, .grid-search-result'],
    ['radius-search', '.search-section-content'],
    ['radius-search-entry', '.search-entry'],
    ['radius-quick-settings', '.quick-settings'],
    ['radius-quick-header', '.quick-settings-system-item StButton, .quick-settings-system-item .button, .quick-settings-system-item .icon-button, .quick-settings-system-item .power-item'],
    ['radius-quick-submenu', '.quick-toggle-menu'],
    ['radius-media', '.message.media-message, .media-message, .quick-settings .message, .quick-settings .media-message'],
];

// Toggles with a menu arrow are two halves; their inner corners stay square.
const toggleCss = r => [
    ['.quick-toggle, .quick-toggle-has-menu', `${r}px`],
    ['.quick-toggle-has-menu .quick-toggle:ltr', `${r}px 0 0 ${r}px`],
    ['.quick-toggle-has-menu .quick-toggle:rtl', `0 ${r}px ${r}px 0`],
    ['.quick-toggle-has-menu .quick-toggle-menu-button:ltr', `0 ${r}px ${r}px 0`],
    ['.quick-toggle-has-menu .quick-toggle-menu-button:rtl', `${r}px 0 0 ${r}px`],
    ['.quick-toggle-has-menu .quick-toggle:ltr:last-child, .quick-toggle-has-menu .quick-toggle:rtl:last-child', `${r}px`],
];

// !important so these win over the shell theme and other extensions' stylesheets.
const rule = (selector, radius) => `${selector} {\n  border-radius: ${radius} !important;\n}\n`;

export default class BorderRadiusManagerExtension extends Extension {
    _buildCss() {
        let css = '';
        for (const [key, selector] of RADII) {
            const r = this._settings.get_int(key);
            if (r >= 0)
                css += rule(selector, `${r}px`);
        }
        const r = this._settings.get_int('radius-quick-toggle');
        if (r >= 0)
            css += toggleCss(r).map(([selector, radius]) => rule(selector, radius)).join('');
        return css;
    }

    _apply() {
        this._unload();
        const css = this._buildCss();
        if (!css)
            return;
        try {
            const dir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'border-radius-manager']);
            GLib.mkdir_with_parents(dir, 0o755);
            const file = Gio.File.new_for_path(GLib.build_filenamev([dir, `radius-${Date.now()}.css`]));
            file.replace_contents(new TextEncoder().encode(css), null, false,
                Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            St.ThemeContext.get_for_stage(global.stage).get_theme().load_stylesheet(file);
            this._file = file;
        } catch (e) {
            console.error(`[BorderRadiusManager] ${e.message}`);
        }
    }

    _unload() {
        if (!this._file)
            return;
        try {
            St.ThemeContext.get_for_stage(global.stage).get_theme().unload_stylesheet(this._file);
            this._file.delete(null);
        } catch (e) {
            // The file may already be gone; nothing else to clean.
        }
        this._file = null;
    }

    enable() {
        this._settings = this.getSettings();
        this._settingsId = this._settings.connect('changed', () => {
            if (this._applyId)
                GLib.Source.remove(this._applyId);
            this._applyId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                this._applyId = null;
                this._apply();
                return GLib.SOURCE_REMOVE;
            });
        });
        this._apply();
    }

    disable() {
        if (this._applyId) {
            GLib.Source.remove(this._applyId);
            this._applyId = null;
        }
        this._settings.disconnect(this._settingsId);
        this._settings = null;
        this._unload();
    }
}
