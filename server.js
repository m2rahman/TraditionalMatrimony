const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash =require('connect-flash');
const bcrypt = require('bcryptjs');
// Load models
const Message = require('./models/message');
const User = require('./models/user');
const app = express();
//Load keys file
const Keys = require('./config/keys');
//load helpers
const {requireLogin,ensureGuest} = require('./helpers/auth');
//use body bodyParser middleware
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());
// configaration of authentication
app.use(cookieParser());
app.use(session({
  secret: 'mysecret',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
//use flash
app.use(flash());
app.use((req,res,next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error =req.flash('error'); 
  next();
});
//express static folder for js and css
app.use(express.static('public'));
//Make User global object
app.use((req,res, next) => {
  res.locals.user = req.user || null;
  next();
});
//LOAD passport :
//Load Facebook Strategy
require('./passport/facebook');
//Load Google Strategy
require('./passport/google');
//Load local
require('./passport/local');
// connect to mLab MongoDB
mongoose.connect(Keys.MongoDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Server is connected to MongoDB');
}).catch((err) => {
  console.log(err);
});
// Environment variable for port
const port = process.env.PORT || 3000;
//View Engine setup
app.engine('handlebars', exphbs({
  defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

app.get('/', ensureGuest,(req, res) => {
  res.render('home', {
    title: 'Home'
  });
});

app.get('/about',ensureGuest, (reg, res) => {
  res.render('about', {
    title: 'About'
  });
});

app.get('/contact',ensureGuest, (reg, res) => {
  res.render('contact', {
    title: 'Contact'
  });
});

app.get('/auth/facebook', passport.authenticate('facebook', {
  scope: ['email']
}));
app.get('/auth/facebook/callback', passport.authenticate('facebook', {
  succcessRedirect: '/profile',
  failureRedirect: '/'
}), (req, res) => {
  res.redirect('/profile')
});


app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile']
}));
app.get('/auth/google/callback', passport.authenticate('google', {
  succcessRedirect: '/profile',
  failureRedirect: '/'
}), (req,res) => {
  res.redirect('/profile')
});

app.get('/profile', requireLogin, (req, res) => {
  User.findById({
    _id:req.user._id
  }).then((user) => {
    if (user) {
      user.online = true;
      user.save((err, user) => {
        if (err) {
          throw err;
        } else {
          res.render('profile', {
            title: 'Profile',
            user: user
          });
        }
      })
    }
  });
});
app.get('/newAccount',(req,res) => {
  res.render('newAccount',{
    title: 'Signup'
  });
});
app.post('/singup',(req,res) => {
  console.log(req.body);
  let errors = [];

  if (req.body.password !== req.body.password2) {
    errors.push({text:'Password does not match'});
  }
  if (req.body.password.length <5) {
    errors.push({text:'Password must be at least 5 characters'});
  }
  if (errors.length > 0) {
    res.render('newAccount', {
      errors: errors,
      title: 'Error',
      fullname: req.body.username,
      email: req.body.email,
      password: req.body.password,
      password2: req.body.password2
    });
  }else{
    User.findOne({email:req.body.email})
    .then((user) => {
      if (user) {
        let errors =[];
        errors.push({text:'Email already exist'});
        res.render( 'newAccount', {
          title:'Signup',
          errors:errors
        })
      }else{
        var salt = bcrypt.genSaltSync(10);
        var hash = bcrypt.hashSync(req.body.password, salt);

        const newUser = {
          fullname: req.body.username,
          email: req.body.email,
          password: hash
        }
        new User(newUser).save((err,user) => {
          if (err) {
            throw err;
          }
          if (user) {
            let success = [];
            success.push({text: 'You successfully created an account. You can login now'});
            res.render('home',{
              success: success
            });
          }
        });
      }
    });
  }
});
app.post('/login',passport.authenticate('local',{
  successRedirect:'/profile',
  failureRedirect: '/loginErrors'
}));
app.get('/loginErrors',(req,res) => {
  let errors = [];
  errors.push({text: 'User not found or Password incorrect'});
  res.render('home',{
    errors:errors
  });
});
app.get('/logout', (req, res) => {
  User.findById({
      _id: req.user._id
    })
    .then((user) => {
      user.online = false;
      user.save((err, user) => {
        if (err) {
          throw err;
        }
        if (user) {
          req.logout();
          res.redirect('/');
        }
      })
    })
});

app.post('/contactUs', (req, res) => {
  console.log(req.body);
  const newMessage = {
    fullname: req.body.fullname,
    email: req.body.email,
    date: new Date()
  }
  new Message(newMessage).save((err, message) => {
    if (err) {
      throw err;
    } else {
      Message.find({}).then((messages) => {
        if (messages) {
          res.render('newmessage', {
            title: 'sent',
            messages: messages
          });
        } else {
          res.render('noMessage', {
            title: 'Not Found'
          });
        }
      });
    }
  });
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
