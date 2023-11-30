const express = require("express");
const { checkDbConnection, sql } = require("./postgres");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcrypt");
const {
  hashPassword,
  generateToken,
  verifyAndCheckExpiration,
} = require("./utils");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT;
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // max 15 request per minute
  handler: (req, res) => {
    res
      .status(429)
      .json({ error: "Too many requests, please try again later" });
  },
});

app.use(express.json(), limiter);

app.get("/", (req, res) => {
  res.send("Welcome to Datify API!💖");
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  const check_duplicate =
    await sql`select * from "user" where email = ${email} or username = ${username}`;

  if (check_duplicate.count > 0) {
    return res.status(400).json({ error: "Email or username already exists" });
  }

  const hash = await hashPassword(password);
  const token = await generateToken(email, username);
  const user =
    await sql`insert into "user" (username, email, password, token) values (${username}, ${email}, ${hash}, ${token})`;

  return res.status(201).json({ token: token });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await sql`select * from "user" where email = ${email}`;

  if (user.count === 0) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  const passwordMatch = await bcrypt.compare(password, user[0].password);

  if (!passwordMatch) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  const token = await generateToken(email, user[0].username);
  await sql`update "user" set token = ${token} where email = ${email}`;

  return res.status(200).json({ message: "login successful", token: token });
});

app.get("/dashboard", async (req, res) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = req.headers.authorization.split(" ")[1];
  const checkToken = (await verifyAndCheckExpiration(token)).valid;

  if (!checkToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await sql`select * from "user" where token = ${token}`;

  if (user.count === 0) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res
    .status(200)
    .json({ message: `Welcome to your dashboard, ${user[0].username}` });
});

app.listen(PORT, () => {
  console.log(`Datify Server Running on http://localhost:${PORT} 💖`);

  checkDbConnection().then((status) => {
    console.log(`Database status: ${status}`);
  });
});

module.exports = app;
