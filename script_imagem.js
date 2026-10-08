const galeriaImagens = [
    { id: 1, titulo: 'Hello Kitty', thumb: 'assets/thumbs/hello_kitty.webp', full: 'assets/thumbs/hello_kitty.webp' },
    { id: 2, titulo: 'Brasil', thumb: 'assets/thumbs/Brasil.webp', full: 'assets/thumbs/Brasil.webp' },
    { id: 3, titulo: 'ABC', thumb: 'assets/thumbs/ABC.webp', full: 'assets/thumbs/ABC.webp' },
    { id: 4, titulo: 'Patrulha Canina', thumb: 'assets/thumbs/patrulhaCanina.webp', full: 'assets/thumbs/patrulhaCanina.webp' },
    { id: 5, titulo: 'Numberblocks', thumb: 'assets/thumbs/Numberblocks.webp', full: 'assets/thumbs/Numberblocks.webp' },

    // ... até completar as 30 imagens
];

let currentImageUrl = '';
let draggedPiece = null;
let touchOffset = { x: 0, y: 0 };
let gridSize = 3; // Padrão: Médio (3x3)
let positions = [];

// --- EFEITOS SONOROS ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playCorrectSound() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

function playWinSound() {
    initAudio();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = freq;

        const startTime = audioCtx.currentTime + (index * 0.12);
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
    });
}

// --- CONTROLE DE DIFICULDADE ---
function setGridSize(size) {
    gridSize = size;
    updateDifficultyButtons();
}

function changeGridAndReset(size) {
    setGridSize(size);
    initPuzzle();
}

function updateDifficultyButtons() {
    document.querySelectorAll('.diff-btn, .game-diff-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-500', 'text-white', 'shadow-md');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });

    const activeBtns = [
        document.getElementById(`btn-diff-${gridSize}`),
        document.getElementById(`btn-game-diff-${gridSize}`)
    ];

    activeBtns.forEach(btn => {
        if (btn) {
            btn.classList.remove('bg-gray-200', 'text-gray-700');
            btn.classList.add('bg-indigo-500', 'text-white', 'shadow-md');
        }
    });
}

function generatePositions() {
    positions = [];
    const step = 100 / (gridSize - 1);
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            positions.push({
                x: gridSize === 1 ? 0 : col * step,
                y: gridSize === 1 ? 0 : row * step
            });
        }
    }
}

// Função responsável por calcular a dimensão ideal das peças soltas para cada nível
function getPieceSizeClass() {
    if (gridSize === 2) return 'w-24 h-24 sm:w-28 sm:h-28';
    if (gridSize === 3) return 'w-16 h-16 sm:w-20 sm:h-20'; // Reduzido para caber 3x3 perfeitamente sem scroll
    if (gridSize === 4) return 'w-12 h-12 sm:w-14 sm:h-14'; // Reduzido para caber as 16 peças
    if (gridSize === 5) return 'w-10 h-10 sm:w-11 sm:h-11';
    return 'w-16 h-16 sm:w-20 sm:h-20';
}

// --- LÓGICA DO JOGO ---
document.addEventListener('DOMContentLoaded', () => {
    renderGallery();
    updateDifficultyButtons();
});

function renderGallery() {
    const galleryGrid = document.getElementById('gallery-grid');
    galleryGrid.innerHTML = '';

    galeriaImagens.forEach(item => {
        const card = document.createElement('div');
        card.className = 'cursor-pointer rounded-xl overflow-hidden border-2 border-amber-200 shadow-sm hover:scale-105 active:scale-95 transition bg-white flex flex-col items-center';
        card.innerHTML = `
            <img src="${item.thumb}" alt="${item.titulo}" class="w-full h-16 sm:h-20 object-cover" loading="lazy">
            <span class="text-[10px] font-bold text-amber-900 py-1">${item.titulo}</span>
        `;
        card.onclick = () => startPuzzle(item.full);
        galleryGrid.appendChild(card);
    });
}

function startPuzzle(imageUrl) {
    currentImageUrl = imageUrl;
    document.getElementById('gallery-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    initPuzzle();
}

function showGallery() {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('gallery-screen').classList.remove('hidden');
}

function initPuzzle() {
    generatePositions();

    const board = document.getElementById('board');
    const piecesBank = document.getElementById('pieces-bank');
    const winMessage = document.getElementById('win-message');

    board.innerHTML = '';
    piecesBank.innerHTML = '';
    winMessage.classList.add('hidden');

    // Ajusta o grid do tabuleiro
    board.className = `grid grid-cols-${gridSize} gap-0 bg-amber-200 rounded-2xl shadow-inner w-72 h-72 sm:w-80 sm:h-80 overflow-hidden border-2 border-amber-300`;

    // Reduz o gap e padding dinamicamente no banco de peças para caber mais elementos sem scroll
    let bankPadding = 'p-2 gap-1.5';
    if (gridSize >= 4) {
        bankPadding = 'p-1.5 gap-1';
    }
    piecesBank.className = `flex flex-wrap ${bankPadding} bg-amber-50 rounded-2xl border-2 border-amber-200 w-72 h-72 sm:w-80 sm:h-80 items-center justify-center overflow-hidden`;

    piecesBank.addEventListener('dragover', e => e.preventDefault());
    piecesBank.addEventListener('drop', handleDropToBankDesktop);

    // 1. Criar os Slots do Tabuleiro
    positions.forEach((pos, index) => {
        const slot = document.createElement('div');
        slot.className = 'bg-white/40 border border-amber-300/40 flex items-center justify-center w-full h-full slot relative overflow-hidden';
        slot.dataset.index = index;

        slot.addEventListener('dragover', e => e.preventDefault());
        slot.addEventListener('drop', handleDropDesktop);

        board.appendChild(slot);
    });

    // 2. Criar as Peças Embaralhadas
    const shuffled = [...positions].map((pos, index) => ({ pos, index })).sort(() => Math.random() - 0.5);

    shuffled.forEach(item => {
        const piece = createPieceElement(item);
        piecesBank.appendChild(piece);
    });
}

function createPieceElement(item) {
    const piece = document.createElement('div');
    const pieceSizeClass = getPieceSizeClass();

    piece.className = `piece ${pieceSizeClass} rounded-2xl shadow-md cursor-grab bg-amber-100 bg-no-repeat active:cursor-grabbing hover:scale-105 transition-transform flex-shrink-0`;
    piece.draggable = true;
    piece.dataset.index = item.index;

    piece.style.backgroundImage = `url('${currentImageUrl}')`;
    
    piece.style.backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;
    piece.style.backgroundPosition = `${item.pos.x}% ${item.pos.y}%`;

    // Eventos PC
    piece.addEventListener('dragstart', e => {
        draggedPiece = piece;
        e.dataTransfer.setData('text/plain', item.index);
    });

    // Eventos Celular
    piece.addEventListener('touchstart', handleTouchStart, { passive: false });
    piece.addEventListener('touchmove', handleTouchMove, { passive: false });
    piece.addEventListener('touchend', handleTouchEnd);

    return piece;
}

function handleDropDesktop(e) {
    e.preventDefault();
    const slot = e.currentTarget;
    if (draggedPiece && slot.children.length === 0) {
        slot.appendChild(draggedPiece);
        draggedPiece.className = 'piece w-full h-full rounded-none bg-amber-100 bg-no-repeat flex-shrink-0';
        
        if (slot.dataset.index === draggedPiece.dataset.index) {
            playCorrectSound();
        }

        checkWinCondition();
    }
}

function handleDropToBankDesktop(e) {
    e.preventDefault();
    const bank = document.getElementById('pieces-bank');
    if (draggedPiece) {
        const pieceSizeClass = getPieceSizeClass();
        draggedPiece.className = `piece ${pieceSizeClass} rounded-2xl shadow-md cursor-grab bg-amber-100 bg-no-repeat active:cursor-grabbing hover:scale-105 transition-transform flex-shrink-0`;
        bank.appendChild(draggedPiece);
    }
}

// --- SUPORTE TOUCH PARA CELULARES ---
function handleTouchStart(e) {
    draggedPiece = e.currentTarget;
    const touch = e.touches[0];
    const rect = draggedPiece.getBoundingClientRect();

    touchOffset.x = touch.clientX - rect.left;
    touchOffset.y = touch.clientY - rect.top;

    draggedPiece.style.position = 'fixed';
    draggedPiece.style.zIndex = '1000';
    
    // Define o tamanho visual do arraste no touch de acordo com o nível
    const dragSize = gridSize >= 4 ? '50px' : '70px';
    draggedPiece.style.width = dragSize;
    draggedPiece.style.height = dragSize;
    
    moveAt(touch.clientX, touch.clientY);
}

function handleTouchMove(e) {
    if (!draggedPiece) return;
    e.preventDefault();
    const touch = e.touches[0];
    moveAt(touch.clientX, touch.clientY);
}

function moveAt(pageX, pageY) {
    draggedPiece.style.left = `${pageX - touchOffset.x}px`;
    draggedPiece.style.top = `${pageY - touchOffset.y}px`;
}

function handleTouchEnd(e) {
    if (!draggedPiece) return;

    draggedPiece.style.display = 'none';
    const changedTouch = e.changedTouches[0];
    const elemBelow = document.elementFromPoint(changedTouch.clientX, changedTouch.clientY);
    draggedPiece.style.display = 'block';

    draggedPiece.style.position = 'static';
    draggedPiece.style.zIndex = 'auto';

    const slot = elemBelow ? elemBelow.closest('.slot') : null;

    if (slot && slot.children.length === 0) {
        slot.appendChild(draggedPiece);
        draggedPiece.style.width = '100%';
        draggedPiece.style.height = '100%';
        draggedPiece.className = 'piece w-full h-full rounded-none bg-amber-100 bg-no-repeat flex-shrink-0';

        if (slot.dataset.index === draggedPiece.dataset.index) {
            playCorrectSound();
        }
    } else {
        const piecesBank = document.getElementById('pieces-bank');
        piecesBank.appendChild(draggedPiece);
        draggedPiece.style.width = '';
        draggedPiece.style.height = '';

        const pieceSizeClass = getPieceSizeClass();
        draggedPiece.className = `piece ${pieceSizeClass} rounded-2xl shadow-md cursor-grab bg-amber-100 bg-no-repeat active:cursor-grabbing hover:scale-105 transition-transform flex-shrink-0`;
    }

    draggedPiece = null;
    checkWinCondition();
}

function checkWinCondition() {
    const slots = document.querySelectorAll('.slot');
    let correctCount = 0;
    const totalSlots = gridSize * gridSize;

    slots.forEach(slot => {
        const piece = slot.querySelector('.piece');
        if (piece && piece.dataset.index === slot.dataset.index) {
            correctCount++;
        }
    });

    if (correctCount === totalSlots) {
        document.getElementById('win-message').classList.remove('hidden');
        playWinSound();
    }
}

function handleUserPhoto(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            startPuzzle(e.target.result);
        };
        reader.readAsDataURL(file);
    }
}