
const UNCOMMITTED = "UNCOMMITTED";
const COMMITTED = "COMMITTED";
const INFLIGHT = "INFLIGHT";


class Patch {
    constructor(block_index, offset, undo_data, length, id, ddeps, name) {
        this.state = UNCOMMITTED;
        this.hard = false;
        this.block_index = block_index;
        this.offset = offset;
        this.undo_data = undo_data;
        this.length = length;
        this.id = parseInt(id);
        this.dependents = [];

        if (typeof ddeps !== 'undefined') {
            // Deep copy to avoid reference issues
            this.ddeps = ddeps.slice();
        } else {
            this.ddeps = [];
        }

        if (typeof name !== 'undefined') {
            this.name = name + "(p" + this.id + ")";
        } else {
            this.name = "p" + this.id;
        }

        for (var i = this.ddeps.length - 1; i >= 0; i--) {
            if (this.ddeps[i] == this.id) {
                this.ddeps.splice(i, 1);
            }
        }

        // Add patch to viz
        G.add_node(this.id, this.name, this.block_index, this.hard, 0);

        // Add links to dependencies in viz
        for (let ddep of this.ddeps) {
            G.add_link(this.id, ddep);
        }

        // Force update of buffer cache
        forceUpdate();
    }

    make_inflight() {
        this.state = INFLIGHT;

        // Change color in viz
        G.change_status(this.id, 1);
        this.harden();
    }

    make_committed() {
        this.state = COMMITTED;

        // Remove from viz
        G.remove_node(this.id);
    }

    add_dependent(pid) {
        pid = parseInt(pid);

        if (pid != this.id && this.dependents.indexOf(pid) == -1) {
            this.dependents.push(pid);

            // Add link from dependent in viz
            G.add_link(pid, this.id);
        }
    }

    add_ddep(pid) {
        pid = parseInt(pid);

        if (pid != this.id && this.ddeps.indexOf(pid) == -1) {
            this.ddeps.push(pid);

            // Add link to dependency in viz
            G.add_link(this.id, pid);
        }
    }

    remove_dependent(pid) {
        pid = parseInt(pid);

        if (this.dependents.indexOf(pid) != -1) {
            this.dependents.splice(this.dependents.indexOf(pid), 1);
        }

        // Remove link from dependent in viz
        G.remove_link(pid, this.id);
    }

    remove_ddep(pid) {
        pid = parseInt(pid);

        if (this.ddeps.indexOf(pid) != -1) {
            this.ddeps.splice(this.ddeps.indexOf(pid), 1);
        }

        // Remove link to dependency in viz
        G.remove_link(this.id, pid);
    }

    overlaps(opatch) {
        return (this.block_index == opatch.block_index &&
                ((this.offset <= opatch.offset &&
                  this.offset + this.length > opatch.offset) ||
                    opatch.hard || this.hard ||
                 (opatch.offset <= this.offset &&
                  opatch.offset + opatch.length > this.offset)))
    }

    harden() {
        this.hard = true;
        this.undo_data = undefined;

        // Add border in viz
        G.change_hard(this.id, this.hard);
    }

    add_patch_to_name(opatch) {
        this.name = this.name + "+" + opatch.name;

        // Update name in viz
        G.change_name(this.id, this.name);
    }

    delete() {
        // Remove from viz
        G.remove_node(this.id);
    }
}

export {Patch, UNCOMMITTED, COMMITTED, INFLIGHT};
