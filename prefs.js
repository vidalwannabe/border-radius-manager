/** @file Preferences window: window corners (General, Blacklist, Custom) and Shell Elements. */
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { prefsTabs } from './preferences/index.js';
import { initPrefs, uninitPrefs } from './utils/settings.js';
export default class BorderRadiusManagerPrefs extends ExtensionPreferences {
    async fillPreferencesWindow(win) {
        initPrefs(this.getSettings());
        win.set_default_size(600, 740);
        for (const page of prefsTabs) {
            win.add(new page());
        }
        win.connect('close-request', () => uninitPrefs());
        const display = Gdk.Display.get_default();
        if (display) {
            const css = new Gtk.CssProvider();
            css.load_from_path(GLib.build_filenamev([this.path, 'stylesheet-prefs.css']));
            Gtk.StyleContext.add_provider_for_display(display, css, 0);
        }
    }
}
