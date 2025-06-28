import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID) {
	console.error("Missing DISCORD_TOKEN and/or DISCORD_CLIENT_ID environment variable!");
	process.exit(1);
}
const commands = [
	new SlashCommandBuilder().setName('track_help').setDescription('Displays a help message for StatsBot'),
	new SlashCommandBuilder().setName('track_function').setDescription('Explains the purpose of this bot'),
	new SlashCommandBuilder().setName('track_opt_out').setDescription('Opts you out of having your games tracked(default)'),
	new SlashCommandBuilder().setName('track_opt_in').setDescription('Opts you in to having your games tracked'),
	new SlashCommandBuilder().setName('track_stats').setDescription('Displays the current statistics for this guild'),
	new SlashCommandBuilder().setName('track_time').setDescription('Displays your current statistics'),
	new SlashCommandBuilder().setName('track_genre').setDescription('Displays your current genre statistics'),
	new SlashCommandBuilder().setName('track_server_genre').setDescription('Displays the current genre statistics for this guild'),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
