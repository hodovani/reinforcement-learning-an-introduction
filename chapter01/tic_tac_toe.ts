import {Tensor1D, Tensor2D} from "@tensorflow/tfjs-node";

const tf = require('@tensorflow/tfjs-node');
// move tf in a separate file to not depend on this library

const BOARD_ROWS = 3;
const BOARD_COLS = 3;
const BOARD_SIZE = BOARD_ROWS * BOARD_COLS;

type StateData = Tensor2D;
type AllStates = {
    [key: string]: { newState: State, isEnd: boolean };
}
enum Symbol {
    X = 'X',
    O = 'O',
    Empty = ' '
}

class State {
    data: StateData;
    winner: null | number;
    hashVal: null | number;
    end: null | boolean;

    constructor() {
        //  the board is represented by an n * n array,
        //  1 represents a chessman of the player who moves first,
        //  -1 represents a chessman of another player
        //  0 represents an empty position.
        // this.data = tf.zeros([BOARD_ROWS, BOARD_COLS]);
        this.data = tf.tensor2d([[1, -1, 1], [1, -1, 1], [1, -1, 1]]);
        this.winner = null;
        this.hashVal = null;
        this.end = null;
    }

    // compute the hash value for one state, it is unique
    hash() {
        if (this.hashVal === null) {
            this.hashVal = 0
        }
        const flat = this.data.arraySync().flat()
        for (const i of flat) {
            this.hashVal = this.hashVal * 3 + i + 1;
        }
        return this.hashVal;
    }

    isEnd() {
        if (this.end !== null) {
            return this.end;
        }

        let results = [];

        // check row
        const rows: Tensor1D = this.data.sum(0);
        results.push(...rows.arraySync());

        // check columns
        const columns: Tensor1D = this.data.sum(1);
        results.push(columns.arraySync());

        // check diagonals
        let trace = 0;
        let reverse_trace = 0;

        const array = this.data.arraySync();
        for (let i = 0; i < BOARD_ROWS; i++) {
            trace += array[i][i];
            reverse_trace += array[i][BOARD_ROWS - 1 - i];
        }
        results.push(trace);
        results.push(reverse_trace);

        for (const result of results) {
            if (result === 3) {
                this.winner = 1;
                this.end = true;
                return this.end;
            }
            if (result === -3) {
                this.winner = -1;
                this.end = true;
                return this.end;
            }
        }

        // whether it is a tie
        const sum_values = this.data.arraySync().flat(2).reduce((a, b) => a + Math.abs(b), 0);
        if (sum_values === BOARD_SIZE) {
            this.winner = 0;
            this.end = true;
            return this.end;
        }

        // game is still going on.
        this.end = false;
        return this.end
    }

    nextState(i: number, j: number, symbol: number) {
        const newState = new State();
        const newDate = this.data.clone().arraySync();
        newDate[i][j] = symbol;
        newState.data = tf.tensor(newDate);
        return newState;
    }

    // print the board
    printState() {
        this.data.print();
    }
}

function getAllStatesImpl(currentState: State, currentSymbol: number, allStates: AllStates) {
    for (let i = 0; i < BOARD_ROWS; i++) {
        for (let j = 0; j < BOARD_ROWS; j++) {
            const currentStateArray = currentState.data.arraySync();
            if (currentStateArray[i][j] === 0) {
                const newState = currentState.nextState(i, j, currentSymbol);
                const newHash = newState.hash();
                if (!(newHash in allStates)) {
                    const isEnd = newState.isEnd();
                    allStates[newHash] = {newState, isEnd}
                }
            }
        }
    }
}

function getAllStates() {
    const currentSymbol = 1;
    const currentState = new State();
    let allStates: AllStates = {};
    allStates[currentState.hash()] = {newState: currentState, isEnd: currentState.isEnd()};
    getAllStatesImpl(currentState, currentSymbol, allStates);
    return allStates;
}

// all possible board configurations
const allStates = getAllStates();


type JudgeConstructor = {
    player1: Player, player2: Player
}

class Judge {
    private p1: Player;
    private p2: Player;
    private currentPlayer: Player;
    private p1Symbol: number;
    private p2Symbol: number;
    private currentState: State;
    constructor({player1, player2}: JudgeConstructor) {
        this.p1 = player1
        this.p2 = player2
        this.currentPlayer = player1;
        this.p1Symbol = 1
        this.p2Symbol = -1
        this.p1.setSymbol(this.p1Symbol)
        this.p2.setSymbol(this.p2Symbol)
        this.currentState = new State()
    }

    reset(){
        this.p1.reset()
        this.p2.reset()
    }

    play() {
    }
}

class HumanPlayer {
}

class Player {
    epsilon: number

    constructor({epsilon}: { epsilon: number }) {
        this.epsilon = epsilon;
    }
}



function train(epochs: number, print_every_n = 500) {
}

function compete() {
}

function play() {
    while (true) {
        const player1 = new HumanPlayer();
        const player2 = new Player({epsilon: 0});
        const judge = new Judge({player1, player2});
        player2.loadPolicy()
        const winner = judge.play();
        if (winner == player2.symbol) {
            console.log("You lose!");
        } else if (winner == player1.symbol) {
            console.log("You win!");
        } else {
            console.log("Tie!");
        }
    }
}

train(1e5);
compete();
play();
