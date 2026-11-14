# Farm Days

A small, cozy farm game that runs in your web browser. In this first version you can walk around a little farm with a cottage, a fenced field with crops, trees, stones and a chest you can open and close.

## How to start

1. Open the folder this file is in.
2. Double-click **index.html**. It opens in your browser.
   Use Google Chrome or Microsoft Edge for the best result.

No installing, no internet and no extra programs needed. Just keep the `Assets` folder where it is, next to `index.html`.

## Controls

| Key | What it does |
| --- | --- |
| W A S D or the arrow keys | Move around (you run by default) |
| Hold Shift | Walk slowly instead of running |
| E or Space | Open the chest (press again to close it), pick up an egg |
| I | Open or close your backpack (the game pauses while it is open) |
| Esc | Close the backpack or chest |
| 1-5 or mouse wheel | Choose a hotbar slot (the row of five slots at the bottom) |
| Mouse | Click a hotbar slot to choose it; move items around (see below) |
| F3 | Show or hide a debug view with red boxes (only useful for fixing problems) |

Tip: stand right next to the chest, face it, then press E.

## Good to know

- You can't leave the farm: trees and fences surround it.
- You can walk behind treetops and the cottage roof.
- There is an animal pen east of the farm. Enter it by the gate at the top.
- One red chicken in the pen lays its first egg right away, then about one every 30 seconds. There can be at most 5 eggs lying on the ground at a time.
- Walk up to an egg and press E to pick it up. A small puff of smoke appears when you pick up an egg. You hear a small pop sound. The sound starts after your first key press or click (that is a browser rule).
- Eggs go into the hotbar first, then into the backpack. One slot holds up to 99 of the same thing.
- With the backpack or chest open, click an item to pick it up, then click a slot to put it down. The same item stacks up to 99; a different item swaps places.
- Shift+click sends a whole stack across: backpack to chest and back, or hotbar to backpack when no chest is open.
- Right-click picks up half a stack, or puts down just one.
- Press E next to the chest to open it. Press E, I or Esc to close it. The game pauses while it is open.
- The chest holds 20 things, and they stay until you reload the page. On most screens the chest and backpack show side by side.
- The egg pickup sound comes from the file in the `Audio` folder (floraphonic-bloop-2-186531.mp3). Keep that folder next to `index.html`.
- Your backpack, chest and eggs are not saved: they reset when you reload the page.
