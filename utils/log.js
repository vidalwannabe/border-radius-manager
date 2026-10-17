/** @file Provides wrapper functions for printing out debug messages. */
import { getPref } from './settings.js';
/**
 * Log a message with a [Border Radius Manager] prefix, but only
 * when debug mode is enabled.
 */
export function logDebug(...args) {
    if (getPref('debug-mode')) {
        console.log(`[Border Radius Manager] ${args}`);
    }
}
/**
 * Log an error with a [Border Radius Manager] prefix.
 */
export function logError(...args) {
    console.error(`[Border Radius Manager] ${args}`);
}
