/**
 * @file Contains the implementation of the main preferences page:
 * window corners, shell elements, border and backup (import/export/reset).
 */
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { bindPref, getPref, setPref } from '../../utils/settings.js';
import { exportSettings, importSettings, resetSettings } from '../../utils/backup.js';
const BORDER_MODES = ['paint', 'cut'];
export const GeneralPage = GObject.registerClass({
    Template: GLib.uri_resolve_relative(import.meta.url, 'general.ui', GLib.UriFlags.NONE),
    GTypeName: 'BrmPrefsGeneral',
    // Those variables are declared inside of the `general.ui` file and
    // passed into the JS module prefixed with an underscore.
    // (cornerRadius -> _cornerRadius)
    InternalChildren: [
        'cornerRadius',
        'cornerSmoothing',
        'roundShellElements',
        'roundCircularElements',
        'borderWidth',
        'borderMode',
        'borderColorRow',
        'borderColor',
        'paddings',
        'rightClickMenu',
    ],
}, class extends Adw.PreferencesPage {
    #settings = getPref('global-rounded-corner-settings');
    // Bind all buttons to respective prefs.
    constructor() {
        super();
        this._cornerRadius.set_value(this.#settings.borderRadius);
        this._cornerRadius.connect('value-changed', (adj) => {
            this.#settings.borderRadius = adj.get_value();
            this.#updateGlobalConfig();
        });
        this._cornerSmoothing.set_value(this.#settings.smoothing);
        this._cornerSmoothing.connect('value-changed', (adj) => {
            this.#settings.smoothing = adj.get_value();
            this.#updateGlobalConfig();
        });
        bindPref('round-shell-elements', this._roundShellElements, 'active', Gio.SettingsBindFlags.DEFAULT);
        bindPref('round-circular-elements', this._roundCircularElements, 'active', Gio.SettingsBindFlags.DEFAULT);
        // Circular elements only make sense when shell elements are rounded.
        this._roundShellElements.bind_property('active', this._roundCircularElements, 'sensitive', GObject.BindingFlags.SYNC_CREATE);
        bindPref('border-width', this._borderWidth, 'value', Gio.SettingsBindFlags.DEFAULT);
        this._borderMode.set_selected(Math.max(0, BORDER_MODES.indexOf(getPref('border-mode'))));
        this.#updateBorderColorSensitivity();
        this._borderMode.connect('notify::selected', (row) => {
            setPref('border-mode', BORDER_MODES[row.get_selected()]);
            this.#updateBorderColorSensitivity();
        });
        const color = new Gdk.RGBA();
        [color.red, color.green, color.blue, color.alpha] =
            this.#settings.borderColor;
        this._borderColor.set_rgba(color);
        this._borderColor.connect('notify::rgba', (button) => {
            const color = button.get_rgba();
            this.#settings.borderColor = [
                color.red,
                color.green,
                color.blue,
                color.alpha,
            ];
            this.#updateGlobalConfig();
        });
        this._paddings.paddingTop = this.#settings.padding.top;
        this._paddings.connect('notify::padding-top', (row) => {
            this.#settings.padding.top = row.paddingTop;
            this.#updateGlobalConfig();
        });
        this._paddings.paddingBottom = this.#settings.padding.bottom;
        this._paddings.connect('notify::padding-bottom', (row) => {
            this.#settings.padding.bottom = row.paddingBottom;
            this.#updateGlobalConfig();
        });
        this._paddings.paddingStart = this.#settings.padding.left;
        this._paddings.connect('notify::padding-start', (row) => {
            this.#settings.padding.left = row.paddingStart;
            this.#updateGlobalConfig();
        });
        this._paddings.paddingEnd = this.#settings.padding.right;
        this._paddings.connect('notify::padding-end', (row) => {
            this.#settings.padding.right = row.paddingEnd;
            this.#updateGlobalConfig();
        });
        bindPref('enable-preferences-entry', this._rightClickMenu, 'active', Gio.SettingsBindFlags.DEFAULT);
    }
    exportSettings(_button) {
        const dialog = new Gtk.FileDialog({
            title: _('Export settings'),
            initial_name: 'border-radius-manager.json',
            default_filter: jsonFilter(),
        });
        dialog.save(this.root, null, (_dialog, result) => {
            let file;
            try {
                file = dialog.save_finish(result);
            }
            catch (e) {
                this.#reportDialogError(e);
                return;
            }
            try {
                exportSettings(file);
                this.#toast(_('Settings exported'));
            }
            catch (e) {
                this.#toast(_('Could not export settings: %s').format(e.message));
            }
        });
    }
    importSettings(_button) {
        const dialog = new Gtk.FileDialog({
            title: _('Import settings'),
            default_filter: jsonFilter(),
        });
        dialog.open(this.root, null, (_dialog, result) => {
            let file;
            try {
                file = dialog.open_finish(result);
            }
            catch (e) {
                this.#reportDialogError(e);
                return;
            }
            try {
                importSettings(file);
                this.#reloadWindow(_('Settings imported'));
            }
            catch (e) {
                this.#toast(_('Could not import settings: %s').format(e.message));
            }
        });
    }
    resetSettings(_button) {
        const dialog = new Adw.AlertDialog({
            heading: _('Reset all settings?'),
            body: _('Window corners, borders, custom corners and the blacklist go back to their defaults. Export your settings first if you want to keep them.'),
            close_response: 'cancel',
            default_response: 'cancel',
        });
        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('reset', _('Reset'));
        dialog.set_response_appearance('reset', Adw.ResponseAppearance.DESTRUCTIVE);
        dialog.connect('response', (_dialog, response) => {
            if (response !== 'reset') {
                return;
            }
            resetSettings();
            this.#reloadWindow(_('Settings reset'));
        });
        dialog.present(this.root);
    }
    #updateBorderColorSensitivity() {
        this._borderColorRow.set_sensitive(getPref('border-mode') !== 'cut');
    }
    #updateGlobalConfig() {
        setPref('global-rounded-corner-settings', this.#settings);
    }
    #toast(title) {
        this.root?.add_toast?.(new Adw.Toast({ title }));
    }
    #reportDialogError(e) {
        // Closing the file chooser is not an error.
        if (e instanceof GLib.Error &&
            e.matches(Gtk.DialogError, Gtk.DialogError.DISMISSED)) {
            return;
        }
        this.#toast(e.message);
    }
    /**
     * Rebuild every tab so they show the imported or reset values.
     *
     * @param message - Toast shown once the window is rebuilt.
     */
    #reloadWindow(message) {
        const win = this.root;
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            win.rebuildPages?.();
            win.add_toast(new Adw.Toast({ title: message }));
            return GLib.SOURCE_REMOVE;
        });
    }
});
/** File chooser filter for JSON files. */
function jsonFilter() {
    const filter = new Gtk.FileFilter({ name: _('JSON files') });
    filter.add_mime_type('application/json');
    filter.add_suffix('json');
    return filter;
}
