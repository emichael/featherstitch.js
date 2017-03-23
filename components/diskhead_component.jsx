import React from 'react';

class DiskHeadComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {blocks: props.blocks};
    }

    render () {
        var triangles = [];
        var blocks = this.state.blocks;
        var blockWidth = this.props.width / blocks.length;

        for (var i = 0; i < blocks.length; i++) {
            var position = "translate(" + (i * blockWidth + (blockWidth/6)) + "," + (0) + ")";

            var color = this.props.color;
            if (this.props.head == i) {
                color = "red";
            }

            triangles.push(
                <g transform={position} key={blocks[i].data + i}>
                    <polygon fill={color}
                        stroke={color}
                        strokeWidth={4}
                        points={"30,4 4,60 60,60"} />
                </g>);
        }
        return <div className="col-md-12">
            <div className="panel panel-default">
                <div className="panel-body">
                    <svg width={this.props.width} height={this.props.height}>{triangles}</svg>
                </div>
                <div className="panel-footer">
                    <h3 className="panel-title clearfix">{this.props.title}
                        <span>
                            <button className="btn btn-default pull-right" type="button" id="diskhead-btn">Step</button>
                        </span>
                    </h3>
                </div>
            </div>
            </div>;
    }
}

export { DiskHeadComponent };
