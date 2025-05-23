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

// Componente Modal de Bônus
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

// Componente Modal de Penalidade
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

// Componente Modal de Chegada
function ChegadaModal({ isOpen, pontuacao }) {
    if (!isOpen) return null;

    // Estado para o contador regressivo
    const [countdown, setCountdown] = React.useState(5);

    // Gera confetes coloridos aleatórios
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

    // Efeito para o contador regressivo
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

// Componente Modal de Pergunta
function PerguntaModal({ isOpen, onClose, casaId, onPerguntaRespondida }) {
    if (!isOpen) return null;

    // Estados para controlar a pergunta e respostas
    const [pergunta, setPergunta] = React.useState(null);
    const [respostas, setRespostas] = React.useState([]);
    const [carregando, setCarregando] = React.useState(true);
    const [erro, setErro] = React.useState(null);
    const [respostaSelecionada, setRespostaSelecionada] = React.useState(null);
    const [resultadoResposta, setResultadoResposta] = React.useState(null);
    const [mostrarDica, setMostrarDica] = React.useState(false);
    const [usouDica, setUsouDica] = React.useState(false);

    // Cores temáticas para as categorias
    const getCategoryColor = (category) => {
        const categories = {
            'Estatística Básica': '#2ecc71',
            'Tendência Central': '#9b59b6',
            'Probabilidade': '#f1c40f',
            'Dispersão': '#3498db',
            'Correlação': '#e74c3c'
        };
        return categories[category] || '#e67e22';
    };

    // Ícones para categorias
    const getCategoryIcon = (category) => {
        const icons = {
            'Estatística Básica': '📊',
            'Tendência Central': '🎯',
            'Probabilidade': '🎲',
            'Dispersão': '📈',
            'Correlação': '🔄'
        };
        return icons[category] || '📝';
    };

    // Função para buscar a pergunta do servidor
    React.useEffect(() => {
        if (!isOpen || !casaId) return;

        const csrftoken = getCookie('csrftoken');
        const jogoId = document.getElementById('jogo_id').value;

        // Resetar estados
        setPergunta(null);
        setRespostas([]);
        setCarregando(true);
        setErro(null);
        setRespostaSelecionada(null);
        setResultadoResposta(null);
        setMostrarDica(false);
        setUsouDica(false);

        // Criar FormData para envio
        const formData = new FormData();
        formData.append('jogo_id', jogoId);
        formData.append('action', 'get_pergunta');
        formData.append('casa_id', casaId);

        // Enviar requisição para buscar a pergunta
        fetch(window.location.href, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            setCarregando(false);
            if (data.status === 'success') {
                setPergunta(data.pergunta);
                setRespostas(data.respostas);
            } else {
                setErro(data.message || 'Erro ao buscar pergunta');
            }
        })
        .catch(error => {
            setCarregando(false);
            setErro('Erro de comunicação com o servidor: ' + error.message);
            console.error('Erro ao buscar pergunta:', error);
        });
    }, [isOpen, casaId]);

    // Função para mostrar a dica
    const exibirDica = () => {
        setMostrarDica(true);
        setUsouDica(true);
    };

    // Função para enviar a resposta selecionada
    const enviarResposta = () => {
        if (!respostaSelecionada) return;

        const csrftoken = getCookie('csrftoken');
        const jogoId = document.getElementById('jogo_id').value;

        // Criar FormData para envio
        const formData = new FormData();
        formData.append('jogo_id', jogoId);
        formData.append('action', 'responder_pergunta');
        formData.append('resposta_id', respostaSelecionada);
        formData.append('usou_dica', usouDica);

        // Bloquear novas respostas
        setCarregando(true);

        // Enviar requisição para processar a resposta
        fetch(window.location.href, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            setCarregando(false);
            if (data.status === 'success') {
                setResultadoResposta(data);

                // Após 5 segundos, fechar o modal e notificar o componente pai
                setTimeout(() => {
                    onPerguntaRespondida(data.pontuacao_atual);
                }, 5000);
            } else {
                setErro(data.message || 'Erro ao processar resposta');
            }
        })
        .catch(error => {
            setCarregando(false);
            setErro('Erro de comunicação com o servidor: ' + error.message);
            console.error('Erro ao processar resposta:', error);
        });
    };

    // Renderização de elementos animados para o resultado
    const renderAnimatedElements = (correct) => {
        if (correct) {
            // Estrelas para acerto
            return Array.from({ length: 10 }, (_, i) => {
                const left = Math.random() * 80 + 10;
                const top = Math.random() * 80 + 10;
                const delay = Math.random() * 0.5;
                const size = Math.random() * 10 + 15;
                return (
                    <span key={i} className="animated-star" style={{
                        left: left + "%",
                        top: top + "%",
                        animationDelay: delay + "s",
                        fontSize: size + "px"
                    }}>⭐</span>
                );
            });
        } else {
            // Ícones para erro
            return Array.from({ length: 6 }, (_, i) => {
                const left = Math.random() * 80 + 10;
                const top = Math.random() * 80 + 10;
                const delay = Math.random() * 0.5;
                const rotate = Math.random() * 30 - 15;
                return (
                    <span key={i} className="animated-wrong" style={{
                        left: left + "%",
                        top: top + "%",
                        animationDelay: delay + "s",
                        transform: "rotate(" + rotate + "deg)"
                    }}>❌</span>
                );
            });
        }
    };

    // Renderização do modal de pergunta
    return (
        <div className="modal-overlay">
            <div className="modal-content pergunta-modal">
                {carregando && !resultadoResposta ? (
                    <div className="carregando-pergunta">
                        <div className="spinner"></div>
                        <p>Carregando pergunta...</p>
                        <div className="loading-dots">
                            {Array.from({ length: 3 }, (_, i) => (
                                        <span key={i} style={{animationDelay: `${i * 0.2}s`}}>.</span>
                            ))}
                        </div>
                    </div>
                ) : erro ? (
                    <div className="erro-pergunta">
                        <h3>Ops! Ocorreu um erro</h3>
                        <p>{erro}</p>
                        <button className="btn-fechar" onClick={onClose}>Fechar</button>
                    </div>
                ) : resultadoResposta ? (
                    <div className={`resultado-resposta ${resultadoResposta.resposta_correta ? "acerto-container" : "erro-container"}`}>
                        <h2 className="resultado-titulo">{resultadoResposta.resposta_correta ? "ACERTOU!" : "ERROU!"}</h2>
                        <div className={`resultado-icone ${resultadoResposta.resposta_correta ? "acerto" : "erro"}`}>
                            {resultadoResposta.resposta_correta ? "✓" : "✗"}
                        </div>

                        <div className="animated-elements">
                            {renderAnimatedElements(resultadoResposta.resposta_correta)}
                        </div>

                        <div className="pergunta-respondida">
                            <div className="pergunta-card">
                                <p><strong>Pergunta:</strong> {resultadoResposta.pergunta.text}</p>
                            </div>

                            {resultadoResposta.resposta_correta ? (
                                <div className="resposta-card resposta-correta">
                                    <strong>Sua resposta:</strong> {resultadoResposta.resposta.text}
                                    <p className="pontos-ganhos">+{resultadoResposta.pontos} pontos!</p>
                                </div>
                            ) : (
                                <div className="resposta-card resposta-errada">
                                    <strong>Resposta correta:</strong> {resultadoResposta.resposta_correta_obj.text}
                                    <p className="pontos-penalidade">Penalidade: -{resultadoResposta.penalidade} pontos</p>
                                </div>
                            )}

                            {resultadoResposta.pergunta.explicacao && (
                                <div className="explicacao-resposta">
                                    <h4>Explicação:</h4>
                                    <p>{resultadoResposta.pergunta.explicacao}</p>
                                </div>
                            )}

                            <div className="pontuacao-footer">
                                <p className="pontuacao-atual">Pontuação atual: <span>{resultadoResposta.pontuacao_atual}</span></p>
                                <p className="fechando-automaticamente">O jogo continuará em <span className="countdown-timer">5</span> segundos...</p>
                            </div>
                        </div>
                    </div>
                ) : pergunta ? (
                    <div className="pergunta-container">
                        <div
                            className="category-header"
                            style={{
                                background: `linear-gradient(135deg, ${getCategoryColor(pergunta.category)} 0%, rgba(0,0,0,0.7) 100%)`
                            }}
                        >
                            <span className="category-icon">{getCategoryIcon(pergunta.category)}</span>
                            <span className="category-name">{pergunta.category}</span>
                        </div>

                        <h2 className="pergunta-titulo">DESAFIO DE CONHECIMENTO</h2>

                        {pergunta.imagem_url && (
                            <div className="pergunta-imagem">
                                <img src={pergunta.imagem_url} alt="Imagem da pergunta" />
                            </div>
                        )}

                        <div className="pergunta-texto-container">
                            <p className="pergunta-texto">{pergunta.text}</p>
                        </div>

                        {pergunta.dica && !mostrarDica && (
                            <button
                                className="btn-dica"
                                onClick={exibirDica}
                                disabled={carregando}
                            >
                                <span className="dica-icon">💡</span>
                                Ver Dica <span className="dica-pontos">(-30 pontos)</span>
                            </button>
                        )}

                        {mostrarDica && (
                            <div className="dica-container">
                                <div className="dica-header">
                                    <span className="dica-icon">💡</span>
                                    <h4>Dica:</h4>
                                </div>
                                <p>{pergunta.dica}</p>
                            </div>
                        )}

                        <div className="respostas-container">
                            <h4 className="respostas-titulo">Escolha uma resposta:</h4>
                            {respostas.map((resposta, index) => (
                                <div
                                    key={resposta.id}
                                    className={`resposta-opcao ${respostaSelecionada === resposta.id ? 'selecionada' : ''}`}
                                    onClick={() => !carregando && setRespostaSelecionada(resposta.id)}
                                    style={{
                                        animationDelay: (index * 0.1) + "s"
                                    }}
                                >
                                    <div className="resposta-radio">
                                        {respostaSelecionada === resposta.id ? '●' : '○'}
                                    </div>
                                    <div className="resposta-texto">
                                        {resposta.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="acoes-pergunta">
                            <button
                                className={`btn-responder ${respostaSelecionada ? 'active' : ''}`}
                                onClick={enviarResposta}
                                disabled={!respostaSelecionada || carregando}
                            >
                                Responder
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="pergunta-nao-encontrada">
                        <h3>Nenhuma pergunta encontrada para esta casa</h3>
                        <button className="btn-fechar" onClick={onClose}>Fechar</button>
                    </div>
                )}
            </div>
        </div>
    );
}

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

    const casasTabuleiro = [
        { tipo: "saida", label: "0", extra: <span className="extra-casa">Saída</span> },
        { tipo: "vazia" }, { tipo: "vazia" }, { tipo: "vazia" },
        { label: "1" }, { tipo: "vazia", label: "2" }, { tipo: "zona", label: "3", nomeZona: "Estatística Básica" }, { label: "4" },
        { tipo: "zona zona2", label: "8", nomeZona: "Tendência Central" }, { label: "7" }, { tipo: "bonus", label: "6" }, { tipo: "vazia", label: "5" },
        { tipo: "penalidade", label: "9" }, { tipo: "vazia", label: "10" }, { label: "11" }, { tipo: "zona zona3", label: "12", nomeZona: "Probabilidade" },
        { tipo: "zona zona4", label: "16", nomeZona: "Dispersão" }, { label: "15" }, { tipo: "vazia", label: "14" }, { tipo: "bonus", label: "13" },
        { tipo: "penalidade", label: "17" }, { tipo: "vazia", label: "18" }, { label: "19" }, { tipo: "zona zona5", label: "20", nomeZona: "Correlação" },
        { tipo: "vazia" }, { tipo: "vazia" }, { tipo: "vazia" }, { tipo: "chegada", label: "21", extra: <span className="extra-casa">Chegada</span> }
    ];

    // Função para verificar eventos especiais nas casas
    function verificarEventosCasa(casa) {
        // Verificar se chegou ao final do tabuleiro (casa 21)
        if (casa >= 21) {
            // Mostrar o modal de chegada com um pequeno delay
            // para que o jogador veja seu personagem chegar na casa final
            setTimeout(() => {
                setShowChegadaModal(true);

                // Configurar redirecionamento após 5 segundos
                // (sincronizado com o contador no modal)
                setTimeout(() => {
                    // Finalizar o jogo enviando a pontuação final ao servidor
                    atualizarPontuacao(0, true);
                }, 5000);
            }, 800);

            return true;
        }

        // Verificar se é uma casa bônus (6 ou 13)
        if (casa === 6 || casa === 13) {
            // Adicionar 50 pontos ao jogador
            atualizarPontuacao(50, false);

            // Mostrar o modal de bônus
            setShowBonusModal(true);

            // Esconder o modal após 3 segundos
            setTimeout(() => {
                setShowBonusModal(false);
            }, 3000);

            return true;
        }

        // Verificar se é uma casa de penalidade (9 ou 17)
        if (casa === 9 || casa === 17) {
            // Subtrair 30 pontos do jogador
            atualizarPontuacao(-30, false);

            // Mostrar o modal de penalidade
            setShowPenalidadeModal(true);

            // Esconder o modal após 3 segundos
            setTimeout(() => {
                setShowPenalidadeModal(false);
            }, 3000);

            return true;
        }

        // Verificar se é uma casa de zona (casas 3, 8, 12, 16, 20)
        const casasZona = [3, 8, 12, 16, 20];
        if (casasZona.includes(casa)) {
                console.log("Caiu em casa de zona:", casa);
                // Mostrar modal de pergunta com um pequeno delay
                // para que o jogador veja onde seu personagem parou
                setTimeout(() => {
                    console.log("Preparando para exibir modal de pergunta para casa:", casa);
                    // Definir a casa atual para o modal de pergunta
                    setCasaPerguntaAtual(casa);
                    // Mostrar o modal
                    setShowPerguntaModal(true);
                    console.log("Modal de pergunta definido como visível");
            }, 500);

            return true;
        }

        // Se não for nenhum evento especial
        return false;
    }

    // Função para processar após responder uma pergunta
    function handlePerguntaRespondida(novaPontuacao) {
        // Atualizar a pontuação na interface
        setPontuacaoAtual(novaPontuacao);
        // Fechar o modal de pergunta
        setShowPerguntaModal(false);
        // Limpar a casa atual da pergunta
        setCasaPerguntaAtual(null);
    }

    // Função para buscar a pontuação atual do servidor
    function buscarPontuacaoAtual() {
        const csrftoken = getCookie('csrftoken');

        // Obter o jogo_id diretamente do campo oculto (fornecido pelo servidor)
        const jogoId = document.getElementById('jogo_id').value;

        // Se não tivermos um ID válido, redireciona para a página inicial do tabuleiro
        if (!jogoId || jogoId === "" || jogoId === "None") {
            console.error("Sem jogo_id válido para buscar pontuação");
            window.location.href = '/tabuleiro/';
            return;
        }

        // Criar FormData para envio
        const formData = new FormData();
        formData.append('jogo_id', jogoId);
        formData.append('action', 'check_status'); // Nova ação para apenas verificar o status

        // Enviar requisição para buscar status do jogo
        fetch(window.location.href, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Atualiza a pontuação
                setPontuacaoAtual(data.pontuacao_atual);

                // Se o jogo não estiver mais em andamento, redireciona para a página inicial
                if (data.jogo_status !== 'IN_PROGRESS') {
                    alert('Este jogo não está mais em andamento. Redirecionando para a página inicial.');
                    window.location.href = '/';
                }
            } else {
                console.error("Erro ao verificar status do jogo:", data.message);
                // Redirecionar para a página inicial do tabuleiro para criar um novo jogo
                window.location.href = '/tabuleiro/';
            }
        })
        .catch(error => {
            console.error('Erro ao buscar status do jogo:', error);
        });
    }

    // Função para atualizar a pontuação
    function atualizarPontuacao(pontos, finalizar = false) {
        const csrftoken = getCookie('csrftoken');

        // Criar FormData para envio
        const formData = new FormData();
        formData.append('jogo_id', document.getElementById('jogo_id').value);
        formData.append('pontos', pontos);
        formData.append('casa_atual', casaAtual);
        formData.append('finalizar', finalizar);

        // Enviar requisição para atualizar pontuação
        fetch(window.location.href, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log('Pontuação atualizada:', data.pontuacao_atual);
                setPontuacaoAtual(data.pontuacao_atual);

                // Se o jogo foi finalizado e há uma URL de redirecionamento
                if (data.redirect_url) {
                    // Redirecionar para a URL de redirecionamento
                    window.location.href = data.redirect_url;
                }
            } else {
                console.error('Erro:', data.message);
            }
        })
        .catch(error => {
            console.error('Erro ao atualizar pontuação:', error);
        });
    }

    // Função para sair da partida sem confirmações
    function cancelarPartida() {
        const csrftoken = getCookie('csrftoken');
        const jogoId = document.getElementById('jogo_id').value;
        
        // Redirecionar imediatamente para o índice para evitar qualquer atraso
        // que possa causar mensagens de confirmação
        const homeUrl = '/';
        
        // Usar sendBeacon para garantir que a requisição seja enviada mesmo durante a navegação
        if (navigator.sendBeacon) {
            const formData = new FormData();
            formData.append('jogo_id', jogoId);
            formData.append('action', 'cancel_game');
            formData.append('csrfmiddlewaretoken', csrftoken);
            
            navigator.sendBeacon(window.location.href, formData);
            
            // Redirecionar imediatamente sem esperar resposta
            window.location.href = homeUrl;
        } else {
            // Fallback para fetch, mas ainda sem esperar resposta
            const formData = new FormData();
            formData.append('jogo_id', jogoId);
            formData.append('action', 'cancel_game');
            
            fetch(window.location.href, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken,
                },
                body: formData,
                // Usar keepalive para garantir que a requisição continue mesmo durante navegação
                keepalive: true
            });
            
            // Redirecionar imediatamente sem esperar resposta
            window.location.href = homeUrl;
        }
    }

    // Hook para detectar quando o usuário fecha a página
    React.useEffect(() => {
        const handleBeforeUnload = (e) => {
            // Cancela a partida automaticamente quando o jogador fecha a página sem perguntar
            const jogo_id = document.getElementById('jogo_id').value;
            const csrftoken = getCookie('csrftoken');
    
            // Usando sendBeacon para garantir que a requisição seja enviada mesmo quando a página é fechada
            if (navigator.sendBeacon) {
                const formData = new FormData();
                formData.append('jogo_id', jogo_id);
                formData.append('action', 'cancel_game');
                formData.append('csrfmiddlewaretoken', csrftoken);
    
                navigator.sendBeacon(window.location.href, formData);
            }
            
            // Não fazer nada aqui (sem mensagem e sem preventDefault)
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    function animarDado() {
        if (casaAtual >= 21 || animando) return;
        setAnimando(true);
        setStars([]);
        const sorte = Math.floor(Math.random() * 6) + 1;
        setDado(sorte);
        setCor(getColor(sorte));
        setBorderColor(getBorderColor(sorte));
        let destino = Math.min(casaAtual + sorte, 21);
        let passo = casaAtual;
        function mover() {
            if (passo < destino) {
                passo++;
                setCasaAtual(passo);
                setDado(destino - passo);
                setTimeout(mover, 320);
            } else {
                setCasaAtual(destino);
                setDado(null);
                setCor(getColor(sorte));
                setBorderColor(getBorderColor(sorte));
                setStars(Array.from({ length: 6 }, (_, i) => <Star keyId={"final-" + i} />));

                // Verificar eventos especiais na casa de destino
                // Se não houver evento especial, não atribuímos pontos
                verificarEventosCasa(destino);

                setTimeout(() => {
                    setStars([]);
                    setAnimando(false);
                }, 700);
            }
        }
        setTimeout(mover, 320);
    }

    // Inicialização do tabuleiro - simplificada
    React.useEffect(() => {
        // Mostrar informações de debug se necessário
        console.log("Jogo ID:", document.getElementById('jogo_id').value);

        // Verificar se há dados temporários salvos (retorno da página de bônus)
        const casa_atual_salva = localStorage.getItem('casa_atual');
        const pontuacao_salva = localStorage.getItem('pontuacao_atual');

        if (casa_atual_salva) {
            // Usar a casa salva temporariamente
            setCasaAtual(parseInt(casa_atual_salva));

            // Se tiver pontuação salva, usar temporariamente
            if (pontuacao_salva) {
                setPontuacaoAtual(parseInt(pontuacao_salva));
            }

            // Limpar localStorage
            localStorage.removeItem('casa_atual');
            localStorage.removeItem('pontuacao_atual');
        }

        // Buscar dados atualizados do servidor
        buscarPontuacaoAtual();
        setJogoCarregado(true);

        // Exibir informações de debug se necessário (para desenvolvimento)
        // document.getElementById('debug-info').style.display = 'block';

    }, []); // Este useEffect é executado apenas uma vez na inicialização

    // Este useEffect será acionado quando o jogo for carregado e quando a casa mudar
    // É importante para garantir que a pontuação esteja sincronizada com o servidor
    React.useEffect(() => {
        if (jogoCarregado) {
            // Buscar pontuação sempre que a casa mudar
            buscarPontuacaoAtual();
        }
    }, [jogoCarregado, casaAtual]);

    return (
        <div className="tabuleiro-container">
            <div className="titulo-tabuleiro">Tabuleiro Caminho da Fama</div>

            {/* Mostrar pontuação atual */}
            <div className="pontuacao-display">
                Pontuação: <span className="pontuacao-valor">{pontuacaoAtual}</span>
            </div>

            <div className="tabuleiro-grade">
                {casasTabuleiro.map((casa, idx) => {
                    const tipo = casa.tipo ? `casa ${casa.tipo} casa-relativa` : "casa casa-relativa";
                    let avatar = null;
                    if (idx === (mapaCasas[casaAtual] || 0)) {
                        avatar = <span className="avatar-estrela">⭐</span>;
                    }
                    return (
                        <div className={tipo} key={idx}>
                            {casa.label}
                            {casa.nomeZona && <div className="nome-zona">{casa.nomeZona}</div>}
                            {casa.extra}
                            {avatar}
                        </div>
                    );
                })}
            </div>

            <div className="botoes-container">
                <div className="linha-botoes linha-um">
                    <button
                        className="botao-cinema"
                        style={{
                          marginRight: '12px',
                          background: animando
                             ? `linear-gradient(145deg, ${cor} 30%, #3a2c1a 100%)`
                             : "linear-gradient(145deg, #3a2c1a 60%, #6b4e23 100%)",
                          borderColor: borderColor
                        }}
                        disabled={animando || casaAtual >= 21}
                        onClick={animarDado}
                        >
                        <span className="linha-titulo">Tirar a sorte</span>
                        <span className="linha-status">
                          Casa: {casaAtual}
                          <span className="estrela-cinema">⭐</span>
                        </span>
                        <div className="estrelas-efeito">{stars}</div>
                    </button>
                </div>
                <div className="linha-botoes linha-dois">
                    <button
                    className="botao-cinema"
                    style={{
                      marginRight: '12px'
                    }}
                    onClick={() => {
                        // Chamar diretamente cancelarPartida sem confirmações
                        cancelarPartida();
                    }}
                    >
                    <span className="linha-titulo">Sair</span>
                    </button>
                    <button
                    className="botao-cinema"
                    onClick={() => window.location.href = window.rankingUrl}
                    >
                    <span className="linha-titulo">Ranking</span>
                    </button>
                </div>


            </div>

            {/* Modal de Bônus */}
            <BonusModal
                isOpen={showBonusModal}
                onClose={() => setShowBonusModal(false)}
            />

            {/* Modal de Penalidade */}
            <PenalidadeModal
                isOpen={showPenalidadeModal}
                onClose={() => setShowPenalidadeModal(false)}
            />

            {/* Modal de Chegada/Vitória */}
            <ChegadaModal
                isOpen={showChegadaModal}
                pontuacao={pontuacaoAtual}
            />

            {/* Modal de Pergunta */}
            <PerguntaModal
                isOpen={showPerguntaModal}
                onClose={() => setShowPerguntaModal(false)}
                casaId={casaPerguntaAtual}
                onPerguntaRespondida={handlePerguntaRespondida}
            />
        </div>
    );
}

ReactDOM.render(<Tabuleiro />, document.getElementById('botao-cinematografico-root'));