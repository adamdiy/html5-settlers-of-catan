// Include dependencies
require('../shared/catan.js');

// Shared modules
require("fs").readdirSync("shared/modules").forEach(function(file) {
	require("../shared/modules/" + file);
});

// Server modules
require("fs").readdirSync("server/modules").forEach(function(file) {
	require("../server/modules/" + file);
});

CATAN.setupSockets = function(io) {
	this.Server = io;
	this.Lobby = io.of('/lobby');

	// Socket hooks
	io.sockets.on('connection', function(socket) {
		console.log("[MAIN] Client connected");
		CATAN.Players.connect(socket);
	});

	this.Lobby.on('connection', function(socket) {
		console.log("[LOBBY] Client connected");

		var ply = CATAN.Players.getBySocket(socket);

		socket.on('createServer', function(data) {
			data.socket = socket; // reference lobby socket
			CATAN.Games.setup(ply, data);
		});

		socket.on('changeName', function(data) {
			ply.setName(data.name);
		});

		socket.on('requestServerlist', function(data) {
			socket.emit('CServerList', { Servers: CATAN.Games.getVisible() });
		});
	});
};