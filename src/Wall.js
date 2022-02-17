export class Wall {
  x1;
  y1;
  x2;
  y2;
  length;
  normal;

  constructor( x1, y1, x2, y2 ) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    this.length = Math.hypot( x2 - x1, y2 - y1 );
    this.normal = {
      x: ( y2 - y1 ) / this.length,
      y: ( x1 - x2 ) / this.length,
    }

    // const angle = Math.atan2( y2 - y1, x2 - x1 );
    // const normAngle = angle - Math.PI / 2;
    // this.normal = {
    //   x: Math.cos( normAngle ),
    //   y: Math.sin( normAngle ),
    // }
  }

  getCollision( entity ) {
    const distFromLine = ( this.x1 - entity.x ) * this.normal.x + ( this.y1 - entity.y ) * this.normal.y;

    const vDotN = entity.dx * this.normal.x + entity.dy * this.normal.y;
    const hitTime = ( distFromLine + entity.size ) / vDotN;

    const hitX = entity.x + entity.dx * hitTime;
    const hitY = entity.y + entity.dy * hitTime;

    const vx = this.x2 - this.x1;
    const vy = this.y2 - this.y1;
    const wx = hitX - this.x1;
    const wy = hitY - this.y1;

    const c1 = wx * vx + wy * vy;
    if ( c1 <= 0 ) {
      return getPointHit( entity, this.x1, this.y1 );
    }

    const c2 = vx * vx + vy * vy;
    if ( c2 <= c1 ) {
      return getPointHit( entity, this.x2, this.y2 );
    }

    return {
      time: hitTime,
      normal: this.normal,
      x: hitX,
      y: hitY,
      entities: [ entity, this ],
    };
  }

  draw( ctx ) {
    // this.path ?= new Path2D( `M ${ this.x1 },${ this.y1 } L ${ this.x2 },${ this.y2 }` );

    ctx.beginPath();
    ctx.moveTo( this.x1, this.y1 );
    ctx.lineTo( this.x2, this.y2 );

    const midX = ( this.x1 + this.x2 ) / 2;
    const midY = ( this.y1 + this.y2 ) / 2;
    ctx.moveTo( midX, midY );
    ctx.lineTo( midX + this.normal.x * 10, midY + this.normal.y * 10 );

    ctx.strokeStyle = 'white';
    ctx.stroke();
  }
}

function getPointHit( entity, cx, cy ) {
  // See: https://stackoverflow.com/questions/1073336/circle-line-segment-collision-detection-algorithm
  const dX = entity.dx;
  const dY = entity.dy;
  const fX = entity.x - cx;
  const fY = entity.y - cy;

  const a = dX * dX + dY * dY;
  const b = 2 * ( fX * dX + fY * dY ); 
  const c = ( fX * fX + fY * fY ) - Math.pow( entity.size, 2 );

  let disc = b * b - 4 * a * c;

  if ( disc > 0 ) {
    const hitTime = ( -b - Math.sqrt( disc ) ) / ( 2 * a );

    const hitX = entity.x + entity.dx * hitTime;
    const hitY = entity.y + entity.dy * hitTime;

    let nx = cx - hitX;
    let ny = cy - hitY;
    const len = Math.hypot( nx, ny );
    nx /= len;
    ny /= len;

    return {
      time: hitTime,
      normal: { x: nx, y: ny },
      x: hitX,
      y: hitY,
      entities: [ entity, this ],
    }
  }
  else {
    return {
      time: Infinity
    }
  }
}