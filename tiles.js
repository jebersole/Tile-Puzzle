// This program creates a board with puzzle pieces which must be moved into position to complete the game.
(() => {
    "use strict";
    // Default board size is 4x4, and tile size 100px. This could theoretically be altered.
    const BOARD_SIZE = 4;
    const TILE_SIZE = 100;
    window.onload = () => {
        const clock = new GameClock("timer");
        const board = new TileBoard("puzzlearea", () => { // upon puzzle completion, this function is called
            clock.stop();
            document.getElementById("puzzlearea").style.pointerEvents = "none";
            const waitMillisecs = 1200;
            setTimeout(() => { // allow css animations to complete
                alert("Congratulations! You've solved the puzzle! To play again, press shuffle.");
            }, waitMillisecs);
        });

        board.init();

        document.getElementById("shufflebutton").onclick = () => {
            board.shuffle();
            clock.start();
        };

        document.getElementById("reset").onclick = () => {
            location.reload();
        };

        document.getElementById("change").onclick = changePic;

        const pics = [];
        for (var i = 1; i <= 17; i++) {
            pics.push("url('./assets/" + i + ".jpg')");
        }
        changePic(); // set default picture

        function changePic() {
            var tiles = document.querySelectorAll(".tile");
            var current = pics.shift();
            pics.push(current);
            for (var i = 0; i < tiles.length; i++) {
                tiles[i].style.backgroundImage = current;
            }
        }
    };

    function GameClock(timerElement) {
        var timerObject;
        this.count;

        this.tick = () => {
            this.count++;
            var seconds = this.count % 60;
            var minutes = (this.count - seconds) / 60;
            var text = "Time: ";
            if (minutes) text += minutes + " minute" + (minutes == 1 ? "" : "s");
            if (seconds) {
                if (minutes) text += ", ";
                text += seconds + " second" + (seconds == 1 ? "" : "s");
            }
            document.getElementById(timerElement).innerHTML = text;
        };

        this.start = () => {
            this.count = 0;
            if (timerObject) this.stop(); // user shuffles again
            timerObject = setInterval(this.tick, 1000);
        };

        this.stop = () => {
            clearInterval(timerObject);
            timerObject = null;
        }
    }

    function Tile(tileNum) {
        const tile = this.element = document.createElement("div");
        this.tileNum = tileNum;
        tile.id = tileNum;
        tile.className = "tile";
        var y = Math.floor((tileNum - 1) / BOARD_SIZE) * TILE_SIZE; // calculate tile's desired position
        var x = ((tileNum - 1) % BOARD_SIZE) * TILE_SIZE;
        tile.style.top = y + "px";
        tile.style.left = x + "px";
        tile.style.backgroundPosition = -x + "px " + -y + "px";
        tile.innerHTML = tileNum;

        // tile is highlighted if user mouses over, done more generally in TileBoard
        this.toggleHighlight = () => {
            if (!tile.className.includes("highlight"))
                tile.className += " highlight";
            else
                tile.className = tile.className.replace(" highlight", "");
        };

        this.move = (x, y) => {
            tile.style.top = parseInt(tile.style.top) + y * TILE_SIZE + "px";
            tile.style.left = parseInt(tile.style.left) + x * TILE_SIZE + "px";
            if (tile.className.includes("back")) { // for css animations
                tile.className = tile.className.replace("back", "");
            } else {
                tile.className = tile.className.replace(" move", "");
                tile.className += " moveback";
            }
        };
    }

    function TileBoard(puzzle, onFinished) {
        var finished = false;
        var shuffling = false;
        var tiles;
        var emptyLeft, emptyTop; // Left and right coordinates of empty space, from 0-3 on a 4x4 board

        this.init = () => {
            tiles = new Array(BOARD_SIZE);
            for (var i = 0; i < BOARD_SIZE; i++) {
                tiles[i] = new Array(BOARD_SIZE);
            }
            for (var j = 0; j < BOARD_SIZE; j++) {
                for (var k = 0; k < BOARD_SIZE; k++) {
                    var tile = new Tile(1 + (j * BOARD_SIZE) + k);
                    document.getElementById(puzzle).appendChild(tile.element);
                    document.getElementById(tile.tileNum).onmouseenter = this.highlight;
                    document.getElementById(tile.tileNum).onmouseleave = this.highlight;
                    tiles[j][k] = tile;
                }
            }
            document.getElementById(puzzle).removeChild(tile.element); // create empty space
            tiles[BOARD_SIZE - 1][BOARD_SIZE - 1] = null;
            emptyLeft = emptyTop = BOARD_SIZE - 1;
            document.getElementById(puzzle).onclick = event => {
                if (finished || shuffling) return;
                var [x, y] = getCoords(event.target);
                if (canMove(x, y)) {
                    this.moveTiles(x, y);
                    finished = checkFinished();
                    if (finished) onFinished();
                }
            };
        };

        // highlight all tiles between user mouseover and empty space
        this.highlight = event => {
            if (event.target.clicked) { event.target.clicked = false; return; } // clicked tile mouseout bugfix
            var [x, y] = getCoords(event.target);
            if (canMove(x, y)) {
                if (y == emptyTop) {
                    var [dir, currentX, done] = getLoopParams("x", x);
                    while (currentX != done) {
                        tiles[y][currentX].toggleHighlight();
                        currentX -= dir;
                    }
                } else {
                    var [dir, currentY, done] = getLoopParams("y", y);
                    while (currentY != done) {
                        tiles[currentY][x].toggleHighlight();
                        currentY -= dir;
                    }
                }
            }
        };

        this.shuffle = () => {
            finished = false;
            shuffling = true;
            for (var j = 0; j < 1000; j++) { // a random, moveable tile is clicked an arbitrary 1000 times
                var neighbors = [];
                var allTiles = document.querySelectorAll(".tile");
                for (var i = 0; i < allTiles.length; i++) {
                    var [x, y] = getCoords(allTiles[i]);
                    if (canMove(x, y)) {
                        neighbors.push(allTiles[i]);
                    }
                }
                var rand = parseInt(Math.random() * neighbors.length);
                var randTile = neighbors[rand];
                var [randX, randY] = getCoords(randTile);
                this.moveTiles(randX, randY);
            }
            shuffling = false;
            document.getElementById(puzzle).style.pointerEvents = "auto";
        };

        // move all tiles between user click and empty space
        this.moveTiles = (x, y) => {
            if (y == emptyTop) {
                var [dir, currentX, done] = getLoopParams("x", x);
                while (currentX != done) {
                    tiles[y][currentX].move(dir, 0);
                    if (!shuffling) tiles[y][currentX].toggleHighlight();
                    tiles[y][currentX + dir] = tiles[y][currentX];
                    currentX -= dir;
                }
            } else {
                var [dir, currentY, done] = getLoopParams("y", y);
                while (currentY != done) {
                    tiles[currentY][x].move(0, dir);
                    if (!shuffling) tiles[currentY][x].toggleHighlight();
                    tiles[currentY + dir][x] = tiles[currentY][x];
                    currentY -= dir;
                }
            }
            if (!shuffling) tiles[y][x].element.clicked = true;
            emptyLeft = x;
            emptyTop = y;
            tiles[emptyTop][emptyLeft] = null;
        }

        // helper function to produce x and y
        function getCoords(tile) {
            return [Math.round(parseInt(tile.style.left) / TILE_SIZE),
                Math.round(parseInt(tile.style.top) / TILE_SIZE)
            ];
        }

        // clicked tile is in row or column of empty space
        function canMove(x, y) {
            return (y == emptyTop && x != emptyLeft) || (y != emptyTop && x == emptyLeft);
        }

        // helper produces values used in looping over tiles
        function getLoopParams(direction, val) {
            if (direction == "y") {
                var dir = val < emptyTop ? 1 : -1;
                return [dir, emptyTop - dir, val - dir];
            }
            var dir = val < emptyLeft ? 1 : -1;
            return [dir, emptyLeft - dir, val - dir];
        }

        // check if user has finished puzzle
        function checkFinished() {
            for (var i = 1; i < (BOARD_SIZE * BOARD_SIZE); i++) {
                var tileTop = parseInt(document.getElementById(i).style.top);
                var tileLeft = parseInt(document.getElementById(i).style.left);
                if (tileLeft !== ((i - 1) % BOARD_SIZE) * TILE_SIZE) {
                    return false;
                }
                if (tileTop !== Math.floor((i - 1) / BOARD_SIZE) * TILE_SIZE) {
                    return false;
                }
            }
            return true;
        }

    }

})();
