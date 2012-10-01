/**
 * @author Samuel Maddock / http://samuelmaddock.com/
 */

var HexTile = function() {
	
	this.create();

	// Catan
	this.Resource = -1;
	this.NumberToken = -1;
	this.bHasRobber = false;
	
	this.AdjacentCorners = [];
	this.AdjacentEdges = [];
	
	this.x = -1;
	this.y = -1;
	
	this.cornersX = [];
	this.cornersY = [];
	
	this.edgesX = [];
	this.edgesY = [];

	this.bVisible = true;

	// Networked randomized rotation
	this.yaw = (2*Math.PI)/6 * (Math.floor(Math.random() * 6) + 1);
	
};

HexTile.prototype = CATAN.ents.create('BaseEntity');

/*
	Resources
*/
HexTile.prototype.getResource = function() { return this.Resource; };
HexTile.prototype.setResource = function(resource) { this.Resource = resource; };

HexTile.prototype.isDesert = function() {
	return this.getResource() == RESOURCE_DESERT;
}

/*
	Tokens
*/
HexTile.prototype.getToken = function() { return this.NumberToken; };
HexTile.prototype.setToken = function(num) {
	this.NumberToken = num;

	if(CLIENT && num > 0) {
		// White circular base
		if(!this.tokenBase) {
			this.tokenBase = new THREE.Mesh(
				new THREE.CylinderGeometry(18,18,4,12,1,false),
				new THREE.MeshBasicMaterial({color:0xFFFFFF})
			)
			this.tokenBase.position.x = this.position.x;
			this.tokenBase.position.y = this.position.y;
			this.tokenBase.position.z = this.position.z;
			CATAN.Game.scene.add(this.tokenBase);
		}

		// Number token
		if(!this.tokenText) {
			this.tokenText = new THREE.Mesh(
				new THREE.TextGeometry(this.getToken().toString(), {
					size: 20,
					height: 1,
					curveSegments: 2,
					font: "helvetiker"
				}),
				new THREE.MeshBasicMaterial({ color: 0x000000 })
			)
			this.tokenText.position.x = this.position.x - 8;
			this.tokenText.position.y = this.position.y + 2;
			this.tokenText.position.z = this.position.z + 8;
			this.tokenText.rotation.x = -90 * Math.PI/180;
			CATAN.Game.scene.add(this.tokenText);
		}
	}
};

/*
	Robber
*/
HexTile.prototype.hasRobber = function() { return this.bHasRobber; };
HexTile.prototype.setRobber = function(bRobber) { this.bHasRobber = bRobber; };

/*
	Hex Geometry
*/
HexTile.prototype.setRadius = function(r) {
	this.Radius = r;
	this.Width = r * 2;
	this.Height = r * Math.sqrt(3);
	this.Side = r * 3 / 2;	
}

/* -----------------------------------------------
	HexTile.setGridIndex( x, y )

	Desc: Sets the hex tile grid index and
	calculates the appropriate offsets
------------------------------------------------*/
HexTile.prototype.setGridIndex = function(x,y,offset) {
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
HexTile.prototype.getNeighborX = function() {};
HexTile.prototype.getNeighborY = function() {};

/* -----------------------------------------------
	HexTile.setupMesh

	Desc: Creates world mesh for tile
------------------------------------------------*/
HexTile.prototype.setupMesh = function() {
	var res = CATAN.getSchema().Resources[this.getResource()];

	this.Mesh = new THREE.Mesh(
		CATAN.AssetManager.get(res.url),
		new THREE.MeshLambertMaterial({
			map: CATAN.AssetManager.get(res.mat)
		})
	);

	this.Mesh.position = this.position;
	
	this.Mesh.Parent = this;

	CATAN.Game.scene.add( this.Mesh );
}

/* -----------------------------------------------
	HexTile.getCornerPosition( CORNER_ENUM )

	Desc: Returns the world position for the 
	requested corner of the tile (See enums.js)
------------------------------------------------*/
HexTile.prototype.getCornerPosition = function(CORNER_ENUM) {
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
HexTile.prototype.getEdgePosAng = function(EDGE_ENUM) {
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

if(CLIENT) {
	HexTile.prototype.setup = function(data) {
		this._setup(data);

		this.setResource(data.resource);
		this.setToken(data.token);

		this.setupMesh();

		this.Mesh.rotation.y = data.yaw;
	}
}

CATAN.ents.register('HexTile', HexTile);