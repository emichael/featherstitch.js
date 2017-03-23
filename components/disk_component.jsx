import React from 'react';
import {ArrayComponent} from 'components/array_component';
import {DiskHeadComponent} from 'components/diskhead_component';

class DiskComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {disk: props.disk};
        window.components.push(this);
    }

    render () {
        return <div>
            <ArrayComponent
                head={this.state.disk.head}
                color={this.props.aprops.color}
                width={this.props.aprops.width}
                height={this.props.aprops.height}
                blocks={this.state.disk.cache} 
                title="Disk Cache"/>
            <ArrayComponent
                head={this.state.disk.head}
                color={this.props.aprops.color}
                width={this.props.aprops.width}
                height={this.props.aprops.height}
                blocks={this.state.disk.data} 
                title="Disk Device" />
            <DiskHeadComponent
                head={this.state.disk.head}
                color={"white"}
                width={this.props.aprops.width}
                height={this.props.aprops.height}
                blocks={this.state.disk.data} 
                title="Disk Head" />
        </div>
    }
}

export { DiskComponent };
