import { Extension, InjectionManager, } from 'resource:///org/gnome/shell/extensions/extension.js';
import { layoutManager } from 'resource:///org/gnome/shell/ui/main.js';
import { WindowPreview } from 'resource:///org/gnome/shell/ui/windowPreview.js';
import { WorkspaceAnimationController } from 'resource:///org/gnome/shell/ui/workspaceAnimation.js';
import { disableEffect, enableEffect } from './manager/event_manager.js';
import { addShadowInOverview } from './patch/add_shadow_in_overview.js';
import { addShadowsInWorkspaceSwitch, removeShadowsAfterWorkspaceSwitch, } from './patch/workspace_switch.js';
import { ShellElements } from './shell_elements.js';
import { disableBackgroundMenuItem, enableBackgroundMenuItem, } from './utils/background_menu.js';
import { getPref, initPrefs, prefs, uninitPrefs } from './utils/settings.js';
import { WindowPicker } from './window_picker/service.js';
export default class BorderRadiusManager extends Extension {
    // Window corners work by overriding (monkey patching) GNOME Shell's
    // internal methods. InjectionManager restores them on disable.
    #injectionManager = null;
    #windowPicker = null;
    #shellElements = null;
    #startupConnection = null;
    #prefsConnection = null;
    #workspaceSwitchConnections = null;
    #startWindowCorners() {
        enableEffect();
        if (getPref('enable-preferences-entry'))
            enableBackgroundMenuItem();
    }
    enable() {
        initPrefs(this.getSettings());
        // Shell elements only need a stylesheet; it can load right away.
        this.#shellElements = new ShellElements(prefs);
        this.#shellElements.enable();
        // D-Bus window picker used by the Blacklist/Custom tabs.
        this.#windowPicker = new WindowPicker();
        this.#windowPicker.export();
        // Wait for GNOME Shell to be ready before rounding windows.
        if (layoutManager._startingUp) {
            this.#startupConnection = layoutManager.connect('startup-complete', () => {
                layoutManager.disconnect(this.#startupConnection);
                this.#startupConnection = null;
                this.#startWindowCorners();
            });
        }
        else {
            this.#startWindowCorners();
        }
        const self = this;
        this.#injectionManager = new InjectionManager();
        // Overview window previews need their own shadow actor.
        this.#injectionManager.overrideMethod(WindowPreview.prototype, '_addWindow', addWindow => function (window) {
            addWindow.call(this, window);
            addShadowInOverview(window, this);
        });
        // Same for windows while switching workspaces.
        this.#injectionManager.overrideMethod(WorkspaceAnimationController.prototype, '_prepareWorkspaceSwitch', prepareWorkspaceSwitch => function (workspaceIndices) {
            prepareWorkspaceSwitch.call(this, workspaceIndices);
            self.#workspaceSwitchConnections = addShadowsInWorkspaceSwitch(this);
        });
        this.#injectionManager.overrideMethod(WorkspaceAnimationController.prototype, '_finishWorkspaceSwitch', finishWorkspaceSwitch => function (switchData) {
            removeShadowsAfterWorkspaceSwitch(this);
            finishWorkspaceSwitch.call(this, switchData);
        });
        this.#prefsConnection = prefs.connect('changed::enable-preferences-entry', () => {
            getPref('enable-preferences-entry')
                ? enableBackgroundMenuItem()
                : disableBackgroundMenuItem();
        });
    }
    disable() {
        this.#injectionManager?.clear();
        this.#injectionManager = null;
        prefs.disconnect(this.#prefsConnection);
        this.#prefsConnection = null;
        disableBackgroundMenuItem();
        this.#windowPicker?.unexport();
        this.#windowPicker = null;
        disableEffect();
        this.#shellElements?.disable();
        this.#shellElements = null;
        if (this.#startupConnection !== null) {
            layoutManager.disconnect(this.#startupConnection);
            this.#startupConnection = null;
        }
        for (const connection of this.#workspaceSwitchConnections ?? []) {
            connection.object.disconnect(connection.id);
        }
        this.#workspaceSwitchConnections = null;
        uninitPrefs();
    }
}
