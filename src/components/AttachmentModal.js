import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {View, Animated, Keyboard} from 'react-native';
import Str from 'expensify-common/lib/str';
import lodashGet from 'lodash/get';
import lodashExtend from 'lodash/extend';
import _ from 'underscore';
import CONST from '../CONST';
import Modal from './Modal';
import AttachmentView from './AttachmentView';
import AttachmentCarousel from './AttachmentCarousel';
import styles from '../styles/styles';
import * as StyleUtils from '../styles/StyleUtils';
import * as FileUtils from '../libs/fileDownload/FileUtils';
import themeColors from '../styles/themes/default';
import compose from '../libs/compose';
import withWindowDimensions, {windowDimensionsPropTypes} from './withWindowDimensions';
import Button from './Button';
import HeaderWithCloseButton from './HeaderWithCloseButton';
import fileDownload from '../libs/fileDownload';
import withLocalize, {withLocalizePropTypes} from './withLocalize';
import ConfirmModal from './ConfirmModal';
import HeaderGap from './HeaderGap';
import SafeAreaConsumer from './SafeAreaConsumer';

/**
 * Modal render prop component that exposes modal launching triggers that can be used
 * to display a full size image or PDF modally with optional confirmation button.
 */

const propTypes = {
    /** Optional source (URL, SVG function) for the image shown. If not passed in via props must be specified when modal is opened. */
    source: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),

    /** Optional callback to fire when we want to preview an image and approve it for use. */
    onConfirm: PropTypes.func,

    /** Optional callback to fire when we want to do something after modal show. */
    onModalShow: PropTypes.func,

    /** Optional callback to fire when we want to do something after modal hide. */
    onModalHide: PropTypes.func,

    /** Optional original filename when uploading */
    originalFileName: PropTypes.string,

    /** A function as a child to pass modal launching methods to */
    children: PropTypes.func.isRequired,

    /** Whether source url requires authentication */
    isAuthTokenRequired: PropTypes.bool,

    /** Determines if download Button should be shown or not */
    allowDownload: PropTypes.bool,

    /** Title shown in the header of the modal */
    headerTitle: PropTypes.string,

    /** The ID of the report that has this attachment */
    reportID: PropTypes.string,

    ...withLocalizePropTypes,

    ...windowDimensionsPropTypes,
};

const defaultProps = {
    source: '',
    onConfirm: null,
    originalFileName: '',
    isAuthTokenRequired: false,
    allowDownload: false,
    headerTitle: null,
    reportID: '',
    onModalShow: () => {},
    onModalHide: () => {},
};


const AttachmentModal = (props) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [shouldLoadAttachment, setShouldLoadAttachment] = useState(false);
    const [isAttachmentInvalid, setIsAttachmentInvalid] = useState(false);
    const [attachmentInvalidReasonTitle, setAttachmentInvalidReasonTitle] = useState(null);
    const [attachmentInvalidReason, setAttachmentInvalidReason] = useState(null);
    const [source, setSource] = useState(props.source);
    const [modalType, setModalType] = useState(CONST.MODAL.MODAL_TYPE.CENTERED_UNSWIPEABLE);
    const [isConfirmButtonDisabled, setIsConfirmButtonDisabled] = useState(false);
    const [confirmButtonFadeAnimation] = useState(new Animated.Value(1));
    const [file, setFile] = useState(props.originalFileName
        ? {
            name: props.originalFileName,
        }
        : undefined);

    /**
     * Helps to navigate between next/previous attachments
     * by setting sourceURL and file in state
     * @param {Object} attachmentData
     */
    const onNavigate = (attachmentData) => {
        setSource(attachmentData.source);
        setFile(attachmentData.file);    
    };

   /**
     * If our attachment is a PDF, return the unswipeable Modal type.
     * @param {String} sourceURL
     * @param {Object} _file
     * @returns {String}
     */
    const getModalType = (sourceURL, _file) => sourceURL && (Str.isPDF(sourceURL) || (_file && Str.isPDF(_file.name || props.translate('attachmentView.unknownFilename'))))
        ? CONST.MODAL.MODAL_TYPE.CENTERED_UNSWIPEABLE
        : CONST.MODAL.MODAL_TYPE.CENTERED
    
    /**
    * @param {String} sourceURL
    */
    const downloadAttachment = (sourceURL) => {
        const originalFileName = lodashGet(file, 'name') || props.originalFileName;
        fileDownload(sourceURL, originalFileName);

        // At ios, if the keyboard is open while opening the attachment, then after downloading
        // the attachment keyboard will show up. So, to fix it we need to dismiss the keyboard.
        Keyboard.dismiss();
    }

    /**
     * Execute the onConfirm callback and close the modal.
     */
    const submitAndClose = () => {
        // If the modal has already been closed or the confirm button is disabled
        // do not submit.
        if (!isModalOpen || isConfirmButtonDisabled) {
            return;
        }

        if (props.onConfirm) {
            props.onConfirm(lodashExtend(file, {source}));
        }

        setIsModalOpen(false);
    }

    /**
     * Close the confirm modal.
     */
    const closeConfirmModal = () => {
        setIsAttachmentInvalid(false);
    }
    
    /**
     * @param {Object} _file
     * @returns {Boolean}
     */
    const isValidFile = (_file) => {
        const {fileExtension} = FileUtils.splitExtensionFromFileName(lodashGet(_file, 'name', ''));
        if (_.contains(CONST.API_ATTACHMENT_VALIDATIONS.UNALLOWED_EXTENSIONS, fileExtension.toLowerCase())) {
            const invalidReason = props.translate('attachmentPicker.notAllowedExtension');
            
            setIsAttachmentInvalid(true);
            setAttachmentInvalidReasonTitle(props.translate('attachmentPicker.wrongFileType'));
            setAttachmentInvalidReason(invalidReason);
            return false;
        }

        if (lodashGet(_file, 'size', 0) > CONST.API_ATTACHMENT_VALIDATIONS.MAX_SIZE) {
            setIsAttachmentInvalid(true);
            setAttachmentInvalidReasonTitle(props.translate('attachmentPicker.attachmentTooLarge'));
            setAttachmentInvalidReason(props.translate('attachmentPicker.sizeExceeded'));
            return false;
        }

        if (lodashGet(_file, 'size', 0) < CONST.API_ATTACHMENT_VALIDATIONS.MIN_SIZE) {
            setIsAttachmentInvalid(true);
            setAttachmentInvalidReasonTitle(props.translate('attachmentPicker.attachmentTooSmall'));
            setAttachmentInvalidReason(props.translate('attachmentPicker.sizeNotMet'));
            return false;
        }

        return true;
    }
    
    /**
     * @param {Object} _file
     */
    const validateAndDisplayFileToUpload = (_file) => {
        if (!_file) {
            return;
        }

        if (!isValidFile(_file)) {
            return;
        }

        if (_file instanceof File) {
            const inputSource = URL.createObjectURL(_file);
            const inputModalType = getModalType(inputSource, _file);
            setIsModalOpen(true);
            setSource(inputSource);
            setFile(_file);
            setModalType(inputModalType);
        } else {
            const inputModalType = getModalType(_file.uri, _file);
            setIsModalOpen(true);
            setSource(_file.uri);
            setFile(_file);
            setModalType(inputModalType);
        }
    }
    
        /**
         * In order to gracefully hide/show the confirm button when the keyboard
         * opens/closes, apply an animation to fade the confirm button out/in. And since
         * we're only updating the opacity of the confirm button, we must also conditionally
         * disable it.
         *
         * @param {Boolean} shouldFadeOut If true, fade out confirm button. Otherwise fade in.
         */
        const updateConfirmButtonVisibility = (shouldFadeOut) => {
            setIsConfirmButtonDisabled(shouldFadeOut);
            const toValue = shouldFadeOut ? 0 : 1;

            Animated.timing(confirmButtonFadeAnimation, {
                toValue,
                duration: 100,
                useNativeDriver: true,
            }).start();
        }

        return (
            <>
            <Modal
                type={modalType}
                onSubmit={submitAndClose}
                onClose={() => setIsModalOpen(false)}
                isVisible={isModalOpen}
                backgroundColor={themeColors.componentBG}
                onModalShow={() => {
                    props.onModalShow();
                    setShouldLoadAttachment(true);
                }}
                onModalHide={(e) => {
                    props.onModalHide(e);
                    setShouldLoadAttachment(false);
                }}
                propagateSwipe
            >
                {props.isSmallScreenWidth && <HeaderGap />}
                <HeaderWithCloseButton
                    title={props.headerTitle || props.translate('common.attachment')}
                    shouldShowBorderBottom
                    shouldShowDownloadButton={props.allowDownload}
                    onDownloadButtonPress={() => downloadAttachment(source)}
                    onCloseButtonPress={() => setIsModalOpen(false)}
                />
                <View style={styles.imageModalImageCenterContainer}>
                    {props.reportID ? (
                        <AttachmentCarousel
                            reportID={props.reportID}
                            onNavigate={onNavigate}
                            source={props.source}
                            onToggleKeyboard={updateConfirmButtonVisibility}
                        />
                    ) : (
                        Boolean(source) &&
                        shouldLoadAttachment && (
                            <AttachmentView
                                containerStyles={[styles.mh5]}
                                source={source}
                                isAuthTokenRequired={props.isAuthTokenRequired}
                                file={file}
                                onToggleKeyboard={updateConfirmButtonVisibility}
                            />
                        )
                    )}
                </View>
                {/* If we have an onConfirm method show a confirmation button */}
                {Boolean(props.onConfirm) && (
                    <SafeAreaConsumer>
                        {({safeAreaPaddingBottomStyle}) => (
                            <Animated.View style={[StyleUtils.fade(confirmButtonFadeAnimation), safeAreaPaddingBottomStyle]}>
                                <Button
                                    success
                                    style={[styles.buttonConfirm, props.isSmallScreenWidth ? {} : styles.attachmentButtonBigScreen]}
                                    textStyles={[styles.buttonConfirmText]}
                                    text={props.translate('common.send')}
                                    onPress={submitAndClose}
                                    disabled={isConfirmButtonDisabled}
                                    pressOnEnter
                                />
                            </Animated.View>
                        )}
                    </SafeAreaConsumer>
                )}
            </Modal>

            <ConfirmModal
                title={attachmentInvalidReasonTitle}
                onConfirm={closeConfirmModal}
                onCancel={closeConfirmModal}
                isVisible={isAttachmentInvalid}
                prompt={attachmentInvalidReason}
                confirmText={props.translate('common.close')}
                shouldShowCancelButton={false}
            />

            {props.children({
                displayFileInModal: validateAndDisplayFileToUpload,
                show: () => {
                    setIsModalOpen(true);
                },
            })}
        </>
    );
}

AttachmentModal.propTypes = propTypes;
AttachmentModal.defaultProps = defaultProps;
AttachmentModal.displayName = 'AttachmentModal';
export default compose(withWindowDimensions, withLocalize)(AttachmentModal);
