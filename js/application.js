function getSize() { 
  var reg = new RegExp("(^|&)size=([^&]*)(&|$)", "i");
  var r = location.search.substr(1).match(reg);
  if (r != null) {
    return parseInt(unescape(decodeURI(r[2])));
  }
  return 8; 
}

function getMode() { 
  var reg = new RegExp("(^|&)mode=([^&]*)(&|$)", "i");
  var r = location.search.substr(1).match(reg);
  if (r != null) {
    return unescape(decodeURI(r[2]));
  }
  return "normal"; 
}

var game;
window.requestAnimationFrame(function () {
  var size = getSize();
  var container = document.getElementById('grid-container');
  var html = '';
  for (var i = 0; i < size; ++i) {
    html += '<div class="grid-row">';
    for (var j = 0; j < size; ++j) {
      html += '<div class="grid-cell"></div>';
    }
    html += '</div>';
  }
  container.innerHTML = html;
  game = new GameManager(size, KeyboardInputManager, HTMLActuator, LocalScoreManager);
  var mode = getMode();
  switch (mode) {
  case "alwaysTwo":
    alwaysTwo();
    break;
  case "fibonacci":
    fibonacci();
    break;
  case "threes":
    threes();
    break;
  case "mergeAny":
    mergeAny();
    break;
  case "powerTwo":
    powerTwo();
    break;
  case "tileZero":
    tileZero();
    break;
  case "tileNegative":
    tileNegative();
    break;
  case "gravity":
    gravity();
    break;
  default:
    normal();
    break;
  }
});

var last = '';
var dir = 0;
var cnt = 0;

var mover = undefined;

function doMovementPattern(moveType) {
  if (typeof(mover) != 'undefined') {
    clearInterval(mover);
  }
  mover = setInterval(moveType, 50);
}

function stopMovement() {
  if (typeof(mover) != 'undefined') {
    clearInterval(mover);
    mover = undefined;
  }
}

function corner() {
  if (game == null || typeof(game) === "undefined") {
    return;
  }
  var item = document.getElementById('tile-container');
  if (item.innerHTML == last) {
    if (++cnt > 0) {
      dir = 1 - dir;
      cnt = 0;
    }
  }
  last = item.innerHTML;
  if (0 === dir) {
    game.move(0);
    setTimeout(function() {game.move(3)}, 20);
  } else {
    game.move(0);
    setTimeout(function() {game.move(1)}, 20);
  }
}

function swing() {
  if (game == null || typeof(game) === "undefined") {
    return;
  }
  var item = document.getElementById('tile-container');
  if (item.innerHTML == last) {
    if (++cnt > 0) {
      dir = 1 - dir;
      cnt = 0;
    }
  }
  last = item.innerHTML;
  if (0 === dir) {
    game.move(0);
    setTimeout(function() {game.move(2)}, 20);
  } else {
    game.move(1);
    setTimeout(function() {game.move(3)}, 20);
  }
}

function swirl() {
  dir = (dir + 1) % 4;
  game.move(dir);
}

function random() {
  game.move(Math.floor(Math.random() * 4));
}

function changeSize(size) {
  window.location.href = 'index.html?size=' + size + '&mode=' + getMode();
}

function changeMode(mode) {
  window.location.href = 'index.html?size=' + getSize() + '&mode=' + mode;
}

function changeRule(add, merge, win) {
  game.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
      var tile = new Tile(this.grid.randomAvailableCell(), add());
      this.grid.insertTile(tile);
    }
  };
  game.tileMatchesAvailable = function () {
    var self = this;
    var tile;
    for (var x = 0; x < this.size; x++) {
      for (var y = 0; y < this.size; y++) {
        tile = this.grid.cellContent({ x: x, y: y });
        if (tile) {
          for (var direction = 0; direction < 4; direction++) {
            var vector = self.getVector(direction);
            var cell   = { x: x + vector.x, y: y + vector.y };
            var other  = self.grid.cellContent(cell);
            if (other && merge(other.value, tile.value)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  };
  game.move = function (direction) {
    var self = this;
    if (this.over || this.won) return;
    var cell, tile;
    var vector     = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved      = false;
    this.prepareTiles();
    traversals.x.forEach(function (x) {
      traversals.y.forEach(function (y) {
        cell = { x: x, y: y };
        tile = self.grid.cellContent(cell);
        if (tile) {
          var positions = self.findFarthestPosition(cell, vector);
          var next      = self.grid.cellContent(positions.next);
          if (next && !next.mergedFrom && merge(next.value, tile.value)) {
            var merged = new Tile(positions.next, tile.value + next.value);
            merged.mergedFrom = [tile, next];
            self.grid.insertTile(merged);
            self.grid.removeTile(tile);
            tile.updatePosition(positions.next);
            self.score += merged.value;
            if (win(merged.value)) self.won = true;
          } else {
            self.moveTile(tile, positions.farthest);
          }
          if (!self.positionsEqual(cell, tile)) {
            moved = true; 
          }
        }
      });
    });
    if (moved) {
      this.addRandomTile();
      if (!this.movesAvailable()) {
        this.over = true; 
      }
      this.actuate();
    }
  };
  game.inputManager.events["move"] = [];
  game.inputManager.on("move", game.move.bind(game));
  game.restart();
}

function normalAdd() {
  return Math.random() < 0.9 ? 2 : 4;
}

function normalMerge(a, b) {
  return a === b;
}

function normalWin(merged) {
  return merged === -1;
}

function normal() {
  changeRule(normalAdd, 
    function(a, b) { return a === b; }, 
    function(merged) { return merged === -1; });
}

function alwaysTwo() {
  changeRule(function() { return 2; }, normalMerge, normalWin);
}

function fibonacci() {
  var fib = new Array();
  var a = 1, b = 1;
  fib.push(a);
  fib.push(b);
  while (a + b <= 2147483648) {
    var c = a + b;
    fib.push(c);
    a = b;
    b = c;
  }
  changeRule(function() { return 1; },
    function(a, b) {
      for (var i = 0; i < fib.length; ++i) {
        if (a + b === fib[i]) {
          return true;
        }
      }
      return false;
    }, 
    function(merged) { return merged === -1; });
}

function threes() {
  changeRule(function() { return Math.random() < 0.7 ? (Math.random() < 0.5 ? 1 : 2) : 3; },
    function(a, b) { return (a === 1 && b === 2) || (a === 2 && b === 1) || (a > 2 && b > 2 && a === b); }, 
    function(merged) { return merged === -1; });
}

function mergeAny() {
  changeRule(function() { return Math.random() < 0.5 ? 1 : 2; },
    function(a, b) { return true; }, 
    function(merged) { return false; });
}

function powerTwo() {
  var index = 0;
  changeRule(function() {
    var value = index === 0 ? 1 : index;
    if (index == 0) {
      index = 1;
    } else {
      index <<= 1;
      if (index > 65536) {
        index = 0;
      }
    }
    return value;
  }, normalMerge, normalWin);
}

function tileZero() {
  changeRule(function() {
    return Math.random() < 0.7 ? (Math.random() < 0.5 ? 1 : 2) : 0;
  }, normalMerge, normalWin);
}

function tileNegative() {
  changeRule(function() { return Math.random() < 0.5 ? 1 : -1; }, 
    function(a, b) { return a === b || a === -b; }, normalWin);
}

function gravity() {
  changeRule(normalAdd, 
    function(a, b) { return a === b; }, 
    function(merged) { return merged === -1; });
  game.gravity = game.move;
  game.move = function(dir) {
    game.gravity(dir);
    game.gravity(2);
  };
  game.inputManager.events["move"] = [];
  game.inputManager.on("move", game.move.bind(game));
  game.restart();
}

function timeRush(sec) {
  stopMovement();
  var autos = document.getElementsByName('automove');
  for (var i in autos) {
    autos[i].disabled = 'disabled';
  }
  game.restart();
  var cnt = sec;
  function countDown() {
    if (game.over) {
      cnt = 0;
    }
    var item = document.getElementById('game-intro');
    item.innerText = "Remaining Time: " + cnt;
    if (cnt == 0) {
      game.over = true;
      game.actuate();
      item.innerText = sec + "s time rush result: " + game.score;
      var autos = document.getElementsByName('automove');
      for (var i in autos) {
        autos[i].disabled = '';
      }
    } else {
      setTimeout(function() {
        --cnt;
        countDown();
      }, 1000);
    }
  }
  countDown();
}

function saveBoard() {
  tiles = []
  for (var i = 0; i < game.grid.cells.length; ++i) {
    for (var j = 0; j < game.grid.cells[i].length; ++j) {
      if (game.grid.cells[i][j]) {
        tiles.push(game.grid.cells[i][j]);
      }
    }
  }
  window.localStorage.setItem('tiles', JSON.stringify(tiles));
}

function loadBoard() {
  var tiles = window.localStorage.getItem('tiles');
  if (tiles) {
    tiles = JSON.parse(tiles);
    for (var i = 0; i < game.grid.cells.length; ++i) {
      for (var j = 0; j < game.grid.cells[i].length; ++j) {
        if (game.grid.cells[i][j]) {
          game.grid.removeTile(game.grid.cells[i][j]);
        }
      }
    }
    for (var i = 0; i < tiles.length; ++i) {
      var tile = new Tile({x: tiles[i].x, y: tiles[i].y}, tiles[i].value);
      game.grid.insertTile(tile);
    }
    game.actuate();
  }
}
