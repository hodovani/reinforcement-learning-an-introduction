const {State} = require('./state.js');

const BOARD_ROWS = 3;
const BOARD_COLS = 3;
const BOARD_SIZE = BOARD_ROWS * BOARD_COLS;

/**
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

function getAllStatesImpl(currentState, currentSymbol, allStates) {
    for (let i = 0; i < BOARD_ROWS; i++) {
        for (let j = 0; j < BOARD_ROWS; j++) {
            const currentStateArray = currentState.data.arraySync();
            if (currentStateArray[i][j] === 0) {
                const newState = currentState.nextState(i, j, currentSymbol);
                const newHash = newState.hash();
                if (!(newHash in allStates)) {
                    const isEnd = newState.isEnd();
                    allStates[newHash] = {state: newState, isEnd}
                }
            }
        }
    }
}

function getAllStates() {
    const currentSymbol = 1;
    const currentState = new State();
    let allStates = {};
    allStates[currentState.hash()] = {state: currentState, isEnd: currentState.isEnd()};
    getAllStatesImpl(currentState, currentSymbol, allStates);
    return allStates;
}

// all possible board configurations
const allStates = getAllStates();

class Judge {
    constructor({player1, player2}) {
        this.p1 = player1
        this.p2 = player2
        this.currentPlayer = player1;
        this.p1Symbol = 1
        this.p2Symbol = -1
        this.p1.setSymbol(this.p1Symbol)
        this.p2.setSymbol(this.p2Symbol)
        this.currentState = new State()
    }

    reset() {
        this.p1.reset()
        this.p2.reset()
    }

    * alternate() {
        while (true) {
            yield this.p1;
            yield this.p2;
        }
    }

    play(printState = false) {
        const alternator = this.alternate()
        this.reset()
        const currentState = new State();
        this.p1.setState(currentState)
        this.p2.setState(currentState)
        if (printState) {
            currentState.printState();
        }
        while (true) {
            const player = alternator.next().value;
            const {position, symbol} = player.act();
            if(position === undefined){
                console.log('');
            }
            const newState = currentState.nextState(position.i, position.j, symbol)
            player.setState(newState)
            if (printState) {
                newState.printState();
            }
            if (newState.isEnd()) {
                return newState.winner
            }
            currentState.data = newState.data
        }
    }
}

class Player {
    constructor({epsilon = 0.1, stepSize = 0.1}) {
        this.estimations = {};
        this.stepSize = stepSize;
        this.epsilon = epsilon;
        this.states = [];
        this.greedy = [];
        this.symbol = 0;
    }

    reset() {
        this.states = [];
        this.greedy = [];
    }

    setState(state) {
        this.states.push(state)
        this.greedy.push(true)
    }

    setSymbol(symbol) {
        this.symbol = symbol;
        for (const hashVal in allStates) {
            const {state, isEnd} = allStates[hashVal];
            if (isEnd) {
                if (state.winner === symbol) {
                    this.estimations[hashVal] = 1;
                } else if (state.winner === 0) {
                    this.estimations[hashVal] = 0.5;
                } else {
                    this.estimations[hashVal] = 0;
                }
            } else {
                this.estimations[hashVal] = 0.5;
            }
        }
    }

    backup() {
        const states = this.states.map(state => state.hash());
        for (let i = states.length - 1; i >= 0; i--) {
            const state = states[i];
            const tdError = this.greedy[i] * (this.estimations[states[i + 1]] - this.estimations[state]);
            this.estimations[state] += this.stepSize * tdError;
        }
    }

    act() {
        const state = this.states[this.states.length - 1];
        const nextStates = [];
        const nextPositions = [];
        for (let i = 0; i < BOARD_ROWS; i++) {
            for (let j = 0; j < BOARD_COLS; j++) {
                if (state.data.arraySync()[i][j] === 0) {
                    nextStates.push(state.nextState(i, j, this.symbol));
                    nextPositions.push({i, j});
                }
            }
        }

        if (Math.random() < this.epsilon) {
            const action = nextPositions[getRandomInt(0, nextPositions.length)];
            action.symbol = this.symbol;
            this.greedy[-1] = false;
            return action
        }

        let values = [];

        for (let i = 0; i < nextStates.length; i++) {
            values.push({
                estimate: this.estimations[nextStates[i].hash()],
                position: nextPositions[i]
            });
        }

        values = values.sort((a, b) => b.estimate - a.estimate);

        if(values[0] === undefined){
            console.log('');
        }

        return {position: values[0].position, symbol: this.symbol};
    }

    savePolicy() {
        require('fs').writeFile(
            `./policy_${this.symbol === -1 ? 'first' : 'second'}.json`,
            JSON.stringify(this.estimations),
            console.error
        );
    }

    loadPolicy() {
        this.estimations = require(`./policy_${this.symbol === -1 ? 'first' : 'second'}.json`);
    }
}

// human interface
// input a number to put a chessman
// | q | w | e |
// | a | s | d |
// | z | x | c |
class HumanPlayer {
    symbol = null;
    keys = ['q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c'];
    state = new State();

    reset() {
    }

    setState(state) {
        this.state = state
    }

    setSymbol(symbol) {
        this.symbol = symbol
    }

    act() {
        this.state.printState()
        const key = input("Input your position:")
        const data = this.keys.indexOf(key)
        const i = Math.floor(data / BOARD_COLS);
        const j = data % BOARD_COLS
        return {position: {i, j}, symbol: this.symbol}
    }
}

function train(epochs, print_every_n = 500) {
    const player1 = new Player({epsilon: 0.01});
    const player2 = new Player({epsilon: 0.01});
    const judge = new Judge({player1, player2});
    let player1_win = 0;
    let player2_win = 0;
    for (let i = 1; i < epochs + 1; i++) {
        const winner = judge.play({print_state: false});
        if (winner === 1) {
            player1_win++;
        }
        if (winner === -(1)) {
            player2_win++;
        }
        if (i % print_every_n === 0) {
            console.log(`Epoch ${i}, player 1 winrate: ${player1_win / i}, player 2 winrate: ${player2_win / i}`);
        }
        player1.backup();
        player2.backup();
        judge.reset();
    }
    player1.savePolicy();
    player2.savePolicy();
}

function compete(turns) {
    const player1 = new Player({epsilon: 0});
    const player2 = new Player({epsilon: 0});
    const judge = new Judge({player1, player2});
    player1.loadPolicy();
    player2.loadPolicy();
    let player1Win = 0;
    let player2Win = 0;
    for (let i = 0; i < turns; i++) {
        const winner = judge.play();
        if (winner === 1) {
            player1Win++;
        }
        if (winner === -(1)) {
            player2Win++;
        }
        judge.reset();
    }
    console.log(`${turns} turns, player 1 win ${player1Win / turns}, player 2 win ${player2Win / turns}`);
}

function play() {
    while (true) {
        const player1 = new HumanPlayer();
        const player2 = new Player({epsilon: 0});
        const judge = new Judge({player1, player2});
        player2.loadPolicy()
        const winner = judge.play();
        if (winner === player2.symbol) {
            console.log("You lose!");
        } else if (winner === player1.symbol) {
            console.log("You win!");
        } else {
            console.log("Tie!");
        }
    }
}

train(1e5);
compete(1e3);
play();
