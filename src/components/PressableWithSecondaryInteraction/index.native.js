import _ from 'underscore';
import React, {forwardRef} from 'react';
import {Pressable} from 'react-native';
import {LongPressGestureHandler, State} from 'react-native-gesture-handler';
import * as pressableWithSecondaryInteractionPropTypes from './pressableWithSecondaryInteractionPropTypes';
import HapticFeedback from '../../libs/HapticFeedback';

/**
 * This is a special Pressable that calls onSecondaryInteraction when LongPressed.
 *
 * @param {Object} props
 * @returns {React.Component}
 */
const PressableWithSecondaryInteraction = props => (
    <LongPressGestureHandler
        onHandlerStateChange={(e) => {
            if (e.nativeEvent.state !== State.ACTIVE) {
                return;
            }
            e.preventDefault();
            HapticFeedback.trigger();
            props.onSecondaryInteraction(e);
        }}
        maxDist={20}
    >
        <Pressable
            ref={props.forwardedRef}
            onPress={props.onPress}
            onPressIn={props.onPressIn}
            onPressOut={props.onPressOut}
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...(_.omit(props, 'onLongPress'))}
        >
            {props.children}
        </Pressable>
    </LongPressGestureHandler>

);

PressableWithSecondaryInteraction.propTypes = pressableWithSecondaryInteractionPropTypes.propTypes;
PressableWithSecondaryInteraction.defaultProps = pressableWithSecondaryInteractionPropTypes.defaultProps;
PressableWithSecondaryInteraction.displayName = 'PressableWithSecondaryInteraction';

export default forwardRef((props, ref) => (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <PressableWithSecondaryInteraction {...props} forwardedRef={ref} />
));
