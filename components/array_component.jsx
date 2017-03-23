import React from 'react';
import {BlockComponent} from 'components/block_component';

class ArrayComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {blocks: props.blocks};
    }

    render () {
        var rects = [];
        var blocks = this.state.blocks;
        var blockWidth = this.props.width / blocks.length;

        for (var i = 0; i < blocks.length; i++) {
            var position = "translate(" + (i * blockWidth) + "," + (0) + ")";

            var color = this.props.color;
            if (this.props.head == i) {
                color = "red";
            }

            rects.push(
                <g transform={position} key={blocks[i].data + i}>
                    <BlockComponent
                        color={color}
                        width={blockWidth}
                        height={this.props.height}
                        block={blocks[i]} />
                </g>);
        }
        return <div className="col-md-12">
            <div className="panel panel-default">
                <div className="panel-heading">
                    <h3 className="panel-title">{this.props.title}</h3>
                </div>
                <div className="panel-body">
                    <svg width={this.props.width} height={this.props.height}>{rects}</svg>
                </div>
            </div>
            </div>;
    }
}

export { ArrayComponent };
