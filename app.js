// --------- Environment Setup ---------
process.env.NODE_ENV = (process.argv[2].toUpperCase() === 'DEV' ||
  process.argv[2].toUpperCase() === 'DEVELOPMENT') ? 'DEV' : 'PROD';
var debug = (process.env.NODE_ENV.toUpperCase() === 'DEV');
var config = require('./config/settings')[process.env.NODE_ENV];
config.CONNECTIONS = require('./config/settings').CONNECTIONS;
var messages = require('./config/messages');

// --------- Dependencies ---------
var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var cookieParser = require('cookie-parser');
var passport = require('passport');
var flash = require('connect-flash');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var nev = require('email-verification')(mongoose);
var smtpTransport = require('nodemailer-smtp-transport');
require('express-mongoose');

// Require models
var User = require('./models/user');

// Configure email verification options
nev.configure({
  verificationURL: config.URL + '/verify/${URL}',

  // MongoDB Model Info
  persistentUserModel: User,
  tempUserCollection: 'unverified_users',
  emailFieldName: 'email',
  URLFieldName: 'verificationUrl',

  // Emailing Options
  transportOptions: smtpTransport(config.EMAIL_SETTINGS),
  verifyMailOptions: config.VERIFY_EMAIL_FORMAT,
  confirmMailOptions: config.CONFIRM_EMAIL_FORMAT,

  // Log errors on console
  verifySendMailCallback: function(err, info) {
    if (err) {
      console.error(err);
    }
  },
  confirmSendMailCallback: function(err, info) {
    if (err) {
      console.error(err);
    }
  }
}, function(err, options) {
  if (err) {
    console.error(err);
  }
});
nev.generateTempUserModel(User, function(err, info) {
  if (err) {
    console.error(err);
  }
});

// --------- Support bodies ---------
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// --------- MongoDB & Mongoose Setup ---------
mongoose.connect(config.MONGO_URI, function(err) {
  if (err) {
    throw err;
  }
  if (debug) {
    console.log('Successfully connected to MongoDB');
  }
});

// --------- Authentication Setup ---------
require('./config/passport')(passport, nev);
app.use(cookieParser());
app.use(session({
  secret: '#ofi!af8_1b_edlif6h=o8b)f&)hc!8kx=w*$f2pi%hm)(@yx8',
  store: new MongoStore({mongooseConnection: mongoose.connection}),
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// --------- Assets Setup ---------
app.use('/static', express.static(path.join(__dirname, '/assets')));
app.use('/fonts', express.static(path.join(__dirname,
  '/node_modules/materialize-css/dist/font')));
app.set('view engine', 'pug');
require('./routes/assets')(app);

// Capitalize Pug variables
app.locals.ucfirst = function(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
};

// Use moment library on Pug variables
app.locals.moment = require('moment');

// Pass login status for use in views
app.use(function(req, res, next) {
  // Set up login status and variables
  res.locals.login = req.isAuthenticated();
  if (req.user) {
    // Get display name
    res.locals.displayName = req.user.displayName;

    // Set up greeting message
    var date = new Date();
    var hour = date.getHours();
    var greeting = 'Hi';

    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 18) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }

    // Set the greeting and get the user's avatar and email address
    res.locals.greeting = greeting;
    res.locals.avatar = req.user.avatar;
    res.locals.email = req.user.email;
  }
  next();
});

// --------- Miscellaneous Routes & Helper Functions ---------

/**
 * Route middleware to ensure that the user is logged in.
 * @param  {Object}   req  The current request
 * @param  {Object}   res  The response
 * @param  {Function} next Pass control to the next matching route
 * @return {Function}      Proceed if the user is logged in; otherwise,
 *                         redirect to the home page
 */
function isLoggedIn(req, res, next) {
  // Proceed if user is authenticated
  if (req.isAuthenticated()) {
    return next();
  }

  // Otherwise, redirect to front page
  res.redirect('/');
}

// Set up app routes
require('./routes/pages')(app, passport, isLoggedIn, nev);
require('./routes/facebook')(app, passport, isLoggedIn);
require('./routes/youtube')(app, passport, isLoggedIn);

/**
 * If the route does not exist (error 404), go to the error page.
 * This route must remain as the last defined route, so that other
 * routes are not overridden!
 */
app.all('*', function(req, res, next) {
  next({
    status: 404,
    message: 'Page Not Found',
    description: messages.ERROR.ERROR_PAGE.PAGE_NOT_FOUND
  });
});

// --------- Error handling ---------
app.use(function(err, req, res, next) {
  // If no status is predefined, then label as internal server error
  if (!err.status) {
    err.status = 500;
  }

  // If in dev env, pass all information on error
  if (debug) {
    res.render('error', {
      title: 'Error ' + err.status,
      message: err.message,
      fullError: JSON.stringify(err, null, '<br />').replace('}', '<br />}'),
      stack: err.stack || 'No stack to display'
    });
  } else {
    // If in prod env, pass a user-friendly message
    res.render('error', {
      title: 'Error ' + err.status,
      message: err.message,
      description: err.description ||
        messages.ERROR.ERROR_PAGE.INTERNAL_SERVER_ERROR
    });
  }
});

// Run App
var server = app.listen(3000, function() {
  if (debug) {
    var host = (server.address().address === '::') ? 'localhost' :
    server.address().address;
    var port = server.address().port;
    console.log('Listening on %s:%s', host, port);
  }
});
