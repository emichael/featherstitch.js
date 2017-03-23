import React from 'react';


class BlockComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {block: props.block};
    }

    foo() {
        this.setState({block: this.state.block.patch(0, 'test')});
    }

    render () {
        return <g>
            <rect width={this.props.width}
                  height={this.props.height}
                  style={{stroke: this.props.color, fill: "none", strokeWidth: 3}} />
                <text x="10" y="22"> {this.state.block.data} </text>
        </g>;
    }
}

export { BlockComponent };
