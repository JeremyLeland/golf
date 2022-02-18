import { Wall } from "./Wall.js";

const LEVEL_HEIGHT = 900;
const FLAG_WIDTH = 5, FLAG_HEIGHT = 10;

export class Level {
  #topPoints = [];
  #bottomPoints = [];

  #topPath;
  #bottomPath;

  #midPath = new Path2D();
  #normalsPath = new Path2D();

  #walls = [];
  #flags = [];

  constructor() {    
    const width = 500, height_var = 100;

    const flags = [];

    for ( let t = 0; t <= 10; t ++ ) {
      flags.push( {
        x: width * t, //+ height_var * ( Math.random() - 0.5 ),
        y: LEVEL_HEIGHT * Math.random(),
      } );
    }

    this.#flags = flags;

    const curves = getCurvesThroughPoints( flags );

    curves.forEach( c => {
      for ( let t = 0; t < 1; t += 0.05 ) {
        const pos = getCurvePosition( c, t );
        const norm = getCurveNormal( c, t );

        this.#midPath.lineTo( pos.x, pos.y );

        const off = 5;// * Math.random() * Math.sin( t * Math.PI * 2 * 123 );
        const mid = {
          x: pos.x + norm.x * off,
          y: pos.y + norm.y * off,
        }

        const radius = 40 + 10 * Math.sin( t * Math.PI * 2 ); //10 + ( 2 + Math.sin( t * Math.PI * 2 * 123 ) ) * 5;
        this.#topPoints.push( { 
          x: mid.x + norm.x * -radius,// + ( Math.random() - 0.5 ) * 5,
          y: mid.y + norm.y * -radius,// + ( Math.random() - 0.5 ) * 5,
        } );

        // radius = 10 + ( 2 + Math.sin( t * Math.PI * 2 * 123 + 42 ) ) * 5;
        this.#bottomPoints.push( {
          x: mid.x + norm.x * radius,// + ( Math.random() - 0.5 ) * 5,
          y: mid.y + norm.y * radius,// + ( Math.random() - 0.5 ) * 5,
        } );
      }
    } );

    this.#topPath = new Path2D( 'M 0,0 L ' +
      this.#topPoints.map( p => `${ p.x },${ p.y }` ).join( ' L ' ) +
    'V 0 Z' );

    this.#bottomPath = new Path2D( `M 0,${ LEVEL_HEIGHT } L ` +
      this.#bottomPoints.map( p => `${ p.x },${ p.y }` ).join( ' L ' ) +
    `V ${ LEVEL_HEIGHT } Z` );


    // ).moveTo( 0, 0 );
    // this.#leftPoints.forEach( p => this.#leftPath.lineTo( p.x, p.y ) );
    // this.#leftPath.lineTo( 0, this.#leftPoints[ this.#leftPoints.length - 1 ].y );
    // this.#leftPath.closePath

    // [ this.#leftPath, this.#rightPath ] = [ this.#leftPoints, this.#rightPoints ].map( 
    //   points => new Path2D( 'M ' + points.map( p => `${ p.x },${ p.y }` ).join( ' L ' ) )
    // );

    for ( let i = 0; i < this.#topPoints.length - 1; i ++ ) {
      const current = this.#topPoints[ i + 1 ], next = this.#topPoints[ i ];
      this.#walls.push( new Wall( current.x, current.y, next.x, next.y ) );
    }

    for ( let i = 0; i < this.#bottomPoints.length - 1; i ++ ) {
      const current = this.#bottomPoints[ i ], next = this.#bottomPoints[ i + 1 ];
      this.#walls.push( new Wall( current.x, current.y, next.x, next.y ) );
    }
    

    const normLen = 10;
    this.#walls.forEach( wall => {
      const midx = ( wall.x1 + wall.x2 ) / 2;
      const midy = ( wall.y1 + wall.y2 ) / 2;
      this.#normalsPath.moveTo( midx, midy );
      this.#normalsPath.lineTo( 
        midx + wall.normal.x * normLen, 
        midy + wall.normal.y * normLen, 
      );
    } );
  }

  spawn( ball ) {
    const top = this.#topPoints[ 0 ], bottom = this.#bottomPoints[ 0 ];
    ball.x = ( top.x + bottom.x ) / 2;
    ball.y = ( top.y  + bottom.y ) / 2;
  }

  getWallsNear( ball ) {
    // TODO: Actually calcuate nearby walls and only return those
    return this.#walls;
  }

  draw( ctx ) {
    ctx.fillStyle = 'green';
    ctx.fill( this.#topPath );
    ctx.fill( this.#bottomPath );

    ctx.strokeStyle = 'gray';
    ctx.stroke( this.#midPath );
    ctx.stroke( this.#normalsPath );

    this.#flags.forEach( flag => {
      ctx.beginPath();
      ctx.moveTo( flag.x, flag.y );
      ctx.lineTo( flag.x, flag.y - FLAG_HEIGHT );
      ctx.strokeStyle = 'white';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo( flag.x, flag.y - FLAG_HEIGHT );
      ctx.lineTo( flag.x + FLAG_WIDTH, flag.y - FLAG_HEIGHT * 0.75 );
      ctx.lineTo( flag.x, flag.y - FLAG_HEIGHT * 0.5 );
      ctx.closePath();
      ctx.fillStyle = 'red';
      ctx.fill();
    } );
  }
}

// See: http://csharphelper.com/blog/2019/04/draw-a-smooth-curve-in-wpf-and-c/
function getCurvesThroughPoints( points, tension = 0.5 ) {
  const control_scale = tension / 0.5 * 0.175;

  const curves = [];

  for ( let i = 0; i < points.length - 1; i ++ )
  {
    const pt_before = points[ Math.max( i - 1, 0 ) ];
    const pt = points[ i ];
    const pt_after = points[ i + 1 ];
    const pt_after2 = points[ Math.min( i + 2, points.length - 1 ) ];

    const p2 = {
      x: pt.x + control_scale * ( pt_after.x - pt_before.x ),
      y: pt.y + control_scale * ( pt_after.y - pt_before.y ),
    };
    const p3 = {
      x: pt_after.x - control_scale * ( pt_after2.x - pt.x ),
      y: pt_after.y - control_scale * ( pt_after2.y - pt.y ),
    };

    curves.push( {
      start: pt,
      control1: p2,
      control2: p3,
      end: pt_after,
    } );
  }

  return curves;
}

function getCurvePosition( curve, t ) {
  const x =     (1-t) * (1-t) * (1-t) * curve.start.x +
            3 * (1-t) * (1-t) *    t  * curve.control1.x +
            3 * (1-t) *    t  *    t  * curve.control2.x +
                    t  *    t  *    t  * curve.end.x;

  const y =     (1-t) * (1-t) * (1-t) * curve.start.y +
            3 * (1-t) * (1-t) *    t  * curve.control1.y +
            3 * (1-t) *    t  *    t  * curve.control2.y +
                    t  *    t  *    t  * curve.end.y;

  return { x: x, y: y };
}

// See: https://pomax.github.io/bezierinfo/#derivatives
function getCurveNormal( curve, t ) {
  const x = 3 * (1-t) * (1-t) * ( curve.control1.x - curve.start.x ) +
            3 * (1-t) *    t  * ( curve.control2.x - curve.control1.x ) +
            3 *    t  *    t  * ( curve.end.x - curve.control2.x );

  const y = 3 * (1-t) * (1-t) * ( curve.control1.y - curve.start.y ) +
            3 * (1-t) *    t  * ( curve.control2.y - curve.control1.y ) +
            3 *    t  *    t  * ( curve.end.y - curve.control2.y );

  // normal = -y,x of tangent
  // also, normalize it
  const dist = Math.hypot( x, y );
  return { x: -y / dist, y: x / dist };
}
