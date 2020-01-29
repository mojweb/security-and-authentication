//jshint esversion:6

///// use enviroment variables to keep secrets safe 
//////https://www.npmjs.com/package/dotenv
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require("mongoose-findorcreate");



const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

/// initialize and start using the session package
/// using an initial configuration
app.use(session({
    secret: "tajnata vecera",
    resave: false,
    saveUninitialized: false
}));

//// tell the app to initialize and use the passport package,
app.use(passport.initialize());
/// tell the app to use passport.. to deal with session
app.use(passport.session());

mongoose.set('useUnifiedTopology', true);
mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });
/// fix DeprecationWarning  https://github.com/Automattic/mongoose/issues/6890
mongoose.set('useCreateIndex', true);

// ///setup a new user database
/// setup a proper mongoose schema(object created from the schema class)
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String, /// add an option to store the users googleID in to the database
    facebookId: String, /// add an option to store the users facebookId in to the database
    secret: String /// save the new secret from the user input.. in to DB
});

/// https://www.npmjs.com/package/passport-local-mongoose
/// User.plugin(passportLocalMongoose);
/// set our userSchema to use passportLocalMongoose as plugin
userSchema.plugin(passportLocalMongoose);
/// https://www.npmjs.com/package/mongoose-findorcreate
userSchema.plugin(findOrCreate);

//// new mongoose Model for DB, with collection name "User", using the userSchema
const User = new mongoose.model("User", userSchema);

/// Simplified Passport/Passport-Local Configuration
/// https://www.npmjs.com/package/passport-local-mongoose
passport.use(User.createStrategy());
/// these do not work with Google OAuth
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
/// BUT, these do work, .. http://www.passportjs.org/docs/configure/
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

/// google OAuth
passport.use(new GoogleStrategy({
    // clientID: GOOGLE_CLIENT_ID,
    // clientSecret: GOOGLE_CLIENT_SECRET,
    // callbackURL: "http://www.example.com/auth/google/callback"
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    ///// this is a fix for the oauth to work after google+ is no more!!
    // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    /// after being authenticated by google, find or create a new user to our database
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

///*************************************************
passport.use(new FacebookStrategy({
    // clientID: FACEBOOK_APP_ID,
    // clientSecret: FACEBOOK_APP_SECRET,
    // callbackURL: "http://localhost:3000/auth/facebook/callback"
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);
        User.findOrCreate({ facebookId: profile.id }, function (err, user) {
            console.log(err);
            return cb(err, user);
        });
    }
));
///*************************************************
//// show the pages when url is typed
app.get("/", function (req, res) {
    res.render("home");
});

/// as shown here... http://www.passportjs.org/packages/passport-google-oauth20/
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
);
/// authenticate the user localy, and save the session after being registered using google and redirected here
app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect("/secrets");
    });

///*************************************************
//// http://www.passportjs.org/packages/passport-facebook/
//// http://www.passportjs.org/docs/facebook/
app.get("/auth/facebook",
    passport.authenticate("facebook", { scope: ["email"] })
);

app.get("/auth/facebook/secrets",
    passport.authenticate("facebook", { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect("/secrets");
    });
///*************************************************
app.get("/login", function (req, res) {
    res.render("login");
});
app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function (req, res) {
    /// search for all the users that have a "secret" field that is not null
    User.find({ "secret": { $ne: null } }, function (err, foundUsers) {
        if (err) { /// if error.. log it
            console.log(err);
        } else {
            if (foundUsers) { ///if there are such users
                /// render the secrets page with the secrets found
                res.render("secrets", { usersWithASecrets: foundUsers });
            }
        }
    });
});
// app.get("/secrets", function (req, res) {
//     //// if the user isAuthenticated, send/redirect him to secrets page
//     if (req.isAuthenticated()) {
//         res.render("secrets");
//         /// else, redirect the user back to login page
//     } else {
//         res.redirect("login");
//     }
// });

/// ako e authenticated.. renderiraj mu ja stranata submit, ako ne.. back to login
app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("login");
    }
});

/// ovozmozi postiranje na secrets, i sejvnuvanje na inputot vo bazata na userot
app.post("/submit", function (req, res) {
    const submittedSecret = req.body.secret;
    // console.log(req.user.id); /// log the user's id
    /// find the user by his id
    User.findById(req.user.id, function (err, foundUser) {
        if (err) { /// if error.. log the error
            console.log(err);
        } else { /// if user is found, i negoviot secret ke bide submittedSecret
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function () { /// save the secret
                    res.redirect("/secrets");/// then redirect the user to see the secrets page
                });
            }
        }
    });

});

/// logout -> de-authenticate 
/// http://www.passportjs.org/docs/logout/
app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});

//// register the user, and save the input to userDB
app.post("/register", function (req, res) {
    /// usage of the User. is possible because of the passportLocalMongoose package
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) { /// if error, log it, and redirect the user back to register page
            console.log(err);
            res.redirect("/register");
        } else { /// if the user is successfully authenticated, redirect them to "secrets" page, and send a cookie to the browser
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});

///login the registered user
app.post("/login", function (req, res) {
    /// create a new user from our mongoose model 
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    ///http://www.passportjs.org/docs/login/
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else { /// if the user is successfully authenticated, redirect them to "secrets" page, and send a cookie to the browser
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });

});



app.listen(3000, function () {
    console.log("Server is running on port 3000");
});

