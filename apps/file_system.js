
const SB = 0;
const BITMAP = 1
const INODES = 2;
const NUM_INODES = 12;
const DATA = INODES + NUM_INODES;
const NUM_DATA = 10;
const NUM_BLOCKS = 8;

function assert(cond, message) {
    if (!cond) {
        console.log("Assertion failure " + message);
        throw message;
    }
}

class FileSystem {
    constructor(fs) {
        this.fs = fs;
        this.deps = {};
        this.sb = 0;
    }

    pad(str, pad=" ") {
        pad = pad.repeat(10);
        return str + pad.substring(0, pad.length - str.length)
    }

    mkfs() {
        var bitmap = this.fs.write(BITMAP, 0, this.pad("", "0"), [],
                                   "INIT_BMP");

        var inodes = [];
        for(var i = 0; i < NUM_INODES; i++) {
            inodes.push(this.fs.write(INODES + i, 0, this.pad("00", " "),
                                      [], "CLR_INODE"));
        }

        // for(var i = 0; i < NUM_DATA; i++) {
        //     this.fs.write(DATA + i, 0, this.pad(""));
        // }
        var root = this.ialloc(inodes);

        this.sb = this.fs.write(SB, 0, this.pad("" + 1 + " " + NUM_INODES + " " + NUM_DATA + "/" + root[0]), inodes.concat([bitmap, root[1]]), "SB_INIT");

    }

    ialloc(deps=[]) {
        for(var i = 0; i < NUM_INODES; i++) {
            var b = this.fs.read(INODES + i);
            if (this.fs.read(INODES + i).data[0] == "0") {
                return [i + 1, this.fs.write(INODES + i, 0, "1", deps,
                                             "INIT_INODE")];
            }
        }
    }

    balloc(deps=[]) {
        var b = this.fs.read(BITMAP);
        for(var i = 0; i < NUM_DATA; i++) {
            if (b.data[i] == "0") {
                var rdep = this.fs.write(BITMAP, i, "1", deps, "BMP");
                var clear = this.fs.write(DATA + i, 0, this.pad("", " "),
                    [rdep], "CLR_DATA");
                return [i, [clear]];
            }
        }
    }

    bfree(bit, deps=[]) {
        this.fs.write(BITMAP, parseInt(bit), "0", deps, "BMP");
    }

    iget(i) {
        return this.fs.read(INODES + i - 1);
    }

    iput(inum, inode, deps=[]) {
        // very hacky..
        var old = this.iget(inum);
        for(var i = 0; i < inode.data.length; i++) {
            if (old.data[i] != inode.data[i]) {
                var len;
                for(len = 0; len + i < inode.data.length && old.data[i + len] != inode.data[i + len]; len++);
                var dat = inode.data.substr(i, len + 1);
                if (inum in this.deps)
                    deps.concat(this.deps[inum]);
                this.fs.write(INODES + inum - 1, i, dat, deps, "W_INODE");
                i += len;
            }
        }
    }

    bmap(ino, off) {
        var inode = this.iget(ino);
        assert(inode.data[0] == "1"); // is in use
        if (inode.data[off + 2] == " ") {
            var b = this.balloc();
            inode = inode.patch(off + 2, "" + b[0]);
            inode = inode.patch(1, "" + (parseInt(inode.data[1]) + 1));
            this.iput(ino, inode, b[1]);
        }

        return DATA + parseInt(inode.data[off + 2]);
    }

    creat(dir, name) {
        var new_file = this.ialloc();
        this.deps[new_file[0]] = [this.sb, new_file[1]];

        for(var i = 0; i < NUM_BLOCKS; ++i) {
            var block_idx = this.bmap(dir, i);
            var block = this.fs.read(block_idx);
            // There are two dentries per block
            if (block.data[0] != " " && block.data[5] != " ") {
                continue;
            }

            if (block.data[0] == " ") {
                this.fs.write(block_idx, 0, "" + new_file[0] + name,
                              [new_file[1]], "W_DENTRY");
                return new_file[0];
            }

            if (block.data[5] == " ") {
                this.fs.write(block_idx, 5, "" + new_file[0] + name,
                              [new_file[1]], "W_DENTRY");
                return new_file[0];
            }
        }
    }

    append(ino, data) {
        var inode = this.iget(ino)
        var size = parseInt(inode.data[1]);
        var block_idx = this.bmap(ino, size);
        this.fs.write(block_idx, 0, data, [], "W_DATA");
    }

    unlink(ino, name) {
        var inode = this.iget(ino);

        var removed_inode = 0;
        var dep = 0;

        for (var i = 0; i < inode.data[1]; i++) {
            var block_idx = this.bmap(ino, i);
            var block = this.fs.read(block_idx);
            // name length is wrong..
            if (block.data.substr(1, 4) == (name + " ".repeat(4 - name.length))) {
                removed_inode = parseInt(block.data[0]);
                dep = this.fs.write(block_idx, 0, " ".repeat(5));
                break;
            }
            if (block.data.substr(6, 4) == (name + " ".repeat(4 - name.length))) {
                removed_inode = parseInt(block.data[5]);
                dep = this.fs.write(block_idx, 5, " ".repeat(5));
                break;
            }
        }

        if (dep != 0 && removed_inode != 0) {
            var rino = this.iget(removed_inode);
            for (var i = 0; i < rino.data[1]; i++) {
                this.bfree(rino.data[i + 2], [dep]);
            }
            this.fs.write(INODES + removed_inode - 1, 0, this.pad("00", " "), [dep], "CLR_INODE");
            return true;
        }

        return false;
    }
}

export {FileSystem};
