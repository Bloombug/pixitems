var express = require('express');
var assert = require('assert');


//To read the dbf file
const dbfstream = require('dbfstream');

var dbf = dbfstream('./upload/produtos.dbf', 'utf-8');
var content = [];

var favicon = require('serve-favicon');
var helmet = require('helmet');


//Formidable: to upload files and mess with them!
var formidable = require('formidable');

//Referencing credentials
var credentials = require('./credentials.js');

//Express basic authentication module
var basicAuth = require('express-basic-auth');

//using mongoose for simplicity
var mongoose = require('mongoose');

var db = mongoose.connection;
mongoose.connect('mongodb://localhost:27017/produtos');

//To read and import the .dbf file

//Upload path
var path = require('path');

//Both modules were used to delete all contents of the upload directory
//so that the last file is the most recent one.
var fs = require('fs');
var rimraf = require('rimraf');


//Product model for the database
var produto_schema = mongoose.Schema({

	id: { type: Number, max: 2000 },
	nome: String,
	tipo: { type: Number, default: 100, max: 250 },
	stock: { type: Number, max: 999, default: 0 },
	familia: { type: String, default: "" },


});

//Assigning functions to the "methods" of your schema

produto_schema.methods.getData = function (cb) {

	return this.model('Produto').find({ tipo: this.tipo }, cb);

};

var produto = mongoose.model('Produto', produto_schema);

//#####################################################

var app = express();

//Favicon path
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

//Background images path
app.use(express.static('./views/images'));


//Using Helmet to handle web vulnerabilities, by setting HTTP headers
app.use(helmet());

//Using basicAuth to add default username and password




//Database code!
//#####################################################


db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {

	console.log("\n### Database up and running at mongodb://localhost/produtos... ###");
	module.exports = produto;
	console.log("\n### Model created and exported with success... ###");

});


//###################################################


app.disable('x-powered-by');

var handlebars = require('express-handlebars').create({ defaultLayout: 'main' });

//View engine
app.engine('handlebars', handlebars.engine);

//Setting view engine
app.set('view engine', 'handlebars')

//Body-parser: To parse encoded data whenever POST is used
app.use(require('body-parser').urlencoded({
	extended: true
}));


//Cookie-parser: to manage cookies and sessions	
app.use(require('cookie-parser')(credentials.cookieSecret));

//Setting up the port
app.set('port', process.env.PORT || 3000);

//Getting files in /public
app.use(express.static(__dirname + '/'));


//##################################################



//Routes
app.get('/', function (req, res) {
	res.render('home');

});
app.get('/about', function (req, res) {
	res.render('about');
});


//Form routes
app.get('/contact', function (req, res) {
	res.render('contact', { csrf: 'CSRF token here' });
});


//Getting data from mongoose
app.get('/products', function (req, res) {


	var produtos_1 = JSON.parse(fs.readFileSync("./upload/produtos.json", 'utf8'));

	produto.collection.insertMany(produtos_1, function(err,r) {
		assert.equal(null, err);
		assert.equal(produtos_1.length, r.insertedCount);
	});

	

	//This is rendering the data inside the page! Woooohoooo
	produto.collection.find({}, (function (err, produtos_1) {
		res.render('produtos', { produtos_list: produtos_1})
	}));


	//Never forget the .close()!
	db.close();
	fs.writeFileSync("./upload/produtos.json", JSON.stringify(content, null, 4), 'utf8');
	console.log("\n### Product.json was saved... ###");
});




app.get('/thankyou', function (req, res) {
	res.render('thankyou');;
});




//Dealing with the info given to us on the contact page, using its form
app.post('/process', function (req, res) {

	//Implement sending to company email: geral@programpix.pt

	console.log('Formulário: ' + req.query.form);
	console.log('CSRF token: ' + req.body._csrf);
	console.log('Email do cliente: ' + req.body.email);

	console.log('Questão: ' + req.body.ques);

	var nodemailer = require('nodemailer').mail;

	nodemailer({
		from: req.body.email,
		to: "programpix@gmail.com",
		subject: "ProgramPix - Resolução de Problemas",
		text: "Teste",
	});


	res.redirect(303, '/thankyou');
});

//Handle dbf file uploads!
app.get('/database', function (req, res) {

	//By using month and year, we can easily access and manage newly created files 
	//based on the date they were created
	var now = new Date();
	res.render('database', {
		year: now.getFullYear(),
		month: now.getMonth()
	});
});

//Handle post imports!
app.post('/database/:year/:month', function (req, res) {

	//Getting the file using formidable middleware
	var form = new formidable.IncomingForm();

	form.encoding = 'utf-8';

	form.keepExtensions = true;

	form.multiples = false;


	//Upload directory: will store .dbf file(s) here
	form.uploadDir = path.join(__dirname, '/upload/');

	//Renaming to uploade file name, instead of random name
	form.on('file', function (field, file) {

		//rename the incoming file to the file's name
		//Keep it unique and updated
		fs.rename(file.path, form.uploadDir + file.name);

		console.log("\n### DBF file uploaded to local server... ###");
		console.log("Path: " + form.uploadDir + file.name);


	});

	form.parse(req, function (err, fields, file) {

		if (err)
			return res.redirect(303, '/error');
		//Redirect to database_view.handlebars --DONE
		res.redirect(303, '/products');

	});

});

//Push form contents to array...
dbf.on('data', (data) => {

	content.push(data);

});





//Looking for URL
app.use(function (req, res, next) {
	console.log("Looking for URL: " + req.url);
	next();
});

//Handling errors on console
app.use(function (err, req, res, next) {
	console.log('Error: ' + err.message);
	next();
});



//404 and 500 pages
app.use(function (req, res) {
	res.type('text/html');
	res.status(404);
	res.render('404. This sucks, i know.');
});


//Listening to defined port
//The 0.0.0.0 allows the server to be accessed from devices in the same LAN
//for instance, on your phone
//using the client's IP 

//Perhaps setting up a way to share the localtunnel address here...?
app.listen(app.get('port'), '0.0.0.0', function () {
	console.log('\n### Started on http://localhost:' + app.get('port') + "... ###");
});