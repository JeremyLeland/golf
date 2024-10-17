import { Line } from './Line.js';

const EPSILON = 1e-6;

const Constants = {
  Gravity: 3e-5,
  RollAngle: Math.PI / 32,
  RollFriction: 1,
  BounceFriction: 0.05,
  BounceDamping: 0.7,
  MinBounceSpeed: 5e-4,
};


// TODO: Don't roll across large angle changes, bounce off instead
// TODO: Only count as hit if we are facing normal (not coming from behind)


export class World {
  
  player;

  #level;

  #lines;


  constructor( level ) {
    this.#level = level;

    this.#lines = [];
    level.loops.forEach( loop => {
      for ( let i = 0; i < loop.length; i ++ ) {
        this.#lines.push( 
          new Line( ...loop[ i ], ...loop[ ( i + 1 ) % loop.length ] )
        );
      }
    } );

    this.respawn();
  }

  respawn() {
    this.player = { 
      x: this.#level.spawn[ 0 ], 
      y: this.#level.spawn[ 1 ], 
      dx: 0, 
      dy: 0, 
      ax: 0, 
      ay: 0, 
      radius: 0.2
    };
  }

  update( dt ) {

    // 0. See if we are already colliding with something
    //    - If so, back out of it, and this is our current line
    // -- LOOP (up to N times) --
    // 1. If we are colliding, are we rolling or bouncing?
    //    - Set dx/dy and ax/ay appropriately
    //    - Find next collision
    // 2. If we are not colliding
    //    - Find next collision
    // 3. Update ball until next collision (or dt)
    // 4. Back to step 1
    
    if ( this.player ) {
      let currentLine = null, currentDist = EPSILON;  // currentDist start value is "snap" distance
      this.#lines.forEach( line => {
        const dist = line.distanceFrom( this.player );
        
        if ( -this.player.radius < dist && dist < currentDist ) {
          currentLine = line;
          currentDist = dist;
        }
      } );

      if ( currentLine ) {
        const normalAngle = currentLine.normalAngle;

        // Don't always snap. Definitely back us out of collision, but don't bring us back to it if we are trying to escape.
        // Maybe only if velocity vector projected on normal is negative?

        const normX = Math.cos( normalAngle );
        const normY = Math.sin( normalAngle );

        const proj = this.player.dx * normX + this.player.dy * normY;

        console.log( 'proj = ' + proj );

        if ( proj <= 0 ) { 
          this.player.x -= Math.cos( normalAngle ) * currentDist;
          this.player.y -= Math.sin( normalAngle ) * currentDist;
        }
        else {
          currentLine = null;
        }
      }

      for ( let step = 0; step < 5; step ++ ) {
        let nextTime = dt, nextLine = null;
        let stopTime = Infinity, willFullStop = false;

        if ( currentLine ) {
          const slopeAngle = currentLine.slopeAngle;
          const lineSlopeX = Math.cos( slopeAngle );
          const lineSlopeY = Math.sin( slopeAngle );
  
          const playerAngle = Math.atan2( this.player.dy, this.player.dx );
          const playerSpeed = Math.hypot( this.player.dx, this.player.dy );
  
          // Roll
          if ( playerSpeed < Constants.MinBounceSpeed ||
               Math.abs( deltaAngle( slopeAngle, playerAngle ) )           < Constants.RollAngle ||
               Math.abs( deltaAngle( playerAngle, slopeAngle + Math.PI ) ) < Constants.RollAngle ) {  
            // console.log( '  Rolling' );
  
            const dir = this.player.dx < 0 ? -1 : 1 ;
            
            const gravTerm = lineSlopeY;
            const fricTerm = dir * Constants.RollFriction * lineSlopeX;
            const a = Constants.Gravity * ( gravTerm - fricTerm );
  
            this.player.ax = a * lineSlopeX;
            this.player.ay = a * lineSlopeY;
  
            this.player.dx = dir * playerSpeed * lineSlopeX;
            this.player.dy = dir * playerSpeed * lineSlopeY;
  
            // See when we'd stop rolling from friction
            stopTime = dir * playerSpeed / -a;
            willFullStop = Math.abs( lineSlopeY ) < Math.abs( Constants.RollFriction * lineSlopeX );
            
            // console.log( '    stopTime = ' + stopTime );
            // console.log( '    willFullStop = ' + willFullStop );
          }
  
          // Bounce
          else {
            // console.log( '  Bouncing' );
  
            const normalAngle = currentLine.normalAngle;
            const normX = Math.cos( normalAngle );
            const normY = Math.sin( normalAngle );
  
            const vDotN = this.player.dx * normX + this.player.dy * normY;
            const vDotF = this.player.dx * lineSlopeX + this.player.dy * lineSlopeY;
  
            // console.log( `    Before = ${ JSON.stringify( this.player ) }` );
  
            this.player.dx -= 2 * vDotN * normX * Constants.BounceDamping + vDotF * lineSlopeX * Constants.BounceFriction;
            this.player.dy -= 2 * vDotN * normY * Constants.BounceDamping + vDotF * lineSlopeY * Constants.BounceFriction;
            this.player.ax = 0;
            this.player.ay = Constants.Gravity;
  
            // console.log( `    After = ${ JSON.stringify( this.player ) }` );
  
            currentLine = null;
          }
          
        }
        else {
          this.player.ax = 0;
          this.player.ay = Constants.Gravity;
        }
  
        // See when we'd hit another line
        this.#lines.forEach( ( line, index ) => {
          if ( currentLine != line ) {
            const time = line.timeToHit_accel( this.player );;
  
            // console.log( `  Would hit line ${ JSON.stringify( line ) } at ${ time }` );
  
            // if ( EPSILON < time && time < nextTime ) {
            if ( 0 < time && time < nextTime ) {
              nextLine = line;
              nextTime = time;
            }
          }
        } );
  
        if ( 0 <= stopTime && stopTime < nextTime ) {
          // console.log( `  Will stop in ${ stopTime }` );
          nextLine = currentLine;
  
          this.player.x += this.player.dx * stopTime + 0.5 * this.player.ax * stopTime ** 2;
          this.player.y += this.player.dy * stopTime + 0.5 * this.player.ay * stopTime ** 2;
  
          this.player.dx = 0;
          this.player.dy = 0;
  
          if ( willFullStop ) {
            // ctx.fillStyle = 'red';
            // drawPlayer( ctx, this.player );
  
            // console.log( 'Full stop, breaking' );
            break;
          }
          else {
            // ctx.fillStyle = 'yellow';
  
            // console.log( 'Partial stop, going other direction' );
            // drawPlayer( ctx, this.player );
          }
        }
        else {
          // console.log( `  Will hit line ${ JSON.stringify( nextLine) } in ${ nextTime }` );
  
          this.player.x += this.player.dx * nextTime + 0.5 * this.player.ax * nextTime ** 2;
          this.player.y += this.player.dy * nextTime + 0.5 * this.player.ay * nextTime ** 2;
  
          this.player.dx += this.player.ax * nextTime;
          this.player.dy += this.player.ay * nextTime;
  
          // ctx.fillStyle = COLORS[ step % COLORS.length ];
          // drawPlayer( ctx, this.player );
        }
        
        currentLine = nextLine;
        dt -= nextTime;
  
        if ( dt <= 0 ) {
          break;
        }
      }
    }
  }

  draw( ctx ) {
    ctx.fillStyle = 'green';
    this.#level.loops.forEach( loop => {
      ctx.beginPath();
      loop.forEach( p => ctx.lineTo( p[ 0 ], p[ 1 ] ) );
      ctx.fill();
    } );

    ctx.strokeStyle = '#fff8';
    this.#lines.forEach( line => line.draw( ctx ) );

    if ( this.player ) {
      ctx.beginPath();
      ctx.arc( this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2 );
      ctx.closePath();
      ctx.fillStyle = 'white';
      ctx.fill();

      ctx.font = '0.4px Arial';
      JSON.stringify( this.player ).replace( /[\{\}]/gi,'').split( ',' ).forEach( ( str, index ) => {
        ctx.fillText( str, -7, -7 + 0.4 * index );
      } );
    }
  }
}

function fixAngle( a ) {
  return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a;
}

function deltaAngle( a, b ) {
  return fixAngle( b - a );
}