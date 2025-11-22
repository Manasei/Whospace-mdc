(function(){
  const MAX_BLOCKS = 5;
  const MIN_INTERVAL = 500;   // min 0.5s
  const MAX_INTERVAL = 2000;  // max 2s
  const LIFE_TIME = 8000;     // durée de vie avant disparition (ms)

  let destroyedCount = 0;
  let startTime = null;
  const destroyCounter = document.getElementById('destroyCounter');

  function updateDestroyCounter(){
    destroyedCount++;
    if(!startTime) startTime = Date.now(); // chrono au premier clic
    const elapsed = (Date.now() - startTime) / 1000; // secondes écoulées
    const speed = elapsed > 0 ? (destroyedCount / elapsed).toFixed(2) : 0;

    destroyCounter.textContent = 'Blocs détruits : ' + destroyedCount + ' | Rapidité : ' + speed + '/s';
    destroyCounter.style.display = 'inline'; // rendre visible dès le premier clic
  }

  function randomBetween(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function spawnBlock(){
    const existing = document.querySelectorAll('.minecraft-block').length;
    if(existing >= MAX_BLOCKS) return;

    const block = document.createElement('div');
    block.className = 'minecraft-block';

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = randomBetween(0, vw - 64);
    let y = randomBetween(0, vh - 64);

    block.style.left = x + 'px';
    block.style.top  = y + 'px';
    block.style.zIndex = 999999;

    // disparition auto
    setTimeout(()=> block.remove(), LIFE_TIME);

    // disparition au clic + son + compteur
    block.addEventListener('click', ()=> {
      const sound = document.getElementById('plopSound');
      if(sound) {
        sound.currentTime = 0;
        sound.play();
      }
      block.remove();
      updateDestroyCounter();
    });

    document.body.appendChild(block);
  }

  function loop(){
    spawnBlock();
    const next = randomBetween(MIN_INTERVAL, MAX_INTERVAL);
    setTimeout(loop, next);
  }

  document.addEventListener('DOMContentLoaded', loop);
})();

// Ajoute le comportement "plop" aux blocs déjà présents dans le HTML
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.minecraft-block').forEach(block => {
    block.addEventListener('click', () => {
      const sound = document.getElementById('plopSound');
      if (sound) {
        sound.currentTime = 0;
        sound.play();
      }
      block.remove();
      const destroyCounter = document.getElementById('destroyCounter');
      if(destroyCounter){
        destroyedCount++;
        if(!startTime) startTime = Date.now();
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? (destroyedCount / elapsed).toFixed(2) : 0;
        destroyCounter.textContent = 'Blocs détruits : ' + destroyedCount + ' | Rapidité : ' + speed + '/s';
        destroyCounter.style.display = 'inline';
      }
    });
  });
});
