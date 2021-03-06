const GRAVITY = 0.0005;

const REST_SPEED = 0.1, REST_TIME = 1500;
const HIT_SENSITIVITY = 0.004, MAX_HIT = 100;

export class Ball {
  x = 0;
  y = 0;
  dx = 0;
  dy = 0;
  size = 6;
  fillStyle = 'white';

  #path = new Path2D();

  #timeSinceMovement = 0;

  #aimAngle = 0;
  #aimDist = 0;

  constructor( x, y ) {
    this.x = x;
    this.y = y;

    this.#path.arc( 0, 0, this.size, 0, Math.PI * 2 );
  }

  update( dt ) {
    this.x += this.dx * dt;
    this.y += this.dy * dt;

    this.#timeSinceMovement += dt;
    if ( REST_SPEED < Math.abs( this.dx ) || 
         REST_SPEED < Math.abs( this.dy ) ) {
      this.#timeSinceMovement = 0;
    }

    // Do this last so our movement matches our collision time predictions
    this.dy += GRAVITY * dt;
  }

  isAtRest() {
    return REST_TIME < this.#timeSinceMovement;
  }

  aimAt( x, y ) {
    const cx = x - this.x;
    const cy = y - this.y;

    this.#aimAngle = Math.atan2( cy, cx );
    this.#aimDist  = Math.min( MAX_HIT, Math.hypot( cx, cy ) );
  }

  hit() {
    this.dx += HIT_SENSITIVITY * Math.cos( this.#aimAngle ) * this.#aimDist;
    this.dy += HIT_SENSITIVITY * Math.sin( this.#aimAngle ) * this.#aimDist;
  }

  bounceFrom( hit ) {
    const f = 0.8, r = 0.5;

    const vDotN = ( this.dx * hit.normal.x + this.dy * hit.normal.y );

    const uX = vDotN * hit.normal.x;
    const uY = vDotN * hit.normal.y;
    
    this.dx = f * ( this.dx - uX ) - r * uX;
    this.dy = f * ( this.dy - uY ) - r * uY;
  }

  draw( ctx ) {
    ctx.save();

    ctx.translate( this.x, this.y );

    // Aimer
    if ( this.isAtRest() ) {
      const cos = Math.cos( this.#aimAngle ), sin = Math.sin( this.#aimAngle );
      ctx.beginPath();
      ctx.lineTo( -sin * this.size,  cos * this.size );
      ctx.lineTo(  sin * this.size, -cos * this.size );
      ctx.lineTo(  cos * this.#aimDist, sin * this.#aimDist );
      ctx.closePath();
      
      const gradient = ctx.createRadialGradient( 0, 0, 0, 0, 0, MAX_HIT * 0.75 );
      gradient.addColorStop( 0, 'green' );
      gradient.addColorStop( 0.5, 'yellow' );
      gradient.addColorStop( 1, 'red' );
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Ball itself
    ctx.fillStyle = this.fillStyle;
    ctx.fill( this.#path );
    ctx.strokeStyle = 'black';
    ctx.stroke( this.#path );

    ctx.restore();
  }

  // getSegmentHit( { x1, y1, x2, y2 } ) {
  //   const length = Math.hypot( x2 - x1, y2 - y1 );
  //   const normal = {
  //     x: ( y2 - y1 ) / length,
  //     y: ( x1 - x2 ) / length,
  //   };

  //   const distFromLine = ( x1 - this.x ) * normal.x + ( y1 - this.y ) * normal.y;

  //   const vDotN = this.dx * normal.x + this.dy * normal.y;
  //   const hitTime = ( distFromLine + this.size ) / vDotN;

  //   const hitX = this.x + this.dx * hitTime;
  //   const hitY = this.y + this.dy * hitTime;

  //   //
  //   // TODO: Can we avoid this with more of an ST approach like the tangrams code?
  //   //
  //   const d1 = Math.hypot( this.x1 - hitX, this.y1 - hitY );
  //   const d2 = Math.hypot( this.x2 - hitX, this.y2 - hitY );
        
  //   // Inside segment
  //   if ( d1 < length && d2 < length ) {
  //     return {
  //       time: hitTime,
  //       normal: normal,
  //     };
  //   }

  //   // End points. If these miss, they will return time: Infinity
  //   const hit1 = getPointHit( this, x1, y1 );
  //   const hit2 = getPointHit( this, x2, y2 );

  //   return hit1.time < hit2.time ? hit1 : hit2;
  // }

  // // See: https://stackoverflow.com/questions/1073336/circle-line-segment-collision-detection-algorithm
  // getPointHit( cx, cy ) {
  //   const dX = this.dx;
  //   const dY = this.dy;
  //   const fX = this.x - cx;
  //   const fY = this.y - cy;
  
  //   const a = dX * dX + dY * dY;
  //   const b = 2 * ( fX * dX + fY * dY ); 
  //   const c = ( fX * fX + fY * fY ) - Math.pow( this.size, 2 );
  
  //   let disc = b * b - 4 * a * c;

  //   const hitX = entity.x + entity.dx * hitTime;
  //   const hitY = entity.y + entity.dy * hitTime;

  //   let nx = cx - hitX;
  //   let ny = cy - hitY;
  //   const len = Math.hypot( nx, ny );
  //   nx /= len;
  //   ny /= len;

  //   if ( 0 < disc ) {
  //     return {
  //       time: ( -b - Math.sqrt( disc ) ) / ( 2 * a ),
  //       normal: { x: nx, y: ny },
  //     }
  //   }
  //   else {
  //     return {
  //       time: Infinity
  //     }
  //   }
  // }
}