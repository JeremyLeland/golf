export class Curve {
  start;
  control1;
  control2;
  end;

  static getCurvesThroughPoints( points ) {
    const curves = [];

    for ( let i = 0; i < points.length - 1; i ++ ) {
      const before = points[ Math.max( i - 1, 0 ) ];
      const start = points[ i ];
      const end = points[ i + 1 ];
      const after = points[ Math.min( i + 2, points.length - 1 ) ];

      curves.push( Curve.fromAdjacentPoints( before, start, end, after ) );
    }

    return curves;
  }

  static getLoopThroughPoints( points ) {
    const curves = [];

    for ( let i = 0; i < points.length; i ++ ) {
      const before = points[ modulo( i - 1, points.length ) ];
      const start = points[ i ];
      const end = points[ modulo( i + 1, points.length ) ];
      const after = points[ modulo( i + 2, points.length ) ];

      curves.push( Curve.fromAdjacentPoints( before, start, end, after ) );
    }

    return curves;
  }

  // See: http://csharphelper.com/blog/2019/04/draw-a-smooth-curve-in-wpf-and-c/
  static fromAdjacentPoints( before, start, end, after, tension = 0.5 ) {
    const control_scale = tension / 0.5 * 0.175;
    
    const p2 = {
      x: start.x + control_scale * ( end.x - before.x ),
      y: start.y + control_scale * ( end.y - before.y ),
    };
    const p3 = {
      x: end.x - control_scale * ( after.x - start.x ),
      y: end.y - control_scale * ( after.y - start.y ),
    };

    return new Curve( start, p2, p3, end );
  }

  constructor( start, control1, control2, end ) {
    this.start = start;
    this.control1 = control1;
    this.control2 = control2;
    this.end = end;
  }

  getPosition( t ) {
    const x =     (1-t) * (1-t) * (1-t) * this.start.x +
              3 * (1-t) * (1-t) *    t  * this.control1.x +
              3 * (1-t) *    t  *    t  * this.control2.x +
                     t  *    t  *    t  * this.end.x;

    const y =     (1-t) * (1-t) * (1-t) * this.start.y +
              3 * (1-t) * (1-t) *    t  * this.control1.y +
              3 * (1-t) *    t  *    t  * this.control2.y +
                     t  *    t  *    t  * this.end.y;

    return { x: x, y: y };
  }

  // See: https://pomax.github.io/bezierinfo/#derivatives
  getNormal( t ) {
    const x = 3 * (1-t) * (1-t) * ( this.control1.x - this.start.x ) +
              3 * (1-t) *    t  * ( this.control2.x - this.control1.x ) +
              3 *    t  *    t  * ( this.end.x - this.control2.x );

    const y = 3 * (1-t) * (1-t) * ( this.control1.y - this.start.y ) +
              3 * (1-t) *    t  * ( this.control2.y - this.control1.y ) +
              3 *    t  *    t  * ( this.end.y - this.control2.y );

    // normal = -y,x of tangent
    // also, normalize it
    const dist = Math.hypot( x, y );
    return { x: -y / dist, y: x / dist };
  }

  draw( ctx, step = 0.05 ) {
    const posPath = new Path2D();
    const normPath = new Path2D();
    
    for ( let t = 0; t <= 1; t += step ) {
      const pos = this.getPosition( t );
      const norm = this.getNormal( t );

      posPath.lineTo( pos.x, pos.y );
      normPath.moveTo( pos.x, pos.y );
      normPath.lineTo( pos.x + norm.x * 10, pos.y + norm.y * 10 );
    }

    ctx.strokeStyle = 'yellow';
    ctx.stroke( posPath );
    ctx.strokeStyle = 'gray';
    ctx.stroke( normPath );
  }
}

function modulo( a, n ) {
  return ( ( a % n ) + n ) % n;
}