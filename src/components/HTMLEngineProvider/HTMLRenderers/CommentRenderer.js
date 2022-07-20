import _ from 'underscore';
import React from 'react';
import {View} from 'react-native';
import {
    TNodeChildrenRenderer,
} from 'react-native-render-html';
import htmlRendererPropTypes from './htmlRendererPropTypes';

const propTypes = {
    ...htmlRendererPropTypes,
};

const CommentRender = props => (
    <View style={{alignContent: 'center', flexDirection: 'row'}}>
        { _.map(props.tnode.children, node => (<TNodeChildrenRenderer tnode={node} />))}
    </View>
);

CommentRender.propTypes = propTypes;
CommentRender.displayName = 'CommentRenderer';

export default CommentRender;
