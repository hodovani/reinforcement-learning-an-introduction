const tf = require('@tensorflow/tfjs-node');

const BOARD_ROWS = 3;
const BOARD_COLS = 3;
const BOARD_SIZE = BOARD_ROWS * BOARD_COLS;

class State {
    constructor() {
        //  the board is represented by an n * n array,
        //  1 represents a chessman of the player who moves first,
        //  -1 represents a chessman of another player
        //  0 represents an empty position.
        this.data = tf.zeros([BOARD_ROWS, BOARD_COLS]);
        // this.data = tf.tensor2d([[1, -1, 1], [1, -1, 1], [1, -1, 1]]);
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
        const rows = this.data.sum(0);
        results.push(...rows.arraySync());

        // check columns
        const columns = this.data.sum(1);
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

    nextState(i, j, symbol) {
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

module.exports = { State }
