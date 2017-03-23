import React from 'react';

var global_context = {'root_ino': 1};
function _eval(js) {
    return function() {
        eval(js);
    };
}

function eval_in_ctx(js) {
    _eval(js).call(global_context);
}

class CodeComponent extends React.Component {
    constructor(props) {
        super(props);

        var lines = {};
        for (var k in this.props.code) {
            lines[k] = 0;
        }

        this.state = {
            lines: lines
        };

        components.push(this);
    }

    step(selected) {
        var lines = this.state.lines;
        if (lines[selected] < this.props.code[selected].length) {
            var line = this.props.code[selected][lines[selected]];
            eval_in_ctx(line);
            lines[selected]++;
            this.setState({lines: lines});
        }
    }

    renderExample(example) {
        var code = this.props.code[example];
        var codes = [];
        for (var line in code) {
            var color = "white";
            if (line == this.state.lines[example]) {
                color = "yellow";
            }
            codes.push(<div key={code[line]}>
                <code style={{backgroundColor: color}}>{(parseInt(line) + 1)}. {code[line].replace('file_system.', '').replace('this.', '')}</code>
            </div>);
        }
        return <div key={code}>{codes}</div>;
    }

    render() {
        var examples = [];
        for (var example in this.props.code) {
            examples.push(<div key={example}>
                <h3>
                <span style={{paddingRight: 20}}>{example}</span>
                <button onClick={this.step.bind(this, example)} type="button" className="btn btn-default">
                    <span className="glyphicon glyphicon-step-forward"></span>
                </button>
                </h3></div>);
            examples.push(this.renderExample(example));
        }
        return <div>{examples}</div>;
    }
}

export { CodeComponent };
