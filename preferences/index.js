/** @file Contains the list of top-level pages (tabs) in the preferences window. */
import { BlacklistPage } from '../preferences/pages/blacklist.js';
import { CustomPage } from '../preferences/pages/custom.js';
import { GeneralPage } from '../preferences/pages/general.js';
import { ShellElementsPage } from '../preferences/pages/shell_elements.js';
export const prefsTabs = [
    GeneralPage,
    BlacklistPage,
    CustomPage,
    ShellElementsPage,
];
