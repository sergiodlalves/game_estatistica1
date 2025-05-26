// Função para obter o cookie CSRF
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function getColor(num) {
    switch (num) {
        case 1: return "#e74c3c";
        case 2: return "#f1c40f";
        case 3: return "#2ecc71";
        case 4: return "#3498db";
        case 5: return "#9b59b6";
        case 6: return "#e67e22";
        default: return "#c9a14a";
    }
}

function getBorderColor(num) {
    return num > 0 ? "#9b59b6" : "#c9a14a";
}

// Caminho do avatar no grid (índices das casas)
const mapaCasas = [
    0, 4, 5, 6, 7, 11, 10, 9, 8, 12, 13, 14, 15, 19, 18, 17, 16, 20, 21, 22, 23, 27
];

// Função para configurar e controlar a música de fundo
function setupBackgroundMusic() {
    const music = document.getElementById('background-music');
    const toggleButton = document.getElementById('toggle-audio');
    const audioIcon = document.getElementById('audio-icon');
    const audioEnabled = localStorage.getItem('gameAudioEnabled') !== 'false';

    const updateAudioIcon = (playing) => {
        audioIcon.textContent = playing ? '🔊' : '🔇';
    };

    if (audioEnabled) {
        setTimeout(() => {
            music.play().then(() => updateAudioIcon(true)).catch(e => {
                console.log('Reprodução automática bloqueada pelo navegador:', e);
                updateAudioIcon(false);
            });
        }, 1000);
    } else {
        music.pause();
        updateAudioIcon(false);
    }

    toggleButton.addEventListener('click', () => {
        if (music.paused) {
            music.play();
            localStorage.setItem('gameAudioEnabled', 'true');
            updateAudioIcon(true);
        } else {
            music.pause();
            localStorage.setItem('gameAudioEnabled', 'false');
            updateAudioIcon(false);
        }
    });

    document.addEventListener('click', () => {
        if (audioEnabled && music.paused) {
            music.play().catch(e => console.log('Erro ao retomar música:', e));
        }
    }, { once: true });

    return { music, toggleButton };
}

// COMPONENTES AUXILIARES

function Star({ keyId }) {
    const size = Math.random() * 12 + 12;
    const left = Math.random() * 80 + 10;
    const top = Math.random() * 40 + 10;
    const duration = Math.random() * 0.5 + 0.8;
    return (
        <span
            key={keyId}
            className="estrela-animada"
            style={{
                left: `${left}%`,
                top: `${top}%`,
                fontSize: `${size}px`,
                animation: `star-pop ${duration}s linear forwards`
            }}
        >⭐</span>
    );
}

function BonusModal({ isOpen, onClose }) {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay">
            <div className="modal-content bonus-modal">
                <h2>CASA BÔNUS!</h2>
                <p>Você ganhou 50 pontos!</p>
                <div className="bonus-stars">
                    {Array.from({ length: 10 }, (_, i) => (
                        <span key={i} className="bonus-star" style={{
                            left: `${Math.random() * 80 + 10}%`,
                            top: `${Math.random() * 80 + 10}%`,
                            animationDelay: `${Math.random() * 0.5}s`
                        }}>⭐</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function PenalidadeModal({ isOpen, onClose }) {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay">
            <div className="modal-content penalidade-modal">
                <h2>CASA PENALIDADE!</h2>
                <p>Você perdeu 30 pontos!</p>
                <div className="penalidade-icons">
                    {Array.from({ length: 8 }, (_, i) => (
                        <span key={i} className="penalidade-icon" style={{
                            left: `${Math.random() * 80 + 10}%`,
                            top: `${Math.random() * 80 + 10}%`,
                            animationDelay: `${Math.random() * 0.5}s`
                        }}>❌</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ChegadaModal({ isOpen, pontuacao }) {
    if (!isOpen) return null;
    const [countdown, setCountdown] = React.useState(5);
    const confetes = React.useMemo(() => {
        return Array.from({ length: 50 }, (_, i) => {
            const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            return {
                id: i,
                color: randomColor,
                left: `${Math.random() * 100}%`,
                delay: `${Math.random() * 3}s`,
                size: `${Math.random() * 8 + 5}px`
            };
        });
    }, []);

    React.useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            setCountdown(prevCount => {
                if (prevCount <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prevCount - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isOpen]);

    return (
        <div className="modal-overlay">
            <div className="modal-content chegada-modal">
                <h2>PARABÉNS!</h2>
                <p>Você chegou ao final do jogo!</p>
                <div className="trophy">🏆</div>
                <p>Sua pontuação final:</p>
                <div className="pontuacao-final">{pontuacao} pontos</div>
                <div className="chegada-countdown">
                    Redirecionando em {countdown} segundos...
                </div>
                <div className="confetti-container">
                    {confetes.map(confete => (
                        <div
                            key={confete.id}
                            className="confetti"
                            style={{
                                backgroundColor: confete.color,
                                left: confete.left,
                                width: confete.size,
                                height: confete.size,
                                animationDelay: confete.delay
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ... (O componente PerguntaModal permanece igual ao seu original, sem alterações para a música. Por limitação de espaço, não está listado aqui, mas basta manter o seu código original.)

// Componente principal do Tabuleiro
function Tabuleiro() {
    const [casaAtual, setCasaAtual] = React.useState(0);
    const [animando, setAnimando] = React.useState(false);
    const [dado, setDado] = React.useState(null);
    const [cor, setCor] = React.useState(getColor(0));
    const [borderColor, setBorderColor] = React.useState(getBorderColor(0));
    const [stars, setStars] = React.useState([]);
    const [showBonusModal, setShowBonusModal] = React.useState(false);
    const [showPenalidadeModal, setShowPenalidadeModal] = React.useState(false);
    const [showChegadaModal, setShowChegadaModal] = React.useState(false);
    const [showPerguntaModal, setShowPerguntaModal] = React.useState(false);
    const [casaPerguntaAtual, setCasaPerguntaAtual] = React.useState(null);
    const [pontuacaoAtual, setPontuacaoAtual] = React.useState(0);
    const [jogoCarregado, setJogoCarregado] = React.useState(false);

    // Referência para controlar a música
    const audioRef = React.useRef(null);

    // Inicialização do tabuleiro e da música
    React.useEffect(() => {
        // Configurar música de fundo
        audioRef.current = setupBackgroundMusic();

        // Código original de inicialização do tabuleiro
        const casa_atual_salva = localStorage.getItem('casa_atual');
        const pontuacao_salva = localStorage.getItem('pontuacao_atual');

        if (casa_atual_salva) {
            setCasaAtual(parseInt(casa_atual_salva));
            if (pontuacao_salva) {
                setPontuacaoAtual(parseInt(pontuacao_salva));
            }
            localStorage.removeItem('casa_atual');
            localStorage.removeItem('pontuacao_atual');
        }

        buscarPontuacaoAtual();
        setJogoCarregado(true);
    }, []);

    // Limpar recursos ao desmontar o componente
    React.useEffect(() => {
        return () => {
            if (audioRef.current && audioRef.current.music) {
                audioRef.current.music.pause();
            }
        };
    }, []);

    // ... (todo o restante do código do componente Tabuleiro permanece igual)
    // Copie e cole o restante do seu componente Tabuleiro normalmente aqui

    return (
        <div className="tabuleiro-container">
            {/* Todo o JSX existente permanece igual */}
            <div className="titulo-tabuleiro">Tabuleiro Caminho da Fama</div>
            <div className="pontuacao-display">
                Pontuação: <span className="pontuacao-valor">{pontuacaoAtual}</span>
            </div>
            {/* ... resto do JSX ... */}
            {/* Modais e outros componentes */}
            <BonusModal
                isOpen={showBonusModal}
                onClose={() => setShowBonusModal(false)}
            />
            <PenalidadeModal
                isOpen={showPenalidadeModal}
                onClose={() => setShowPenalidadeModal(false)}
            />
            <ChegadaModal
                isOpen={showChegadaModal}
                pontuacao={pontuacaoAtual}
            />
            {/* Inclua o PerguntaModal conforme seu código original */}
        </div>
    );
}

ReactDOM.render(<Tabuleiro />, document.getElementById('botao-cinematografico-root'));