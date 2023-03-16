const mapData = {
  minX: 0,
  maxX: 15,
  minY: 0,
  maxY: 15,
  blockedSpaces: {
    "5x9": true,
    "6x9": true,
    "7x9": true,
    "8x9": true,
    "9x9": true,
    "9x8": true,
    "9x7": true,
    "9x6": true,
    "8x6": true,
    "7x6": true,
    "6x6": true,
    "5x6": true,
    "5x7": true,
    "5x8": true,
    "5x9": true,
    "0x2": true,
    "0x1": true,
    "0x0": true,
    "1x0": true,
    "2x0": true,
    "3x0": true,
    "4x0": true,
    "4x1": true,
    "4x2": true,
    "3x2": true,
    "2x2": true,
    "5x5": true,
  },
};

const mapData2 = {
  minX: 0,
  maxX: 15,
  minY: 0,
  maxY: 15,
  blockedSpaces: {
    "0x5": true,
    "1x5": true,
    "2x5": true,
    "3x5": true,
    "4x5": true,
    "4x6": true,
    "5x6": true,
    "5x7": true,
    "6x7": true,
    "6x8": true,
    "6x9": true,
    "7x9": true,
    "7x10": true,
    "8x10": true,
    "9x10": true,
    "10x10": true,
    "10x9": true,
    "11x9": true,
    "11x8": true,
    "12x8": true,
    "12x7": true,
    "13x7": true,
    "13x6": true,
    "14x6": true,
    "14x5": true,
    "0x1": true,
  },
};

// Options for Player Colors... these are in the same order as our sprite sheet
const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];

//Misc Helpers
function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function getKeyString(x, y) {
  return `${x}x${y}`;
}

function isSolid(x, y, pMap) {
  if (pMap === 1) {
    const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
    return (
      blockedNextSpace ||
      x >= mapData.maxX ||
      x < mapData.minX ||
      (y < mapData.minY && pMap === 1)
    );
  } else {
    const blockedNextSpace = mapData2.blockedSpaces[getKeyString(x, y)];
    return (
      blockedNextSpace ||
      x >= mapData.maxX ||
      x < mapData.minX ||
      (y < mapData.minY && pMap === 1)
    );
  }
  // return blockedNextSpace;
}

function isBoundary(x, y) {
  return (
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  );
}

function randomRespawnSpot() {
  //We don't look things up by key here, so just return an x/y
  return randomFromArray([
    { x: 1, y: 1 },
    { x: 4, y: 6 },
    { x: 2, y: 12 },
    { x: 12, y: 12 },
    { x: 12, y: 7 },
    { x: 12, y: 2 },
    { x: 7, y: 4 },
    { x: 6, y: 2 },
    { x: 4, y: 3 },
  ]);
}

(function () {
  let playerId;
  let playerMap;
  let playerRef;
  let players = {};
  let playerElements = {};

  const gameContainer = document.querySelector(".game-container");
  const playerColorButton = document.querySelector("#player-color");

  function minimap() {
    const minimapCanvas = document.getElementById("minimap-canvas");
    const minimapContext = minimapCanvas.getContext("2d");
    const gameContainerStyle = getComputedStyle(gameContainer);
    const mapImage = gameContainerStyle.backgroundImage
      .slice(4, -1)
      .replace(/"/g, "");
    let img = new Image();
    img.onload = function () {
      minimapContext.clearRect(0, 0, img.width, img.height);
      minimapContext.drawImage(img, 0, 0, 240, 233);
      const playersRef = firebase.database().ref("players");
      let mapId = players[playerId].map;
      playersRef.once("value", (snapshot) => {
        snapshot.forEach((childSnapshot) => {
          const player = childSnapshot.val();
          const playerSize = 5;
          if (playerId !== player.id && mapId === player.map) {
            const playerX = player.x * 16 + 8;
            const playerY = player.y * 16 + 4;
            minimapContext.beginPath();
            minimapContext.arc(playerX, playerY, playerSize, 0, 2 * Math.PI);
            minimapContext.fillStyle = "blue";
            minimapContext.fill();
          } else if (playerId === player.id) {
            const playerX = player.x * 16 + 8;
            const playerY = player.y * 16 + 4;
            minimapContext.beginPath();
            minimapContext.arc(playerX, playerY, playerSize, 0, 2 * Math.PI);
            minimapContext.fillStyle = "red";
            minimapContext.fill();
          }
        });
      });
    };
    img.src = mapImage;
  }

  function isPositionAvailable(x, y, arr) {
    return arr.find((pos) => pos.x === x && pos.y === y) !== undefined;
  }

  function handleArrowPress(xChange = 0, yChange = 0) {
    const gameContainer = document.getElementById("game-container");
    const playersRef = firebase.database().ref("players");
    const positions = [];
    //get other players positions
    playersRef.once("value", (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const player = childSnapshot.val();
        if (player.id !== playerId && player.map === playerMap) {
          const otherX = player.x;
          const otherY = player.y;
          positions.push({ x: otherX, y: otherY });
        }
      });
    });

    const newX = players[playerId].x + xChange;
    const newY = players[playerId].y + yChange;
    const pMap = players[playerId].map;
    let backgroundSrc;
    if (
      !isSolid(newX, newY, pMap) &&
      !isPositionAvailable(newX, newY, positions)
    ) {
      //move to the next space
      players[playerId].x = newX;
      players[playerId].y = newY;
      console.log("X : " + newX + ", Y : " + newY);
      if (isBoundary(newX, newY)) {
        if (newY >= mapData.maxY) {
          //top boundary
          if (players[playerId].map === 1) {
            playerMap = 2;
            players[playerId].map = 2;
            players[playerId].y = 0;
            backgroundSrc = "url('./images/map-bottom.png')";
          }
        } else if (newY < mapData.minY) {
          if (players[playerId].map === 2) {
            playerMap = 1;
            players[playerId].map = 1;
            players[playerId].y = 14;
            backgroundSrc = "url('./images/mapgrass.png')";
          }
        }
      }
      gameContainer.style.backgroundImage = backgroundSrc;

      if (xChange === 1) {
        players[playerId].direction = "right";
      }
      if (xChange === -1) {
        players[playerId].direction = "left";
      }
      if (yChange === 1) {
        players[playerId].direction = "down";
      }
      if (yChange === -1) {
        players[playerId].direction = "up";
      }
      playerRef.set(players[playerId]);
    }
  }

  function initGame() {
    console.log("initGame called");
    new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1));
    new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1));
    new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0));
    new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0));

    new KeyPressListener("KeyW", () => handleArrowPress(0, -1));
    new KeyPressListener("KeyS", () => handleArrowPress(0, 1));
    new KeyPressListener("KeyA", () => handleArrowPress(-1, 0));
    new KeyPressListener("KeyD", () => handleArrowPress(1, 0));

    const allPlayersRef = firebase.database().ref(`players`);

    allPlayersRef.on("value", (snapshot) => {
      // console.log("running: snapshot 1");

      //Fires whenever a change occurs
      players = snapshot.val() || {};

      Object.keys(players).forEach((key) => {
        const characterState = players[key];
        if (
          characterState.map === playerMap &&
          characterState.map !== undefined
        ) {
          let el = playerElements[key];
          // console.log(characterState.name);
          // Now update the DOM
          el.querySelector(".Character_name").innerText = characterState.id;
          el.setAttribute("data-color", characterState.color);
          el.setAttribute("data-direction", characterState.direction);
          const left = 16 * characterState.x + "px";
          const top = 16 * characterState.y - 3 + "px";
          const intLeft = 16 * characterState.x;
          const intTop = 16 * characterState.y - 3;

          el.style.visibility = `visible`;
          el.style.transform = `translate3d(${left}, ${top}, 0)`;
          // move camera by moving the map.
          // translate(3d) ignore image scaling in css, have to specify in function.
          if (characterState.id === playerId) {
            gameContainer.style.transform = `translate3d(${
              -intLeft * 3 + 415
            }px, ${-intTop * 3 + 380}px, 0) scale(3)`;
          }
        } else {
          let el = playerElements[key];
          el.style.visibility = `hidden`;
        }
      });
      minimap();
    });
    allPlayersRef.on("child_added", (snapshot) => {
      //   console.log("running: snapshot 2");

      //Fires whenever a new node is added the tree
      const addedPlayer = snapshot.val();
      if (addedPlayer.map === playerMap && addedPlayer.map !== undefined) {
        const characterElement = document.createElement("div");
        characterElement.classList.add(
          "Character",
          "grid-cell",
          `map-${addedPlayer.map}`
        );
        if (addedPlayer.id === playerId) {
          characterElement.classList.add("you");
        }
        characterElement.innerHTML = `
        <div class="Character_shadow grid-cell"></div>
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
        </div>
        <div class="Character_you-arrow"></div>
      `;
        playerElements[addedPlayer.id] = characterElement;

        characterElement.querySelector(".Character_name").innerText =
          addedPlayer.id;
        characterElement.setAttribute("data-color", addedPlayer.color);
        characterElement.setAttribute("data-direction", addedPlayer.direction);
        const left = 16 * addedPlayer.x + "px";
        const top = 16 * addedPlayer.y - 4 + "px";

        characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
        gameContainer.appendChild(characterElement);
      }
    });

    //Remove character DOM element after they leave
    allPlayersRef.on("child_removed", (snapshot) => {
      // console.log("running: snapshot 3");
      const addedPlayer = snapshot.val();
      const removedKey = addedPlayer.id;
      // if (addedPlayer.map !== playerMap && addedPlayer.map !== undefined) {
      gameContainer.removeChild(playerElements[removedKey]);
      delete playerElements[removedKey];
      // }
    });

    //Update player color on button click
    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      playerRef.update({
        color: nextColor,
      });
    });
  }

  firebase.auth().onAuthStateChanged((user) => {
    console.log(user);
    if (user) {
      //You're logged in!
      playerId = user.uid;
      playerMap = 1;
      playerRef = firebase.database().ref(`players/${playerId}`);

      const { x, y } = randomRespawnSpot();
      
      // const { x, y } = { x: 7, y: 7 }; // for testing
      playerRef.set({
        id: playerId,
        direction: "right",
        color: randomFromArray(playerColors),
        x,
        y,
        map: playerMap,
      });
      //Remove me from Firebase when I diconnect
      playerRef.onDisconnect().remove();

      //Begin the game now that we are signed in
      initGame();
    } else {
      //You're logged out.
    }
  });

  firebase
    .auth()
    .signInAnonymously()
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
      // ...
      console.log(errorCode, errorMessage);
    });
})();
