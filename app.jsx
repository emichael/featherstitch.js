import {Disk} from 'datastructures/disk';
import {BCache} from 'datastructures/bcache';
import {Block} from 'datastructures/block';
import {Featherstitch} from 'datastructures/featherstitch';
import {FileSystem} from 'apps/file_system';

import {BlockComponent} from 'components/block_component';
import {ArrayComponent} from 'components/array_component';
import {DiskComponent} from 'components/disk_component';
import {BCacheComponent} from 'components/bcache_component';
import {CodeComponent} from 'components/code_component';

import {render} from 'react-dom';
import React from 'react';

import * as d3 from 'd3';
import svgPanZoom from 'svg-pan-zoom';

class GraphViz {
    constructor() {
        var width = 960,
            height = 600;
        this.color = d3.scaleOrdinal(d3.schemeCategory10);

        this.legend = d3.select("#graph-body").append("svg")
            .attr("width", 110)
            .attr("height", height)
            .append("g")
            .selectAll("g")
            .data([0,1])
            .enter()
            .append("g")
                .attr("class", "legend")
                .attr("transform", function(d, i) {
                    return "translate(" + 0 + "," + (i * 25 + height - 50) + ")";});
        this.legend.append("rect")
            .attr("width", 20)
            .attr("height", 20)
            .style("fill", this.color)
            .style("stroke", this.color);

        this.legend.append("text")
            .attr("x", 25)
            .attr("y", 15)
            .text(function(d) { return d == 0 ? "uncommitted" : "inflight"; });

        // TODO: make sure hack doesn't cause problems
        var svg = d3.select("#graph-body").append("svg")
            .attr("id", "graph-svg")
            .attr("width", "90%")
            .attr("height", height);

        this.nodes = [];
        this.links = [];

        this.simulation = d3.forceSimulation(this.nodes)
            .force("charge", d3.forceManyBody().strength(-1000))
            .force("link", d3.forceLink(this.links).distance(200))
            .force("x", d3.forceX())
            .force("y", d3.forceY())
            .alphaTarget(0)
            .alphaDecay(0.02)
            .on("tick", this.ticked.bind(this));

        var g = svg.append("g")
            .attr("transform",
                  "translate(" + width / 2 + "," + height / 2 + ")");

        // build the arrow.
        svg.append("svg:defs").selectAll("marker")
            .data(["end"])      // Different link/path types can be defined here
          .enter().append("svg:marker")    // This section adds in the arrows
            .attr("id", String)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", -1.5)
            .attr("markerWidth", 8)
            .attr("markerHeight", 8)
            .attr("orient", "auto")
          .append("svg:path")
            .attr("d", "M0,-5L10,0L0,5");


        this.link_viz = g.append("g")
            .attr("stroke", "#000")
            .attr("stroke-width", 1.5)
            .attr("marker-end", "url(#end)")
            .selectAll(".link");

        this.node_viz = g.append("g")
            .attr("stroke", "#000")
            .selectAll(".node");

        this.text_viz = g.append("g")
            .selectAll("text");

        this.restart()

        svgPanZoom('#graph-svg', {
            'fit': false,
            'center': false
        });
    }

    restart() {
        // Apply the general update pattern to the nodes.
        this.node_viz = this.node_viz.data(
            this.nodes, function(d) { return d.id;})
            .attr("fill", function(d) {
                return this.color(d.status);
            }.bind(this))
            .attr("stroke-width",
                function(d) {
                    if (d.hard) {
                        return 3;
                    } else {
                        return 0.5;
                    }
                })
            .call(d3.drag().on("drag", function(d) {
                this.simulation.alpha(1).restart();
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            }.bind(this)));
        this.node_viz.exit().remove();
        this.node_viz = this.node_viz.enter()
            .append("circle")
            .attr("fill", function(d) {
                return this.color(d.status);
            }.bind(this))
            .attr("stroke-width",
                function(d) {
                    if (d.hard) {
                        return 3;
                    } else {
                        return 0.5;
                    }
                })
            .attr("r", 10).merge(this.node_viz);

        // Apply the general update pattern to the links.
        this.link_viz = this.link_viz.data(this.links,
            function(d) { return d.source.id + "-" + d.target.id; })
            .attr("stroke", "#000")
            .attr("stroke-width", 1.5)
            .attr("marker-end", "url(#end)");
        this.link_viz.exit().remove();
        this.link_viz = this.link_viz.enter().append("line").merge(this.link_viz);

        // Apply the general update pattern to the text.
        this.text_viz = this.text_viz.data(
            this.nodes, function(d) { return "t" + d.id })
            .text(function(d) {
                return "<" + d.name + ", b" + d.block_index + ">";
            });
        this.text_viz.exit().remove();
        this.text_viz = this.text_viz.enter()
            .append("text")
            .text(function(d) {
                return "<" + d.name + ", b" + d.block_index + ">";
            })
            .merge(this.text_viz);

        // Update and restart the simulation.
        this.simulation.nodes(this.nodes);
        this.simulation.force("link").links(this.links);
        this.simulation.alpha(1).restart();
    }

    reset() {
        this.nodes = [];
        this.links = [];
        this.restart();
    }

    ticked() {
        this.node_viz.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        this.text_viz.attr("x", function(d) { return d.x + 8; })
            .attr("y", function(d) { return d.y + 10; });

        this.link_viz.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
    }

    /* Data manipulation functions. */

    find_node(id) {
        id = parseInt(id);
        for (let node of this.nodes) {
            if (node.id == id) {
                return node;
            }
        }
        return undefined;
    }

    node_exists(id) {
        id = parseInt(id);
        for (let node of this.nodes) {
            if (node.id == id) {
                return true;
            }
        }
        return false;
    }

    /* hard should be a boolean, status should be an integer */
    add_node(id, name, block_index, hard, status) {
        id = parseInt(id);
        if (!this.node_exists(id)) {
            this.nodes.push({ id: id, block_index: block_index, name: name,
                              hard: hard, status: status });
            this.restart();
        }
    }

    add_link(id1, id2) {
        id1 = parseInt(id1);
        id2 = parseInt(id2);

        if (!this.node_exists(id1) || !this.node_exists(id2)) {
            return;
        }
        for (let link of this.links) {
            if (link.source.id == id1 && link.target.id == id2) {
                return;
            }
        }
        this.links.push({ source: this.find_node(id1),
                          target: this.find_node(id2) });
        this.restart();
    }

    remove_link(id1, id2) {
        id1 = parseInt(id1);
        id2 = parseInt(id2);

        if (!this.node_exists(id1) || !this.node_exists(id2)) {
            return;
        }
        for (var i = 0; i < this.links.length; i++) {
            var link = this.links[i];
            if (link.source.id == id1 && link.target.id == id2) {
                this.links.splice(i, 1);
                this.restart();
                return;
            }
        }
    }

    remove_node(id) {
        id = parseInt(id);

        var links_to_remove = [];
        for (var i = 0; i < this.links.length; i++) {
            var link = this.links[i];
            if (link.source.id == id || link.target.id == id) {
                links_to_remove.push(i);
            }
        }

        while (links_to_remove.length > 0) {
            this.links.splice(links_to_remove.pop(), 1);
        }

        for (var i = 0; i < this.nodes.length; i++) {
            var node = this.nodes[i];
            if (node.id == id) {
                this.nodes.splice(i, 1);
                break;
            }
        }

        this.restart();
    }

    change_hard(id, hard) {
        if (!this.node_exists(id)) {
            return;
        }
        this.find_node(id).hard = hard;
        this.restart();
    }

    change_status(id, status) {
        if (!this.node_exists(id)) {
            return;
        }
        this.find_node(id).status = status;
        this.restart();
    }

    change_name(id, name) {
        if (!this.node_exists(id)) {
            return;
        }
        this.find_node(id).name = name;
        this.restart();
    }
}

global.window.init_app = function() {
    const NUM_BLOCKS = 24;
    global.window.disk = new Disk(10, NUM_BLOCKS);
    global.window.bcache = new BCache(window.disk);
    global.window.G = new GraphViz();
    global.window.fs = new Featherstitch(window.disk, window.bcache);
    global.window.file_system = new FileSystem(fs)

    global.window.components = [];

    var aprops = { width: NUM_BLOCKS * 100, height: 36, color: "black" };
    var code = {
        "append": [
            'this.file = file_system.creat(this.root_ino, "file")',
            'file_system.append(this.file, "foo")',
            'file_system.append(this.file, "bar")',
            'file_system.append(this.file, "baz")',
            'file_system.append(this.file, "fez")'
        ],
        "subdir": [
            'this.dir1 = file_system.creat(this.root_ino, "dir1")',
            'this.dir2 = file_system.creat(this.dir1, "dir2")',
            'this.dir3 = file_system.creat(this.dir2, "dir3")',
            'this.dir4 = file_system.creat(this.dir3, "dir4")'
        ],
        "multi-files": [
            'this.foo = file_system.creat(this.root_ino, "foo")',
            'this.bar = file_system.creat(this.root_ino, "bar")',
            'this.baz = file_system.creat(this.root_ino, "baz")',
            'this.fez = file_system.creat(this.root_ino, "fez")'
        ],
        "unlink": [
            'file_system.unlink(this.root_ino, "file")',
            'file_system.unlink(this.dir3, "dir4")',
            'file_system.unlink(this.dir2, "dir3")',
            'file_system.unlink(this.dir1, "dir2")',
            'file_system.unlink(this.root_ino, this.dir1)',
            // 'this.tmp = file_system.creat(this.root_ino, "tmp")',
            // 'file_system.append(this.tmp, "lotsofdata")',
            // 'file_system.append(this.tmp, "moredatas!")',
            // 'file_system.append(this.tmp, "important!")',
            // 'file_system.unlink(this.root_ino, "tmp")',
        ]
    };
    render(
        <CodeComponent selected="append" code={code} />,
        document.getElementById("application-body"));

    render(
        <div>
            <BCacheComponent bcache={window.bcache} aprops={aprops}/>
            <DiskComponent disk={window.disk} aprops={aprops}/>
        </div>,
    document.getElementById("featherstitch-container"));



    document.getElementById("mkfs-btn").addEventListener("click", function() {
        file_system.mkfs();
    });

    document.getElementById("step-btn").addEventListener("click", function() {
        step();
    });

    document.getElementById("reset-btn").addEventListener("click", function() {
        fs.reset();
        disk.reset();
        var lines = components[0].state.lines;
        for (var line in lines) {
            lines[line] = 0;
        }
        components[0].setState({'lines': lines})
        forceUpdate();
    });

    document.getElementById("flush-btn").addEventListener("click", function() {
        document.flush();
    });

    document.getElementById("crash-btn").addEventListener("click", function() {
        fs.reset();
        disk.crash();

        var lines = components[0].state.lines;
        for (var line in lines) {
            lines[line] = 0;
        }
        components[0].setState({'lines': lines})

        forceUpdate();
    });

    document.getElementById("diskhead-btn").addEventListener("click", function() {
        step_disk();
    });

    document.getElementById("step-fs-btn").addEventListener("click", function() {
        step_fs();
    });

    document.getElementById("step-opt-btn").addEventListener("click", function() {
        step_opt();
    });

    document.getElementById("play-btn").addEventListener("click", function() {
        var glyph = document.querySelector("#play-btn > span");
        if (playing) {
            global.window.playing = false;
            glyph.className = glyph.className.replace('pause', 'play');
        } else {
            global.window.playing = true;
            glyph.className = glyph.className.replace('play', 'pause');
            play();
        }

    });

    document.getElementById("interval-box").value = 200
};

global.document.flush = (function flush() {
    var fs = step_opt() || step_fs();
    var disk = step_disk();
    if (fs || disk) {
        setTimeout(flush, 100);
    }
})

global.window.playing = false;
global.window.play = function() {
    if (!playing) {
        return;
    }

    step_opt() || step_fs();
    step_disk();

    var timeout = parseInt(document.getElementById("interval-box").value)
    if (!isNaN(timeout)) {
        setTimeout(play, timeout);
    }
}

global.window.step_thing = function(thing) {
    return thing.step() && forceUpdate();
}

global.window.step = function(count=1) {
    var r = false;
    for(; count > 0; count--) {
        r = step_opt() || step_fs() || step_disk();
    }
    return r;
}

global.window.step_fs = function() {
    return step_thing(fs);
}

global.window.step_opt = function() {
    return fs.step_opt() && forceUpdate();
}

global.window.step_disk = function() {
    return step_thing(disk);
}


global.window.forceUpdate = function() {
    components.forEach((c) => { c.forceUpdate() });
    return true;
}

