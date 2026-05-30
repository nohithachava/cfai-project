let b=['','','','','','','','',''], turn='X', over=false;
const board=document.getElementById('board'), statusBox=document.getElementById('status');
function draw(){board.innerHTML=''; b.forEach((v,i)=>{let d=document.createElement('div');d.className='cell';d.textContent=v;d.onclick=()=>move(i);board.appendChild(d)})}
function win(){let W=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];for(let x of W){if(b[x[0]]&&b[x[0]]==b[x[1]]&&b[x[1]]==b[x[2]])return b[x[0]]}return b.every(x=>x)?'Draw':null}
async function move(i){if(b[i]||over)return;b[i]=turn;draw();let w=win();if(w)return end(w);let mode=document.getElementById('mode').value;if(mode==='Player vs AI'){statusBox.textContent='AI thinking...';let r=await fetch('/api/tictactoe_ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({board:b})});let data=await r.json();if(!b[data.move])b[data.move]='O';draw();w=win();if(w)return end(w);statusBox.textContent='Your turn'}else{turn=turn==='X'?'O':'X';statusBox.textContent=turn+' turn'}}
function end(w){over=true;let mode=document.getElementById('mode').value;statusBox.textContent=w==='Draw'?'Game Draw':w+' Wins!';saveScore('Tic Tac Toe',mode,statusBox.textContent,w==='X'?20:w==='Draw'?10:5)}
function resetTTT(){b=['','','','','','','','',''];turn='X';over=false;statusBox.textContent='Your turn';draw()} draw();
