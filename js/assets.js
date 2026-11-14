window.Game = window.Game || {};
(function () {
  var ROOT = 'Assets/Farm RPG FREE 16x16 - Tiny Asset Pack/';
  // All file paths live ONLY here.
  var MANIFEST = {
    charIdle: ROOT + 'Character/Idle.png',
    charWalk: ROOT + 'Character/Walk.png',
    tileset:  ROOT + 'Tileset/Tileset Grass Spring.png',
    house:    ROOT + 'Objects/House.png',
    tree:     ROOT + 'Objects/Maple Tree.png',
    fence:    ROOT + "Objects/Fence's copiar.png",
    road:     ROOT + 'Objects/Road copiar.png',
    chest:    ROOT + 'Objects/chest.png',
    crops:    ROOT + 'Objects/Spring Crops.png',
    interior: ROOT + 'Objects/Interior.png',
    cowF:     ROOT + 'Farm Animals/Female Cow Brown.png',
    cowM:     ROOT + 'Farm Animals/Male Cow Brown.png',
    chickenRed:    ROOT + 'Farm Animals/Chicken Red.png',
    chickenBlonde: ROOT + 'Farm Animals/Chicken Blonde  Green.png',
    chick:    ROOT + 'Farm Animals/Baby Chicken Yellow.png',
    smoke3:   'Assets/Smoke Effect 01/Smoke VFX3.png',
    rivalBase:   'Assets/Pixel_Art_Character_Base_free/Base_Human_03_free.png',
    rivalHair:   'Assets/Pixel_Art_Character_Base_free/Hair_01-01_free.png',
    rivalOutfit: 'Assets/Pixel_Art_Character_Base_free/Outfit_Explorer_01_free.png'
  };
  var images = {};

  function showError(msg) {
    var el = document.getElementById('error');
    if (el) { el.style.display = 'block'; el.textContent = msg; }
  }

  function loadOne(key) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { images[key] = img; resolve(img); };
      img.onerror = function () { reject(new Error('Could not load picture file: ' + MANIFEST[key])); };
      img.src = encodeURI(MANIFEST[key]);
    });
  }

  Game.Assets = {
    load: function () {
      var keys = Object.keys(MANIFEST);
      return Promise.all(keys.map(loadOne)).catch(function (err) {
        showError(err.message);
        throw err;
      });
    },
    get: function (key) { return images[key]; },
    showError: showError
  };

  Game.drawSprite = function (ctx, img, sx, sy, sw, sh, dx, dy, flipX) {
    dx = Math.round(dx); dy = Math.round(dy);
    if (flipX) {
      ctx.save();
      ctx.translate(dx + sw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh);
    }
  };
})();
