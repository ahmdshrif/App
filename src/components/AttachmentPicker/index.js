import React, {useCallback, useEffect, useRef, useState} from 'react';
import CONST from '../../CONST';
import {propTypes, defaultProps} from './attachmentPickerPropTypes';

/**
 * Returns acceptable FileTypes based on ATTACHMENT_PICKER_TYPE
 * @param {String} type
 * @returns {String|undefined} Picker will accept all file types when its undefined
 */
function getAcceptableFileTypes(type) {
    if (type !== CONST.ATTACHMENT_PICKER_TYPE.IMAGE) {
        return;
    }

    return 'image/*';
}

/**
 * This component renders a function as a child and
 * returns a "show attachment picker" method that takes
 * a callback. This is the web/mWeb/desktop version since
 * on a Browser we must append a hidden input to the DOM
 * and listen to onChange event.
 * @param {propTypes} props
 * @returns {JSX.Element}
 */
function AttachmentPicker(props) {
    const fileInput = useRef();
    const onPicked = useRef();
    const [pickerWillOpen, setPickerWillOpen] = useState(false);
    const onWindowFocus = useCallback(
        (e) => {
            props.onPickerCancel(e);
            // if picker
            window.removeEventListener('focus', onWindowFocus);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [props.onPickerDidOpen],
    );

    const onWindowBlur = useCallback(
        (e) => {
            props.onPickerDidOpen(e);
            setPickerWillOpen(false);
            // if window is Focused when picker is opened, this mean that the picker was closed
            window.addEventListener('focus', onWindowFocus);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [props.onPickerDidOpen, onWindowFocus],
    );

    useEffect(() => {
        if (!pickerWillOpen) {
            return;
        }
        window.addEventListener('blur', onWindowBlur);
        return () => {
            window.removeEventListener('blur', onWindowBlur);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pickerWillOpen]);

    return (
        <>
            <input
                hidden
                type="file"
                ref={fileInput}
                onChange={(e) => {
                    const file = e.target.files[0];

                    if (file) {
                        file.uri = URL.createObjectURL(file);
                        onPicked.current(file);
                        props.onPickerGetFile(file);
                    } else {
                        props.onPickerCancel(e);
                    }

                    // Cleanup after selecting a file to start from a fresh state
                    fileInput.current.value = null;
                }}
                // We are stopping the event propagation because triggering the `click()` on the hidden input
                // causes the event to unexpectedly bubble up to anything wrapping this component e.g. Pressable
                onClick={(e) => e.stopPropagation()}
                accept={getAcceptableFileTypes(props.type)}
            />
            {props.children({
                openPicker: ({onPicked: newOnPicked}) => {
                    props.onPickerWillOpen();
                    setPickerWillOpen(true);
                    onPicked.current = newOnPicked;
                    fileInput.current.click();
                },
            })}
        </>
    );
}

AttachmentPicker.propTypes = propTypes;
AttachmentPicker.defaultProps = defaultProps;
export default AttachmentPicker;
