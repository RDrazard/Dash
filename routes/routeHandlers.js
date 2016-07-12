// --------- Dependencies ---------
var User = require.main.require('./models/user');
var messages = require.main.require('./config/messages');

// Number of post items per page
var ITEMS_PER_PAGE = module.exports.ITEMS_PER_PAGE = 10;

// Number of pages shown in the pagination
var NUM_PAGES_SHOWN = module.exports.NUM_PAGES_SHOWN = 5;

// Number of pages shown before current page
var PAGE_CENTER = module.exports.PAGE_CENTER = 2;

/**
 * Send a general error back to the user.
 * @param  {Object}   res         The response
 * @param  {number}   code        The status code
 * @param  {?string}  message     A custom message to send to the user or the
 *                                general error message if null
 * @param  {boolean}  refresh     Whether to refresh the page after sending
 *                                the response
 * @return {res}                  Send a message back to the user that indicates
 *                                the status of the completed process
 */
var handleResponse = module.exports.handleResponse = function(res, code,
    message, refresh) {
  return res.status(code).send({
    message: message || messages.ERROR.GENERAL,
    refresh: refresh
  });
};

/**
 * Handles pagination for the dashboard.
 * @param  {Object} batches     The post collections
 * @param  {number} currentPage The current page that the user is on
 * @param  {number} totalPosts  The total number of posts that the user has
 *                              across services
 * @return {Object}             The details needed for setting up pagination
 */
var handlePagination = module.exports.handlePagination = function(batches,
    currentPage, totalPosts) {
  var results = {
    batches: batches,
    currentPage: currentPage,
    numPages: Math.ceil(totalPosts / ITEMS_PER_PAGE),
    startPage: null,
    endPage: null
  };
  if (totalPosts > 0) {
    var postCount = ITEMS_PER_PAGE;
    var skipCount = ITEMS_PER_PAGE * (results.currentPage - 1);
    batches.reverse().forEach(function(batch) {
      batch.posts.slice().forEach(function(post, idx, obj) {
        if (skipCount > 0) {
          skipCount--;
          batch.posts.splice(obj.length - 1 - idx, 1);
        } else if (postCount > 0) {
          postCount--;
        } else if (postCount === 0) {
          batch.posts.splice(obj.length - 1 - idx, 1);
        }
      });
    });

    // Ensure start page is positive
    results.startPage = results.currentPage - PAGE_CENTER > 0 &&
      results.numPages > NUM_PAGES_SHOWN ?
      results.currentPage - PAGE_CENTER : 1;

    // Ensure there is no overflow past the total number of pages
    results.endPage = results.startPage + (NUM_PAGES_SHOWN - 1) <=
      results.numPages ? results.startPage + (NUM_PAGES_SHOWN - 1) :
      results.numPages;

    // Ensure start page is NUM_PAGES_SHOWN - 1 away from the end page
    results.startPage = results.endPage - (NUM_PAGES_SHOWN - 1) <
      results.startPage && results.endPage - (NUM_PAGES_SHOWN - 1) > 0 ?
      results.endPage - (NUM_PAGES_SHOWN - 1) : results.startPage;
  }

  return results;
};

/**
 * Handles setting up the dashboard pagination for any page.
 * @param  {Object} req   The current request
 * @param  {Object} res   The response
 * @return {res}          Redirect the user to the correct page and template
 */
module.exports.handleDashboardSetup = function(req, res) {
  var totalPosts = 0;
  req.user.batches.forEach(function(batch) {
    totalPosts += batch.posts.length;
  });
  var numPages = Math.ceil(totalPosts / ITEMS_PER_PAGE);

  var currentPage = req.params.page ? parseInt(req.params.page, 10) : null;
  if (currentPage !== null && (currentPage === 1 || currentPage <= 0 ||
      currentPage > numPages)) {
    return res.redirect('/dashboard');
  }

  if (currentPage === null) {
    currentPage = 1;
  }

  var results = handlePagination(req.user.batches, currentPage, totalPosts,
    numPages);

  res.render('dashboard', {
    connected: req.user.facebook.profileId !== undefined ||
      req.user.youtube.profileId !== undefined,
    batches: results.batches,
    currentPage: results.currentPage || null,
    numPages: results.numPages || null,
    startPage: results.startPage || null,
    endPage: results.endPage || null
  });
};

/**
 * Completes the remaining steps after a refresh to generate a status message
 * for the user.
 * @param  {string} serviceName    The name of the service from which to
 *                                 retrieve messages or an empty string if
 *                                 running a refresh across all services
 * @param  {Object} err            An error, if one has occurred
 * @param  {string} errorMessage   Message to look out for in determining
 *                                 whether an access issue occurred or an empty
 *                                 string if running a refresh across all
 *                                 services
 * @param  {Object} posts          An object returned upon successfully finding
 *                                 new posts across services
 * @param  {Object} req            The current request
 * @param  {Object} res            The response
 * @return {res}                   Send the user back a status message
 */
module.exports.handlePostRefresh = function(serviceName, err, errorMessage,
    posts, req, res) {
  if (err && err.toString() === errorMessage) {
    req.flash('serviceMessage', messages.ERROR[serviceName].REFRESH);
    return handleResponse(res, 500,
      messages.STATUS[serviceName].ACCESS_PRIVILEGES, true);
  } else if (err) {
    return handleResponse(res, 500, null, true);
  } else if (posts) {
    return handleResponse(res, 200, messages.STATUS.GENERAL.NEW_POSTS, true);
  }
  return handleResponse(res, 200, messages.STATUS.GENERAL.NO_POSTS, false);
};

/**
 * Completes the remaining steps after an update to generate a status message
 * for the user. Examples of updates include settings updates and toggling
 * services.
 * @param  {string} successMessage The message to send on success
 * @param  {string} failureMessage The message to send on failure
 * @param  {Object} err            An error, if one has occurred
 * @param  {Object} updateSuccess  An object returned upon success
 * @param  {Object} req            The current request
 * @param  {Object} res            The response
 * @return {res}                   Send the user back a status message
 */
var handlePostUpdate = module.exports.handlePostUpdate =
  function(successMessage, failureMessage, err, updateSuccess, req, res) {
    if (err) {
      return handleResponse(res, 500, null, false);
    } else if (updateSuccess) {
      return handleResponse(res, 200, successMessage, true);
    }
    return handleResponse(res, 200, failureMessage, false);
  };

/**
 * Process the account deletion after making the necessary checks.
 * @param  {Object} req   The current request
 * @param  {Object} res   The response
 */
module.exports.handlePostAccountDeletion = function(req, res) {
  User.deleteUser(req.user._id, function(err, deleteSuccess) {
    return handlePostUpdate(messages.SETTINGS.ACCOUNT.DELETE_SUCCEEDED,
      messages.SETTINGS.ACCOUNT.DELETE_FAILED, err, deleteSuccess, req, res);
  });
};

/**
 * Handles a user update to a setting field.
 * @param  {Object} settings       An object containing the settings to update
 * @param  {string} field          The field for which to get the message to
 *                                 send to the user
 * @param  {Object} req            The current request
 * @param  {Object} res            The response
 */
module.exports.handleUserUpdate = function(settings, field, req, res) {
  User.updateUser(req.user._id, settings, function(err, updateSuccess) {
    var success = messages.SETTINGS[field].CHANGE_SUCCEEDED;
    var failure = messages.SETTINGS[field].CHANGE_FAILED;
    return handlePostUpdate(success, failure, err, updateSuccess, req, res);
  });
};

/**
 * Handles the process following registration for both initial sending and
 * resending for email verification.
 * @param  {string} successMessage The message to send on success
 * @param  {string} failureMessage The message to send on failure
 * @param  {Object} err            An error, if one has occurred
 * @param  {Object} userFound      An object returned upon success
 * @param  {Object} req            The current request
 * @param  {Object} res            The response
 * @return {res}                   Send the user back a status message in the
 *                                 allotted space in the page message box
 */
module.exports.handlePostRegistrationEmail = function(successMessage,
    failureMessage, err, userFound, req, res) {
  // An error occurred
  if (err) {
    req.flash('registerMessage', err.toString());
    return res.redirect('/register');
  }

  // Redirect to login
  if (userFound) {
    req.flash('loginMessage', successMessage);
    return res.redirect('/login');
  }

  // Redirect to register page
  req.flash('registerMessage', failureMessage);
  return res.redirect('/register');
};

/**
 * Handles the logout process after the user makes a critical change. Examples
 * of critical changes include changing the email address and thus placing the
 * account back into the unverified user collection.
 * @param  {string} statusMessage The message to give to the user
 * @param  {number} statusCode    The status code to send back
 * @param  {Object} req           The current request
 * @param  {Object} res           The response
 */
var handleLogout = module.exports.handleLogout = function(statusMessage,
    statusCode, req, res) {
  req.logout();
  req.session.destroy(function(err) {
    if (err) {
      return handleResponse(res, 500, null, true);
    }
    return handleResponse(res, statusCode, statusMessage, true);
  });
};

/**
 * Modifies the user's email address by moving the user back into
 * the unverified users' MongoDB collection.
 * @param  {Object}   nev           The email-verification module imported from
 *                                  app.js
 * @param  {Object}   returnedUser  The returned User object containing user
 *                                  details
 * @param  {string}   newEmail      The user's new email address
 * @param  {Object}   req           The current request
 * @param  {Object}   res           The response
 * @return {res}                    Send a message back to the user regarding
 *                                  the status of updating the email address
 */
module.exports.handleEmailChange = function(nev, returnedUser, newEmail, req,
    res) {
  return nev.createTempUser(returnedUser, function(err, existingPersistentUser,
      newTempUser) {
    // An error occurred
    if (err || existingPersistentUser) {
      return handleResponse(res, 200, messages.SETTINGS.EMAIL.EXISTS, false);
    }

    // New user creation successful; delete old one and verify email
    if (newTempUser) {
      User.deleteUser(req.user._id, function(err, deleteSuccess) {
        // An error occurred
        if (err) {
          return handleResponse(res, 500, null, false);
        } else if (deleteSuccess) {
          var URL = newTempUser[nev.options.URLFieldName];
          nev.sendVerificationEmail(newEmail, URL, function(err, info) {
            if (err) {
              return handleLogout(messages.SETTINGS.EMAIL.CHANGE_FAILED, 500);
            }
            return handleLogout(messages.SETTINGS.EMAIL.CHANGE_SUCCEEDED, 200);
          });
        }
      });
    }
  });
};

/**
 * Handles the remaining step of a process by notifying the user of whether the
 * save was successful.
 * @param  {string} successMessage The message to send on success
 * @param  {Object} err            An error, if one has occurred
 * @param  {Object} req            The current request
 * @param  {Object} res            The response
 * @return {res}                   Send the user back a status message
 */
var handlePostSave = module.exports.handlePostSave = function(successMessage,
    err, req, res) {
  // An error occurred
  if (err) {
    return handleResponse(res, 500, null, false);
  }

  // Successfully changed password
  return handleResponse(res, 200, successMessage, true);
};

/**
 * Modifies the user's password after verifying it is different from
 * the current password.
 * @param  {string}   currentPass The current password
 * @param  {string}   newPass     The new password
 * @param  {Object}   req         The current request
 * @param  {Object}   res         The response
 * @return {res}                  Send a message back to the user regarding
 *                                the status of updating the password
 */
module.exports.handlePasswordChange = function(currentPass, newPass, req, res) {
  return User.findById(req.user._id, function(err, user) {
    if (err) {
      return handleResponse(res, 500, null, false);
    } else if (user) {
      if (currentPass === newPass) {
        return handleResponse(res, 200, messages.SETTINGS.PASSWORD.NOT_NEW,
          false);
      }
      user.password = newPass;
      user.save(function(err) {
        var success = messages.SETTINGS.PASSWORD.CHANGE_SUCCEEDED;
        return handlePostSave(success, err, req, res);
      });
    } else {
      return handleResponse(res, 200, messages.SETTINGS.PASSWORD.CHANGE_FAILED,
        false);
    }
  });
};
