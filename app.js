const mapData = {
  minX: 1,
  maxX: 14,
  minY: 4,
  maxY: 12,
  blockedSpaces: {
    "7x4": true,
    "1x11": true,
    "12x10": true,
    "4x7": true,
    "5x7": true,
    "6x7": true,
    "8x6": true,
    "9x6": true,
    "10x6": true,
    "7x9": true,
    "8x9": true,
    "9x9": true,
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

function createName() {
  const prefix = randomFromArray([
    "COOL",
    "SUPER",
    "HIP",
    "SMUG",
    "COOL",
    "SILKY",
    "GOOD",
    "SAFE",
    "DEAR",
    "DAMP",
    "WARM",
    "RICH",
    "LONG",
    "DARK",
    "SOFT",
    "BUFF",
    "DOPE",
  ]);
  const animal = randomFromArray([
    "BEAR",
    "DOG",
    "CAT",
    "FOX",
    "LAMB",
    "LION",
    "BOAR",
    "GOAT",
    "VOLE",
    "SEAL",
    "PUMA",
    "MULE",
    "BULL",
    "BIRD",
    "BUG",
  ]);
  return `${prefix} ${animal}`;
}

function isSolid(x, y) {
  const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
  // return (
  //   blockedNextSpace ||
  //   x >= mapData.maxX ||
  //   x < mapData.minX ||
  //   y >= mapData.maxY ||
  //   y < mapData.minY
  // )
  return blockedNextSpace;
}

function isBoundary(x, y) {
  return (
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  );
}

function getRandomSafeSpot() {
  //We don't look things up by key here, so just return an x/y
  return randomFromArray([
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 6 },
    { x: 2, y: 8 },
    { x: 2, y: 9 },
    { x: 4, y: 8 },
    { x: 5, y: 5 },
    { x: 5, y: 8 },
    { x: 5, y: 10 },
    { x: 5, y: 11 },
    { x: 11, y: 7 },
    { x: 12, y: 7 },
    { x: 13, y: 7 },
    { x: 13, y: 6 },
    { x: 13, y: 8 },
    { x: 7, y: 6 },
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 8, y: 8 },
    { x: 10, y: 8 },
    { x: 8, y: 8 },
    { x: 11, y: 4 },
  ]);
}

(function () {
  let playerId;
  let playerMap;
  let playerRef;
  let players = {};
  let playerElements = {};
  let coins = {};
  let coinElements = {};

  const gameContainer = document.querySelector(".game-container");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");

  // minimap()

  function minimap() {
    const minimapCanvas = document.getElementById("minimap-canvas");
    const minimapContext = minimapCanvas.getContext("2d");
    const gameContainerStyle = getComputedStyle(gameContainer);
    const mapImage = gameContainerStyle.backgroundImage.slice(4, -1).replace(/"/g, "");
    let img = new Image();
    img.onload = function() {
      minimapContext.clearRect(0, 0, img.width, img.height);
      minimapContext.drawImage(img, 0, 0, 240, 208);
      const playerSize = 5;
      const playerX = players[playerId].x * 16 + 8;
      const playerY = players[playerId].y * 16 + 8;
      minimapContext.beginPath();
      minimapContext.arc(playerX, playerY, playerSize, 0, 2*Math.PI);
      minimapContext.fillStyle = 'red';
      minimapContext.fill();
    }
    img.src = mapImage;
  }

  function placeCoin() {
    const { x, y } = getRandomSafeSpot();
    const coinRef = firebase.database().ref(`coins/${getKeyString(x, y)}`);
    coinRef.set({
      x,
      y,
    });

    const coinTimeouts = [2000, 3000, 4000, 5000];
    setTimeout(() => {
      placeCoin();
    }, randomFromArray(coinTimeouts));
  }

  function attemptGrabCoin(x, y) {
    const key = getKeyString(x, y);
    if (coins[key]) {
      // Remove this key from data, then uptick Player's coin count
      firebase.database().ref(`coins/${key}`).remove();
      playerRef.update({
        coins: players[playerId].coins + 1,
      });
    }
  }

  function handleArrowPress(xChange = 0, yChange = 0) {
    const newX = players[playerId].x + xChange;
    const newY = players[playerId].y + yChange;
    const gameContainer = document.getElementById("game-container");

    let backgroundSrc;
    if (!isSolid(newX, newY)) {
      //move to the next space
      players[playerId].x = newX;
      players[playerId].y = newY;
      // console.log("X : " + newX + ", Y : " + newY);
      if (isBoundary(newX, newY)) {
        if (newX >= mapData.maxX) {
          //right boundary
          if (players[playerId].map === 1) {
            playerMap = 2;
            players[playerId].map = 2;
            players[playerId].x = 1;
            backgroundSrc = "url('./images/map2.png')";
          } else if (players[playerId].map === 3) {
            playerMap = 1;
            players[playerId].map = 1;
            players[playerId].x = 1;
            backgroundSrc = "url('./images/map.png')";
          }
        } else if (newX < mapData.minX) {
          //left boundary
          if (players[playerId].map === 1) {
            playerMap = 3;
            players[playerId].map = 3;
            players[playerId].x = 13;
            backgroundSrc = "url('./images/map3.png')";
          } else if (players[playerId].map === 2) {
            playerMap = 1;
            players[playerId].map = 1;
            players[playerId].x = 13;
            backgroundSrc = "url('./images/map.png')";
          }
        } else if (newY >= mapData.maxY) {
          //top boundary
          if (players[playerId].map === 1) {
            playerMap = 4;
            players[playerId].map = 4;
            players[playerId].y = 4;
            backgroundSrc = "url('./images/map4.png')";
          } else if (players[playerId].map === 5) {
            playerMap = 1;
            players[playerId].map = 1;
            players[playerId].y = 4;
            backgroundSrc = "url('./images/map.png')";
          }
        } else if (newY < mapData.minY) {
          //bottom boundary
          if (players[playerId].map === 1) {
            playerMap = 5;
            players[playerId].map = 5;
            players[playerId].y = 11;
            backgroundSrc = "url('./images/map5.png')";
          } else if (players[playerId].map === 4) {
            playerMap = 1;
            players[playerId].map = 1;
            players[playerId].y = 11;
            backgroundSrc = "url('./images/map.png')";
          }
        }

      }
      gameContainer.style.background = backgroundSrc;
      minimap()

      if (xChange === 1) {
        players[playerId].direction = "right";
      }
      if (xChange === -1) {
        players[playerId].direction = "left";
      }
      playerRef.set(players[playerId]);
      attemptGrabCoin(newX, newY);
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
    const allCoinsRef = firebase.database().ref(`coins`);
    // const allMapsRef = firebase.database().ref(`maps`);

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
          el.querySelector(".Character_name").innerText = characterState.name;
          el.querySelector(".Character_coins").innerText = characterState.coins;
          el.setAttribute("data-color", characterState.color);
          el.setAttribute("data-direction", characterState.direction);
          const left = 16 * characterState.x + "px";
          const top = 16 * characterState.y - 4 + "px";
          el.style.display = `block`;
          el.style.transform = `translate3d(${left}, ${top}, 0)`;
        } else {
          let el = playerElements[key];
          el.style.display = `none`;
        }
      });
      minimap()
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
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_you-arrow"></div>
      `;
        playerElements[addedPlayer.id] = characterElement;

        //Fill in some initial state
        characterElement.querySelector(".Character_name").innerText =
          addedPlayer.name;
        console.log(`add ${addedPlayer.name}`);
        characterElement.querySelector(".Character_coins").innerText =
          addedPlayer.coins;
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

    //New - not in the video!
    //This block will remove coins from local state when Firebase `coins` value updates
    allCoinsRef.on("value", (snapshot) => {
      coins = snapshot.val() || {};
    });
    //

    allCoinsRef.on("child_added", (snapshot) => {
      const coin = snapshot.val();
      const key = getKeyString(coin.x, coin.y);
      coins[key] = true;

      // Create the DOM Element
      const coinElement = document.createElement("div");
      coinElement.classList.add("Coin", "grid-cell");
      coinElement.innerHTML = `
        <div class="Coin_shadow grid-cell"></div>
        <div class="Coin_sprite grid-cell"></div>
      `;

      // Position the Element
      const left = 16 * coin.x + "px";
      const top = 16 * coin.y - 4 + "px";
      coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;

      // Keep a reference for removal later and add to DOM
      coinElements[key] = coinElement;
      gameContainer.appendChild(coinElement);
    });
    allCoinsRef.on("child_removed", (snapshot) => {
      const { x, y } = snapshot.val();
      const keyToRemove = getKeyString(x, y);
      gameContainer.removeChild(coinElements[keyToRemove]);
      delete coinElements[keyToRemove];
    });

    //Updates player name with text input
    playerNameInput.addEventListener("change", (e) => {
      const newName = e.target.value || createName();
      playerNameInput.value = newName;
      playerRef.update({
        name: newName,
      });
    });

    //Update player color on button click
    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      playerRef.update({
        color: nextColor,
      });
    });

    //Place my first coin
    // placeCoin();
  }

  firebase.auth().onAuthStateChanged((user) => {
    console.log(user);
    if (user) {
      //You're logged in!
      playerId = user.uid;
      playerMap = 1;
      playerRef = firebase.database().ref(`players/${playerId}`);

      const name = createName();
      playerNameInput.value = name;

      // const { x, y } = getRandomSafeSpot();
      const { x, y } = {x:5, y:6};
      playerRef.set({
        id: playerId,
        name,
        direction: "right",
        color: randomFromArray(playerColors),
        x,
        y,
        coins: 0,
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
