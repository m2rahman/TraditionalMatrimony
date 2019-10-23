const express = require ('express');
const exphbs = require('express-handlebars');
const app = express();
// Environment variable for port
const port = process.env.PORT || 3000;
//View Engine setup
app.engine('handlebars',exphbs({defaultLayout:'main'}));
app.set('view engine', 'handlebars');

app.get('/',(req,res) => {
    res.render('home',{
      title: 'Home'
    });
});

app.get('/about', (reg,res) => {
    res.render('about',{
      title: 'About'
    });
});

app.get('/contact', (reg,res) =>{
  res.render('contact', {
    title: 'Contact'
  });
});
app.listen(port,() => {
    console.log(`Server is running on port ${port}`);
});
