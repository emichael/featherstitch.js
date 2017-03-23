
class Block {
    constructor(block_size, data) {
        this.block_size = block_size;

        if (typeof data !== 'undefined') {
            if (!data.length == block_size) {
                throw "Data used to create block not right length.";
            }
            this.data = data;
        } else {
            this.data = '_'.repeat(block_size);
        }
    }

    patch(offset, data) {
        if (offset + data.length > this.block_size) {
            throw "Patch to large for block";
        }
        var new_data = this.data.substr(0, offset) + data + this.data.substr(offset + data.length)
        return new Block(this.block_size, new_data);
    }

    equals(other_block) {
        return JSON.stringify(this.data) == JSON.stringify(other_block.data);
    }
}

export {Block};
