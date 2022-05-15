import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { clientId, token } from './config.js';

const commands = [
	new SlashCommandBuilder().setName('track_help').setDescription('Displays a help message for StatsBot'),
	new SlashCommandBuilder().setName('track_function').setDescription('Explains the purpose of this bot'),
	new SlashCommandBuilder().setName('track_opt_out').setDescription('Opts you out of having your games tracked(default)'),
	new SlashCommandBuilder().setName('track_opt_in').setDescription('Opts you in to having your games tracked'),
	new SlashCommandBuilder().setName('track_stats').setDescription('Displays the current statistics for this guild'),
	new SlashCommandBuilder().setName('track_time').setDescription('Displays your current statistics'),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationCommands(clientId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
