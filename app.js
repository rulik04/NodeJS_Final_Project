const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const routes = require('./routes/routes.js');
const crypto = require('crypto');
const app = express();
const methodOverride = require('method-override');


app.use(express.static('public'));
app.use(methodOverride('_method'));
app.use('/public/uploads', express.static('public/uploads'));


const port = process.env.PORT || 3000;

mongoose.connect('mongodb+srv://Rulan:0402@rulan.f307uzl.mongodb.net/?retryWrites=true&w=majority')
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('Error connecting to MongoDB Atlas:', err));


app.use(session({
    secret: crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 360000 }
}));

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use('/', routes);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
