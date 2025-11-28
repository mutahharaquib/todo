const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");

const User = require("./models/User");
const Task = require("./models/Task");

require("dotenv").config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.set("view engine", "ejs");

app.use(
  session({
    secret: "todo-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// DB Connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Middleware: Protect Routes
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  next();
}

// ---------- AUTH ROUTES ----------

// LOGIN PAGE
app.get("/login", (req, res) => {
  res.render("login");
});

// SIGNUP PAGE
app.get("/signup", (req, res) => {
  res.render("signup");
});

// SIGNUP POST
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const hashedPass = await bcrypt.hash(password, 10);

  try {
    await User.create({ email, password: hashedPass });
    res.redirect("/login");
  } catch (e) {
    res.send("User already exists!");
  }
});

// LOGIN POST
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.send("User not found!");

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.send("Incorrect password!");

  req.session.userId = user._id;
  res.redirect("/");
});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// ---------- TODO ROUTES ----------

// HOME
app.get("/", requireLogin, async (req, res) => {
  const tasks = await Task.find({ userId: req.session.userId });
  res.render("index", { tasks });
});

// ADD TASK
app.post("/add", requireLogin, async (req, res) => {
  const { text } = req.body;
  await Task.create({
    text,
    userId: req.session.userId,
  });
  res.redirect("/");
});

// TOGGLE
app.post("/toggle/:id", requireLogin, async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    userId: req.session.userId,
  });
  if (task) {
    task.completed = !task.completed;
    await task.save();
  }
  res.redirect("/");
});

// DELETE
app.post("/delete/:id", requireLogin, async (req, res) => {
  await Task.deleteOne({ _id: req.params.id, userId: req.session.userId });
  res.redirect("/");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running...");
});
