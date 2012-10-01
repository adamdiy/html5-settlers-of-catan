if(CLIENT) {
	CATAN.AssetManager.queue([
		"materials/models/tile/desert.png",
		"materials/models/tile/forest.png",
		"materials/models/tile/hills.png",
		"materials/models/tile/pastures.png",
		"materials/models/tile/field.png",
		"materials/models/tile/mountains.png",

		/*"materials/cards/yearofplenty.png",
		"materials/cards/roadbuilding.png",
		"materials/cards/monopoly.png",
		"materials/cards/knight.png",

		"materials/special/largestarmy.png",
		"materials/special/longestroad.png",*/

		"models/tile.js",
		"models/road.js",
		"models/settlement.js",
		"models/city.js",
		"models/robber.js"
	]);
}

var GAMEMODE = {};

GAMEMODE.Resources = [
	
	{
		name: "Desert",
		url: "models/tile.js",
		mat: "materials/models/tile/desert.png",
		color: 0xE8E67D
	},
	
	{
		name: "Lumber",
		url: "models/tile.js",
		mat: "materials/models/tile/forest.png",
		color: 0x7A6400
	},
	
	{
		name: "Brick",
		url: "models/tile.js",
		mat: "materials/models/tile/hills.png",
		color: 0xCC1B1B
	},
	
	{
		name: "Sheep",
		url: "models/tile.js",
		mat: "materials/models/tile/pastures.png",
		color: 0x55E076
	},
	
	{
		name: "Grain",
		url: "models/tile.js",
		mat: "materials/models/tile/field.png",
		color: 0xC2AF25
	},
	
	{
		name: "Ore",
		url: "models/tile.js",
		mat: "materials/models/tile/mountains.png",
		color: 0x878787
	}
		
];

GAMEMODE.Buildings = [
	
	/*
		name		Building name
		url			Model path
		pieces		Maximum amount of pieces per player
		cost		Resource cost according to order in enums
	*/

	{
		name: "Road",
		url: "models/road.js",
		pieces: 15,
		cost: [ 0, 1, 1, 0, 0, 0 ] // use resource enums
	},
	
	{
		name: "Settlement",
		url: "models/settlement.js",
		pieces: 5,
		cost: [ 0, 1, 1, 1, 1, 0 ]
	},
	
	{
		name: "City",
		url: "models/city.js",
		pieces: 4,
		cost: [ 0, 0, 0, 0, 2, 3 ]
	}
	
];

GAMEMODE.Robber = {
	name: "Robber",
	url: "models/robber.js"
};

GAMEMODE.CardCost = [ 0, 0, 0, 1, 1, 1 ]
GAMEMODE.Cards = [
	
	{
		name: "Year of Plenty",
		url: "materials/cards/yearofplenty.png"
	},
	
	{
		name: "Road Building",
		url: "materials/cards/roadbuilding.png"
	},
	
	{
		name: "Monopoly",
		url: "materials/cards/monopoly.png"
	},
	
	{
		name: "Knight",
		url: "materials/cards/knight.png"
	}
	
];

GAMEMODE.Special = [
	
	{
		name: "Largest Army",
		url: "materials/special/largestarmy.png"
	},
	
	{
		name: "Longest Road",
		url: "materials/special/longestroad.png"
	}
	
];

// Default Catan Board Arrangement
// 0 = No tile
// 1 = Resource
// 2 = Dock?
GAMEMODE.getGrid = function() {
	return [[0,1,1,1,0],
			[1,1,1,1,1],
			[1,1,1,1,1],
			[1,1,1,1,1],
			[0,0,1,0,0]]
}

if(SERVER) {

	GAMEMODE.MaxPlayers = 4;

	GAMEMODE.getResources = function() {

		resources = [RESOURCE_DESERT];
		for(var i=0; i < 4; i++) {
			resources.push(RESOURCE_LUMBER);
			resources.push(RESOURCE_SHEEP);
			resources.push(RESOURCE_GRAIN);
		}
		for(var i=0; i < 3; i++) {
			resources.push(RESOURCE_BRICK);
			resources.push(RESOURCE_ORE);
		}

		return resources;

	}

	GAMEMODE.getNumberTokens = function() {
		return [2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12];
	}

	GAMEMODE.getColors = function() {
		return [
			0x2BB1CC,	// blue 
			0x259C31,	// green
			0xCC332B,	// red
			0x912BCC	// purple
		];
	}

	/* -----------------------------------------------
		Gamemode Rules
	------------------------------------------------*/
	GAMEMODE.canPlayerPurchase = function(ply, ent) {
		var building = this.Buildings[ent.getType()];

		// Do they have the necessary resources?
		var cost = building.cost;
		for(res in cost) {
			var amount = cost[res];
			if(!ply.hasResources(res, amount)) {
				return false;
			};
		};

		// Do they have too many of that structure?
		var pieces = building.pieces;
		if(ply.getNumBuildings(ent.getType()) >= pieces) {
			return false;
		}

		return true;
	}

	GAMEMODE.onPlayerRoll = function(ply, d1, d2) {

		var n = d1 + d2;

		if(n == 7) {
			this.onPlayerRollSeven(ply);
		};

	};

	GAMEMODE.onPlayerRollSeven = function(ply) {
		// enable move robber
		ply.mustMoveRobber = true;
	};

	GAMEMODE.onPlayerScore = function(ply) {
		if (ply.getVictoryPoints() >= 10) {
			// win game
		}
	};

	// Player has built structure in the playing state.
	GAMEMODE.onPlayerBuild = function(ply, ent) {
		// Remove resources
		var cost = this.Buildings[ent.getType()].cost;
		for(i in cost) {
			ply.removeResource(i, cost[i]);
		};

		if (ent.isRoad()) {

			// check longest road
			this.checkLongestRoad(ply);

		} else if (ent.isSettlement() || ent.isCity()) {

			ply.addVictoryPoint();
			this.onPlayerScore(ply);

		}
	};

	GAMEMODE.checkLongestRoad = function(ply) {

	}

}

CATAN.Schemas.register("Classic", GAMEMODE);