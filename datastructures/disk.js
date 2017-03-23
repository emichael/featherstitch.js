import {Block} from 'datastructures/block';

function nop() {
}

class Disk {
    constructor(block_size, number_of_blocks) {
        this.block_size = block_size;
        this.number_of_blocks = number_of_blocks;

        this.cache_callback = new Array(this.number_of_blocks);
        this.cache = new Array(this.number_of_blocks);
        this.data = new Array(this.number_of_blocks);

        this.reset();
    }

    reset() {
        this.head_direction = 0;
        this.head = 0;

        for (var i = 0; i < this.number_of_blocks; i++) {
            this.cache[i] = new Block(this.block_size);
            this.data[i] = new Block(this.block_size);
            this.cache_callback[i] = [];
        }
    }

    crash() {
        this.head_direction = 0;
        this.head = 0;

        for (var i = 0; i < this.number_of_blocks; i++) {
            this.cache[i] = this.data[i];
            this.cache_callback[i] = [];
        }
    }

    size() {
        return this.number_of_blocks;
    }

    read(index) {
        return this.cache[index];
    }

    write(index, block, callback) {
        this.cache[index] = block;
        this.cache_callback[index].push(callback);
    }

    dirty(idx) {
        return this.cache_callback[idx].length > 0;
    }

    step() {
        if (this.dirty(this.head)) {
            console.log("Flushing cache at index " + this.head)
            this.data[this.head] = this.cache[this.head];

            var callbacks = this.cache_callback[this.head];
            while(callbacks.length > 0) {
                callbacks.pop()();
            }

            return true;
        }

        if (this.head_direction != 0) {
            for(var i = 1; i < this.number_of_blocks; ++i) {
                var pos = this.head + i * this.head_direction;

                if (pos < 0 || pos >= this.number_of_blocks) {
                    break;
                }

                if (this.dirty(pos)) {
                    this.head += this.head_direction;
                    return true;
                }
            }
        }

        this.head_direction = 0;

        for(var i = 1; i < this.number_of_blocks; ++i) {
            var forward_head = (this.head + i);
            var backward_head = (this.head - i);

            if (forward_head < this.number_of_blocks && this.dirty(forward_head)) {
                this.head_direction = 1;
                break;
            }

            if (backward_head >= 0 && this.dirty(backward_head)) {
                this.head_direction = -1;
                break;
            }
        }

        this.head += this.head_direction;
        return this.head_direction != 0;
    }
}

export {Disk};
