import _ from 'underscore';
import React from 'react';
import {View} from 'react-native';
import {
    TNodeRenderer,
    TNodeChildrenRenderer,
} from 'react-native-render-html';
import htmlRendererPropTypes from './htmlRendererPropTypes';

const propTypes = {
    ...htmlRendererPropTypes,
};

const CommentRender = (props) => {
    // render image comment.
    if (props.tnode.children[0].tagName === 'img') {
        return (
            <View>
                <TNodeChildrenRenderer tnode={props.tnode} />
            </View>
        );
    }

    // get lines on comment by splite <br> tag.
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

    // render every line in View  with flexDirection Row .
    // and render the  comment (contain all lines)in View with flexDirection column (default style)
    return (
        <View>
            {_.map(lines, line => (

                // TODO: separate style
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
