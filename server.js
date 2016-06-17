var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var csvToArray = require('csv-to-array')

app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');

Date.prototype.getJulian = function() {
    return Math.floor((this / 86400000) - (this.getTimezoneOffset()/1440) + 2440587.5);
}

var columns = ['date', 'money', 'like', 'views', 'share'];
csvToArray({
   file: './chart.csv',
   columns: columns
}, function (err, array) {

	db.serialize(function() {

		db.run('CREATE TABLE my_table (id INT PRIMARY key, date INT, money INT, like INT, views INT, share INT);');

		var stmt = db.prepare('INSERT INTO my_table VALUES (?, ?, ?, ?, ?, ?)');

		array.forEach(function(i, idx){
			if(idx !== 0){
				stmt.run(idx, convertDateToUTCTimeStamp(i.date), i.money, i.like, i.views, i.share);
			}
		});
		stmt.finalize();

	});
});

function convertDateToUTCTimeStamp(str){
	if(str){	
		var date = str.split('-');
		var day = parseInt(date[0]);
		var month = "JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(date[1]) / 3;
		var year = parseInt('20' + date[2]);
		var unixTime = Math.floor(new Date(year, month, day).getTime()/1000);
		return unixTime;
	}
	return null;
}

var port = process.env.PORT || 8080;

var router = express.Router(); // get an instance of the express Router

var getLikes = function(req, res){
	var field = 'like';
	var startDate = convertDateToUTCTimeStamp(req.params.start_date) || 0;
	var endDate = convertDateToUTCTimeStamp(req.params.end_date);
	responseObj = []
	var stmt = 'SELECT ' + field + ', date FROM my_table WHERE date >= ' + startDate
	if(endDate) {
		stmt += ' and date < ' + endDate;
	}
	db.all(stmt, function(err, rows) {
		rows.forEach(function(row){
			responseObj.push({field: row[field]})
		})
		res.json(responseObj);
	});
}

app.get('/values/likes', getLikes);
app.get('/values/likes/start_date/:start_date', getLikes);
app.get('/values/likes/end_date/:end_date', getLikes);
app.get('/values/likes/start_date/:start_date/end_date/:end_date', getLikes);

// START THE SERVER
// =============================================================================
app.listen(port);
