// Author: Riley Adams
// Date: 5/10/25
// Description: This is a helper file to store data in a sqlite DB
//
import sqlite3 from 'sqlite3';
import fs from 'fs';

const dbFile = 'data.sqlite';

export class DB {
	db;
	constructor() {
		this.initDb();
	}

	initDb() {
		this.db = new sqlite3.Database(dbFile);
		if (fs.existsSync(dbFile)) {
			return;
		}

		this.db.serialize(() => {
			// Creating table to track who is opted in
			this.db.run("CREATE TABLE tracked_users (id TEXT NOT NULL PRIMARY KEY)");

			// Creating table to track who is opted in
			this.db.run("CREATE TABLE user_stats (id TEXT NOT NULL, game_name TEXT NOT NULL, time_seconds INTEGER, last_update INTEGER, PRIMARY KEY(id, game_name))");

			this.db.run("CREATE TABLE guild_users (user_id TEXT NOT NULL, guild_id TEXT NOT NULL, PRIMARY KEY(user_id, guild_id))");
		});
	}

	addUser(id) {
		return new Promise((res, rej) => {
			this.db.run("INSERT INTO tracked_users VALUES (?)", [id], (err, results) => {
				if (err) {
					rej(err);
					return;
				}
				res();
			});
		});
	}

	addUserToGuild(id, guild_id) {
		return new Promise((res, rej) => {
			this.db.run("INSERT INTO guild_users VALUES (?, ?) ON CONFLICT DO NOTHING", [id, guild_id], (err, results) => {
				if (err) {
					rej(err);
					return;
				}
				res();
			});
		});
	}

	removeUser(id) {
		return new Promise((res, rej) => {
			this.db.run("DELETE FROM tracked_users WHERE id = (?)", [id], (err, results) => {
				if (err) {
					rej(err);
					return;
				}
				res();
			});
		});
	}

	addStat(id, game_name, time_seconds) {
		return new Promise((res, rej) => {
			this.db.run(`INSERT INTO user_stats(id, game_name, time_seconds, last_update)
					VALUES (?, ?, ?, unixepoch())
					ON CONFLICT(id, game_name)
						DO UPDATE SET time_seconds=time_seconds+?, last_update=unixepoch()
						WHERE last_update < unixepoch() - 1000`,
				[id, game_name, time_seconds, time_seconds],
				(err, results) => {
					if (err) {
						rej(err);
						return;
					}
					res();
			});
		});
	}

	optedIn(id) {
		return new Promise((res, rej) => {
			this.db.get("SELECT COUNT(*) c FROM tracked_users WHERE id = ?", [id], (err, results) => {
				if (err) {
					rej(err);
					return;
				}
				res(results['c'] > 0);
			});
		});
	}

	getUserStats(id) {
		return new Promise((res, rej) => {
			this.db.all("SELECT * FROM user_stats WHERE id = ? ORDER BY time_seconds DESC", [id], (err, results) => {
				if (err) {
					rej(err);
					return;
				}

				res(results);
			});
		});
	}

	getGuildStats(guild_id) {
		return new Promise((res, rej) => {
			this.db.all(`SELECT game_name, SUM(time_seconds) time FROM user_stats JOIN guild_users ON id = user_id WHERE guild_id = ? GROUP BY game_name ORDER BY 2 DESC`, [guild_id], (err, results) => {
				if (err) {
					rej(err);
					return;
				}

				res(results);
			});
		});
	}

	getGuildTopPlayerSingle(guild_id) {
		return new Promise((res, rej) => {
			this.db.get(`SELECT user_id, game_name, time_seconds FROM user_stats JOIN guild_users ON id = user_id WHERE guild_id = ? ORDER BY 3 DESC`, [guild_id], (err, results) => {
				if (err) {
					rej(err);
					return;
				}

				res(results);
			});
		});
	}

	getGuildTopPlayerOfGame(guild_id, game_name) {
		return new Promise((res, rej) => {
			this.db.get(`SELECT user_id, time_seconds FROM user_stats JOIN guild_users ON id = user_id WHERE guild_id = ? AND game_name = ? ORDER BY 2 DESC`, [guild_id, game_name], (err, results) => {
				if (err) {
					rej(err);
					return;
				}

				res(results);
			});
		});
	}
}
