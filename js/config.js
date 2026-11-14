window.Game = window.Game || {};
Game.CONFIG = {
  TILE: 16,
  BASE_VIEW_W: 320,
  BASE_VIEW_H: 180,
  WALK_SPEED: 48,
  RUN_SPEED: 96,
  IDLE_FPS: 5,
  WALK_FPS: 10,
  DEBUG: false,
  TITLE: 'Farm Days',
  UI: {
    OUTLINE: '#32131E', WOOD_DARK: '#4A2123', WOOD: '#8A3625', WOOD_LIGHT: '#AE4924', WOOD_HI: '#C46120',
    CREAM: '#D9AB91', CREAM_LIGHT: '#EBCFB4', SLOT_BG: '#C39478', SELECT: '#FFE6A0',
    TEXT_DARK: '#32131E', TEXT_LIGHT: '#FFF4E0', HOTBAR_RESERVE: 32,
    // One place to change the look of all text: Game.CONFIG.UI.font(8) gives a canvas font string.
    FONT_FAMILY: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif',
    FONT_WEIGHT: '700'
  }
};
Game.CONFIG.UI.font = function (px) {
  var U = Game.CONFIG.UI;
  return U.FONT_WEIGHT + ' ' + (px || 8) + 'px ' + U.FONT_FAMILY;
};
