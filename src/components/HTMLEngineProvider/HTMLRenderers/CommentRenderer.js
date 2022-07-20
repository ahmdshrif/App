import _ from 'underscore';
import React from 'react';
import {View, Text} from 'react-native';
import {
    TNodeRenderer,
} from 'react-native-render-html';
import htmlRendererPropTypes from './htmlRendererPropTypes';

const propTypes = {
    ...htmlRendererPropTypes,
};

const CommentRender = (props) => {
    const lines = [];
    let currentLine = [];
    const nodes = props.tnode.children[0].children;
    _.map(nodes, (node) => {
        if (node.tagName !== 'br') {
            currentLine.push(node);
            return;
        }
        lines.push(currentLine);
        currentLine = [];
    });
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }

    return (
        <View>
            {_.map(lines, line => (
                <View style={{alignContent: 'center', flexDirection: 'row', flexWrap: 'wrap'}}>
                    { _.map(line, node => (
                        <TNodeRenderer tnode={node} />
                    ))}
                </View>
            ))}
        </View>
    );
};

CommentRender.propTypes = propTypes;
CommentRender.displayName = 'CommentRenderer';

export default CommentRender;
