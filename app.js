//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.set('useUnifiedTopology', true);
mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });

// ///setup a new user database
const userSchema = {
    email: String,
    password: String
};

//// new mongoose Model for DB, with collection name "User", using the userSchema
const User = new mongoose.model("User", userSchema);

app.get("/", function (req, res) {
    res.render("home");
});
app.get("/login", function (req, res) {
    res.render("login");
});
app.get("/register", function (req, res) {
    res.render("register");
});

//// register the user, and save the input to userDB
app.post("/register", function (req, res) {
    ///create new user, using the userSchema and the input from register page form 
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    newUser.save(function (err) {
        if (err) {
            console.log(err);
        } else {
            //// show the sicrets page only if/when user is registered
            res.render("secrets");
        }
    });
});






app.listen(3000, function () {
    console.log("Server is running on port 3000");
});

