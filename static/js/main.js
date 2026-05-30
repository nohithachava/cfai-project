async function saveScore(game, mode, result, points){
  try{await fetch('/api/save_score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game,mode,result,points})})}catch(e){}
}
