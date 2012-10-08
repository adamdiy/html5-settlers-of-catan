require('../shared/player.js');
require('../shared/board.js');
require('./turnmanager.js');

CATAN.Game = function(ply,name,schema,public) {
	this.id = this._createId();
	this.owner = null; // set on first player connection

	this.name = (typeof name !== 'undefined') ? name : "Settlers Of Catan";
	this.schema = (typeof schema !== 'undefined') ? schema : "Classic";	// Default schema to Classic
	this.public = (typeof public !== 'undefined') ? public : true;

	this.state = STATE_NONE;
	this.players = [];
	this.entities = [];
	this.board = new CATAN.Board(this);
	this.turnManager = new CATAN.TurnManager(this);

	// Setup sockets
	this.namespace = '/' + this.id;
	this.sockets = CATAN.Server.of(this.namespace);
	this.sockets.on( 'connection', this.onPlayerConnection );

	this.started = Date.now();

	// Shutdown server after 60 sec with no players
	var self = this;
	setTimeout(function() {
		if(self.getState() > STATE_NONE) return;
		if(!self._isValid()) {
			CATAN.Games.shutdown(self);
		};
		delete self;
	}, 1000 * 60);
};

CATAN.Game.prototype = {

	constructor: CATAN.Game,

	_createId: function(uri) {
		// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
		return 'xxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	},

	_isValid: function() {
		return (this.getPlayers().length > 0);
	},

	getID: function() {
		return this.id;
	},

	getStatus: function() {
		return {
			id: this.id,
			name: this.name,
			schema: this.schema,
			players: this.getNumPlayers(),
			max: this.getMaxPlayers()
		}
	},

	getBoard: function() {
		return this.board;
	},

	emit: function(name, data) {
		this.sockets.emit(name,data);
	},

	isPublic: function() {
		return this.public;
	},

	isValidEntity: function(ent) {
		return typeof ent != 'undefined';
	},

	/* --------------------------------------------
		Schema
	-------------------------------------------- */
	setSchema: function(schema) {
		this.schema = (schema !== undefined) ? schema : "Classic";
	},

	getSchema: function(schema) {
		return CATAN.Schemas.get(this.schema);
	},

	getMaxPlayers: function(schema) {
		return this.getSchema().MaxPlayers;
	},

	/* --------------------------------------------
		Players
	-------------------------------------------- */
	isValidPlayer: function(ply) {
		return typeof ply != 'undefined';
	},

	isOwner: function(ply) {
		return ply == this.getOwner();
	},

	getPlayers: function() {
		return this.players;
	},

	getNumPlayers: function() {
		return this.players.length;
	},

	getByID: function(id) {
		for(i in this.players) {
			var ply = this.players[i];
			if (ply.getID() == id) {
				return ply;
			};
		};
	},

	// doesn't check duplicate names yet (ply.NameDup)
	getByName: function(name) {
		for(i in this.players) {
			var ply = this.players[i];
			if (ply.getName() == name) {
				return ply;
			};
		};
	},

	/* --------------------------------------------
		Misc
	-------------------------------------------- */
	getEntById: function(id) {
		for(var i in this.entities) {
			if(this.entities[i].getEntId() == id) {
				return this.entities[i];
			}
		}
	},

	getColor: function() {
		//return Math.round( 0xffffff * Math.random() );
		if(!this.colors) {
			this.colors = this.getSchema().getColors();
		}
		var rand = Math.random() * this.colors.length
		return this.colors.splice(rand,1)[0];;
	},

	getOwner: function() {
		return this.owner;
	},

	setOwner: function(ply) {
		this.owner = ply;
		// TODO: inform players of new ownership
	},

	hasValidOwner: function() {
		for(i in this.players) {
			var ply = this.players[i];
			if (ply == this.getOwner()) {
				return true;
			};
		};
		return false;
	},

	getState: function() {
		return this.state;
	},

	setState: function(state) {

		if(state > STATE_WAITING) {
			this.emit('CGameUpdate', {
				state: state
			});
		}

		this.state = state;
	},

	/* --------------------------------------------
		Player Hooks
	-------------------------------------------- */
	onPlayerConnection: function(socket) {

		var ply = CATAN.Players.getBySocket(socket);

		var self = CATAN.Games.getByNamespace(socket.namespace.name);
		if(typeof self === 'undefined') return;

		// Check state
		if(self.getState() > STATE_WAITING) {
			socket.emit('CConnectionStatus', {
				success: false,
				message: 'Game is already in-progress.'
			});
			return;
		};

		// Check max players
		if(self.getMaxPlayers() <= self.getPlayers().length) {
			socket.emit('CConnectionStatus', {
				success: false,
				message: 'Server is full.'
			});
			return;
		};

		ply.connect(self, socket);

		self.players.push(ply); // add to player list

		// First player connection is owner
		if(!self.hasValidOwner()) {
			self.setOwner(ply);
			self.setState(STATE_WAITING);
		}

		// Setup player hooks
		ply.on( 'playerReady',	function(data) { self.onPlayerJoin(ply,data) } );
		ply.on( 'playerChat',	function(data) { self.onPlayerChat(ply,data) } );
		ply.on( 'playerBuild',	function(data) { self.onPlayerBuild(ply,data) } );
		ply.on( 'startGame',	function(data) { self.onPlayerStartGame(ply,data) } );
		ply.on( 'rollDice',		function(data) { self.onPlayerRollDice(ply,data) } );
		ply.on( 'startBuild',	function(data) { self.onPlayerStartBuild(ply,data) } );
		ply.on( 'endTurn',		function(data) { self.onPlayerEndTurn(ply,data) } );
		ply.on( 'movedRobber',	function(data) { self.onPlayerMoveRobber(ply,data) } );
		ply.on( 'devCard',		function(data) { self.onPlayerRequestDevCard(ply,data) } );

		// Inform user of successful connection
		ply.emit('CConnectionStatus', { success: true });
		console.log('[' + self.id + '] Player connected (' + self.getNumPlayers() + '/' + self.getMaxPlayers() + ')');

	},
	
	onPlayerJoin: function(ply, data) {

		if(!this.isValidPlayer(ply)) return;
		if(ply.isInGame()) return;

		ply.setStatus(PLAYER_CONNECTED);

		// Check for duplicate names
		var players = this.getPlayers();
		for(var i in players) {
			var pl = players[i]
			if((pl.getID() != ply.getID()) && (pl.name == ply.name) && (pl.nameDup == ply.nameDup)) {
				ply.nameDup++
			}
		}

		// Send hex tiles, etc.
		this.syncGame(ply);

		// Announce player join in chat
		this.emit('CPlayerJoin', {
			id: ply.getID(),
			name: ply.getName(),
			color: ply.getColor()
		});

	},

	onPlayerDisconnect: function(ply) {

		if(!this.isValidPlayer(ply)) return;

		// Remove player buildings
		for(var i in ply.Buildings) {
			var building = ply.Buildings[i];
			building.Owner = -1;
			this.emit('CBuildingReset', { id: building.Id, building: building.Building });

			delete building;
		}

		// Remove from player list
		var players = this.getPlayers();
		for(i in players) {
			var pl = players[i];
			if (pl.getID() == ply.getID()) {
				this.players.splice(i,1);
			}
		};

		// Broadcast player disconnect
		this.emit('CPlayerLeave', { id: ply.getID() });
		console.log('[' + this.id + '] Player disconnected');

		// End game if all players leave during game
		if((this.getState() > STATE_WAITING) && (this.getNumPlayers() < 2)) {
			this.endGame();
			return;
		}

		// End server if empty
		if(!this._isValid()) {
			return CATAN.Games.shutdown(this);
		}

		// Reassign owner in the case that the owner disconnects
		if(!this.hasValidOwner()) {
			this.setOwner(this.getPlayers()[0]);
		}

		// Check current turn
		if(this.turnManager.getCurrentPlayer() == ply) {
			this.turnManager.nextTurn();
		}

		// Re-add color to available list
		this.colors.push(ply.getColor())

	},

	onPlayerChat: function(ply, data) {

		if(!this.isValidPlayer(ply)) return;

		var text = data.text.substr(0, 127);

	    this.emit('CPlayerChat', { id: ply.getID(), Text: text });
	    console.log('['+this.id+'] '+ply.getName()+': '+text);

	},

	onPlayerBuild: function(ply, data) {

		if(!this.isValidPlayer(ply)) return;

		if((this.getState() != STATE_SETUP) && (this.getState() != STATE_PLAYING)) return;
		if(!ply.isTurn()) return;

		var ent = this.getEntById(data.id);
		if(!this.isValidEntity(ent)) return;
		if(!ent.canBuild(ply)) return;

		if(this.getState() == STATE_SETUP) {
			this.turnManager.handleSetupRequest(ply, ent);
		}

		if(this.getState() == STATE_PLAYING) {

			if(!ply.hasRolledDice) return; // hacker
			if(!this.getSchema().canPlayerPurchaseBuilding(ply, ent)) return;

			ent.build(ply);

			this.emit('CPlayerBuild', {
				id: ply.getID(),
				entid: ent.getEntId()
			});

			this.getSchema().onPlayerBuild(ply, ent, false);

		}

	},


	/* --------------------------------------------
		Game Hooks
	-------------------------------------------- */
	onPlayerStartGame: function(ply, data) {

		if(this.getState() != STATE_WAITING) return;

		// Valid player and player is owner
		if( (!this.isValidPlayer(ply)) || (this.getOwner() !== ply) ) return;

		// Check if we have at least 2 players
		if(this.getNumPlayers() < 2) {
			ply.notify('ErrorNeedPlayers');
			return;
		}

		this.turnManager.start();

	},

	onPlayerRollDice: function(ply, data) {

		if(this.getState() != STATE_PLAYING) return;
		if(!ply.isTurn()) return;
		if(ply.hasRolledDice) {
			ply.notify("CantRollDice", MSG_ERROR);
			return;
		}

		var d1 = Math.floor(Math.random() * (6 - 1 + 1)) + 1,
			d2 = Math.floor(Math.random() * (6 - 1 + 1)) + 1;

		this.emit('CRolledDice', {
			d1: d1,
			d2: d2
		})

		var token = d1 + d2;

		if(token == 7) {
			this.getSchema().onPlayerRollSeven(ply);
		} else {
			this.distributeResources(token);
		}

		ply.hasRolledDice = true;
	},

	onPlayerStartBuild: function(ply, data) {

		if(this.getState() != STATE_PLAYING) return;
		if(!ply.isTurn()) return;

		if(!ply.hasRolledDice) {
			ply.notify("MustRollDice", MSG_ERROR);
			return;
		}

		if(ply.mustMoveRobber) {
			ply.notify("MustMoveRobber", MSG_ERROR);
			return;
		}

		ply.emit('CPlayerStartBuild');

	},

	onPlayerEndTurn: function(ply, data) {

		if(this.getState() != STATE_PLAYING) return;
		if(!ply.isTurn()) return;

		if(!ply.hasRolledDice) {
			ply.notify("MustRollDice", MSG_ERROR);
			return;
		}

		if(ply.mustMoveRobber) {
			ply.notify("MustMoveRobber", MSG_ERROR);
			return;
		}

		this.turnManager.nextTurn();

	},

	onPlayerMoveRobber: function(ply, data) {

		if(this.getState() != STATE_PLAYING) return;
		if(!ply.isTurn()) return;
		if(!ply.mustMoveRobber) return;

		var tile = this.getEntById(data.id);

		if( (tile == null) ||			// Valid entity check
			(!tile.isTile()) ||			// Must be a hex tile
			(tile.hasRobber())) return;	// Can't move to same tile
 
		this.getBoard().getRobber().setTile(tile);

		this.emit('CRobberMoved', {
			id: tile.getEntId()
		})

		ply.mustMoveRobber = false;

	},

	onPlayerRequestDevCard: function(ply, data) {
		if(this.getState() != STATE_PLAYING) return;
		if(!ply.isTurn()) return;
		if(ply.mustMoveRobber) return;
		if(!this.getSchema().canPlayerPurchaseDevCard(ply)) return;

		var card = this.getSchema().getDevCard();
		ply.addDevCard(card);

		this.getSchema().onPlayerGetDevCard(ply, ent, false);
	},

	/*
		Additional Game Helpers
	*/

	distributeResources: function() {

		if(this.getState() == STATE_SETUP) {

			var ply = arguments[0];

			var tiles = ply.getBuildingsByType(BUILDING_SETTLEMENT)[1].getAdjacentTiles();
			for(var i in tiles) {
				var tile = tiles[i];
				var res = tile.getResource();
				if(res > RESOURCE_DESERT) {
					ply.appendResource(tile, res, 1);
				};
			}

			ply.sendResources();

		} else if(this.getState() == STATE_PLAYING) {

			var token = arguments[0];

			// Get tiles
			var tiles = this.getBoard().getTiles();
			for(var i in tiles) {
				var tile = tiles[i];

				// Token matches or undefined (setup mode), and no robber
				if( (tile.getToken() == token) && !tile.hasRobber() ) {

					// Look for player settlements
					var corners = tile.getAdjacentCorners();
					for(var j in corners) {
						var corner = corners[j];

						// Check if player occupies settlement
						if(corner.hasOwner()) {
							var amount = (corner.isCity()) ? 2 : 1;
							corner.getOwner().appendResource(tile, tile.getResource(), amount);
						}

					}

				}
				
			}

			// Alert clients of new resources
			var players = this.getPlayers();
			for(var i in players) {
				var ply = players[i];
				ply.sendResources();
			}

		}
		
	},

	endGame: function(ply) {
		this.setState(STATE_END);
		if(ply !== undefined) {
			// TODO: Send end game stats
		}
		CATAN.Games.shutdown(this);
	},

	syncGame: function(ply) {
		var game = ply.game,
			board = game.getBoard();

		// Send players
		var players = game.getPlayers();
		for(var i in players) {
			var pl = players[i];
			if(pl.getID() != ply.getID()) {
				ply.emit('CSyncPlayer', {
					id: pl.getID(),
					name: pl.getName(),
					color: pl.getColor(),
					owner: this.isOwner(pl)
				});
			}
		}

		// Send tiles
		var tiles = [];
		for(var i=0; i < this.getBoard().getTiles().length; i++) {
			var tile = this.getBoard().getTiles()[i];
			if(tile.isLand()) {
				tiles.push({
					id: tile.getEntId(),
					type: tile.getTileType(),
					resource: tile.getResource(),
					token: tile.getToken(),
					yaw: tile.yaw
				});
			}
		};
		ply.emit('CBoardEntities', { ents: tiles });

		// Send docks
		var docks = [];
		for(var i in this.getBoard().getDocks()) {
			var dock = this.getBoard().getDocks()[i];
			docks.push({
				id: dock.getEntId(),
				type: dock.getTileType(),
				dock: true,
				dockTo: dock.dockTo.getEntId()
			});
		};
		ply.emit('CBoardEntities', { ents: docks });

		// Send robber tile
		var robber = this.getBoard().getRobber();
		ply.emit('CBoardEntities', {
			ents: [{
				id: robber.getEntId(),
				tileId: robber.getTile().getEntId()
			}]
		});
	}

};