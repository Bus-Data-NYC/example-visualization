var express = require('express');
var app = express();

// Public, static paths
app.use(express.static(__dirname + '/public'))

// Util Libraries
var path = require('path');
var fs = require("fs");

var mysql = require('mysql');
var credentials
try {
	credentials = require('./credentials.js');
} catch (e) {
	credentials = {
		host: process.env.HOST,
		user: process.env.USERNAME,
		password: process.env.PASSWORD,
		database: process.env.DATABASE
	}
}

var connection = mysql.createConnection({
	host     : credentials.host,
	user     : credentials.username,
	password : credentials.password,
	database : credentials.database,
});

connection.connect( function (err) {  
	if (err) {
		console.log('MySQL connection error. ' + err);
	}
});


// Routing
app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname + '/views/stops.html'));
});

app.get('/api/stops', function (req, res) {

	rows = getConfig('public/data/current_bus_stops.json');
	res.status(200).send(rows);

	// var query = "SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops WHERE feed_index >= 26 GROUP BY stop_id;"
	// connection.query(query, function (err, rows, fields) {
	// 	if (err) {
	// 		console.log('MySQL error during query run.');
	// 		rows = getConfig('public/data/current_bus_stops.json');
	// 		res.status(200).send(rows);
	// 	} else {
	// 		res.status(200).send(rows);
	// 	}
	// });
});

app.get('/api/arrivals', function (req, res) {
	var date = req.query.date;
	var hour = req.query.hour;
	if (date == undefined || hour == undefined) {
		res.status(400).send("Undefined date or hour.");
	} else {

		rows = getConfig('public/data/example_response.json');

	// 	var query = "SELECT rds.stop_id, route_id, direction_id, " + 
	// 							"fulfilled, early_5, early_2, early, " + 
	// 							"on_time, late, late_10, late_15, late_20, late_30 " + 
	// 							"FROM stops " + 
	// 							"INNER JOIN rds ON stops.stop_id = rds.stop_id " + 
	// 							"INNER JOIN adherence ON adherence.rds = rds.rds " + 
	// 							"WHERE feed_index >= 26 " + 
	// 							"AND date = '" + date + "'" + 
	// 							"AND hour = '" + hour + "' LIMIT 200;"

	// 	console.log(query);
	// 	connection.query(query, function (err, rows, fields) {
	// 		if (err) {
	// 			res.status(500).send("MySQL error during query run. " + err);
	// 		} else {

				var clean = {};

				rows.forEach(function (stop) {
					var k = stop.stop_id;
					if (clean[k] == undefined) {
						clean[k] = {0: null, 1: null};
					}
					var d = stop.direction_id;
					if (d == 0 || d == 1) {
						clean[k][d] = stop;
						delete clean[k][d].stop_id;
						delete clean[k][d].direction_id;
					}
				});

				res.status(200).send(clean);
	// 		}
	// 	});
	}
});


// Util tools
function getConfig(file){
	var filepath = __dirname + '/' + file;
	var file = fs.readFileSync(filepath, "utf8");
	return JSON.parse(file);
};


// Start up managment
var server;
function start() {
	server = app.listen(8080, function () {
		var host = server.address().address;
		var port = server.address().port;
		console.log('Example app listening at http://%s:%s', host, port);
	});
};

if(require.main === module){
		start(); // application run directly; start app server
} else { 
		module.exports = start; // application imported as a module via "require"
}
