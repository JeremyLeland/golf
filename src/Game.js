export class Game {
  mouseX = 0;
  mouseY = 0;
  mouseDown = false;
  mouseMovementX = 0;
  mouseMovementY = 0;

  keysPressed = new Set();

  scrollX = 0;
  scrollY = 0;

  #lastX;
  #lastY;

  constructor() {
    const canvas = document.createElement( 'canvas' );
    window.onresize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.onresize();
    
    document.body.appendChild( canvas );
    const ctx = canvas.getContext( '2d' );

    window.onkeydown = ( e ) => this.keysPressed.add( e.key );
    window.onkeyup   = ( e ) => this.keysPressed.delete( e.key );

    const inputStart = ( e ) => {
      this.mouseDown = true;
    }
    const inputMove = ( e ) => {
      const event = e.touches ? e.touches[ 0 ] : e;

      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
      this.mouseMovementX = this.#lastX ? this.mouseX - this.#lastX : 0;
      this.mouseMovementY = this.#lastY ? this.mouseY - this.#lastY : 0;
      this.#lastX = this.mouseX;
      this.#lastY = this.mouseY;
    }
    const inputStop = ( e ) => {
      this.mouseDown = false;
      this.#lastX = undefined;
      this.#lastY = undefined;
    }
    document.addEventListener( 'mousedown',  inputStart );
    document.addEventListener( 'touchstart', inputStart );
    document.addEventListener( 'mousemove', inputMove );
    document.addEventListener( 'touchmove', inputMove );
    document.addEventListener( 'mouseup',  inputStop );
    document.addEventListener( 'touchend', inputStop );
    

    let lastTime = null;
    const animate = ( now ) => {
      lastTime ??= now;  // for first call only
      this.update( now - lastTime );
      lastTime = now;
  
      ctx.clearRect( 0, 0, ctx.canvas.width, ctx.canvas.height );

      ctx.save();
      ctx.translate( this.scrollX, this.scrollY );
      this.draw( ctx );
      ctx.restore();
  
      requestAnimationFrame( animate );
    };

    requestAnimationFrame( animate );
  }

  update( dt ) {}
  draw( ctx ) {}

}
