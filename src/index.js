// Author: Riley Adams
// Date: 6/22/20
// Description: This is a Discord bot that tracks the games played by opted in users and track their total time played over the bots running time
// 				Use the "-track help" command in a channel when the bot is running to see commands, "-track function" will give you more information
// To run you need discord.js, collections, and list
//'use strict';

import {token} from './config.js';
import {Client, Intents} from 'discord.js';
const client = new Client({intents: [Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILDS], token: token});

//Replace the string below with your personal bot key
client.login(token);

import Set from "collections/set.js";
import fs from 'fs';
var runTime = new Date();

let userLog = new Map();
var tracking = new Set();

client.on('rateLimit', (rateLimitInfo) => {
	console.log(rateLimitInfo.method);
});

client.on('ready', () => {
	var tempTrack = new Set();
	try{
		var input = fs.readFileSync("tracking.txt", "utf8");
		var lines = input.split("\n");
		
		for(var x = 0; x < lines.length; x++){
			if(lines[x] != '' && lines[x] != 'undefined'){
				tempTrack.add(lines[x]);
			}
		}
	}catch(err){
		console.log("Unable to load users from file");
	}
	
	if(tempTrack.length > 0){
		tracking = tempTrack;
		console.log("Loaded "+tempTrack.length+" users from file to track");
	}
	client.user.setActivity("\"-track help\" for commands", {type:2});
	console.log('Bot is ready');
});

// Called when anyone changes status in any server the bot is in
client.on('presenceUpdate', function(oldMember, newMember){
	if(oldMember){
		if (tracking.has(oldMember.user.id)){
			for(var i = 0; i < oldMember.activities.length; i++){
				var endedGame = true;
				for(var t = 0; t < newMember.activities.length; t++){
					if(oldMember.activities[i].name == newMember.activities[t].name){
						endedGame = false;
						break;
					}
				}
				if(endedGame && oldMember.activities[i].timestamps){
					console.log("Added stat");
					var timeAdded = (Date.now() - oldMember.activities[i].timestamps.start) / 1000;
					
					// Used to check if discord failed to get the start time and in general make sure that the time added isn't ridiculus
					if(timeAdded > 31540000){
						return;
					}
					
					if(!userLog.has(oldMember.guild)){
						userLog.set(oldMember.guild, new Map());
						console.log("Added guild to log");
					}
					
					if (userLog.get(oldMember.guild).has(oldMember.user.id)){
						if(userLog.get(oldMember.guild).get(oldMember.user.id).has(oldMember.activities[i].name)){
							userLog.get(oldMember.guild).get(oldMember.user.id).set(oldMember.activities[i].name, userLog.get(oldMember.guild).get(oldMember.user.id).get(oldMember.activities[i].name) + timeAdded);
						}else{
							userLog.get(oldMember.guild).get(oldMember.user.id).set(oldMember.activities[i].name, timeAdded);
						}
					}else{
						var tempMap = new Map();
						tempMap.set(oldMember.activities[i].name, timeAdded);
						userLog.get(oldMember.guild).set(oldMember.user.id, tempMap);
					}
				}
			}
		}
	}
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()){
		return;
	}

	const { commandName } = interaction

    switch(commandName){
        case "track_time":
            if(userLog.has(interaction.guild) && userLog.get(interaction.guild).has(interaction.member.user.id)){
                var out = "";
                for (let [k, v] of userLog.get(interaction.guild).get(interaction.member.user.id)) {
                    if(v < 60){
                        out = out + k + " played for " + Math.round(v)+" seconds"+"\n";
                    }else if(v < 60*60){
                        out = out + k + " played for " + Math.round(v / 60)+" minutes"+"\n";
                    }else{
                        out = out + k + " played for " + Math.round(v / 60 / 60)+" hours"+"\n";
                    }
                }out = out + "Since "+(runTime.getMonth()+1)+"/"+runTime.getDate();
                interaction.reply(out);
            }else{
                interaction.reply("No games played yet");
            }
            break;

        case "track_opt_in":
            if(tracking.has(interaction.member.user.id)){
                interaction.reply("<@"+interaction.member.user+">" + " appears to have already been opted in");
            }else{
                interaction.reply("<@"+interaction.member.user+">" + " has been opted in. This allows the bot to track when you play games and store your unique discord id so that it can remember if you have opted in or not.");
                tracking.add(interaction.member.user.id);
            }
            
            var out = "";
            for (let user of tracking){
                out = out + user + "\n";
            }
            
            const data = new Uint8Array(Buffer.from(out));
            fs.writeFile('tracking.txt', data, function (err) {
              if (err) console.log(err);
            });
            break;

        case "track_opt_out":
            if(tracking.delete(interaction.member.user.id)){
                interaction.reply("<@"+interaction.member.user+">" + " has been opted out successfully");
                
                var out = "";
                for (let user of tracking){
                    out = out + user + "\n";
                }
                
                const data = new Uint8Array(Buffer.from(out));
                fs.writeFile('tracking.txt', data, function (err) {
                  if (err) return console.log(err);
                });
            }else{
                interaction.reply("<@"+interaction.member.user+">" + " wasn't opted in");
            }
            break;
        
        case "track_stats":
            if(!userLog.has(interaction.guild)){
                console.log("No games played in this server or not properly adding server to log");
                interaction.reply("There are no stats for this server");
                return;
            }
            var gameTotals = new Map();
            var topPlayed = new Map();
            var highestSingle = ["Name", "Game", 0];
            
            for(let [k1, v1] of userLog.get(interaction.guild)){
                for(let [k2, v2] of v1){
                    if(gameTotals.has(k2)){
                        gameTotals.set(k2, gameTotals.get(k2) + v2);
                        if(v2 > userLog.get(interaction.guild).get(topPlayed.get(k2)).get(k2)){
                            topPlayed.set(k2, k1);
                        }
                    }else{
                        gameTotals.set(k2, v2);
                        topPlayed.set(k2, k1);
                    }
                    if(v2 > highestSingle[2]){
                        highestSingle[0] = k1;
                        highestSingle[1] = k2;
                        highestSingle[2] = v2;
                    }
                }
            }
            const sortedGames = new Map([...gameTotals.entries()].sort((a, b) => b[1] - a[1]));
            
            var out = "";
            var max = 0;
            var firstKey;
            for (let [k, v] of sortedGames) {
                if(max == 0){
                    firstKey = k;
                }
                if(max > 9){
                    break;
                }
                if(v < 60){
                    out = out + k + " played for " + Math.round(v)+" seconds"+"\n";
                }else if(v < 60*60){
                    out = out + k + " played for " + Math.round(v / 60)+" minutes"+"\n";
                }else{
                    out = out + k + " played for " + Math.round(v / 60 / 60)+" hours"+"\n";
                }
                max = max + 1;
            }
            getTopPlayed(topPlayed, firstKey, interaction, runTime, out, highestSingle);
            break;

        case "track_help":
            interaction.reply("Current commands are:\n\"/track_function\" Explains what this bot does and how to get started\n\"/track_opt_in\" allows you to be tracked by the bot\n\"/track_opt_out\" stops you from being tracked by the bot\n\"/track_stats\" gets combined stats of users in this server\n\"/track_time\" prints your time recorded on games");
            break;

        case "track_function":
            interaction.reply("This bot collects game data on users that opt in, which allows it to see how much time a user plays a game while the bot was running. To opt in do \"/track_opt_in\", to see personal stats do \"/track_time\", to see server wide stats do \"/track_stats\"");
            break;
    }
});

async function getTopPlayed(topPlayed, firstKey, interaction, runTime, out, highestSingle){
    let playedTopUser = (await interaction.guild.members.fetch(topPlayed.get(firstKey))).displayName;
    let playedHighestSingle = (await interaction.guild.members.fetch(highestSingle[0])).displayName;
	out = out + playedTopUser + " played the top game the most\n";
	out = out + playedHighestSingle + " played a single game("+highestSingle[1]+") the most, for "+Math.round(highestSingle[2] / 60 / 60)+" hours\n";
	out = out + "Since "+(runTime.getMonth()+1)+"/"+runTime.getDate();

	interaction.reply(out);
}
