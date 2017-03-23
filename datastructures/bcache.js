import {Block} from 'datastructures/block';

class BCache {
    constructor(disk) {
        this.disk = disk;
        this.number_of_blocks = disk.size();
        this.data = new Array(this.number_of_blocks);
        this.present = new Array(this.number_of_blocks);

        this.reset();
    }

    reset() {
        for (var i = 0; i < this.number_of_blocks; i++) {
            this.present[i] = false;
            this.data[i] = new Block(1, "?");
        }
    }

    read(index) {
        if (!this.present[index]) {
            this.data[index] = this.disk.read(index);
            this.present[index] = true;
        }
        return this.data[index];
    }

    write(index, block) {
        this.data[index] = block;
        this.present[index] = true;
    }
}

export {BCache};
