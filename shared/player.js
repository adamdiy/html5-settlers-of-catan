/**
 * @author Samuel Maddock / http://samuelmaddock.com/
 */
 
CATAN.Player = function() {

	this.turn = false
	this.buildings = [];

	if(SERVER) {
		this.Inventory = {
			Resources: []
		}
	}

};

CATAN.Player.prototype = {

	getID: function() {
		return this.id;
	},

	getName: function() {
		var name = this.name;
		if(this.nameDup > 0) { name += '('+this.nameDup+')' };
		return name;
	},

	getColor: function() {
		return this.color;
	},

	setTurn: function(bTurn) {
		this.turn = bTurn;
	},

	isTurn: function() {
		return this.turn;
	},
		
	getNumResource: function(RESOURCE_ENUM) {
		return ( this.Inventory.Resources[RESOURCE_ENUM] !== undefined ) ? this.Inventory.Resources[RESOURCE_ENUM] : 0;
	},

	hasResources: function(RESOURCE_ENUM, amount) {
		return this.getResource(RESOURCE_ENUM) >= amount;
	},

	giveResource: function(RESOURCE_ENUM, amount) {
		this.Inventory.Resources[RESOURCE_ENUM] += ( amount !== undefined ? amount : 1);
	},

	removeResource: function(RESOURCE_ENUM, amount) {
		this.Inventory.Resources[RESOURCE_ENUM] -= ( amount !== undefined ? amount : 1);
	},

	getBuildings: function() {
		return this.buildings;
	},

	setOwnership: function(building) {
		building.Color = this.Color;
		this.buildings.push(building);
	},

	isOwner: function(ent) {
		return ( ent.hasOwner() && ent.getOwner() == this.getID() );
		/*for(i in this.buildings) {
			var b = this.buildings[i];
			if (b.getEntId() == building.getEntId() && b.Building == building.Building) {
				return true;
			};
		};*/
	}

}

if(SERVER) {
	require('../server/player.js');
}