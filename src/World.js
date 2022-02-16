export class World {
  ball;
  walls = [];

  update( dt ) {
    let lastHit;

    for ( let tries = 0; dt > 0 && tries < 10; tries ++ ) {   // don't get stuck forever
      const hits = [];

      this.walls.filter( 
        wall => !lastHit?.entities.includes( wall ) 
      ).forEach( 
        wall => hits.push( wall.getCollision( this.ball ) ) 
      );

      const hit = hits.reduce( 
        ( closest, nextHit ) => 0 < nextHit.time && nextHit.time < closest.time ? nextHit : closest,
        { time: Infinity }
      );

      if ( 0 < hit.time && hit.time <= dt ) {
        lastHit = hit;
        
        this.ball.update( hit.time );
        dt -= hit.time;

        const f = 1, r = 1;
        const m1 = 1, m2 = 1;

        const vDotN = ( this.ball.dx * hit.normal.x + this.ball.dy * hit.normal.y ) / ( m1 + m2 );

        const uX = m2 * vDotN * hit.normal.x;
        const uY = m2 * vDotN * hit.normal.y;
        
        this.ball.dx = f * ( this.ball.dx - uX ) - r * uX;
        this.ball.dy = f * ( this.ball.dy - uY ) - r * uY;
      }
      else {
        this.ball.update( dt );
        dt = 0;
      }
    }
  }
}