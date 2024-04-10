/**
 * BGA Duel Finder.
 *
 * Script to find duels from a list of players.
 *
 * Usage:
 *  1. Copy and paste this code to the developer console
 *     (or put it as a bookmarklet https://caiorss.github.io/bookmarklet-maker/)
 *  2. Pick game, date, and introduce duel list. For example:
 *        Game: Carcassonne
 *        Date: 08/04/2024
 *        Duel list:
 *          estroncio - 71st
 *          texe1 - TheCreep74
 *          2020Rafa - DexterLogan
 *          MadCan - isloun
 *          Loku_elo - Tarakanov28
 *          oscaridis - Annenmay
 *          thePOC - Glinka
 *
 *  3. Click 'Find Games'.
 */

(function() {
    'use strict';

const REQUEST_INTERVAL = 250;     // 250ms between requests, give BGA a break
const CACHE_DURATION = 604800000; // One week in milliseconds

createUi();

/**
 * Create ui for user interaction.
 *
 */
function createUi() {
  const uiId = "bgaDuelFinderUi";
  let ui = document.getElementById(uiId);
  if (ui) {
    ui.style.display = "block";
    return;
  }

  ui = document.createElement("div");
  ui.id = uiId;
  ui.style.position = 'fixed';
  ui.style.left = "0";
  ui.style.top = "0";
  ui.style.margin = "1em 1em";
  ui.style.width = "300px";
  ui.style.height = "600px";
  ui.style.padding = "15px";
  ui.style.backgroundColor = "#eeefef";
  ui.style.border = "2px solid black";
  ui.style.boxShadow = "7px 7px #444";
  ui.style.zIndex = "1000";

  const title = document.createElement("h2");
  title.innerText = "BGA Duel Finder";

  const gamePicker = document.createElement("select");
  gamePicker.id = "finderGamePicker";
  const optionsData = [
      { value: 1, text: "Carcassonne" },
      { value: 79, text: "Hive" },
      { value: 1131, text: "7 Wonders" }
  ];
  optionsData.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.text;
      gamePicker.appendChild(option);
  });
  const gamePickerLabel = document.createElement("label");
  gamePickerLabel.htmlFor = "finderGamePicker";
  gamePickerLabel.textContent = "Game: ";

  const datePicker = document.createElement("input");
  datePicker.id = "finderDatePicker";
  datePicker.type = "date";

  const datePickerLabel = document.createElement("label");
  datePickerLabel.htmlFor = "finderDatePicker";
  datePickerLabel.textContent = "Duels date: ";

  const textArea = document.createElement("textArea");
  textArea.id = "finderDuelListTxt";
  textArea.style.display = "block";
  textArea.style.width  = "100%";
  textArea.style.height  = "75%";
  const textAreaLabel = document.createElement("label");
  textAreaLabel.htmlFor = "finderDuelListTxt";
  textAreaLabel.textContent = "Duel list: ";

  const button = document.createElement("a");
  button.classList = "bgabutton bgabutton_blue";
  button.style.position = "absolute";
  button.style.right = "15px";
  button.style.bottom = "0px";
  button.innerText = "Find Duels";

  const backButton = document.createElement("a");
  backButton.classList = "bgabutton bgabutton_blue";
  backButton.style.position = "absolute";
  backButton.style.right = "15px";
  backButton.style.bottom = "0px";
  backButton.innerText = "Back";
  backButton.style.display = "none";

  const closeButton = document.createElement("a");
  closeButton.classList = "bgabutton bgabutton_red";
  closeButton.style.position = "absolute";
  closeButton.style.left = "15px";
  closeButton.style.bottom = "0px";
  closeButton.innerText = "Close";
  closeButton.style.display = "block";

  ui.appendChild(title);
  ui.appendChild(gamePickerLabel);
  ui.appendChild(gamePicker);
  ui.appendChild(document.createElement("br"));
  ui.appendChild(datePickerLabel);
  ui.appendChild(datePicker);
  ui.appendChild(document.createElement("br"));
  ui.appendChild(textAreaLabel);
  ui.appendChild(textArea);
  ui.appendChild(button);
  ui.appendChild(backButton);
  ui.appendChild(closeButton);

  document.body.appendChild(ui);
  let duelsDiv;

  button.onclick = async function () {
    const game_id = parseInt(gamePicker.value);
    const date = new Date(datePicker.value);
    const unixTimestamp = Math.floor(date.getTime() / 1000);
    const duelsText = textArea.value;
    textArea.disabled = true;
    button.disabled = true;
    duelsDiv = await getAllDuels(duelsText, unixTimestamp, game_id);

    textArea.disabled = false;
    button.disabled = false;
    textArea.style.display = "none";
    ui.appendChild(duelsDiv);
    button.style.display = "none";
    backButton.style.display = "block";
  };

  backButton.onclick = function () {
    textArea.style.display = "block";
    ui.removeChild(duelsDiv);
    button.style.display = "block";
    backButton.style.display = "none";
  };

  closeButton.onclick = function () {
    ui.style.display = "none";
  }
}

/**
 * Returns a player id given its username.
 *
 */
function getPlayerId(name) {
  const currentTime = new Date().getTime();
  const cacheKey = `playerId-${name.toLowerCase()}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const data = JSON.parse(cached);
    if (currentTime - data.timestamp < CACHE_DURATION) {
      console.debug(`Using cached id ${data.id} for ${name}`);
      return data.id;
    }
  }

  try {
    const response = dojo.xhrGet({
      url: 'https://boardgamearena.com/player/player/findplayer.html',
      content: { q: name, start: 0, count: Infinity },
      sync: true,
      handleAs: 'json'
    });

    for (const currentUser of response.results[0].items) {
      if (currentUser.q.toLowerCase() === name.toLowerCase()) {
        console.debug(`Found id ${currentUser.id} for ${name}`);
        localStorage.setItem(cacheKey, JSON.stringify({ id: currentUser.id, timestamp: currentTime }));
        return currentUser.id;
      }
    }
    console.error(`Couldn't find user ${name}`);
    throw "Player not found";
  }
  catch (error) {
    console.error(`Couldn't find user ${name}`);
    throw error;
  }
}

/**
 * Return games for two players in a given day
 *
 */
function getGames(player1, player2, day, game_id) {
  const tables = [];
  try {
    const player1_id = getPlayerId(player1);
    const player2_id = getPlayerId(player2);
    const params = {
      game_id: game_id,
      player: player1_id,
      opponent_id: player2_id,
      updateStats: 1
    };
    if (day) {
      params.start_date = day;
      params.end_date = day + 86400;
    }

    const response = dojo.xhrGet({
      url: 'https://boardgamearena.com/gamestats/gamestats/getGames.html',
      content: params,
      handleAs: 'json',
      headers: { 'X-Request-Token': bgaConfig.requestToken },
      sync: true
    });
    for (const table of response.results[0].data.tables) {
      const table_url = `https://boardgamearena.com/table?table=${table.table_id}`;
      const table_scores = table.scores ? table.scores.split(",") : ["?", "?"];
      const table_players = table.players.split(",");
      const table_date = new Date(table.start * 1000);
      let table_flags = "";
      if (table.concede == 1) {
        table_flags += " 🏳️ ";
      }
      if (table.arena_win) {
        table_flags += " 🏟️ ";
      }

      tables.push({
        id: table.table_id,
        url: table_url,
        scores: (table_players[0] == player1_id)
                  ? `${table_scores[0]} - ${table_scores[1]}`
                  : `${table_scores[1]} - ${table_scores[0]}`,
        date: table_date.toISOString().substr(0, 16).replace("T", " "),
        timestamp: table.start,
        flags: table_flags
      });
    }
    tables.sort((a, b) => a.timestamp - b.timestamp);
    let players_url = `https://boardgamearena.com/gamestats?player=${player1_id}&opponent_id=${player2_id}&game_id=${game_id}&finished=0`;
    if (day) {
      players_url += `&start_date=${day}&end_date=${day + 86400}`;
    }
    console.debug(`Got ${tables.length} tables`);

    return { player1_id, player2_id, players_url, tables };
  }
  catch (error) {
    console.error(`Couldnt get games for ${player1} - ${player2}: ${error}`);
  }
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function getAllDuels(all_duels_txt, day, game_id) {
  const gameListDiv = document.createElement('div');
  gameListDiv.style.height = "460px";
  gameListDiv.style.overflowY = "auto";
  const duels_txt = all_duels_txt.split("\n");
  const vsRegex = new RegExp(" vs ", 'i');

  for (const duel_txt of duels_txt) {
    if (!duel_txt) {
      continue;
    }

    let players = duel_txt.split(" - ");
    if (players.length !== 2) {
      players = duel_txt.split(vsRegex);
    }
    if (players.length !== 2) {
      players = duel_txt.split("-");
    }
    if (players.length !== 2) {
      console.error(`Couldn't get players for "${duel_txt}"`);
      continue;
    }

    players = [players[0].trim(), players[1].trim()];

    await sleep(REQUEST_INTERVAL);
    const games_data = getGames(players[0], players[1], day, game_id);
    const games = games_data.tables;

    // Add duel header info
    const duelHeader = document.createElement("h3");
    const duelLink = document.createElement("a");
    const duelGameList = document.createElement("ol");
    duelLink.style.textDecoration = "none"
    duelLink.innerText = `${players[0]} - ${players[1]}`;
    duelLink.href = games_data.players_url;
    gameListDiv.appendChild(duelHeader);
    duelHeader.appendChild(duelLink);
    gameListDiv.appendChild(duelGameList);

    // Add games info
    for (const game of games) {
      const liItem = document.createElement('li');
      const gameLink = document.createElement('a');
      liItem.innerText = day ? `${game.date.substring(11)}: ` : `${game.date}: `;
      liItem.style.padding = "0.1em 0.2em";
      gameLink.classList = "bga-link";
      gameLink.innerText = game.scores;
      gameLink.href = game.url;
      liItem.appendChild(gameLink);
      liItem.appendChild(document.createTextNode(game.flags));
      duelGameList.appendChild(liItem);
    }
  }
  return gameListDiv;
}

})();
