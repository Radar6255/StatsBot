import {DB} from './db.js';
let db = new DB();

let steamGameList = null;
let steamUpdateLast = null;

async function handleGenre(gameName) {
	// First check to see if this game already has its genres populated
	try {
		if (await db.gameHasGenres(gameName)) {
			return;
		}
	} catch (err) {
		console.error("<3>Unable to find if game has genres!");
		return;
	}

	// Now see if we have the steam game list
	try {
		if (steamGameList == null || Date.now() - steamUpdateLast > 1000 * 60 * 60 * 24) {
			const res = await fetch("https://api.steampowered.com/ISteamApps/GetAppList/v2/");
			steamGameList = await res.json();
			steamUpdateLast = Date.now();
		}
	} catch (err) {
		console.error("<3>Unable to get steam game list!");
		return;
	}

	// Now we know that the steam game list is populated
	// Need to find the appid for the game
	let appid = null;

	console.time("Find appid");
	for (let game of steamGameList.applist.apps) {
		if (game.name == gameName) {
			appid = game.appid;
			break;
		}
	}
	console.timeEnd("Find appid");

	if (appid == null) {
		console.log(`WARNING: Unable to find appid for ${gameName}!`);
		return;
	}

	console.log(`Found appid ${appid} for ${gameName}!`);

	// All that is left is doing another HTTP call to get the genres and storing that in the DB
	try {
		const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}`);
		const gameData = await res.json();

		for (let genre of gameData[appid].data.genres) {
			await db.addGenre(gameName, genre.description);
		}
		console.log(`Added new genres for ${gameName}!`);
	} catch (err) {
		console.error(`<3>Unable to get genres for ${gameName}!`);
		return;
	}
}

async function main() {
	console.log("Starting to get game list");
	const games = await db.getGameList();
	console.log(games);

	for (let game of games) {
		await handleGenre(game.game_name);
	}
}

await main();
