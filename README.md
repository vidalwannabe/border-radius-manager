# Border Radius Manager

GNOME Shell extension (GNOME 48) to control rounded corners everywhere in the desktop with a single radius.

- **General** tab:
  - **Corner radius** and **corner smoothing** for application windows.
  - **Round shell elements**: uses the same radius for menus, top bar buttons, calendar, notifications, dialogs, OSD, dash, Alt+Tab, overview search and the quick settings menu.
  - **Round circular elements**: also applies it to elements that are circles by design (round buttons, switches, the calendar's today mark).
  - **Border width**, **border mode** and **border color**. *Paint* draws the border with the chosen color; *Cut* trims the window to the border's shape instead (negative widths are ignored, and the shadow follows the trimmed window).
  - **Paddings** to trim specific sides of windows.
  - **Backup**: export and import every setting (including custom corners and the blacklist) as JSON, or reset everything.
- **Custom** tab: per-application overrides.
- **Blacklist** tab: applications that are never rounded.

Rounded windows get a shadow that matches GNOME's own; maximized and fullscreen windows keep square corners.

Inspired by and built on [Rounded Window Corners Reborn](https://github.com/flexagoon/rounded-window-corners) by flexagoon, a fork of the original [Rounded Window Corners](https://github.com/yilozt/rounded-window-corners) by yilozt.

Licensed under the GPL-3.0 (see COPYING).
