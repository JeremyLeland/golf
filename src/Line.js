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
}

function timeToHitPoint( entity, cx, cy ) {
  const dX = entity.dx;
  const dY = entity.dy;
  const fX = entity.x - cx;
  const fY = entity.y - cy;

  const a = dX * dX + dY * dY;
  const b = 2 * ( fX * dX + fY * dY ); 
  const c = ( fX * fX + fY * fY ) - Math.pow( entity.radius, 2 );

  let disc = b * b - 4 * a * c;

  if ( disc > 0 ) {
    return ( -b - Math.sqrt( disc ) ) / ( 2 * a );
  }
  else {
    return Infinity;
  }
}

function getSlopeDistPoint( entity, slopeX, slopeY, cx, cy ) {
  const dX = slopeX;
  const dY = slopeY;
  const fX = entity.x - cx;
  const fY = entity.y - cy;

  const a = dX * dX + dY * dY;
  const b = 2 * ( fX * dX + fY * dY ); 
  const c = ( fX * fX + fY * fY ) - Math.pow( entity.radius, 2 );

  let disc = b * b - 4 * a * c;

  if ( disc >= 0 ) {
    return ( -b - Math.sqrt( disc ) ) / ( 2 * a );
  }
  else {
    return Infinity;
  }
}