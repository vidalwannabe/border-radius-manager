/** @file "Shell Elements" tab: corner radius of menus, quick settings, dash... */
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import { prefs } from '../../utils/settings.js';

const HINT = '-1 = system default, 0 = square corners.';

// [group title, group description, rows: [key, title, subtitle]]
const GROUPS = [
    ['Rounding', `Corner radius in pixels. ${HINT}`, [
        ['radius-popup', 'Menus'],
        ['radius-datemenu', 'Calendar / date', 'Date menu, events, world clocks, weather'],
        ['radius-notification', 'Notifications', 'Notification cards and Clear button'],
        ['radius-modal', 'Dialogs'],
        ['radius-dash', 'Dash'],
        ['radius-switcher', 'Alt+Tab'],
        ['radius-tile', 'App icons'],
        ['radius-search', 'Search results'],
        ['radius-search-entry', 'Search bar', 'Overview search field'],
    ]],
    ['Quick settings', `Panel, buttons, submenus and media player of the quick settings menu. ${HINT}`, [
        ['radius-quick-settings', 'Panel', 'Background of the whole quick settings menu'],
        ['radius-quick-toggle', 'Toggle buttons', 'Wi-Fi, Bluetooth, Dark Style... (active or not)'],
        ['radius-quick-header', 'Header buttons', 'Battery, screenshot, settings, lock, power'],
        ['radius-quick-submenu', 'Submenu boxes', 'Boxes that open under toggles, like the Wi-Fi list'],
        ['radius-media', 'Media player', 'Player card'],
    ]],
];

export const ShellElementsPage = GObject.registerClass({
    GTypeName: 'BrmPrefsShellElements',
}, class extends Adw.PreferencesPage {
    constructor() {
        super({ title: 'Shell Elements', icon_name: 'applications-graphics-symbolic' });
        const keys = [];

        for (const [title, description, rows] of GROUPS) {
            const group = new Adw.PreferencesGroup({ title, description });
            for (const [key, rowTitle, subtitle] of rows) {
                const row = new Adw.SpinRow({
                    title: rowTitle,
                    adjustment: new Gtk.Adjustment({ lower: -1, upper: 60, step_increment: 1, page_increment: 4 }),
                });
                if (subtitle)
                    row.set_subtitle(subtitle);
                prefs.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
                // -1 also clears the saved value, so the key is back to its default.
                row.connect('notify::value', () => {
                    if (row.get_value() === -1 && prefs.get_user_value(key) !== null)
                        prefs.reset(key);
                });
                group.add(row);
                keys.push(key);
            }
            this.add(group);
        }

        const resetRow = new Adw.ActionRow({ title: 'Restore all to system default' });
        const resetAll = new Gtk.Button({ label: 'Restore defaults', valign: Gtk.Align.CENTER });
        resetAll.add_css_class('destructive-action');
        resetAll.connect('clicked', () => keys.forEach(k => prefs.reset(k)));
        resetRow.add_suffix(resetAll);
        const resetGroup = new Adw.PreferencesGroup();
        resetGroup.add(resetRow);
        this.add(resetGroup);
    }
});
