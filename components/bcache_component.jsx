import React from 'react';
import {ArrayComponent} from 'components/array_component';

class BCacheComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {bcache: props.bcache};
        window.components.push(this);
    }

    render () {
        return <div>
            <ArrayComponent
                color={this.props.aprops.color}
                width={this.props.aprops.width}
                height={this.props.aprops.height}
                blocks={this.state.bcache.data} 
                title="Buffer Cache"/>
        </div>
    }
}

export { BCacheComponent };
