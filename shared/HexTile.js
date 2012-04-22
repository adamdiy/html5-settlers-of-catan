/**
 * @author Samuel Maddock / http://samuelmaddock.com/
 */

if(typeof exports !== 'undefined') {
	Entity = require('./Entity.js')
}

HexGridCell = function(radius) {
	
	// Catan
	this.Resource = -1;
	this.NumberToken = -1;
	this.Robber = false;
	
	this.corners = [];
	this.edges = [];
	
	this.getResource = function() { return this.Resource; };
	this.hasRobber = function() { return this.Robber; };
	
	// Geometry
	this.Mesh;

	this.Radius = radius;
	this.Width = radius * 2;
	this.Height = radius * Math.sqrt(3);
	this.Side = radius * 3 / 2;	
	
	this.x = -1;
	this.y = -1;
	
	this.cornersX = [];
	this.cornersY = [];
	
	this.edgesX = [];
	this.edgesY = [];
	
};

HexGridCell.prototype = new Entity();
HexGridCell.prototype.constructor = HexGridCell;
HexGridCell.prototype.super = Entity.prototype;

/* -----------------------------------------------
	HexTile.setGridIndex( x, y )

	Desc: Sets the hex tile grid index and
	calculates the appropriate offsets
------------------------------------------------*/
HexGridCell.prototype.setGridIndex = function(x,y,offset) {
	this.x = x;
	this.y = y;

	var r = this.Radius,
	w = this.Width,
	h = this.Height,
	s = this.Side;
	
	this.mX = (x * s),
	this.mY = h * (2 * y + (x % 2)) / 2;
	
	// Corner positions from center of tile
	this.cornersX = [ -r/2, r/2, r, r/2, -r/2, -r ];
	this.cornersY = [ -h/2, -h/2, 0, h/2, h/2, 0 ];
	
	// Edge positions from center of tile
	this.edgesX = [ 0, r/4 + r/2, r/4 + r/2, 0, -r/4 - r/2, -r/4 - r/2 ];
	this.edgesY = [ -h/2, -h/4, h/4, h/2, h/4, -h/4 ];

	var rad = 60 * Math.PI/180
	this.edgesAngle = [ 0, -rad, rad, 0, -rad, rad ];

	this.position = new THREE.Vector3(
		this.mX - offset.x + s,
		0,
		this.mY - offset.z + h/2
	);

}

/* -----------------------------------------------
	HexTile.getNeighborXY

	Desc: Returns adjacent hex tile in accordance
	to the BOARD.Grid
------------------------------------------------*/
HexGridCell.prototype.getNeighborX = function() {};
HexGridCell.prototype.getNeighborY = function() {};

/* -----------------------------------------------
	HexTile.setupMesh

	Desc: Creates world mesh for tile
------------------------------------------------*/
HexGridCell.prototype.setupMesh = function() {

	this.Material = new THREE.MeshBasicMaterial({ color: 0xFF0000, wireframe: true });
	
	// Spawn hex mesh
	var resource = CATAN.getSchema().Resources[this.Resource];
	
	this.Mesh = new THREE.Mesh( resource.geometry, new THREE.MeshBasicMaterial( { color: resource.color } ) );
	this.Mesh.position = this.position;
	scene.add( this.Mesh );
	
}
/* -----------------------------------------------
	HexTile.setupMesh

	Desc: Creates world mesh for tile
------------------------------------------------*/
HexGridCell.prototype.remove = function() {

	scene.remove( this.Mesh )
	scene.remove( this.robberMesh )
	delete this
	
}

/* -----------------------------------------------
	HexTile.getMesh

	Desc: Returns the tile's world mesh
------------------------------------------------*/
HexGridCell.prototype.getMesh = function() {

	if (!this.Mesh) {
		this.setupMesh();
	}
	
	return this.Mesh;

};

/* -----------------------------------------------
	HexTile.getCornerPosition( CORNER_ENUM )

	Desc: Returns the world position for the 
	requested corner of the tile (See enums.js)
------------------------------------------------*/
HexGridCell.prototype.getCornerPosition = function(CORNER_ENUM) {
	var pos = this.getPosition();
	var corner = new THREE.Vector3(
		pos.x + this.cornersX[CORNER_ENUM],
		pos.y,
		pos.z + this.cornersY[CORNER_ENUM]
	);

	return corner;
}

/* -----------------------------------------------
	HexTile.getEdgePosition( EDGE_ENUM )

	Desc: Returns the world position for the 
	requested edge of the tile (See enums.js)
------------------------------------------------*/
HexGridCell.prototype.getEdgePosAng = function(EDGE_ENUM) {
	var angle = new THREE.Vector3(
		0,
		this.edgesAngle[EDGE_ENUM],
		0
	);

	var hexpos = this.getPosition();
	var position = new THREE.Vector3(
		hexpos.x + this.edgesX[EDGE_ENUM],
		hexpos.y,
		hexpos.z + this.edgesY[EDGE_ENUM]
	);

	return { pos: position, ang: angle };
}

/* -----------------------------------------------
	HexTile.setRobber

	Desc: Sets the robber on top of the tile
	TODO: Create actual robber object
------------------------------------------------*/
HexGridCell.prototype.setRobber = function() {

	this.Robber = true;

	if (!CLIENT) return;

	this.robberMesh = new THREE.Mesh( CATAN.getSchema().Robber.geometry, new THREE.MeshBasicMaterial( { color: 0x888888, envMap: textureSkybox } ) );
	this.robberMesh.position = new THREE.Vector3(this.position.x, this.position.y + 5, this.position.z);
	scene.add( this.robberMesh );

}

if(typeof exports !== 'undefined') {
	module.exports = HexGridCell;
}