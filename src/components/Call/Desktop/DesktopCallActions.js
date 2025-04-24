import React, { useEffect, useRef, useState } from 'react';
import CallActions from "../CallActions";
import Draggable from 'react-draggable';
import bus from 'components/bus';
import $ from "jquery";

var is_mouse_inside = true;

function DesktopCallActions(props) {
    const [is_minimized, setIsMinimized] = useState(false);
    const [have_dragged, setHaveDragged] = useState(false);

    useEffect(() => {
        attachBusListeners();

        return () => {
            removeEventListeners();
        }
    }, []);

    const attachBusListeners = () => {
        bus.on('call__layout_switched', (layout_type) => {
            if(layout_type == 'shared-screen') {
                attachEventListeners();
                lazyMinimize();
            
            } else{
                maximize();
            }
        });
    }

    const attachEventListeners = () => {
        $(document).on('mouseenter', '.desktop-call-actions', maximize);
        $(document).on('mouseleave', '.desktop-call-actions', lazyMinimize);
    }

    const removeEventListeners = () => {
        $(document).off('mouseenter', '.desktop-call-actions', maximize);
        $(document).off('mouseleave', '.desktop-call-actions', lazyMinimize);
    }

    const maximize = () => {
        is_mouse_inside = true;
        setIsMinimized(false);
    }

    const lazyMinimize = () => {
        is_mouse_inside = false;

        setTimeout(() => {
            if(!is_mouse_inside) {
                setIsMinimized(true);
                window.call_helpers.closeAllDropdowns();
            }
        }, 10000);
    }

    const stopSharing = () => {
        window.call_helper.stopShareScreen();
    }

    const onDrag = () => {
        setHaveDragged(true);
    }

    return (
        <Draggable 
            handle='.desktop-call-actions'
            bounds='body'
            onDrag={ onDrag } 
            disabled={ props.layout_type != 'shared-screen' }>
            
            <div className={
                `desktop-call-actions 
                ${is_minimized ? 'minimized' : ''} 
                ${!have_dragged ? 'not-dragged' : ''}`
            }>
                <CallActions { ...props } />

                { 
                    true &&

                    <div className='sharing-screen-parent'>
                        <span className='sharing-screen'>
                            You are sharing screen
                        </span>

                        <span className='stop-share-screen' onClick={ stopSharing }>
                            Stop sharing
                        </span>
                    </div>
                } 
            </div>
        </Draggable>
    )
}

export default DesktopCallActions;