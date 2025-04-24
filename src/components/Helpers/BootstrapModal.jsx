import React, { forwardRef, useRef, useImperativeHandle } from "react";
import $ from "jquery";

const BootstrapModal = forwardRef((props, ref) => {
    const modal = useRef(false);

    const open = () => {
        $(modal.current).modal('show');
    }

    const close = () => {
        $(modal.current).modal('hide');
    }

    useImperativeHandle(ref, () => ({
        open,
        close
    }));

    return (
        <div
            className={'modal fade ' + props.className}
            tabIndex="-1"
            role="dialog"
            aria-hidden="true"
            ref={ modal }>
            
            <div className="popup-backdrop"></div>

            <div className="modal-dialog popup-container" role="document">
                <div className="modal-content popup-inner">
                    <div className="popup-header">
                        <div className="popup-heading">
                            { props.title }
                        </div>

                        { (props.is_closeable == undefined || props.is_closeable) &&
                            <div className="popup-close" onClick={ close }>
                                <i className="fas fa-times icon"></i>
                            </div>
                        }
                    </div>

                    <div className="modal-body p-0">
                        { props.children }
                    </div>
                </div>
            </div>
        </div>
    );
});

export default BootstrapModal;