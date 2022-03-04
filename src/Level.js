import { Wall } from './Wall.js';
import { Curve } from './Curve.js'
import * as Noise from '../lib/noise/2d.js';

const FLAG_WIDTH = 10, FLAG_HEIGHT = 20;


class Flag {
  x;
  y;
  wall;

  static #pole = new Path2D( 'M 0 0 V -1 H 0.1 V 0' );
  static #flag = new Path2D( 'M 0 -1 L 1 -0.75 L 0 -0.5' );

  constructor( wall ) {
    this.x = wall.x2;
    this.y = wall.y2;
    this.wall = wall;
  }

  draw( ctx ) {
    ctx.save();

    ctx.translate( this.x, this.y );
    ctx.scale( FLAG_WIDTH, FLAG_HEIGHT );

    ctx.fillStyle = 'white';
    ctx.fill( Flag.#pole );
    ctx.fillStyle = 'red';
    ctx.fill( Flag.#flag );

    ctx.restore();
  }
}

const noise = Noise.makeNoise2D();

const LEVEL_HEIGHT = 500; // 900
const HOLE_WIDTH = 20, HOLE_DEPTH = 20;
const ISLAND_MIN_WIDTH = 100, ISLAND_MAX_WIDTH = 300;


export class Level {
  #walls = [];
  #flags = [];

  #path = new Path2D();

  constructor() {
    const points = { top: [], mid: [], bottom: [] };

    for ( let i = 0; i < 20; i ++ ) {
      const x = i * 400;
      const mid = LEVEL_HEIGHT / 2 + noise( x * 0.01, i ) * LEVEL_HEIGHT / 3;
    
      points.mid.push( { x: x, y: mid } );
    
      const radius = Math.min( mid, LEVEL_HEIGHT - mid ) * ( 1 + noise( x * 0.01, 1 ) ) / 2;
    
      const top    = mid - radius;
      const bottom = mid + radius;
    
      points.top.unshift( { x: x, y: top } );
      points.bottom.push( { x: x, y: bottom } );
    }
    
    const topCurves = Curve.getCurvesThroughPoints( points.top );
    const midCurves = Curve.getCurvesThroughPoints( points.mid );
    const bottomCurves = Curve.getCurvesThroughPoints( points.bottom );
    
    const topWalls = getWallsFromPoints( getAlteredPoints( topCurves ) );
    const bottomWalls = getWallsFromPoints( getAlteredPoints( bottomCurves ) );
    
    // Find flattest points for flags
    for ( let i = 1; i < bottomWalls.length - 1; i ++ ) {
      const prev = bottomWalls[ i - 1 ];
      const current = bottomWalls[ i ];
      const next = bottomWalls[ i + 1 ];
    
      if ( current.normal.y < -0.99 && 
           current.normal.y < prev.normal.y && current.normal.y < next.normal.y ) {
        this.#flags.push( new Flag( current ) );
      }
    }
    
    this.#flags.forEach( flag => {
      const current = flag.wall;
      const index = bottomWalls.indexOf( current );
      
      const bottomY = Math.min( current.y1, current.y2 ) + HOLE_DEPTH;
    
      const left = new Wall( current.x1, current.y1, current.x1, bottomY );
      const right = new Wall( current.x2, bottomY, current.x2, current.y2 );
      current.y1 = bottomY;
      current.y2 = bottomY;
    
      bottomWalls.splice( index + 1, 0, right );
      bottomWalls.splice( index, 0, left );
    } );

    this.#path.addPath( getPathFromWalls( topWalls, 0 ) );
    this.#path.addPath( getPathFromWalls( bottomWalls, LEVEL_HEIGHT ) );
    
    this.#walls = topWalls.concat( bottomWalls );
  }

  spawn( ball ) {
    // const top = this.#topPoints[ 0 ], bottom = this.#bottomPoints[ 0 ];
    // ball.x = ( top.x + bottom.x ) / 2;
    // ball.y = ( top.y  + bottom.y ) / 2;

    ball.x = 50;
    ball.y = 200;
  }

  getWallsNear( ball ) {
    // TODO: Actually calcuate nearby walls and only return those
    return this.#walls;
  }

  draw( ctx ) {
    ctx.fillStyle = 'green';
    ctx.fill( this.#path );

    this.#walls.forEach( wall => wall.draw( ctx ) );
    this.#flags.forEach( flag => flag.draw( ctx ) );
  }
}




function getAlteredPoints( curves, numPoints = 20 ) {
  const points = [];

  curves.forEach( curve => {
    for ( let i = 0; i < numPoints; i ++ ) {
      const t = i / numPoints;
      const pos = curve.getPosition( t );
      const norm = curve.getNormal( t );

      const offset = 10 * Math.sin( t * Math.PI * 2 * 4321 );

      points.push( { 
        x: pos.x + norm.x * offset,
        y: pos.y + norm.y * offset,
      } );
    }
  } );

  return points;
}

// TODO: Loop, reverse?
function getWallsFromPoints( points ) {
  const walls = [];

  for ( let i = 0; i < points.length - 1; i ++ ) {
    const current = points[ i ], next = points[ i + 1 ];
    walls.push( new Wall( current.x, current.y, next.x, next.y ) );
  }

  return walls;
}

function getPathFromWalls( walls, baseY ) {
  const path = new Path2D();

  const first = walls[ 0 ], last = walls[ walls.length - 1 ];
  path.lineTo( first.x1, baseY );
  path.lineTo( first.x1, first.y1 );
  walls.forEach( wall => path.lineTo( wall.x2, wall.y2 ) );
  path.lineTo( last.x2, baseY );
  path.closePath();

  return path;
}

function getPoints( { cx = 0, cy = 0, width = 1, height = 1, numPoints = 10 } ) {
  const spacing = Math.PI * 2 / numPoints;
  const angles = Array.from( Array( numPoints ), ( _, ndx ) => 
    spacing * ( ndx + ( Math.random() - 0.5 ) * 0.5 ) 
  );
  
  return angles.map( angle => ( {
    x: cx + width  * Math.cos( angle ) * ( 0.5 + 0.5 * Math.random() ),
    y: cy + height * Math.sin( angle ) * ( 0.5 + 0.5 * Math.random() ),
  } ) );
}

// // https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
// // https://github.com/bryc/code/blob/master/jshash/PRNGs.md
// function sfc32(a, b, c, d) {
//   return function() {
//     a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
//     var t = (a + b) | 0;
//     a = b ^ b >>> 9;
//     b = c + (c << 3) | 0;
//     c = (c << 21 | c >>> 11);
//     d = d + 1 | 0;
//     t = t + d | 0;
//     c = c + t | 0;
//     return (t >>> 0) / 4294967296;
//   }
// }

// function noise( x, y ) {
//   // borrowing from https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner
//   return ( Math.abs( Math.sin( x * 12.9898 + y * 78.233 ) ) * 43758.5453 ) % 1;
// }

