const pieces = {
  r:'♜', n:'♞', b:'♝', q:'♛', k:'♚', p:'♟',
  R:'♖', N:'♘', B:'♗', Q:'♕', K:'♔', P:'♙'
};
const start = ['rnbqkbnr','pppppppp','........','........','........','........','PPPPPPPP','RNBQKBNR'];
let board, selected = null, whiteTurn = true, legalNow = [], gameOver = false;

function resetChess(){
  board = start.map(row => row.split(''));
  selected = null; legalNow = []; whiteTurn = true; gameOver = false;
  renderChess('White turn');
}
function isWhite(p){ return p >= 'A' && p <= 'Z'; }
function inside(r,c){ return r>=0 && r<8 && c>=0 && c<8; }
function sameColor(a,b){ return a!=='.' && b!=='.' && isWhite(a) === isWhite(b); }
function setHint(t){ document.getElementById('chessHint').textContent = t; }

function renderChess(msg){
  const el = document.getElementById('chessBoard');
  el.innerHTML = '';
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const sq = document.createElement('div');
      sq.className = 'sq ' + (((r+c)%2) ? 'dark' : 'light');
      sq.dataset.pos = `${r},${c}`;
      if(selected && selected[0]===r && selected[1]===c) sq.classList.add('selected');
      if(legalNow.some(m => m[0]===r && m[1]===c)) sq.classList.add(board[r][c]==='.' ? 'legal' : 'capture');
      sq.innerHTML = `<span class="piece">${pieces[board[r][c]] || ''}</span><small>${8-r}${'abcdefgh'[c]}</small>`;
      sq.onclick = () => clickSquare(r,c);
      el.appendChild(sq);
    }
  }
  document.getElementById('chessStatus').textContent = msg || (whiteTurn ? 'White turn' : 'Black turn');
}

function moves(r,c){
  const p = board[r][c];
  if(p === '.') return [];
  const w = isWhite(p), low = p.toLowerCase(), out = [];
  const add = (rr,cc) => {
    if(!inside(rr,cc)) return;
    if(board[rr][cc] === '.' || !sameColor(p, board[rr][cc])) out.push([rr,cc]);
  };
  const ray = (dr,dc) => {
    let rr = r+dr, cc = c+dc;
    while(inside(rr,cc)){
      if(board[rr][cc] === '.') out.push([rr,cc]);
      else { if(!sameColor(p, board[rr][cc])) out.push([rr,cc]); break; }
      rr += dr; cc += dc;
    }
  };
  if(low === 'p'){
    const d = w ? -1 : 1;
    const startRow = w ? 6 : 1;
    if(inside(r+d,c) && board[r+d][c] === '.'){
      out.push([r+d,c]);
      if(r === startRow && board[r+2*d][c] === '.') out.push([r+2*d,c]);
    }
    for(const dc of [-1,1]){
      const rr = r+d, cc = c+dc;
      if(inside(rr,cc) && board[rr][cc] !== '.' && !sameColor(p, board[rr][cc])) out.push([rr,cc]);
    }
  }
  if(low === 'n') [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]].forEach(([dr,dc])=>add(r+dr,c+dc));
  if(low === 'b' || low === 'q') [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>ray(dr,dc));
  if(low === 'r' || low === 'q') [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>ray(dr,dc));
  if(low === 'k') for(let dr=-1; dr<=1; dr++) for(let dc=-1; dc<=1; dc++) if(dr||dc) add(r+dr,c+dc);
  return out;
}

function clickSquare(r,c){
  if(gameOver) return;
  const p = board[r][c];
  if(selected){
    const ok = legalNow.some(m => m[0]===r && m[1]===c);
    if(ok){
      const captured = board[r][c];
      makeMove(selected[0], selected[1], r, c);
      selected = null; legalNow = [];
      if(captured.toLowerCase && captured.toLowerCase() === 'k'){
        gameOver = true;
        const winner = whiteTurn ? 'White won by capturing the king' : 'Black won by capturing the king';
        renderChess(winner); setHint('Game over. Click Restart to play again.');
        saveScore('Chess', winner, 10);
        return;
      }
      whiteTurn = !whiteTurn;
      renderChess(whiteTurn ? 'White turn' : 'Black turn');
      setHint(`${whiteTurn ? 'White' : 'Black'} player, choose your piece.`);
      if(document.getElementById('mode').value === 'Player vs AI' && !whiteTurn) setTimeout(aiMove, 650);
      return;
    }
    selected = null; legalNow = [];
    renderChess(whiteTurn ? 'White turn' : 'Black turn');
    setHint('Move cancelled. Select your own piece again.');
    return;
  }
  if(p !== '.' && isWhite(p) === whiteTurn){
    selected = [r,c];
    legalNow = moves(r,c);
    renderChess(`${whiteTurn ? 'White' : 'Black'} selected ${pieces[p]}`);
    setHint(legalNow.length ? 'Glowing squares are legal moves.' : 'This piece has no legal moves.');
  } else if(p !== '.') {
    setHint(`It is ${whiteTurn ? 'White' : 'Black'} turn.`);
  }
}
function makeMove(r,c,rr,cc){
  board[rr][cc] = board[r][c]; board[r][c] = '.';
  if(board[rr][cc] === 'P' && rr === 0) board[rr][cc] = 'Q';
  if(board[rr][cc] === 'p' && rr === 7) board[rr][cc] = 'q';
}
function aiMove(){
  if(gameOver) return;
  let all = [];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    if(board[r][c] !== '.' && !isWhite(board[r][c])){
      moves(r,c).forEach(m => all.push([r,c,m[0],m[1],value(board[m[0]][m[1]])]));
    }
  }
  if(!all.length){ renderChess('Black has no moves'); return; }
  all.sort((a,b)=>b[4]-a[4]);
  const best = all[0];
  const captured = board[best[2]][best[3]];
  makeMove(best[0],best[1],best[2],best[3]);
  if(captured === 'K'){
    gameOver = true; renderChess('Black AI won by capturing the king'); setHint('Game over.'); saveScore('Chess','AI won',10); return;
  }
  whiteTurn = true;
  renderChess('White turn'); setHint('AI moved. Your turn.');
}
function value(p){ return {P:1,N:3,B:3,R:5,Q:9,K:99,'.':0}[p] || 0; }
resetChess();
