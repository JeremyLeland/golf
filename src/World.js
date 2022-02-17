export class World {

  getNextHit( ball, walls, lastHit ) {
    const hits = walls.filter( 
      wall => !lastHit?.entities.includes( wall ) 
    ).map( 
      wall => wall.getCollision( ball )
    );

    return hits.reduce( 
      ( closest, nextHit ) => 0 < nextHit.time && nextHit.time < closest.time ? nextHit : closest,
      { time: Infinity }
    );
  }

  update( { ball, walls, dt } ) {
    let lastHit;

    for ( let tries = 0; dt > 0 && tries < 10; tries ++ ) {   // don't get stuck forever
      const hit = this.getNextHit( ball, walls );

      if ( hit.time <= dt ) {
        lastHit = hit;
        
        ball.update( hit.time );
        dt -= hit.time;

        ball.bounceFrom( hit );
      }
      else {
        ball.update( dt );
        dt = 0;
      }
    }
  }
}