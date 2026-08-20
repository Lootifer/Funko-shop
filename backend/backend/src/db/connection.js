import path from "node:path";
import sqlite3 from "sqlite3";

const DEFAULT_DB_PATH = path.resolve(process.cwd(), "Data", "lootifer.sqlite");
const DB_PATH = process.env.LOOTIFER_DB_PATH ? path.resolve(process.env.LOOTIFER_DB_PATH) : DEFAULT_DB_PATH;

sqlite3.verbose();

let dbInstance;

export const getDb = () => {
  if (dbInstance) return dbInstance;

  dbInstance = new sqlite3.Database(DB_PATH);
  dbInstance.exec("PRAGMA foreign_keys = ON;");
  return dbInstance;
};

export const getDbPath = () => DB_PATH;

export const run = (sql, params = []) => {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) return reject(error);
      return resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const get = (sql, params = []) => {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) return reject(error);
      return resolve(row || null);
    });
  });
};

export const all = (sql, params = []) => {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) return reject(error);
      return resolve(rows || []);
    });
  });
};

export const exec = (sql) => {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) return reject(error);
      return resolve(true);
    });
  });
};

export const closeDb = async () => {
  if (!dbInstance) return;
  const db = dbInstance;
  dbInstance = undefined;

  await new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) return reject(error);
      return resolve(true);
    });
  });
};
