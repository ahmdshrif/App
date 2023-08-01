import React, {useEffect, useImperativeHandle, useRef, useState, forwardRef} from 'react';
import {StyleSheet, View} from 'react-native';
import PropTypes from 'prop-types';
import _ from 'underscore';
import {TapGestureHandler} from 'react-native-gesture-handler';
import styles from '../styles/styles';
import * as StyleUtils from '../styles/StyleUtils';
import * as ValidationUtils from '../libs/ValidationUtils';
import CONST from '../CONST';
import Text from './Text';
import TextInput from './TextInput';
import FormHelpMessage from './FormHelpMessage';
import {withNetwork} from './OnyxProvider';
import networkPropTypes from './networkPropTypes';
import useNetwork from '../hooks/useNetwork';
import * as Browser from '../libs/Browser';

const TEXT_INPUT_EMPTY_STATE = '';

const propTypes = {
    /** Information about the network */
    network: networkPropTypes.isRequired,

    /** Name attribute for the input */
    name: PropTypes.string,

    /** Input value */
    value: PropTypes.string,

    /** Should the input auto focus */
    autoFocus: PropTypes.bool,

    /** Whether we should wait before focusing the TextInput, useful when using transitions  */
    shouldDelayFocus: PropTypes.bool,

    /** Error text to display */
    errorText: PropTypes.string,

    /** Specifies autocomplete hints for the system, so it can provide autofill */
    autoComplete: PropTypes.oneOf(['sms-otp', 'one-time-code']).isRequired,

    /* Should submit when the input is complete */
    shouldSubmitOnComplete: PropTypes.bool,

    innerRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),

    /** Function to call when the input is changed  */
    onChangeText: PropTypes.func,

    /** Function to call when the input is submitted or fully complete */
    onFulfill: PropTypes.func,

    /** Specifies if the input has a validation error */
    hasError: PropTypes.bool,

    /** Specifies the max length of the input */
    maxLength: PropTypes.number,
};

const defaultProps = {
    value: undefined,
    name: '',
    autoFocus: true,
    shouldDelayFocus: false,
    errorText: '',
    shouldSubmitOnComplete: true,
    innerRef: null,
    onChangeText: () => {},
    onFulfill: () => {},
    hasError: false,
    maxLength: CONST.MAGIC_CODE_LENGTH,
};

/**
 * Converts a given string into an array of numbers that must have the same
 * number of elements as the number of inputs.
 *
 * @param {String} value
 * @param {Number} length
 * @returns {Array}
 */
const decomposeString = (value, length) => {
    let arr = _.map(value.split('').slice(0, length), (v) => (ValidationUtils.isNumeric(v) ? v : CONST.MAGIC_CODE_EMPTY_CHAR));
    if (arr.length < length) {
        arr = arr.concat(Array(length - arr.length).fill(CONST.MAGIC_CODE_EMPTY_CHAR));
    }
    return arr;
};

/**
 * Converts an array of strings into a single string. If there are undefined or
 * empty values, it will replace them with a space.
 *
 * @param {Array} value
 * @returns {String}
 */
const composeToString = (value) => _.map(value, (v) => (v === undefined || v === '' ? CONST.MAGIC_CODE_EMPTY_CHAR : v)).join('');

const getInputPlaceholderSlots = (length) => Array.from(Array(length).keys());

function MagicCodeInput(props) {
    const inputRefs = useRef();
    const [input, setInput] = useState(TEXT_INPUT_EMPTY_STATE);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [editIndex, setEditIndex] = useState(0);
    const shouldFocusLast = useRef(false);
    const inputWidth = useRef(0);
    const lastFocusedIndex = useRef(0);

    const blurMagicCodeInput = () => {
        inputRefs.current.blur();
        setFocusedIndex(undefined);
    };

    const focusMagicCodeInput = () => {
        setFocusedIndex(0);
        inputRefs.current.focus();
    };

    useImperativeHandle(props.innerRef, () => ({
        focus() {
            focusMagicCodeInput();
        },
        resetFocus() {
            setInput(TEXT_INPUT_EMPTY_STATE);
            focusMagicCodeInput();
        },
        clear() {
            setInput(TEXT_INPUT_EMPTY_STATE);
            setFocusedIndex(0);
            setEditIndex(0);
            inputRefs.current.focus();
            props.onChangeText('');
        },
        blur() {
            blurMagicCodeInput();
        },
    }));

    const validateAndSubmit = () => {
        const numbers = decomposeString(props.value, props.maxLength);
        if (!props.shouldSubmitOnComplete || _.filter(numbers, (n) => ValidationUtils.isNumeric(n)).length !== props.maxLength || props.network.isOffline) {
            return;
        }
        // Blurs the input and removes focus from the last input and, if it should submit
        // on complete, it will call the onFulfill callback.
        blurMagicCodeInput();
        props.onFulfill(props.value);
    };

    useNetwork({onReconnect: validateAndSubmit});

    useEffect(() => {
        validateAndSubmit();

        // We have not added:
        // + the editIndex as the dependency because we don't want to run this logic after focusing on an input to edit it after the user has completed the code.
        // + the props.onFulfill as the dependency because props.onFulfill is changed when the preferred locale changed => avoid auto submit form when preferred locale changed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.value, props.shouldSubmitOnComplete]);

    useEffect(() => {
        if (!props.autoFocus) {
            return;
        }

        let focusTimeout = null;
        if (props.shouldDelayFocus) {
            focusTimeout = setTimeout(() => inputRefs.current.focus(), CONST.ANIMATED_TRANSITION);
        } else {
            inputRefs.current.focus();
        }

        return () => {
            if (!focusTimeout) {
                return;
            }
            clearTimeout(focusTimeout);
        };
        // We only want this to run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Focuses on the input when it is pressed.
     *
     * @param {Object} event
     * @param {Number} index
     */
    const onFocus = (event) => {
        if (shouldFocusLast.current) {
            setInput(TEXT_INPUT_EMPTY_STATE);
            setFocusedIndex(lastFocusedIndex.current);
            setEditIndex(lastFocusedIndex.current);
        }
        event.preventDefault();
    };

    /**
     * Callback for the onPress event, updates the indexes
     * of the currently focused input.
     *
     * @param {Number} index
     */
    const onPress = (index) => {
        shouldFocusLast.current = false;
        inputRefs.current.focus();
        setInput(TEXT_INPUT_EMPTY_STATE);
        setFocusedIndex(index);
        setEditIndex(index);
        lastFocusedIndex.current = index;
    };

    /**
     * Updates the magic inputs with the contents written in the
     * input. It spreads each number into each input and updates
     * the focused input on the next empty one, if exists.
     * It handles both fast typing and only one digit at a time
     * in a specific position.
     *
     * @param {String} value
     */
    const onChangeText = (value) => {
        if (_.isUndefined(value) || _.isEmpty(value) || !ValidationUtils.isNumeric(value)) {
            return;
        }

        // Updates the focused input taking into consideration the last input
        // edited and the number of digits added by the user.
        const numbersArr = value
            .trim()
            .split('')
            .slice(0, props.maxLength - editIndex);
        const updatedFocusedIndex = Math.min(editIndex + (numbersArr.length - 1) + 1, props.maxLength - 1);

        let numbers = decomposeString(props.value, props.maxLength);
        numbers = [...numbers.slice(0, editIndex), ...numbersArr, ...numbers.slice(numbersArr.length + editIndex, props.maxLength)];

        setFocusedIndex(updatedFocusedIndex);
        setEditIndex(updatedFocusedIndex);
        setInput(TEXT_INPUT_EMPTY_STATE);

        const finalInput = composeToString(numbers);
        props.onChangeText(finalInput);
    };

    /**
     * Handles logic related to certain key presses.
     *
     * NOTE: when using Android Emulator, this can only be tested using
     * hardware keyboard inputs.
     *
     * @param {Object} event
     */
    const onKeyPress = ({nativeEvent: {key: keyValue}}) => {
        if (keyValue === 'Backspace') {
            let numbers = decomposeString(props.value, props.maxLength);

            // If the currently focused index already has a value, it will delete
            // that value but maintain the focus on the same input.
            if (numbers[focusedIndex] !== CONST.MAGIC_CODE_EMPTY_CHAR) {
                setInput(TEXT_INPUT_EMPTY_STATE);
                numbers = [...numbers.slice(0, focusedIndex), CONST.MAGIC_CODE_EMPTY_CHAR, ...numbers.slice(focusedIndex + 1, props.maxLength)];
                setEditIndex(focusedIndex);
                props.onChangeText(composeToString(numbers));
                return;
            }

            const hasInputs = _.filter(numbers, (n) => ValidationUtils.isNumeric(n)).length !== 0;

            // Fill the array with empty characters if there are no inputs.
            if (focusedIndex === 0 && !hasInputs) {
                numbers = Array(props.maxLength).fill(CONST.MAGIC_CODE_EMPTY_CHAR);

                // Deletes the value of the previous input and focuses on it.
            } else if (focusedIndex !== 0) {
                numbers = [...numbers.slice(0, Math.max(0, focusedIndex - 1)), CONST.MAGIC_CODE_EMPTY_CHAR, ...numbers.slice(focusedIndex, props.maxLength)];
            }

            const newFocusedIndex = Math.max(0, focusedIndex - 1);

            // Saves the input string so that it can compare to the change text
            // event that will be triggered, this is a workaround for mobile that
            // triggers the change text on the event after the key press.
            setInput(TEXT_INPUT_EMPTY_STATE);
            setFocusedIndex(newFocusedIndex);
            setEditIndex(newFocusedIndex);
            props.onChangeText(composeToString(numbers));

            if (!_.isUndefined(newFocusedIndex)) {
                inputRefs.current.focus();
            }
        }
        if (keyValue === 'ArrowLeft' && !_.isUndefined(focusedIndex)) {
            const newFocusedIndex = Math.max(0, focusedIndex - 1);
            setInput(TEXT_INPUT_EMPTY_STATE);
            setFocusedIndex(newFocusedIndex);
            setEditIndex(newFocusedIndex);
            inputRefs.current.focus();
        } else if (keyValue === 'ArrowRight' && !_.isUndefined(focusedIndex)) {
            const newFocusedIndex = Math.min(focusedIndex + 1, props.maxLength - 1);
            setInput(TEXT_INPUT_EMPTY_STATE);
            setFocusedIndex(newFocusedIndex);
            setEditIndex(newFocusedIndex);
            inputRefs.current.focus();
        } else if (keyValue === 'Enter') {
            // We should prevent users from submitting when it's offline.
            if (props.network.isOffline) {
                return;
            }
            setInput(TEXT_INPUT_EMPTY_STATE);
            props.onFulfill(props.value);
        }
    };

    // We need to check the browser because, in iOS Safari, an input in a container with its opacity set to
    // 0 (completely transparent) cannot handle user interaction, hence the Paste option is never shown.
    // Alternate styling will be applied based on this condition.
    const isMobileSafari = Browser.isMobileSafari();

    return (
        <>
            <View style={[styles.magicCodeInputContainer]}>
                <View style={[StyleSheet.absoluteFillObject, styles.w100, styles.invisibleOverlay]}>
                    <TapGestureHandler
                        onBegan={(e) => {
                            onPress(Math.floor(e.nativeEvent.x / (inputWidth.current / props.maxLength)));
                        }}
                    >
                        {/* Android does not handle touch on invisible Views so I created wrapper around inivisble View just to handle taps */}
                        <View
                            style={[styles.w100, styles.h100, styles.invisibleOverlay]}
                            collapsable={false}
                        >
                            <View style={[styles.w100, styles.h100, isMobileSafari ? styles.bgTransparent : styles.opacity0]}>
                                <TextInput
                                    onLayout={(e) => {
                                        inputWidth.current = e.nativeEvent.layout.width;
                                    }}
                                    ref={(ref) => (inputRefs.current = ref)}
                                    autoFocus={props.autoFocus && !props.shouldDelayFocus}
                                    inputMode="numeric"
                                    textContentType="oneTimeCode"
                                    name={props.name}
                                    maxLength={props.maxLength}
                                    value={input}
                                    hideFocusedState
                                    autoComplete={props.autoComplete}
                                    keyboardType={CONST.KEYBOARD_TYPE.NUMBER_PAD}
                                    onChangeText={(value) => {
                                        onChangeText(value);
                                    }}
                                    onKeyPress={onKeyPress}
                                    onFocus={onFocus}
                                    onBlur={() => {
                                        shouldFocusLast.current = true;
                                        lastFocusedIndex.current = focusedIndex;
                                        setFocusedIndex(undefined);
                                    }}
                                    caretHidden={isMobileSafari}
                                    inputStyle={[isMobileSafari ? styles.magicCodeInputTransparent : undefined]}
                                    accessibilityRole={CONST.ACCESSIBILITY_ROLE.TEXT}
                                    style={[isMobileSafari ? styles.bgTransparent : styles.opacity0]}
                                    textInputContainerStyles={[styles.borderNone]}
                                />
                            </View>
                        </View>
                    </TapGestureHandler>
                </View>
                {_.map(getInputPlaceholderSlots(props.maxLength), (index) => (
                    <View
                        key={index}
                        style={[styles.w15]}
                    >
                        <View
                            style={[
                                styles.textInputContainer,
                                StyleUtils.getHeightOfMagicCodeInput(),
                                props.hasError || props.errorText ? styles.borderColorDanger : {},
                                focusedIndex === index ? styles.borderColorFocus : {},
                            ]}
                        >
                            <Text style={[styles.magicCodeInput, styles.textAlignCenter]}>{decomposeString(props.value, props.maxLength)[index] || ''}</Text>
                        </View>
                    </View>
                ))}
            </View>
            {!_.isEmpty(props.errorText) && (
                <FormHelpMessage
                    isError
                    message={props.errorText}
                />
            )}
        </>
    );
}

MagicCodeInput.propTypes = propTypes;
MagicCodeInput.defaultProps = defaultProps;

export default withNetwork()(
    forwardRef((props, ref) => (
        <MagicCodeInput
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            innerRef={ref}
        />
    )),
);
