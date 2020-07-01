// Author: Riley Adams
// Date: 6/22/20
// Description: This is a Discord bot that tracks the games played by opted in users and track their total time played over the bots running time
// 				Use the "-track help" command in a channel when the bot is running to see commands, "-track function" will give you more information
// To run you need discord.js, collections, and list
'use strict';

const Discord = require('discord.js');

const client = new Discord.Client();

//Replace the string below with your personal bot key
client.login('Your token here');

var Set = require("collections/set.js");
var fs = require('fs');
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
					var timeAdded = (Date.now() - oldMember.activities[i].timestamps.start) / 1000;
					
					if(!userLog.has(oldMember.guild)){
						userLog.set(oldMember.guild, new Map());
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

client.on('message', function(message){
	if(message.content == "-track time") {
		if(userLog.has(message.guild) && userLog.get(message.guild).has(message.member.user.id)){
			var out = "";
			for (let [k, v] of userLog.get(message.guild).get(message.member.user.id)) {
				if(v < 60){
					out = out + k + " played for " + Math.round(v)+" seconds"+"\n";
				}else if(v < 60*60){
					out = out + k + " played for " + Math.round(v / 60)+" minutes"+"\n";
				}else{
					out = out + k + " played for " + Math.round(v / 60 / 60)+" hours"+"\n";
				}
			}out = out + "Since "+(runTime.getMonth()+1)+"/"+runTime.getDate();
			message.channel.send(out);
		}else{
			message.channel.send("No games played yet");
		}
	}else if(message.content == "-track opt in"){
		if(tracking.has(message.member.user.id)){
			message.channel.send("<@"+message.member.user+">" + " appears to have already been opted in");
		}else{
			message.channel.send("<@"+message.member.user+">" + " has been opted in. This allows the bot to track when you play games and store your unique discord id so that it can remember if you have opted in or not.");
			tracking.add(message.member.user.id);
		}
		
		var out = "";
		for (let user of tracking){
			out = out + user + "\n";
		}
		
		const data = new Uint8Array(Buffer.from(out));
		fs.writeFile('tracking.txt', data, function (err) {
		  if (err) return console.log(err);
		});
		
	}else if(message.content == "-track opt out"){
		if(tracking.delete(message.member.user.id)){
			message.channel.send("<@"+message.member.user+">" + " has been opted out successfully");
			
			var out = "";
			for (let user of tracking){
				out = out + user + "\n";
			}
			
			const data = new Uint8Array(Buffer.from(out));
			fs.writeFile('tracking.txt', data, function (err) {
			  if (err) return console.log(err);
			});
		}else{
			message.channel.send("<@"+message.member.user+">" + " wasn't opted in");
		}
	}else if(message.content == "-track stats"){
		if(!userLog.has(message.guild)){
			message.channel.send("There are no stats for this server");
			return;
		}
		var gameTotals = new Map();
		var topPlayed = new Map();
		var highestSingle = ["Name", "Game", 0];
		
		for(let [k1, v1] of userLog.get(message.guild)){
			for(let [k2, v2] of v1){
				if(gameTotals.has(k2)){
					gameTotals.set(k2, gameTotals.get(k2) + v2);
					if(v2 > userLog.get(message.guild).get(topPlayed.get(k2)).get(k2)){
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
		getTopPlayed(topPlayed, client, firstKey, message, runTime, out, highestSingle);
	}else if(message.content == "-track help"){
		message.channel.send("Current commands are:\n\"-track function\" Explains what this bot does and how to get started\n\"-track opt in\" allows you to be tracked by the bot\n\"-track opt out\" stops you from being tracked by the bot\n\"-track stats\" gets combined stats of users in this server\n\"-track time\" prints your time recorded on games");
	}else if(message.content == "-track function"){
		message.channel.send("This bot collects game data on users that opt in, which allows it to see how much time a user plays a game while the bot was running. To opt in do \"-track opt in\", to see personal stats do \"-track time\", to see server wide stats do \"-track stats\"");
	}
});

async function getTopPlayed(topPlayed, client, firstKey, message, runTime, out, highestSingle){
	let result = await client.users.fetch(topPlayed.get(firstKey));
	out = out + message.guild.member(result).displayName + " played the top game the most\n";
	out = out + message.guild.member(highestSingle[0]).displayName + " played a single game("+highestSingle[1]+") the most, for "+Math.round(highestSingle[2] / 60 / 60)+" hours\n";
	out = out + "Since "+(runTime.getMonth()+1)+"/"+runTime.getDate();

	message.channel.send(out);
	return result;
}