var http = require("http");
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var io = require('socket.io');
var fs = require("fs");
var https = require("https");
/*
Server Singleton class
*/
var Core;
(function (Core) {
    var Server = (function () {
        function Server(type) {
            this.app = express();
            this.app.use(bodyParser.urlencoded({ extended: false }));
            this.app.use(cookieParser());
            this.app.use(express.static(__dirname + '/public'));
            if (type == "https") {
                this.httpObject = https.createServer({
                    cert: fs.readFileSync(__dirname + '/my.crt'),
                    key: fs.readFileSync(__dirname + '/my.key')
                }, this.app);
            }
            else {
                this.httpObject = http.createServer(this.app);
            }
        }
        Server.prototype.startServer = function (port_num) {
            this.httpObject.listen(port_num, function () {
                console.log("Server is running on port " + port_num);
            });
            return this;
        };
        return Server;
    })();
    Core.Server = Server;
    var Company = (function () {
        function Company(code, bid, ask) {
            this._code = code;
            this._bid = bid;
            this._ask = ask;
        }
        Company.prototype.setBid = function (bid) {
            this._bid = bid;
        };
        Company.prototype.setAsk = function (ask) {
            this._ask = ask;
        };
        Company.prototype.setPrices = function (bid, ask) {
            this.setBid(bid);
            this.setAsk(bid);
        };
        Company.prototype.changePrices = function () {
            if (Math.random() > 0.5) {
                var val = this._bid + rnd();
                if (val >= 0)
                    this._bid = val;
            }
            else {
                var val = this._ask + rnd();
                if (val >= 0)
                    this._ask = val;
            }
        };
        Company.prototype.start = function (callback) {
            var instance = this;
            (function loop() {
                instance.changePrices();
                callback(instance);
                setTimeout(function () {
                    loop();
                }, randomInterval());
            }());
        };
        return Company;
    })();
    Core.Company = Company;
    var StockMarket = (function () {
        function StockMarket(num_companies) {
            this._companies = this.createCompanies(num_companies);
        }
        StockMarket.prototype.getCompanies = function () {
            return this._companies;
        };
        StockMarket.prototype.createCompanies = function (num_companies) {
            var companies = [];
            for (var i = 0; i < num_companies; i++) {
                companies.push(new Company(randomAlphaId(3), randomStockPrice(), randomStockPrice()));
            }
            return companies;
        };
        return StockMarket;
    })();
    Core.StockMarket = StockMarket;
    var randomAlphaId = function (len) {
        var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var text = "";
        for (var i = 0; i < len; i++) {
            text += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return text;
    };
    var randomStockPrice = function () {
        return Math.random() * 10;
    };
    var randomInterval = function () {
        return Math.random() * 3000;
    };
    var rnd = function () {
        return ((Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random()) - 3) / 3;
    };
})(Core || (Core = {}));
//Initiliazing Server
var server = new Core.Server("https");
server.startServer(1337);
//Initializing Stock Market including companies, and starting bidding and asking prices
var stockMarket = new Core.StockMarket(10);
var companies = stockMarket.getCompanies();
var io_listener = io.listen(server.httpObject);
io_listener.sockets.on('connection', function (socket) {
    for (var i = 0; i < companies.length; i++) {
        companies[i].start(function (instance) {
            socket.emit('update', instance);
        });
    }
});
// class Server2 {
// 	private static _serverInstance: Server = new Server();
// 	public app = express();
// 	public httpObject;
// 	constructor() {
// 		if(Server._serverInstance) {
// 			throw new Error("Error: Instance already exists. Use Server.getInstance()");
// 		}
// 		Server._serverInstance = this;
// 	}
// 	static getInstance(): Server{
// 		return Server._serverInstance;
// 	}
// 	initializeExpress(type: string): Server {
// 		var app = Server._serverInstance.app
// 		app.use(bodyParser.urlencoded({ extended:false }));
// 		app.use(cookieParser());
// 		app.use(express.static(__dirname + '/public'));
//         if (type == "https") {
// 		  Server._serverInstance.httpObject = https.createServer({
//               cert: fs.readFileSync(__dirname + '/my.crt'),
//               key: fs.readFileSync(__dirname + '/my.key')
//           }, app);
//         }
//         else {
// 		  Server._serverInstance.httpObject = http.createServer(app);
//         }
// 		return Server._serverInstance;
// 	}
// 	startServer(port_num): Server {
// 		Server._serverInstance.httpObject.listen(port_num, function() {
// 			console.log("Server is running on port " + port_num);
// 		});
// 		return Server._serverInstance;
// 	}
// } 
