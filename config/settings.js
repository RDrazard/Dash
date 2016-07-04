// Define variables for development and production environments
var settings = {
  CONNECTIONS: {
    FACEBOOK: {
      CLIENT_ID: process.env.DASH_FACEBOOK_APP_ID,
      CLIENT_SECRET: process.env.DASH_FACEBOOK_APP_SECRET
    },
    YOUTUBE: {
      CLIENT_ID: process.env.DASH_YOUTUBE_APP_ID,
      CLIENT_SECRET: process.env.DASH_YOUTUBE_APP_SECRET
    }
  },
  DEV: {
    MONGO_URI: 'mongodb://dashbot:dash@127.0.0.1:27017/dash',
    URL: 'http://localhost:3000',
    EMAIL_SETTINGS: {
      HOST: process.env.DASH_EMAIL_HOST,
      PORT: process.env.DASH_EMAIL_PORT,
      AUTH: {
        USER: process.env.DASH_EMAIL_USER,
        PASS: process.env.DASH_EMAIL_PASS
      },
      SECURE: true
    },
    VERIFY_EMAIL_FORMAT: {
      FROM:
        process.env.DASH_EMAIL_NAME + ' <' +
        process.env.DASH_EMAIL_USER + '>',
      SUBJECT:
        'Pending: Dash Account Verification',
      HTML:
        '<div style="text-align: center;"><h1>Dash</h1><h2>' +
        '<i>Account Verification</i></h2></div><p>Click the ' +
        'following link to confirm your account:</p>' +
        '<p>${URL}</p><p>- DashBot</p>',
      TEXT:
        'Dash Account Verification: Please confirm your ' +
        'account by clicking the following link: ${URL} - DashBot'
    },
    CONFIRM_EMAIL_FORMAT: {
      FROM:
        process.env.DASH_EMAIL_NAME + ' <' +
        process.env.DASH_EMAIL_USER + '>',
      SUBJECT:
        'Dash Account Verified!',
      HTML:
        '<div style="text-align: center;"><h1>Dash</h1><h2>' +
        '<i>Account Verification</i></h2></div><p>Your Dash ' +
        'account has been successfully verified. Welcome to Dash!</p>' +
        '<p>- DashBot</p>',
      TEXT:
        'Dash Account Verification: Your account has been ' +
        'successfully verified. Welcome to Dash! - DashBot'
    }
  },
  PROD: {
    MONGO_URI: process.env.DASH_MONGODB_URL,
    URL: 'http://localhost:3000', // Default to localhost for now
    EMAIL_SETTINGS: {
      HOST: process.env.DASH_EMAIL_HOST,
      PORT: process.env.DASH_EMAIL_PORT,
      AUTH: {
        USER: process.env.DASH_EMAIL_USER,
        PASS: process.env.DASH_EMAIL_PASS
      },
      SECURE: true
    },
    VERIFY_EMAIL_FORMAT: {
      FROM:
        process.env.DASH_EMAIL_NAME + ' <' +
        process.env.DASH_EMAIL_USER + '>',
      SUBJECT:
        'Pending: Dash Account Verification',
      HTML:
        '<div style="text-align: center;"><h1>Dash</h1><h2>' +
        '<i>Account Verification</i></h2></div><p>Click the ' +
        'following link to confirm your account:</p>' +
        '<p>${URL}</p><p>- DashBot</p>',
      TEXT:
        'Dash Account Verification: Please confirm your ' +
        'account by clicking the following link: ${URL} - DashBot'
    },
    CONFIRM_EMAIL_FORMAT: {
      FROM:
        process.env.DASH_EMAIL_NAME + ' <' +
        process.env.DASH_EMAIL_USER + '>',
      SUBJECT:
        'Dash Account Verified!',
      HTML:
        '<div style="text-align: center;"><h1>Dash</h1><h2>' +
        '<i>Account Verification</i></h2></div><p>Your Dash ' +
        'account has been successfully verified. Welcome to Dash!</p>' +
        '<p>- DashBot</p>',
      TEXT:
        'Dash Account Verification: Your account has been ' +
        'successfully verified. Welcome to Dash! - DashBot'
    }
  }
};

module.exports = settings;
