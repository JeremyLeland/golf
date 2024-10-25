import { Line } from './Line.js';
import { Constants } from './Golf.js';

const EPSILON = 1e-6;
const LOGGING = false;

let pullGrad;

export class World {
  player;

  strokes = 0;
  readyForInput = true;
  victory = false;

  #level;

  #lines;

  #hitDrag;

  #debug = {}

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
      radius: 0.1
    };
  }

  startHitDrag( x, y ) {
    if ( this.readyForInput && !this.#hitDrag ) {
      this.#hitDrag = [ x, y, x, y ];
    }
  }

  moveHitDrag( x, y ) {
    if ( this.readyForInput && this.#hitDrag ) {
      this.#hitDrag[ 2 ] = x;
      this.#hitDrag[ 3 ] = y;
    }
  }

  stopHitDrag() {
    if ( this.readyForInput && this.#hitDrag ) {
      const SENSITIVITY = 0.01;
      
      const cx = this.#hitDrag[ 0 ] - this.#hitDrag[ 2 ];
      const cy = this.#hitDrag[ 1 ] - this.#hitDrag[ 3 ];
      const angle = Math.atan2( cy, cx );
      const dist = Math.min( Constants.Player.MaxHit, Math.hypot( cx, cy ) );
      
      this.player.dx = SENSITIVITY * dist * Math.cos( angle );
      this.player.dy = SENSITIVITY * dist * Math.sin( angle );
      this.readyForInput = false;
      this.strokes ++;
      
      this.#hitDrag = null;
    }
  }

  update( dt ) {
    log( '\n=== Update( ' + dt + ' ) === ');

    // 0. See if we are already colliding with something
    //    - If so, back out of it, and this is our current line
    // -- LOOP (up to N times) --
    // 1. If we are colliding, are we rolling or bouncing?
    //    - Set dx/dy and ax/ay appropriately
    // 2. Find when we'd stop from friction, find next collision
    // 3. Update ball until stopping point or next collision (or until time runs out)
    // 4. Back to step 1
    
    if ( this.player ) {

      log( `playerAngle at beginning of update = ${ Math.atan2( this.player.dy, this.player.dx ) }` );

      let currentLine = null, currentDist = 0.01;  // currentDist start value is "snap" distance
      this.#lines.forEach( line => {
        const dist = line.distanceFrom( this.player );

        if ( -this.player.radius < dist && dist < currentDist ) {
          log( `  Distance from line ${ JSON.stringify( line ) } is ${ dist }` );
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

        log( 'proj = ' + proj );

        if ( proj <= EPSILON ) { 
          this.player.x -= normX * currentDist;
          this.player.y -= normY * currentDist;
        }
        else {
          currentLine = null;
        }
      }

      let stopped = false;

      for ( let step = 0; step < 5; step ++ ) {
        log( 'Step ' + step + ', dt = ' + dt );

        let nextLineTime = Infinity, nextLine = null;
        let stopTime = Infinity, willFullStop = false;

        if ( currentLine ) {
          const slopeAngle = currentLine.slopeAngle;
          const lineSlopeX = Math.cos( slopeAngle );
          const lineSlopeY = Math.sin( slopeAngle );

          const playerAngle = Math.atan2( this.player.dy, this.player.dx );
          const playerSpeed = Math.hypot( this.player.dx, this.player.dy );
          
          log( `  Current line is ${ JSON.stringify( currentLine ) } ` );
          log( `  Slope angle is  ${ slopeAngle }` );
          log( `  Player angle is ${ playerAngle }` );
          log( `  Player speed is ${ playerSpeed }, MinBounceSpeed = ${ Constants.MinBounceSpeed }` );

          this.#debug.playerSpeed = playerSpeed;
  
          // TODO: Maybe player speed isn't the issue here
          // Maybe we're no longer detecting as rolling, and so we fall, which changes angle and throws off stopping time?

          // Roll
          if ( playerSpeed < Constants.MinBounceSpeed ||
               Math.abs( deltaAngle( slopeAngle, playerAngle ) )           < Constants.RollAngle ||
               Math.abs( deltaAngle( playerAngle, slopeAngle + Math.PI ) ) < Constants.RollAngle ) {  
            log( '  Rolling' );
  
            const dir = this.player.dx < 0 ? -1 : 1;
            
            const gravTerm = lineSlopeY;
            const fricTerm = dir * Constants.RollFriction * lineSlopeX;
            const a = Constants.Gravity * ( gravTerm - fricTerm );

            this.#debug.a = a;
  
            this.player.ax = a * lineSlopeX;
            this.player.ay = a * lineSlopeY;
  
            // Do we need to match slope with current line? 
            // Might be messing up our slow-downs (I don't see where else dx/dy are altered)
            // // Is this sometimes preventing us from stopping when going left?
            // if ( playerSpeed > Constants.MinBounceSpeed ) {   // TODO: Some other threshold?
              this.player.dx = dir * playerSpeed * lineSlopeX;
              this.player.dy = dir * playerSpeed * lineSlopeY;
            // }

            log( `playerSpeed expected: ${ playerSpeed }, actual ${ Math.hypot( this.player.dx, this.player.dy ) }` );
            log( `playerAngle after correction = ${ Math.atan2( this.player.dy, this.player.dx ) }` );

            //
            // NOTES
            //
            // While we're rolling in the editor demo, the stopTime is not decreasing by the amount expected
            // If stopTime is 25 and we update 15, then stopTime should be 10. But it'll still be like 21.
            // 
            // Does this mean playerSpeed is not decreasing as much as it should when we update? (dir and a shouldn't change)
  
            // See when we'd stop rolling from friction
            stopTime = dir * playerSpeed / -a;

            log( `dir = ${ dir }, playerSpeed = ${ playerSpeed }, a = ${ a }` );

            willFullStop = Math.abs( lineSlopeY ) < Math.abs( Constants.RollFriction * lineSlopeX );

            if ( stopTime < 0 ) {
              stopTime = Infinity;
              debugger;
            }
            
            // if ( stopTime == 0 && willFullStop ) {
            //   log( 'Already fully stopped, breaking' );
            //   stopped = true;
            //   break;
            // }
          }
  
          // Bounce
          else {
            log( '  Bouncing' );
  
            const normalAngle = currentLine.normalAngle;
            const normX = Math.cos( normalAngle );
            const normY = Math.sin( normalAngle );
  
            const vDotN = this.player.dx * normX + this.player.dy * normY;
            const vDotF = this.player.dx * lineSlopeX + this.player.dy * lineSlopeY;
  
            // log( `    Before = ${ JSON.stringify( this.player ) }` );
  
            this.player.dx -= 2 * vDotN * normX * Constants.BounceDamping + vDotF * lineSlopeX * Constants.BounceFriction;
            this.player.dy -= 2 * vDotN * normY * Constants.BounceDamping + vDotF * lineSlopeY * Constants.BounceFriction;
            this.player.ax = 0;
            this.player.ay = Constants.Gravity;
  
            // log( `    After = ${ JSON.stringify( this.player ) }` );
  
            currentLine = null;
          }
          
        }
        else {
          log( '  No current line, falling with gravity' );
          this.player.ax = 0;
          this.player.ay = Constants.Gravity;
        }
  
        // See when we'd hit another line
        this.#lines.forEach( line => {
          if ( currentLine != line ) {
            const time = line.timeToHit_accel( this.player );
  
            // log( `  Would hit line ${ JSON.stringify( line ) } at ${ time }` );
  
            // if ( EPSILON < time && time < nextTime ) {
            if ( 0 < time && time < nextLineTime ) {
              nextLine = line;
              nextLineTime = time;
            }
          }
        } );

        log( `  Would roll to stop at ${ stopTime }, full stop = ${ willFullStop }` );
        log( `  Would hit line ${ JSON.stringify( nextLine ) } at ${ nextLineTime }` );

        this.#debug.stopTime = stopTime;
        this.#debug.willFullStop = willFullStop;
        this.#debug.nextLine = JSON.stringify( nextLine );
        this.#debug.nextLineTime = nextLineTime;

        const nextTime = Math.min( stopTime, nextLineTime, dt );

        log( `    Before = ${ JSON.stringify( this.player ) }` );

        this.player.x += this.player.dx * nextTime + 0.5 * this.player.ax * nextTime ** 2;
        this.player.y += this.player.dy * nextTime + 0.5 * this.player.ay * nextTime ** 2;

        this.player.dx += this.player.ax * nextTime;
        this.player.dy += this.player.ay * nextTime;

        log( `playerAngle after move = ${ Math.atan2( this.player.dy, this.player.dx ) }` );

        dt -= nextTime;

        log( `    After = ${ JSON.stringify( this.player ) }` );

        if ( nextTime == stopTime ) {
          log( `  Stopped at ${ nextTime }` );

          if ( willFullStop ) {
            log( `  Full stop, ending update loop` );
            stopped = true;
            break;
          }
          else {
            log( ` Partial stop, will now go other direction` );
          }
        }
        else if ( nextTime == nextLineTime ) {
          log( `  Hit line at ${ nextTime }` );
          currentLine = nextLine;
        }
        else {
          log( `  Finished update to ${ nextTime }, ending update loop` );
          break;
        }
      }

      if ( stopped ) {
        if ( !this.readyForInput ) {
          if ( this.#level.goal &&
               this.#level.goal[ 0 ] < this.player.x && this.player.x < this.#level.goal[ 2 ] &&
               this.#level.goal[ 1 ] < this.player.y && this.player.y < this.#level.goal[ 3 ] ) {
            this.victory = true;
          }
          else {
            this.readyForInput = true;
          }
        }
      }

      // Respawn if out of bounds (TODO: define bounds in level?)
      if ( this.player.y > 40 ) {
        this.respawn();
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

    // ctx.strokeStyle = '#fff8';
    // this.#lines.forEach( line => line.draw( ctx ) );

    if ( this.player ) {
      ctx.beginPath();
      ctx.arc( this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2 );
      ctx.closePath();
      ctx.fillStyle = 'white';
      ctx.fill();

      debug( ctx, this.player, -7, -7 );
      debug( ctx, this.#debug, 2, -7 );
    }

    if ( this.#hitDrag ) {
      const cx = this.#hitDrag[ 0 ] - this.#hitDrag[ 2 ];
      const cy = this.#hitDrag[ 1 ] - this.#hitDrag[ 3 ];
      const angle = Math.atan2( cy, cx );
      const dist = Math.min( Constants.Player.MaxHit, Math.hypot( cx, cy ) );

      const offX =  Math.sin( angle ) * this.player.radius;
      const offY = -Math.cos( angle ) * this.player.radius;

      ctx.translate( this.player.x, this.player.y );
      ctx.beginPath();
      ctx.lineTo( offX, offY );
      ctx.lineTo( -offX, -offY );
      ctx.lineTo( -Math.cos( angle ) * dist, -Math.sin( angle ) * dist );

      if ( pullGrad == null ) {
        pullGrad = ctx.createRadialGradient( 0, 0, 0, 0, 0, 2 );
        pullGrad.addColorStop( 0, 'green' );
        pullGrad.addColorStop( 0.5, 'yellow' );
        pullGrad.addColorStop( 1, 'red' );
      }

      ctx.fillStyle = pullGrad;
      ctx.fill();
      ctx.translate( -this.player.x, -this.player.y );
    }
  }
}

function fixAngle( a ) {
  return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a;
}

function deltaAngle( a, b ) {
  return fixAngle( b - a );
}

function log( str ) {
  if ( LOGGING ) {
    console.log( str );
  }
}

function debug( ctx, object, x, y ) {
  ctx.font = '0.4px Arial';
  JSON.stringify( object ).replace( /[\{\}]/gi,'').split( ',' ).forEach( ( str, index ) => {
    ctx.fillText( str, x, y + 0.4 * index );
  } );
}