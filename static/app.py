from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3, os, json, random
from datetime import datetime

app = Flask(__name__)
app.secret_key = "change-this-secret-key"
DB = "arena.db"

GAMES = {
    "tictactoe": {"name":"Tic Tac Toe", "desc":"Minimax AI strategy game", "icon":"✕○"},
    "connect4": {"name":"Connect Four", "desc":"Drop discs and connect four", "icon":"🔵"},
    "memory": {"name":"Memory Match", "desc":"Brain sharpening card game", "icon":"🧠"},
    "sudoku": {"name":"Sudoku Solver", "desc":"Backtracking CSP solver", "icon":"9×9"},
    "ludo": {"name":"Real Ludo", "desc":"Classic 4-color board with dice animation", "icon":"🎲"},
    "chess": {"name":"Chess AI", "desc":"Strategy board with smart AI moves", "icon":"♟️"},
}

def db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con

def init_db():
    con = db(); cur = con.cursor()
    cur.execute('''CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT NOT NULL)''')
    cur.execute('''CREATE TABLE IF NOT EXISTS scores(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        game TEXT NOT NULL,
        mode TEXT NOT NULL,
        result TEXT NOT NULL,
        points INTEGER NOT NULL,
        created_at TEXT NOT NULL)''')
    # demo account for easy testing
    demo = con.execute('SELECT * FROM users WHERE username=?', ('demo',)).fetchone()
    if not demo:
        con.execute('INSERT INTO users(username,password,created_at) VALUES(?,?,?)',
            ('demo', generate_password_hash('demo123'), datetime.now().strftime('%Y-%m-%d %H:%M')))
    con.commit(); con.close()

@app.before_request
def setup():
    if not os.path.exists(DB): init_db()

def login_required():
    return 'user' in session

@app.route('/')
def home():
    if login_required(): return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['GET','POST'])
def register():
    if request.method == 'POST':
        u = request.form['username'].strip()
        p = request.form['password']
        if len(u) < 3 or len(p) < 4:
            flash('Username must be 3+ chars and password 4+ chars.')
            return redirect(url_for('register'))
        try:
            con = db(); con.execute('INSERT INTO users(username,password,created_at) VALUES(?,?,?)',
                (u, generate_password_hash(p), datetime.now().strftime('%Y-%m-%d %H:%M')))
            con.commit(); con.close()
            session['user'] = u
            return redirect(url_for('dashboard'))
        except sqlite3.IntegrityError:
            flash('Username already exists.')
    return render_template('register.html')

@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        u = request.form['username'].strip(); p = request.form['password']
        con = db(); user = con.execute('SELECT * FROM users WHERE username=?', (u,)).fetchone(); con.close()
        if user and check_password_hash(user['password'], p):
            session['user'] = u
            return redirect(url_for('dashboard'))
        
        if not user:
            flash('User not found. Please register first or use demo / demo123.')
        else:
            flash('Incorrect password. Try again.')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear(); return redirect(url_for('home'))

@app.route('/dashboard')
def dashboard():
    if not login_required(): return redirect(url_for('login'))
    con = db()
    rows = con.execute('SELECT game, SUM(points) total FROM scores WHERE username=? GROUP BY game', (session['user'],)).fetchall()
    total = con.execute('SELECT COALESCE(SUM(points),0) t FROM scores WHERE username=?', (session['user'],)).fetchone()['t']
    con.close()
    return render_template('dashboard.html', games=GAMES, rows=rows, total=total)

@app.route('/game/<game>')
def game(game):
    if not login_required(): return redirect(url_for('login'))
    if game not in GAMES: return redirect(url_for('dashboard'))
    return render_template(f'{game}.html', game=GAMES[game], game_key=game)

@app.route('/leaderboard')
def leaderboard():
    if not login_required(): return redirect(url_for('login'))
    con = db()
    rows = con.execute('SELECT username, SUM(points) total, COUNT(*) games FROM scores GROUP BY username ORDER BY total DESC LIMIT 20').fetchall()
    con.close()
    return render_template('leaderboard.html', rows=rows)

@app.route('/history')
def history():
    if not login_required(): return redirect(url_for('login'))
    con = db()
    rows = con.execute('SELECT * FROM scores WHERE username=? ORDER BY id DESC LIMIT 50', (session['user'],)).fetchall()
    con.close()
    return render_template('history.html', rows=rows)

@app.post('/api/save_score')
def save_score():
    if not login_required(): return jsonify({'ok':False}), 401
    data = request.json or {}
    game = data.get('game','Game'); mode=data.get('mode','1 vs 1'); result=data.get('result','Played')
    points = int(data.get('points', 5))
    con = db(); con.execute('INSERT INTO scores(username,game,mode,result,points,created_at) VALUES(?,?,?,?,?,?)',
        (session['user'], game, mode, result, points, datetime.now().strftime('%Y-%m-%d %H:%M')))
    con.commit(); con.close()
    return jsonify({'ok':True})

# Tic Tac Toe Minimax AI
wins = [(0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6)]
def winner(b):
    for a,c,d in wins:
        if b[a] and b[a]==b[c]==b[d]: return b[a]
    if all(b): return 'draw'
    return None

def minimax(b, is_ai):
    w = winner(b)
    if w == 'O': return 1
    if w == 'X': return -1
    if w == 'draw': return 0
    scores=[]
    for i in range(9):
        if not b[i]:
            b[i] = 'O' if is_ai else 'X'
            scores.append(minimax(b, not is_ai))
            b[i] = ''
    return max(scores) if is_ai else min(scores)

@app.post('/api/tictactoe_ai')
def ttt_ai():
    b = request.json.get('board', ['']*9)
    best_score=-99; best=0
    for i in range(9):
        if not b[i]:
            b[i]='O'; score=minimax(b, False); b[i]=''
            if score > best_score: best_score=score; best=i
    return jsonify({'move':best})

@app.post('/api/sudoku_solve')
def sudoku_solve():
    grid = request.json.get('grid')
    def ok(r,c,n):
        for i in range(9):
            if grid[r][i]==n or grid[i][c]==n: return False
        br=(r//3)*3; bc=(c//3)*3
        for i in range(br, br+3):
            for j in range(bc, bc+3):
                if grid[i][j]==n: return False
        return True
    def solve():
        for r in range(9):
            for c in range(9):
                if grid[r][c]==0:
                    for n in range(1,10):
                        if ok(r,c,n):
                            grid[r][c]=n
                            if solve(): return True
                            grid[r][c]=0
                    return False
        return True
    solved = solve()
    return jsonify({'solved':solved, 'grid':grid})

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
