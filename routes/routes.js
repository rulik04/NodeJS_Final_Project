const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Quiz = require('../models/quiz');
const Item = require('../models/item');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { ObjectId } = require('mongodb');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads') 
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

const upload = multer({ storage: storage });

let questions 

const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

function randomRoute() {
    let routes = ["/quiz/JavaScript", "/quiz/Python", "/quiz/sql", "/quiz/HTML", "/quiz/devops", "/quiz/linux", "/quiz/docker", "/quiz/bash"];
    let random = Math.floor(Math.random() * routes.length);
    return routes[random];
}

function randomTitle(route) {
    let title = route.split("/")[2];

    if (title === "JavaScript") {
        return "JavaScript Quiz";
    } else if (title === "Python") {
        return "Python Quiz";
    }
    else if (title === "sql") {
        return "SQL Quiz";
    }
    else if (title === "HTML") {
        return "HTML";
    }
    else if (title === "devops") {
        return "DevOps";
    }
    else if (title === "linux") {
        return "Linux";
    }
    else if (title === "docker") {
        return "Docker";
    }
    else if (title === "bash") {
        return "Bash";
    }
    else {
        return "Quiz";
    }
}

router.get('/', async (req, res) => {

    const lastResults = await Quiz.find({}).sort({ submitAt: -1 }).limit(5);
    const lastUsersByResults = await User.find({ _id: { $in: lastResults.map(result => result.userID) } });
    const items = await Item.find();
    const recentResults = lastResults.map((result, index) => {
        const user = lastUsersByResults.find(user => user._id.toString() === result.userID.toString());
        return {
            username: user.username,
            category: result.category,
            totalCorrect: result.totalCorrect,
            totalTime: result.totalTime,
            submitAt: result.submitAt
        };
    });
    
    // console.log('Recent Results:', recentResults);

    if (req.session.user) {
            
        res.render('main', { user: req.session.user, randomRoute: randomRoute(), randomTitle: randomTitle(randomRoute()), recentResults: recentResults, items: items});
    } else {
        res.render('main', { user: "noLogin", randomRoute: randomRoute(), randomTitle: randomTitle(randomRoute()), recentResults: recentResults, items: items});
    }
});

router.get('/login', (req, res) => {
    try {
        res.render('login', { message: false });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', { errorMessage: 'Internal Server Error' });
    }
});

router.get('/signup', (req, res) => {
    res.render('signup', { message: false });
});

router.post('/signup', async (req, res) => {
    const { email, username, password } = req.body;

    const existingUser = await User.findOne({ username });

    if (existingUser) {
        return res.status(400).send({ message: 'Пользователь с таким именем уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ email, username, password: hashedPassword });
    await user.save();
    
    res.render('login', { message: "user created successfully"});
});

router.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    const existingUser = await User.findOne({ username });

    if (existingUser) {
        return res.render('signup', { message: "user already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, password: hashedPassword });
    await user.save();

    
    res.render('login', { message: "user created successfully"});
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.db.collection('users').findOne({ username });

    if (!user) {
        return res.render('login', { message: "user not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.render('login', { message: "password is incorrect" });
    }
    req.session.user = user;

    if (req.session.user.role === 'admin') {
        res.redirect('/admin');
    } else {
        res.redirect('/');
    }
});


router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


router.get('/quizzes', (req, res) => {
    if (req.session.user) {
        res.render('allQuizzes', { user: req.session.user });
    } else {
        res.render('allQuizzes', { user: "noLogin" });
    }
});




router.get('/quiz/:category', isAuthenticated, async (req, res) => {
    const category = req.params.category;
    
    const user = await User.findByIdAndUpdate(req.session.user._id, { $inc: { totalAttempt: 1 } }, { new: true });
    req.session.user = user;
    try {
        const limit = 20;
        const apiKey = 'jpNjbKyQO8KwFxr7pcU3QpdLm6bFZ5NfXkrFlaTX';
        let apiUrl = `https://quizapi.io/api/v1/questions?apiKey=${apiKey}&limit=${limit}&category=${category}`;
        if (category === 'Python' || category === 'HTML' || category === 'JavaScript') {
            apiUrl = `https://quizapi.io/api/v1/questions?apiKey=${apiKey}&limit=${limit}&tags=${category}`;
        }

        const response = await fetch(apiUrl);
        const data = await response.json();
        const oneAnswerQuestions = data.filter(question => question.multiple_correct_answers === 'false');
        const selectedQuestions = oneAnswerQuestions.slice(0, 10);
        questions = selectedQuestions;
        res.render('quiz', {data: selectedQuestions, user: req.session.user});
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data from the API' });
    }
});

router.post('/submit', isAuthenticated, async (req, res) => {
    const selectedAnswers = req.body.selectedAnswers;

    const questionsData = req.body.questionsData;
    const timerData = 300 - req.body.timerData;
    const category = req.body.category;

    let correctCount = 0;
    const correctQuestions = {};
    const correctAnswers = {};

    Object.keys(selectedAnswers).forEach(questionId => {
        const selectedAnswer = selectedAnswers[questionId].trim(); 
        const question = questions.find(q => q.id == questionId);

        if (question && selectedAnswer) {
            const correctAnswer = question.correct_answers[`${selectedAnswer}_correct`];
            if (correctAnswer === 'true') {
                correctCount++;
                correctQuestions[questionId] = question;
                correctAnswers[questionId] = selectedAnswer;
            }
        }
    });

    let allCorrectAnswers = {}
    questions.forEach(question => {
        for (const key in question.correct_answers) {
            if (question.correct_answers.hasOwnProperty(key)) {
                const answer = question.correct_answers[key];
                if (answer === 'true') {
                    allCorrectAnswers[question.id] = key.replace('_correct', '');
                }
            }
        }
    });
    

    // console.log('All Correct Answers:', allCorrectAnswers);
    // console.log('data questions:', questions);
    // console.log('All Correct Answers:', allCorrectAnswers);
    // console.log('Selected Answers:', selectedAnswers);
    // console.log('Correct Count:', correctCount);
    // console.log('Correct Questions:', correctQuestions);
    // console.log('Correct Answers:', correctAnswers);


    const quiz = new Quiz({
        userID: req.session.user._id,
        questionsData: questionsData,
        selectedAnswers: selectedAnswers,
        submitAt: new Date(),   
        category: category,
        totalCorrect: correctCount,
        totalWrong: 10 - correctCount,
        totalTime: timerData
    });
    await quiz.save();

    const user = await User.findByIdAndUpdate(req.session.user._id, { $inc: { totalCorrect: correctCount, totalWrong: 10 - correctCount, totalTime: timerData } }, { new: true });
    req.session.user = user;
    
    res.render('submittedAnswers', {
        data: questions,
        allCorrectAnswers: allCorrectAnswers,
        selectedAnswers: selectedAnswers,
        correctCount: correctCount,
        correctQuestions: correctQuestions,
        correctAnswers: correctAnswers,
        user: req.session.user
    });
});


router.get('/programming-news', async (req, res) => {
    try {
        const apiKey = '5fe3eccdbb984e1eb2f8b1550778b9a7';
        const theme = 'programming';
        const apiUrl = `https://newsapi.org/v2/everything?q=${theme}&apiKey=${apiKey}`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.articles) {
            const articlesWithImages = data.articles.filter(article => article.urlToImage !== null);
            
            const first10ArticlesWithImages = articlesWithImages.slice(0, 10);

            if (first10ArticlesWithImages.length > 0) {
                if (req.session.user) {
                    res.render('programmingNews', { articles: first10ArticlesWithImages, user: req.session.user});
                } else {
                    res.render('programmingNews', { articles: first10ArticlesWithImages, user: "noLogin"});
                }
            } else {
                res.status(404).json({ message: 'No articles with images found' });
            }
        } else {
            res.status(404).json({ message: 'No articles found' });
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});


router.get('/profile', isAuthenticated, (req, res) => {
    res.render('profile', { user: req.session.user, message: false});
});


router.put('/change-user-data', isAuthenticated, async (req, res) => {
    const { username, email } = req.body;
    const user = await User.findByIdAndUpdate(req.session.user._id, { username, email }, { new: true });
    req.session.user = user;
    res.render('profile', { user: req.session.user });
});


router.put('/change-password', isAuthenticated, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const isMatch = await bcrypt.compare(oldPassword, req.session.user.password);

    if (!isMatch) {
        return res.render('profile', { user: req.session.user, message: 'password is incorrect'});
    }
    newPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(req.session.user._id, { password: newPassword }, { new: true });
    req.session.user = user;
    res.render('profile', { user: req.session.user });
});


router.get('/history', isAuthenticated, async (req, res) => {
    const user = req.session.user;
    const quizzes = await Quiz.find({ userID: req.session.user._id }).sort({ submitAt: -1 });
    res.render('history', { user: user, quizzes: quizzes });
});









router.get('/admin', isAuthenticated, async (req, res) => {
    if (req.session.user.role === 'admin') {
        try {
            const users = await User.db.collection('users').find().toArray();
            const items = await Item.find();
            // const users = await User.find({});
            // console.log(users);
            res.render('admin', { users: users, user: req.session.user, items: items});
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.redirect('/main');
    }
});


router.post('/deleteUser/:userId', isAuthenticated, async (req, res) => {
    const userId = req.params.userId;

    try {
        await User.db.collection('users').deleteOne({ _id: new ObjectId(userId)});

        res.redirect('/admin');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Internal Server Error');
    }
});


router.post('/editUser',  isAuthenticated, async (req, res) => {
    const userId = req.body.userId;
    const updatedUsername = req.body.username;
    const updatedRole = req.body.role;
    const updatedTime = Date.now();

    try {
        await User.db.collection('users').updateOne({ _id: new ObjectId(userId) }, { $set: { username: updatedUsername, role: updatedRole, updatedAt: updatedTime } });

        res.redirect('/admin');
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Internal Server Error');
    }

});




router.post('/addUser', async (req, res) => {
    const { username, password, role, email } = req.body; 
    // console.log(username, password, role);
    try {
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ 
            email, 
            username, 
            password: hashedPassword, 
            role});

        await newUser.save();

        res.redirect('/admin');
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


router.post('/admin/add-item', upload.array('pictures', 3), async (req, res) => {
    try {
        const { nameEnglish, nameSpanish, descriptionEnglish, descriptionRussian } = req.body;
        const pictures = req.files.map(file => file.path);

        const newItem = new Item({
            pictures: pictures,
            names: {
                english: nameEnglish,
                russian: nameSpanish
            },
            descriptions: {
                english: descriptionEnglish,
                russian: descriptionRussian
            }
        });

        await newItem.save();

        res.redirect('/admin');
    } catch (error) {
        console.error('Error adding item:', error);
        res.status(500).send('Error adding item');
    }
});

router.delete('/deleteItem/:itemId', isAuthenticated, async (req, res) => {
    const itemId = req.params.itemId;

    try {
        await Item.findByIdAndDelete(itemId);

        res.redirect('/admin');
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/editItem', upload.array('newItemImages', 3), async (req, res) => {
    try {
        const { itemId, itemName, itemRussianName, itemDescriptionEnglish, itemDescriptionRussian } = req.body;
        const newPictures = req.files.map(file => file.path);

        const updatedItem = await Item.findByIdAndUpdate(itemId, {
            $set: {
                'names.english': itemName,
                'names.russian': itemRussianName,
                'descriptions.english': itemDescriptionEnglish,
                'descriptions.russian': itemDescriptionRussian,
                $push: { pictures: { $each: newPictures } }
            }
        }, { new: true });

        res.redirect('/admin');
    } catch (error) {
        console.error('Error editing item:', error);
        res.status(500).send('Error editing item');
    }
});



module.exports = router;

