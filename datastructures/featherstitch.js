import {Patch, UNCOMMITTED, COMMITTED, INFLIGHT} from 'datastructures/patch';


/* Returns a set with all nodes found in BFS.
   start_node should be an int or string of an int. expand_f should take a int
   and return an Array of ints/strings of ints. visit_f should take an int
   return whether it should be visited at all. */
function BFS(start_node, expand_f, visit_f) {
    var front = [parseInt(start_node)];
    var explored = new Set();
    while (front.length > 0) {
        var current = front.shift();
        for (let neighbor of expand_f(current)) {
            neighbor = parseInt(neighbor);
            if (!explored.has(neighbor) && visit_f(neighbor)) {
                explored.add(neighbor);
                front.push(neighbor);
            }
        }
    }
    return explored;
}

Set.prototype.intersection = function(setB) {
    var intersection = new Set();
    for (var elem of setB) {
        if (this.has(elem)) {
            intersection.add(elem);
        }
    }
    return intersection;
}


class Featherstitch {
    constructor(disk, bcache) {
        this.disk = disk;
        this.bcache = bcache;

        this.reset();
    }

    /* Doesn't reset the disk. */
    reset() {
        bcache.reset();
        G.reset();

        this._ident = 0;

        this.committed = {};
        this.uncommitted = {};
        this.inflight = {};

        // Map to lists of pids
        this.uncommitted_by_block = {};
    }

    _new_ident() {
        return this._ident++;
    }

    read(index) {
        return this.bcache.read(index);
    }

    patch(id) {
        if (id in this.uncommitted) {
            return this.uncommitted[id];
        } else if (id in this.committed) {
            return this.committed[id];
        } else if (id in this.inflight) {
            return this.inflight[id];
        }

        throw "No patch with id: " + id;
    }

    /* Returns all uncommitted and inflight patches. */
    not_committed() {
        return Object.assign({}, this.uncommitted, this.inflight);
    }

    /* Removes patch object from all 4 tracking sets. */
    remove_patch(patch) {
        var pid = patch.id;
        var block_index = patch.block_index;

        if (pid in this.uncommitted) {
            delete this.uncommitted[pid];
        }
        if (pid in this.committed) {
            delete this.committed[pid];
        }
        if (pid in this.inflight) {
            delete this.inflight[pid];
        }

        if (block_index in this.uncommitted_by_block &&
            this.uncommitted_by_block[block_index].indexOf(pid) != -1) {

            var on_block = this.uncommitted_by_block[block_index];
            on_block.splice(on_block.indexOf(pid), 1);
            if (on_block.length == 0) {
                delete this.uncommitted_by_block[block_index];
            }
        }
    }

    write(index, offset, data, ddeps, name) {
        if (typeof ddeps == 'undefined') {
            ddeps = [];
        }

        var old_block = this.bcache.read(index);
        var undo_data = old_block.data.substr(offset, data.length);
        var new_block = old_block.patch(offset, data)
        this.bcache.write(index, new_block);

        const id = this._new_ident();
        var patch = new Patch(index, offset, undo_data, data.length, id, ddeps,
                              name);

        // Add all of the overlapping writes as dependencies
        Object.entries(this.not_committed()).forEach(([opid, opatch]) => {
            if (patch.overlaps(opatch)) {
                patch.add_ddep(opid);
            }
        });

        Object.entries(this.not_committed()).forEach(([opid, opatch]) => {
            if (opatch.hard && opatch.block_index == index) {
                patch.add_ddep(opid);
            }
        });

        // Add to tracking sets
        this.uncommitted[id] = patch;
        if (!(index in this.uncommitted_by_block)) {
            this.uncommitted_by_block[index] = [id];
        } else {
            this.uncommitted_by_block[index].push(id);
        }

        // Add reverse dependencies
        for (let opid of patch.ddeps) {
            this.patch(opid).add_dependent(id);
        }

        var do_opts = document.getElementById("auto-opt-chkbox").checked;
        var harden = document.getElementById("hard-chkbox").checked;
        if (do_opts && harden) {
            while (this.harden_patch()) {}
        }

        return id;
    }

    step_opt() {
        // Try optimizations first
        var harden = document.getElementById("hard-chkbox").checked,
            mergehard = document.getElementById("mergehard-chkbox").checked,
            mergeoverlap = document.getElementById("mergeoverlap-chkbox").checked;

        return ((harden && this.harden_patch()) ||
                (mergehard && this.merge_hard_patches()) ||
                (mergeoverlap && this.merge_overlapping_patches()));
    }


    step() {
        // Look for patches to send in flight, all to same block
        var block_index = -1;
        var to_send = new Set();
        for (var pid in this.uncommitted) {
            var patch = this.patch(pid);
            if (this.can_send_inflight(patch) &&
                (block_index == -1 || patch.block_index == block_index)) {
                block_index = patch.block_index;
                to_send.add(pid);
            }
        }

        if (block_index != -1) {
            this.send_in_flight(to_send, block_index);
            return true;
        }

        return false;
    }

    /* Takes a patch object and determines if it has unsafe dependencies. */
    can_send_inflight(patch) {
        for (let ddep_pid of patch.ddeps) {
            var ddep = this.patch(ddep_pid);
            if (ddep.state == UNCOMMITTED ||
                (ddep.state == INFLIGHT &&
                 ddep.block_index != patch.block_index)) {
                return false;
            }
        }
        return true;
    }

    /* Takes a set of uncommitted patch ids and sends the patches in
       flight, with necessary undo data applied. */
    send_in_flight(pids, block_index) {
        var block = this.bcache.read(block_index);

        // First gather all other uncommitted writes to the same block
        var to_undo = new Set();
        Object.entries(this.uncommitted).forEach(([pid, pt]) => {
            if (pt.block_index == block_index && !pids.has(pid)) {
                to_undo.add(parseInt(pid));
            }
        });

        // Now, apply in topological order
        while (to_undo.size > 0) {
            // Find a patch that can be applied
            for (let pid of to_undo) {
                var pt = this.patch(pid);

                // Test if all dependencies on same block have been applied
                var can_undo = true;
                for (var i = 0; i < pt.dependents.length; i++) {
                    var dep_pid = pt.dependents[i];
                    var dep = this.patch(dep_pid);

                    if (dep.block_index == block_index &&
                        to_undo.has(dep_pid)) {
                        can_undo = false;
                    }
                }

                if (can_undo) {
                    block = block.patch(pt.offset, pt.undo_data);
                    to_undo.delete(pid);
                    break;
                }
            }
        }

        // Finally, send the blocks in flight
        for (let pid of pids) {
            var patch = this.patch(pid);

            this.remove_patch(patch);

            patch.make_inflight();
            this.inflight[pid] = patch;
            console.log("Changing patch " + pid + " to inflight");

            this.disk.write(patch.block_index, block, function() {
                var patch = this.patch(pid);

                this.remove_patch(patch);
                patch.make_committed();
                this.committed[pid] = patch;

                console.log("Changing patch " + pid + " to committed");
            }.bind(this));
        }
    }

    /* Remove undo data from patches which don't need it */
    harden_patch() {
        for (var pid in this.uncommitted) {
            pid = parseInt(pid);

            var patch = this.patch(pid);
            if (patch.hard) {
                continue;
            }

            // Patch p is created as hard if no (uncommitted) patches on other
            // blocks depend on uncommitted patches on blk[p]
            var can_harden = true;
            Object.entries(this.uncommitted).forEach(([opid, opatch]) => {
                if (opatch.block_index != patch.block_index) {
                    for (let dep_pid of opatch.ddeps) {
                        var dep = this.patch(dep_pid);

                        if (dep_pid != pid && dep.block_index == patch.block_index &&
                            dep.state == UNCOMMITTED) {
                            can_harden = false;
                        }
                    }
                }
            });

            // Harden the patch
            if (can_harden) {
                patch.harden();
                console.log("Hardening patch " + patch.id);
                return true;
            }
        }

        // Couldn't harden any patch
        return false;
    }

    /* Merges the second patch into the first one. */
    do_merge(patch1, patch2) {
        var right_edge1 = patch1.offset + patch1.length;
        var right_edge2 = patch2.offset + patch2.length;

        if (patch1.hard || patch2.hard) {
            patch1.harden();
        } else {
            // Compute the combined undo data
            var left = "";
            if (patch2.offset < patch1.offset) {
                left = patch2.undo_data.substr(0, patch1.offset - patch2.offset);
            }
            var right = "";
            if (right_edge2 > right_edge1) {
                var num_chars = right_edge2 - right_edge1;
                right = patch2.undo_data.substr(
                    patch2.undo_data.length - num_chars, num_chars);
            }
            patch1.undo_data = left.concat(patch1.undo_data, right);
        }

        // Compute new offset and length
        if (patch2.offset < patch1.offset) {
            patch1.offset = patch2.offset;
        }
        if (right_edge2 > right_edge1) {
            right_edge1 = right_edge2;
        }
        patch1.length = right_edge1 - patch1.offset;

        // Take union of dependencies and dependents
        for (let ddep of patch2.ddeps) {
            this.patch(ddep).remove_dependent(patch2.id);
            this.patch(ddep).add_dependent(patch1.id);
            patch1.add_ddep(ddep);
        }
        for (let dependent of patch2.dependents) {
            this.patch(dependent).remove_ddep(patch2.id);
            this.patch(dependent).add_ddep(patch1.id);
            patch1.add_dependent(dependent);
        }

        patch1.add_patch_to_name(patch2);
        this.remove_patch(patch2);
        patch2.delete();
    }

    /* Tries to merge multiple hard patches to same block together. */
    merge_hard_patches() {
        for (var block_index in this.uncommitted_by_block) {
            var pids = this.uncommitted_by_block[block_index];

            var hard_patches = [];

            for (let pid of pids) {
                var patch = this.patch(pid);
                if (patch.hard) {
                    hard_patches.push(patch);
                }
            }

            // Found some hard patches to merge
            if (hard_patches.length > 1) {
                var survivor = hard_patches.pop();

                // Merge and delete the remaining pids
                for (let opatch of hard_patches) {
                    this.do_merge(survivor, opatch);
                }
                console.log("Merging hard patches on block " + block_index +
                            " into patch " + survivor.id);
                return true;
            }
        }

        // Didn't find mergeable patches
        return false;
    }


    /* Merges overlapping patches if neither is the head of a block-level
       cycle involving the other. */
    merge_overlapping_patches() {
        // Loop over all blocks in uncommitted_by_block
        for (var block_index in this.uncommitted_by_block) {
            var pids = this.uncommitted_by_block[block_index];

            // For each patch, compute its indirect dependencies and dependents
            // TODO: don't recompute these every time....
            var dependencies = {}
            var dependents = {}

            for (let pid of pids) {
                dependencies[pid] = BFS(pid,
                    p => this.patch(p).ddeps,
                    p => p in this.uncommitted);
            }

            for (let pid of pids) {
                dependents[pid] = BFS(pid,
                    p => this.patch(p).dependents,
                    p => p in this.uncommitted);
            }

            // For each pair of patches, if they overlap and the intersection of
            // one's dependencies with the other's dependents are all on the
            // currently considered block (and vice-versa), then they can be
            // merged. The resulting block is hard if either is hard.
            function not_dangerous(pid1, pid2) {
                for (let node of dependencies[pid1].intersection(
                        dependents[pid2])) {
                    if (this.patch(node).block_index != block_index) {
                        return false;
                    }
                }
                return true;
            }

            for (let pid1 of pids) {
                for (let pid2 of pids) {
                    if (pid1 == pid2) {
                        continue;
                    }

                    var patch1 = this.patch(pid1);
                    var patch2 = this.patch(pid2);

                    if (patch1.overlaps(patch2) &&
                            patch1.ddeps.indexOf(pid2) == -1 &&
                            not_dangerous.call(this, pid1, pid2) &&
                            not_dangerous.call(this, pid2, pid1)) {

                        this.do_merge(patch1, patch2);
                        console.log("Merging patch " + pid2 + " into patch " +
                                    pid1);
                        return true;
                    }
                }
            }
        } // END for (var block_index in this.uncommitted_by_block)

        return false;
    }
}

export {Featherstitch};
