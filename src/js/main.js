import { SceneManager } from './core/SceneManager.js';

let sceneManager = null;

function startGame() {
    const oldCanvas = document.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();

    sceneManager = new SceneManager();
    document.getElementById('score-display').textContent = 'Score: 0';
    document.getElementById('restart-score').textContent = 'Score: 0';
    document.getElementById('score-display').style.display = 'block'; 
    document.getElementById('start-overlay').style.display = 'none';
    document.getElementById('gameover-overlay').style.display = 'none';

    window.onGameOver = () => {
        document.getElementById('gameover-overlay').style.display = 'flex';
        if (sceneManager && sceneManager.game) {
            document.getElementById('restart-score').textContent = `Score: ${sceneManager.game.score}`;
        }
    };
}

document.getElementById('start-btn').onclick = startGame;
document.getElementById('restart-btn').onclick = startGame;
window.addEventListener('keydown', (e) => {
    if (document.getElementById('start-overlay').style.display !== 'none' && e.key === 'Enter') {
        startGame();
    }
});