import React from 'react';
import {Linking} from 'react-native';
import BaseAnchorForCommentsOnly from './BaseAnchorForCommentsOnly';
import type AnchorForCommentsOnlyProps from './types';

function AnchorForCommentsOnly({onPress, href, ...props}: AnchorForCommentsOnlyProps) {
    const onLinkPress = () => (typeof onPress === 'function' ? onPress() : Linking.openURL(href ?? ''));

    return (
        <BaseAnchorForCommentsOnly
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            href={href}
            onPress={onLinkPress}
        />
    );
}

AnchorForCommentsOnly.displayName = 'AnchorForCommentsOnly';

export default AnchorForCommentsOnly;
