export class Canvas {
  zoom = 1;
  scrollX = 0;
  scrollY = 0;

  backgroundColor = 'black';

  #scale = 1;
  #offsetX = 0;
  #offsetY = 0;

  #reqId;

  constructor( canvas ) {
    this.canvas = canvas;
    
    if ( !this.canvas ) {
      this.canvas = document.createElement( 'canvas' );
      document.body.appendChild( this.canvas );
    }
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    
    this.canvas.oncontextmenu = () => { return false };
    
    this.ctx = this.canvas.getContext( '2d' /*, { alpha: false }*/ );

    const resizeObserver = new ResizeObserver( entries => {
      entries.forEach( entry => {
        // safari does not support devicePixelContentBoxSize, attempting to work around
        const width = entry.devicePixelContentBoxSize?.[ 0 ].inlineSize ?? ( entry.contentBoxSize[ 0 ].inlineSize * devicePixelRatio );
        const height = entry.devicePixelContentBoxSize?.[ 0 ].blockSize ?? ( entry.contentBoxSize[ 0 ].blockSize * devicePixelRatio );
        this.canvas.width = width;
        this.canvas.height = height;

        // this still needs to be based on content box
        const inlineSize = entry.contentBoxSize[ 0 ].inlineSize;
        const blockSize = entry.contentBoxSize[ 0 ].blockSize;

        this.#scale = Math.min( inlineSize, blockSize );

        // this might get messed up if writing mode is vertical
        // Why did we have devicePixelRatio in here before? Is it needed by Safari?
        this.#offsetX = ( inlineSize - this.#scale );// / devicePixelRatio;
        this.#offsetY = ( blockSize - this.#scale );// / devicePixelRatio;

        // console.log( 'offsetX = ' + this.#offsetX + ', offsetY = ' + this.#offsetY );
      } );
      
      this.redraw();
    } );

    resizeObserver.observe( this.canvas );
  }

  redraw() {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect( 0, 0, this.ctx.canvas.width, this.ctx.canvas.height );

    this.ctx.save(); {
      this.ctx.translate( this.#offsetX, this.#offsetY );

      this.ctx.scale( devicePixelRatio, devicePixelRatio );
      this.ctx.scale( this.#scale, this.#scale );

      this.ctx.scale( this.zoom, this.zoom );
      this.ctx.translate( this.scrollX, this.scrollY );
      this.ctx.lineWidth = this.zoom;

      try {
        this.draw( this.ctx );
      }
      catch ( e ) {
        console.error( e );
      }
    }
    this.ctx.restore();
  }

  start() {
    if ( !this.#reqId ) {     // don't try to start again if already started
      let lastTime;
      const animate = ( now ) => {
        lastTime ??= now;  // for first call only
        this.update( now - lastTime );
        lastTime = now;

        this.redraw();

        if ( this.#reqId ) {    // make sure we didn't stop it
          this.#reqId = requestAnimationFrame( animate );
        }
      };

      this.#reqId = requestAnimationFrame( animate );
    }
  }

  stop() {
    cancelAnimationFrame( this.#reqId );
    this.#reqId = null;   // so we can check if stopped
  }

  update( dt ) {}
  draw( ctx ) {}

  // TODO: Account for offset when centered canvas

  getPointerX( e ) {
    return ( ( e.clientX - this.#offsetX / devicePixelRatio ) / this.#scale ) / this.zoom - this.scrollX;
  }

  getPointerY( e ) {
    return ( ( e.clientY - this.#offsetY / devicePixelRatio ) / this.#scale ) / this.zoom - this.scrollY;
  }
}
