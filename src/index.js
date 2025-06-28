// Author: Riley Adams
// Date: 6/22/20
// Description: This is a Discord bot that tracks the games played by opted in users and track their total time played over the bots running time
// 				Use the "-track help" command in a channel when the bot is running to see commands, "-track function" will give you more information
// To run you need discord.js, collections, and list
//'use strict';

import {DB} from './db.js';
import {Client, Intents} from 'discord.js';

if (!process.env.DISCORD_TOKEN) {
	console.error('DISCORD_TOKEN environment variable is missing!');
	process.exit(1);
}

const client = new Client({intents: [Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILDS], token: process.env.DISCORD_TOKEN});

//Replace the string below with your personal bot key
client.login(process.env.DISCORD_TOKEN);

import Set from "collections/set.js";
import fs from 'fs';

let db = new DB();
let steamGameList = null;
let steamUpdateLast = null;
let genreCalls = new Set();


client.on('rateLimit', (rateLimitInfo) => {
	console.log(rateLimitInfo.method);
});

client.on('ready', () => {
	var tempTrack = new Set();
	
	client.user.setActivity("\"-track help\" for commands", {type:2});
	console.log('Bot is ready');
});

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

	if (genreCalls.has(gameName)) {
		return;
	}
	genreCalls.add(gameName);


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
		genreCalls.delete(gameName);
		return;
	}
}

// Called when anyone changes status in any server the bot is in
client.on('presenceUpdate', function(oldMember, newMember){
	if(oldMember) {
		db.optedIn(oldMember.user.id).then((optedIn) => {
			if (optedIn) {
				for(var i = 0; i < oldMember.activities.length; i++){
					var endedGame = true;
					for(var t = 0; t < newMember.activities.length; t++){
						if(oldMember.activities[i].name == newMember.activities[t].name){
							endedGame = false;
							break;
						}
					}

					if (endedGame && oldMember.activities[i].timestamps) {
						var timeAdded = (Date.now() - oldMember.activities[i].timestamps.start) / 1000;

						// Used to check if discord failed to get the start time and in general make sure that the time added isn't ridiculus
						if(timeAdded > 31540000 || timeAdded < 0){
							continue;
						}

						console.log(`Adding stat for user(${oldMember.user.id}), game(${oldMember.activities[i].name}), time(${timeAdded}).`);
						handleGenre(oldMember.activities[i].name);
						db.addStat(oldMember.user.id, oldMember.activities[i].name, timeAdded);
					}
				}
				db.addUserToGuild(oldMember.user.id, oldMember.guild.id);
			}
		});
	}
});

function timeUnits(time) {
	if(time < 60){
		return Math.round(time) + " seconds";
	}else if(time < 60*60){
		return Math.round(time / 60) + " minutes";
	}else{
		return Math.round(time / 60 / 60) + " hours";
	}
}

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()){
		return;
	}

	const { commandName } = interaction

    switch(commandName){
	case "track_genre":
		db.getGenreTimePlayed(interaction.member.user.id).then((stats) => {
			if (stats.length == 0) {
				interaction.reply("No games played yet");
				return;
			}

			var out = "";
			for (let row of stats) {
			    if(row.time_seconds < 60){
				out = out + row.genre + " played for " + Math.round(row.time)+" seconds\n";
			    }else if(row.time_seconds < 60*60){
				out = out + row.genre + " played for " + Math.round(row.time / 60)+" minutes\n";
			    }else{
				out = out + row.genre + " played for " + Math.round(row.time / 60 / 60)+" hours\n";
			    }
			}
			out = out + "Played " + stats.length + " unique genres!\n";
			interaction.reply(out);
		});
		break;
	case "track_server_genre":
		db.getGuildGenreStats(interaction.guild.id).then((stats) => {
			if (stats.length == 0) {
				interaction.reply("No games played yet");
				return;
			}

			var out = "";
			let c = 0;
			for (let row of stats) {
			    if(row.time_seconds < 60){
				out = out + row.genre + " played for " + Math.round(row.time)+" seconds\n";
			    }else if(row.time_seconds < 60*60){
				out = out + row.genre + " played for " + Math.round(row.time / 60)+" minutes\n";
			    }else{
				out = out + row.genre + " played for " + Math.round(row.time / 60 / 60)+" hours\n";
			    }
			    c++;
			    if (c >= 10) {
				break;
			    }
			}
			out = out + "This server played " + stats.length + " unique genres!\n";
			interaction.reply(out);
		});
		break;

        case "track_time":
		// This just gets one users stats
		db.getUserStats(interaction.member.user.id).then((stats) => {
			if (stats.length == 0) {
				interaction.reply("No games played yet");
				return;
			}

			var out = "";
			for (let row of stats) {
			    if(row.time_seconds < 60){
				out = out + row.game_name + " played for " + Math.round(row.time_seconds)+" seconds\n";
			    }else if(row.time_seconds < 60*60){
				out = out + row.game_name + " played for " + Math.round(row.time_seconds / 60)+" minutes\n";
			    }else{
				out = out + row.game_name + " played for " + Math.round(row.time_seconds / 60 / 60)+" hours\n";
			    }
			}
			out = out + "Played " + stats.length + " unique games!\n";
			interaction.reply(out);
		});
		break;

        case "track_opt_in":
		db.addUser(interaction.member.user.id).then(() => {
			interaction.reply("<@"+interaction.member.user+">" + " has been opted in. This allows the bot to track when you play games and store your unique discord id so that it can remember if you have opted in or not.");
		}).catch((err) => {
			console.error(err);
			if (err.errno = 19) {
				interaction.reply("<@"+interaction.member.user+">" + " appears to have already been opted in");
			} else {
				interaction.reply("Ran into fatal error, try again later...");
			}
		});
            break;

        case "track_opt_out":
		db.removeUser(iteraction.member.user.id).then(() => {
			interaction.reply("<@"+interaction.member.user+">" + " has been opted out successfully");
		}).catch((err) => {
			interaction.reply("<@"+interaction.member.user+">" + " unable to opt out... Try again later");
		});
            break;
        
        case "track_stats":
		db.getGuildStats(interaction.guild.id).then(async (res) => {
			let out = "";
			let topGame = "";
			let c = 0;
			for (let row of res) {
				if (c == 0) {
					topGame = row.game_name;
				}

				if(row.time < 60){
				    out = out + row.game_name + " played for " + Math.round(row.time)+" seconds\n";
				}else if(row.time < 60*60){
				    out = out + row.game_name + " played for " + Math.round(row.time / 60)+" minutes\n";
				}else{
				    out = out + row.game_name + " played for " + Math.round(row.time / 60 / 60)+" hours\n";
				}
				c++;

				if (c > 9) {
					break;
				}
			}

			if (out == "") {
				out = "There are no stats for this server";
				interaction.reply(out);
				return;
			}

			let topPlayerData = await db.getGuildTopPlayerOfGame(interaction.guild.id, topGame);
			out = out + (await interaction.guild.members.fetch(topPlayerData.user_id.toString())).displayName + " played the top game the most\n";

			let singleGameData = await db.getGuildTopPlayerSingle(interaction.guild.id);
			out = out + (await interaction.guild.members.fetch(singleGameData.user_id.toString())).displayName +
				` played a single game(${singleGameData.game_name}) the most, for ${timeUnits(singleGameData.time_seconds)}\n`;

			interaction.reply(out);
		}).catch(console.error);
            break;

        case "track_help":
            interaction.reply("Current commands are:\n\"/track_function\" Explains what this bot does and how to get started\n\"/track_opt_in\" allows you to be tracked by the bot\n\"/track_opt_out\" stops you from being tracked by the bot\n\"/track_stats\" gets combined stats of users in this server\n\"/track_time\" prints your time recorded on games");
            break;

        case "track_function":
            interaction.reply("This bot collects game data on users that opt in, which allows it to see how much time a user plays a game while the bot was running. To opt in do \"/track_opt_in\", to see personal stats do \"/track_time\", to see server wide stats do \"/track_stats\"");
            break;
    }
});
