export const ResizeType = {
  NW: 0, N: 1, NE: 2,
   W: 7,       E:  3,
  SW: 6, S: 5, SE: 4,
};

// export const EditType = {
//   AddPoint: 'AddPoint',
//   MovePoint: 'MovePoint',
//   DeletePoint: 'DeletePoint',
//   AddLoop: 'AddLoop',
//   MoveLoop: 'MoveLoop',
//   ResizeLoop: 'ResizeLoop',
//   RotateLoop: 'RotateLoop',
//   DeleteLoop: 'DeleteLoop',
// };

export const Edit = {
  AddPoint: {
    name: 'AddPoint',
    apply: ( level, cmd ) => addPoint   ( level, cmd.loopIndex, cmd.pointIndex, cmd.point ),
    undo:  ( level, cmd ) => deletePoint( level, cmd.loopIndex, cmd.pointIndex            ),
  },
  MovePoint: {
    name: 'MovePoint',
    apply: ( level, cmd ) => movePoint( level, cmd.loopIndex, cmd.pointIndex,  cmd.dx,  cmd.dy ),
    undo:  ( level, cmd ) => movePoint( level, cmd.loopIndex, cmd.pointIndex, -cmd.dx, -cmd.dy ),
  },
  DeletePoint: {
    name: 'DeletePoint',
    apply: ( level, cmd ) => deletePoint( level, cmd.loopIndex, cmd.pointIndex            ),
    undo:  ( level, cmd ) => addPoint   ( level, cmd.loopIndex, cmd.pointIndex, cmd.point ),
  },
  AddLoop: {
    name: 'AddLoop',
    apply: ( level, cmd ) => addLoop   ( level, cmd.loopIndex, cmd.points ),
    undo:  ( level, cmd ) => deleteLoop( level, cmd.loopIndex             ),
  },
  MoveLoop: {
    name: 'MoveLoop',
    apply: ( level, cmd ) => moveLoop( level, cmd.loopIndex,  cmd.dx,  cmd.dy ),
    undo:  ( level, cmd ) => moveLoop( level, cmd.loopIndex, -cmd.dx, -cmd.dy ),
  },
  ResizeLoop: {
    name: 'ResizeLoop',
    apply: ( level, cmd ) => resizeLoop( level, cmd.loopIndex, cmd.resizeType,  cmd.dx,  cmd.dy ),
    undo:  ( level, cmd ) => resizeLoop( level, cmd.loopIndex, cmd.resizeType, -cmd.dx, -cmd.dy ),
  },
  RotateLoop: {
    name: 'RotateLoop',
    apply: ( level, cmd ) => rotateLoop( level, cmd.loopIndex, cmd.x, cmd.y,  cmd.angle ),
    undo:  ( level, cmd ) => rotateLoop( level, cmd.loopIndex, cmd.x, cmd.y, -cmd.angle ),
  },
  DeleteLoop: {
    name: 'DeleteLoop',
    apply: ( level, cmd ) => deleteLoop( level, cmd.loopIndex             ),
    undo:  ( level, cmd ) => addLoop   ( level, cmd.loopIndex, cmd.points ),
  },

  MoveSpawn: {
    name: 'MoveSpawn',
    apply: ( level, cmd ) => moveSpawn( level,  cmd.dx,  cmd.dy ),
    undo:  ( level, cmd ) => moveSpawn( level, -cmd.dx, -cmd.dy ),
  }
};

export function newLevel() {
  return {
    loops: [],
    spawn: [ 0, 0 ],
    // goal - default?
  };
}


export function applyCommand( level, cmd ) {
  Edit[ cmd.type ].apply( level, cmd );
}

export function undoCommand( level, cmd ) {
  Edit[ cmd.type ].undo( level, cmd );
}

function addPoint( level, loopIndex, pointIndex, point ) {
  level.loops[ loopIndex ].splice( pointIndex, 0, point );
}

function movePoint( level, loopIndex, pointIndex, dx, dy ) {
  const p = level.loops[ loopIndex ][ pointIndex ];
  p[ 0 ] += dx;
  p[ 1 ] += dy;
}

function deletePoint( level, loopIndex, pointIndex ) {
  level.loops[ loopIndex ].splice( pointIndex, 1 );
}


function addLoop( level, loopIndex, points ) {
  level.loops.splice( loopIndex, 0, points );
}

function moveLoop( level, loopIndex, dx, dy ) {
  level.loops[ loopIndex ].forEach( p => {
    p[ 0 ] += dx;
    p[ 1 ] += dy;
  } );
}

function resizeLoop( level, loopIndex, resizeType, dx, dy ) {
  const oldBounds = getBounds( level.loops[ loopIndex ] );
  const newBounds = Object.assign( {}, oldBounds );

  if ( resizeType == ResizeType.NW ) {
    newBounds.left += dx;
    newBounds.top  += dy;
  }
  else if ( resizeType == ResizeType.NE ) {
    newBounds.right += dx;
    newBounds.top   += dy;
  }
  else if ( resizeType == ResizeType.SE ) {
    newBounds.right  += dx;
    newBounds.bottom += dy;
  }
  else if ( resizeType == ResizeType.SW ) {
    newBounds.left   += dx;
    newBounds.bottom += dy;
  }

  level.loops[ loopIndex ].forEach( p => {
    const u = ( p[ 0 ] - oldBounds.left ) / ( oldBounds.right - oldBounds.left );
    const v = ( p[ 1 ] - oldBounds.top )  / ( oldBounds.bottom - oldBounds.top );
    
    p[ 0 ] = newBounds.left + u * ( newBounds.right - newBounds.left );
    p[ 1 ] = newBounds.top  + v * ( newBounds.bottom - newBounds.top );
  } );
}

function rotateLoop( level, loopIndex, x, y, angle ) {
  level.loops[ loopIndex ].forEach( p => {
    const cx = p[ 0 ] - x;
    const cy = p[ 1 ] - y;
    const oldAng = Math.atan2( cy, cx );
    const dist = Math.hypot( cx, cy );

    const newAng = oldAng + angle;

    p[ 0 ] = x + dist * Math.cos( newAng );
    p[ 1 ] = y + dist * Math.sin( newAng );
  } );
}

function deleteLoop( level, loopIndex ) {
  level.loops.splice( loopIndex, 1 );
}

function moveSpawn( level, dx, dy ) {
  level.spawn[ 0 ] += dx;
  level.spawn[ 1 ] += dy;
}

function getBounds( loop ) {
  const bounds = {};

  loop.forEach( p => {
    bounds.left   = Math.min( p[ 0 ], bounds.left   ?? p[ 0 ] );
    bounds.right  = Math.max( p[ 0 ], bounds.right  ?? p[ 0 ] );
    bounds.top    = Math.min( p[ 1 ], bounds.top    ?? p[ 1 ] );
    bounds.bottom = Math.max( p[ 1 ], bounds.bottom ?? p[ 1 ] );
  } );

  return bounds;
}