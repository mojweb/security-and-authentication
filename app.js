//jshint esversion:6

///// use enviroment variables to keep secrets safe 
//////https://www.npmjs.com/package/dotenv
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.set('useUnifiedTopology', true);
mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });

// ///setup a new user database
/// setup a proper mongoose schema(object created from the schema class)
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});



//// new mongoose Model for DB, with collection name "User", using the userSchema
const User = new mongoose.model("User", userSchema);

//// show the pages when url is typed
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

    //// Technique 2 (auto-gen a salt and hash): 
    //// https://www.npmjs.com/package/bcrypt
    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
        ///////// Store hash in your password DB. ////////////////
        ///create new user, using the userSchema and the input from register page form 
        const newUser = new User({
            email: req.body.username,
            //// hash the password
            password: hash
        });
        ///// save the new registered user
        newUser.save(function (err) {
            if (err) {
                console.log(err);
            } else {
                //// show the sicrets page only if/when user is registered
                res.render("secrets");
            }
        });
    });

});
///login the registered user
app.post("/login", function (req, res) {
    ///// we need to check two things, username, and pass, so we declare them here
    const userName = req.body.username;
    const password = req.body.password;

    //// here we check if the entered credentials exist in the userDB
    //// in collection "User", findOne registered email: thats same with the entered username
    User.findOne({ email: userName }, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            //// if there is a matching user found..
            if (foundUser) {
                ////then check if that foundUser in DB.. has a (registered)password -> hash in DB, with a hash that matches the hash from your password DB(foundUser.password).
                // bcrypt.compare(myPlaintextPassword, hash, function (err, res) { 
                bcrypt.compare(password, foundUser.password, function (err, result) {
                    // if resault is true
                    if (result === true) {
                        ///if hash matches, show the "secret" page
                        console.log("you got the password!!!");
                        res.render("secrets");
                    } else {
                        console.log("wrong password!!!");
                    }
                });
            }
        }
    });
});





app.listen(3000, function () {
    console.log("Server is running on port 3000");
});

