import * as Quartic from '../lib/quartic.js';

export class Line {
  constructor( x1, y1, x2, y2 ) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }
  
  get length() {
    return Math.hypot( this.x2 - this.x1, this.y2 - this.y1 );
  }

  get slopeAngle() {
    return Math.atan2( this.y2 - this.y1, this.x2 - this.x1 );
  }

  get normalAngle() {
    return Math.atan2( this.x1 - this.x2, this.y2 - this.y1 );
  }

  draw( ctx ) {
    ctx.beginPath();
    ctx.moveTo( this.x1, this.y1 );
    ctx.lineTo( this.x2, this.y2 );
    // ctx.lineWidth = 1;
    ctx.stroke();

    const midX = ( this.x1 + this.x2 ) / 2;
    const midY = ( this.y1 + this.y2 ) / 2;
    const normalAngle = this.normalAngle;
    const NORM_LEN = 0.5;

    ctx.beginPath();
    ctx.moveTo( midX, midY );
    ctx.lineTo( 
      midX + Math.cos( normalAngle ) * NORM_LEN, 
      midY + Math.sin( normalAngle ) * NORM_LEN,
    );
    ctx.lineWidth /= 2;
    ctx.stroke();
    ctx.lineWidth *= 2;
  }

  distanceFrom( entity ) {
    const px = this.x2 - this.x1;
    const py = this.y2 - this.y1;
    const D = ( px * px ) + ( py * py );

    const len = Math.sqrt( D );
    const normX = py / len;
    const normY = -px / len;
    
    const u = ( ( entity.x - this.x1 ) * px + ( entity.y - this.y1 ) * py ) / D;
    const offset = 0; //entity.radius / len;

    if ( u + offset <= 0 ) {
      return Math.hypot( entity.x - this.x1, entity.y - this.y1 ) - entity.radius;
    }
    else if ( 1 <= u - offset ) {
      return Math.hypot( entity.x - this.x2, entity.y - this.y2 ) - entity.radius;
    }
    else {
      return ( entity.x - this.x1 ) * normX + ( entity.y - this.y1 ) * normY - entity.radius;
    }
  }

  timeToHit( entity ) {
    const px = this.x2 - this.x1;
    const py = this.y2 - this.y1;
    const D = ( px * px ) + ( py * py );

    const len = Math.sqrt( D );
    const normX = py / len;
    const normY = -px / len;
    
    const distFromLine = ( this.x1 - entity.x ) * normX + ( this.y1 - entity.y ) * normY;
    const vDotN = entity.dx * normX + entity.dy * normY;

    const hitTime = ( distFromLine + entity.radius ) / vDotN;

    const hitX = entity.x + entity.dx * hitTime;
    const hitY = entity.y + entity.dy * hitTime;

    const closestOnLine = ( ( hitX - this.x1 ) * px + ( hitY - this.y1 ) * py ) / D;

    if ( closestOnLine <= 0 ) {
      return timeToHitPoint( entity, this.x1, this.y1 );
    }
    else if ( 1 <= closestOnLine ) {
      return timeToHitPoint( entity, this.x2, this.y2 );
    }
    else {
      return hitTime;
    }
  }
  
  getSlopeDist( entity, slopeX, slopeY ) {
    const normalAngle = this.normalAngle;
    const normX = Math.cos( normalAngle ) * entity.radius;
    const normY = Math.sin( normalAngle ) * entity.radius;

    const x1 = this.x1 + normX, y1 = this.y1 + normY;
    const x2 = this.x2 + normX, y2 = this.y2 + normY;
    const x3 = entity.x, y3 = entity.y;
    const x4 = x3 + slopeX, y4 = y3 + slopeY;

    const D = ( y4 - y3 ) * ( x2 - x1 ) - ( x4 - x3 ) * ( y2 - y1 );

    if ( D == 0 ) {
      return Infinity;
    }
    else {
      const uA = ( ( x4 - x3 ) * ( y1 - y3 ) - ( y4 - y3 ) * ( x1 - x3 ) ) / D;
      const uB = ( ( x2 - x1 ) * ( y1 - y3 ) - ( y2 - y1 ) * ( x1 - x3 ) ) / D;

      // console.log( 'uA: ' + uA );
      // console.log( 'uB: ' + uB );

      // TODO: Haven't really tested these cases, not sure how often they come up when following slope
      if ( uA <= 0 ) {
        // console.warn( 'left' );
        return getSlopeDistPoint( entity, slopeX, slopeY, this.x1, this.y1 );
      }
      else if ( 1 <= uA ) {
        // console.warn( 'right' );
        return getSlopeDistPoint( entity, slopeX, slopeY, this.x2, this.y2 );
      }
      else {
        return uB;
      }
    }
  }

  timeToHit_accel( entity ) {
    // https://math.stackexchange.com/questions/106705/find-intersections-between-parametrized-parabola-and-a-line
    // If P = ( px, py ) and Q = ( qx, qy ), line PQ has equation ( x - px ) / ( qx - px ) = ( y - py ) / ( qy - py )

    // 0.5 * ( ( a x q ) - ( a x p ) ) * t * t + ( ( v x q ) - ( v x p ) ) * t + ( ( r x q ) - ( r x p ) - ( p x q ) ) = 0
    // axby - aybx = a x b
    // 0.5 * ( ( ax*qy - ay*qx ) - ( ax*py - ay*px ) ) * t * t + ( ( vx*qy - vy*qx ) - ( vx*py - vy*px ) ) * t + ( ( rx*qy - ry*qx ) - ( rx*py - ry*px ) - ( pxqy - pyqx ) ) = 0

    // A = 0.5 * ( ( ax*qy - ay*qx ) - ( ax*py - ay*px ) )
    // B = ( ( vx*qy - vy*qx ) - ( vx*py - vy*px ) )
    // C = ( ( rx*qy - ry*qx ) - ( rx*py - ry*px ) - ( px*qy - py*qx ) )

    const normalAngle = this.normalAngle;
    const normX = Math.cos( normalAngle );
    const normY = Math.sin( normalAngle );

    const px = this.x1 + normX * entity.radius;
    const py = this.y1 + normY * entity.radius;
    const qx = this.x2 + normX * entity.radius;
    const qy = this.y2 + normY * entity.radius;

    const w = qx - px;
    const h = qy - py;

    const ax = entity.ax;
    const ay = entity.ay;
    const vx = entity.dx;
    const vy = entity.dy;
    const sx = entity.x;
    const sy = entity.y;

    // TODO: The cross-product bit doesn't work for vertical lines...how to handle?
    // Maybe see https://www.nagwa.com/en/explainers/516147029054/
    // "Suppose that we are given parametric equations 𝑥=𝑓(𝑡), 𝑦=𝑔(𝑡) of a curve and the equation of a 
    // horizontal line 𝑦=𝑎 (𝑎 is a constant) or a vertical line 𝑥=𝑏 (𝑏 is a constant). In this case, 
    // we can directly set the relevant parametric coordinate equation equal to the constant: 
    // either 𝑓(𝑡)=𝑏 or 𝑔(𝑡)=𝑎. In both cases, we have a single equation that we can solve for 𝑡 as before."

    const A = 0.5 * ( ( ax*qy - ay*qx ) - ( ax*py - ay*px ) );
    const B = ( ( vx*qy - vy*qx ) - ( vx*py - vy*px ) );
    const C = ( ( sx*qy - sy*qx ) - ( sx*py - sy*px ) - ( px*qy - py*qx ) );

    const lineTime = solveQuadratic( A, B, C );

    const lineX = sx + vx * lineTime + 0.5 * ax * lineTime * lineTime;
    const lineY = sy + vy * lineTime + 0.5 * ay * lineTime * lineTime;
    const closestOnLine = ( ( lineX - px ) * w + ( lineY - py ) * h ) / ( w * w + h * h );

    if ( closestOnLine < 0 ) {
      return parabolaVsCircle( entity.x, entity.y, entity.dx, entity.dy, entity.ax, entity.ay, this.x1, this.y1, entity.radius );
    }
    else if ( 1 < closestOnLine ) {
      return parabolaVsCircle( entity.x, entity.y, entity.dx, entity.dy, entity.ax, entity.ay, this.x2, this.y2, entity.radius );
    }
    else {
      return lineTime;
    }
  }
}

function timeToHitPoint( entity, cx, cy ) {
  const dX = entity.dx;
  const dY = entity.dy;
  const fX = entity.x - cx;
  const fY = entity.y - cy;

  const a = dX * dX + dY * dY;
  const b = 2 * ( fX * dX + fY * dY ); 
  const c = ( fX * fX + fY * fY ) - Math.pow( entity.radius, 2 );

  return solveQuadratic( a, b, c );
}

function getSlopeDistPoint( entity, slopeX, slopeY, cx, cy ) {
  const dX = slopeX;
  const dY = slopeY;
  const fX = entity.x - cx;
  const fY = entity.y - cy;

  const a = dX * dX + dY * dY;
  const b = 2 * ( fX * dX + fY * dY ); 
  const c = ( fX * fX + fY * fY ) - Math.pow( entity.radius, 2 );

  return solveQuadratic( a, b, c );
}

const EPSILON = 1e-6;

function solveQuadratic( A, B, C ) {
  if ( Math.abs( A ) < EPSILON ) {
    return -C / B;
  }
  else {
    const disc = B * B - 4 * A * C;

    if ( disc < 0 ) {
      return Infinity;
    }
    else {
      const t0 = ( -B - Math.sqrt( disc ) ) / ( 2 * A );
      const t1 = ( -B + Math.sqrt( disc ) ) / ( 2 * A );
      
      return t1 < 0 || t0 < t1 ? t0 : t1;
    }
  }
}

function parabolaVsCircle( sx, sy, vx, vy, ax, ay, cx, cy, r ) {
  // Solve: ( ( (1/2) * ax*t^2 + vx*t + sx ) - cx )^2 + ( ( (1/2) * ay*t^2 + vy*t + sy ) - cy )^2 - r^2
  // https://www.symbolab.com/solver/expand-calculator/expand%20%5Cleft(%5Cfrac%7B1%7D%7B2%7Dat%5E%7B2%7D%2Bvt%2B%5Cleft(s-p%5Cright)%5Cright)%5E%7B2%7D%2B%5Cleft(%5Cfrac%7B1%7D%7B2%7Dbt%5E%7B2%7D%2Bwt%2B%5Cleft(u-q%5Cright)%5Cright)%5E%7B2%7D-r%5E%7B2%7D?or=input

  const A = ( ax**2 + ay**2 )/4;
  const B = ax*vx + ay*vy;
  const C = vx**2 + ax*( sx - cx ) + vy**2 + ay*( sy - cy );
  const D = 2*vx*( sx - cx ) + 2*vy*( sy - cy );
  const E = sx*( sx - 2*cx ) + sy*( sy - 2*cy ) + cx**2 + cy**2 - r*r;

  // console.log( `Solving quartic:\nA = ${ A }\nB = ${ B }\nC = ${ C }\nD = ${ D }\nE = ${ E }` );

  let closest = Infinity;

  const times = Quartic.quartic( [ A, B, C, D, E ] );

  // console.log( times );

  times.forEach( time => {
    if ( 0 < time && time < closest ) {
      closest = time;
    }
  } );

  return closest;
}