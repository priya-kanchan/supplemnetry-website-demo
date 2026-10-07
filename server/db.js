// Storage layer. Uses MongoDB when MONGODB_URI is set (production on Render),
// otherwise a local JSON file in ./data for development.
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

const COLLECTIONS = ["products", "orders", "images", "customers"];

async function mongoStore(uri) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "vitalyx");
  const col = name => db.collection(name);
  await col("products").createIndex({ id: 1 }, { unique: true });
  await col("orders").createIndex({ id: 1 }, { unique: true });
  await col("orders").createIndex({ createdAt: -1 });
  await col("images").createIndex({ id: 1 }, { unique: true });
  await col("customers").createIndex({ id: 1 }, { unique: true });
  await col("customers").createIndex({ email: 1 }, { unique: true });
  await col("orders").createIndex({ customerId: 1 });
  await col("orders").createIndex({ payRef: 1 }, { unique: true, sparse: true });
  const noId = { projection: { _id: 0 } };
  return {
    kind: "MongoDB",
    all: name => col(name).find({}, noId).toArray(),
    get: (name, id) => col(name).findOne({ id }, noId),
    findOne: (name, field, value) => col(name).findOne({ [field]: value }, noId),
    where: (name, field, value) => col(name).find({ [field]: value }, noId).toArray(),
    insert: async (name, doc) => { await col(name).insertOne({ ...doc }); return doc; },
    insertMany: async (name, docs) => { if (docs.length) await col(name).insertMany(docs.map(d => ({ ...d }))); },
    update: async (name, id, patch) => (await col(name).findOneAndUpdate({ id }, { $set: patch }, { returnDocument: "after", ...noId })),
    remove: async (name, id) => (await col(name).deleteOne({ id })).deletedCount > 0,
    count: name => col(name).countDocuments()
  };
}

function fileStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let data = {};
  try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* new file */ }
  for (const c of COLLECTIONS) data[c] ||= [];
  const save = () => {
    fs.writeFileSync(file + ".tmp", JSON.stringify(data));
    fs.renameSync(file + ".tmp", file);
  };
  const clone = v => v && structuredClone(v);
  return {
    kind: `JSON file (${file})`,
    all: async name => clone(data[name]),
    get: async (name, id) => clone(data[name].find(d => d.id === id) || null),
    findOne: async (name, field, value) => clone(data[name].find(d => d[field] === value) || null),
    where: async (name, field, value) => clone(data[name].filter(d => d[field] === value)),
    insert: async (name, doc) => { data[name].push(clone(doc)); save(); return doc; },
    insertMany: async (name, docs) => { data[name].push(...clone(docs)); save(); },
    update: async (name, id, patch) => {
      const d = data[name].find(x => x.id === id);
      if (!d) return null;
      Object.assign(d, clone(patch)); save();
      return clone(d);
    },
    remove: async (name, id) => {
      const n = data[name].length;
      data[name] = data[name].filter(d => d.id !== id);
      if (data[name].length === n) return false;
      save(); return true;
    },
    count: async name => data[name].length
  };
}

export async function connectDb(rootDir) {
  const uri = process.env.MONGODB_URI;
  if (uri) return mongoStore(uri);
  return fileStore(path.join(rootDir, "data", "db.json"));
}
