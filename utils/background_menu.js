/**
 * @file Handles adding and removing the settings item in the desktop
 * context menu.
 *
 * XXX: It seems like this relies on GNOME Shell methods which aren't supposed
 *      to be public. Perhaps this would be removed in the future.
 */
import { gettext as _, Extension, } from 'resource:///org/gnome/shell/extensions/extension.js';
import { PopupMenuItem, PopupSeparatorMenuItem, } from 'resource:///org/gnome/shell/ui/popupMenu.js';
/** Enable the settings item in desktop context menu. */
export function enableBackgroundMenuItem() {
    for (const background of global.windowGroup.firstChild.get_children()) {
        const menu = background._backgroundMenu;
        addItemToMenu(menu);
    }
}
/** Disable the settings item in desktop context menu. */
export function disableBackgroundMenuItem() {
    for (const background of global.windowGroup.firstChild.get_children()) {
        const menu = background._backgroundMenu;
        removeItemFromMenu(menu);
    }
}
const itemName = () => _('Border Radius Settings...');
/**
 * Find our item in a background menu.
 *
 * @param menu - BackgroundMenu to search.
 */
function findItem(menu) {
    return menu._getMenuItems().find(item => item instanceof PopupMenuItem &&
        item.label.text === itemName());
}
/**
 * Move the item to the end of the menu's first section (right above the
 * first separator), below "Change Background..." and any items other
 * extensions placed there.
 *
 * @param menu - BackgroundMenu that holds the item.
 * @param item - The settings item.
 */
function placeItem(menu, item) {
    const others = menu._getMenuItems().filter(i => i !== item);
    const separator = others.findIndex(i => i instanceof PopupSeparatorMenuItem);
    menu.moveMenuItem(item, separator === -1 ? others.length : separator);
}
/**
 * Add the menu item to the background menu.
 *
 * @param menu - BackgroundMenu to add the item to.
 */
function addItemToMenu(menu) {
    if (findItem(menu)) {
        return;
    }
    const item = menu.addAction(itemName(), () => {
        const extension = Extension.lookupByURL(import.meta.url);
        extension.openPreferences();
    });
    placeItem(menu, item);
    // Other extensions may add their items later, so the position is
    // checked again every time the menu opens.
    item._brmOpenId = menu.connect('open-state-changed', (_menu, open) => {
        if (open) {
            placeItem(menu, item);
        }
    });
}
/**
 * Remove the menu item from the background menu.
 *
 * @param menu - BackgroundMenu to remove the item from.
 */
function removeItemFromMenu(menu) {
    const item = findItem(menu);
    if (!item) {
        return;
    }
    if (item._brmOpenId) {
        menu.disconnect(item._brmOpenId);
    }
    item.destroy();
}
