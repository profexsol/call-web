import React, { useEffect, useRef, useState } from 'react';
import "../../../assets/css/call/desktop_call.css";
import bus from 'components/bus';
import $ from "jquery";
import * as common from "../../../assets/js/helpers/common";
import i18next from "i18next";
import Call from "../Call";
import DesktopVideoManager from "./DesktopVideoManager";
import DesktopCallActions from "./DesktopCallActions";

const electronn = window.require ? window.require('electron') : {};
const BrowserWindow = electronn.remote ? electronn.remote.BrowserWindow : {};

var current_window = window.electron_window;
var desktop_window = false;
var current_user = common.getCurrentUser() || common.getDummyUser();

function DesktopCall(props) {
    const [layout_type, setLayoutType] = useState('main');
    const [view_type, setViewType] = useState('');
    const bus_events_ids_ref = useRef([]);
    const layout_type_ref = useRef(layout_type);
    layout_type_ref.current = layout_type;

    useEffect(() => {
        desktop_window = current_window;

        window.switchToShareScreenLayout = switchToShareScreenLayout;
        window.switchToMainLayout = switchToMainLayout;
        window.setIgnoreMouseEventsTrue = setIgnoreMouseEventsTrue;
        window.setIgnoreMouseEventsFalse = setIgnoreMouseEventsFalse;

        attachBusListeners();

        window.BrowserWindow = BrowserWindow;

        setupIgnoreMouseEvents();

        return () => {
            setTimeout(removeBusListeners, 4000);
        }
    }, []);

    const setupIgnoreMouseEvents = () => {
        $(document).on('mouseenter', '.desktop-call, .Toastify__toast-container', function () {
            console.log('mouseenter');
            if(layout_type_ref.current != 'shared-screen') return;

            desktop_window.setIgnoreMouseEvents(false);
        });

        $(document).on('mouseleave', '.desktop-call, .Toastify__toast-container', function () {
            console.log('mouseleave');
            if(layout_type_ref.current != 'shared-screen') return;

            desktop_window.setIgnoreMouseEvents(true, { forward: true });
        });
    }

    const setIgnoreMouseEventsFalse = () => {
        desktop_window.setIgnoreMouseEvents(false);
    };

    const setIgnoreMouseEventsTrue = () => {
        desktop_window.setIgnoreMouseEvents(true, { forward: true });
    };

    const attachBusListeners = () => {
        var bus_events_ids = bus_events_ids_ref.current;

        bus_events_ids[bus_events_ids.length] = bus.on('desktop-call--switch-view', (view_type) => {
            if(view_type == 'minimized') switchToMinimizedView();
            if(view_type == 'speaker') switchToSpeakerView();
            if(view_type == 'gallery') switchToGalleryView();
        });

        bus_events_ids[bus_events_ids.length] = bus.on('call__rtc_client_ready', (params) => attachCallListeners(params));

        bus_events_ids[bus_events_ids.length] = bus.on('call__joined', (params) => onJoined(params));
        bus_events_ids[bus_events_ids.length] = bus.on('call__left', (params) => onLeft(params));

        bus_events_ids[bus_events_ids.length] = bus.on('whiteboard__show', () => switchToMainLayout());
    }

    const removeBusListeners = () => {
        bus_events_ids_ref.current.forEach(event_id => {
			bus.remove(event_id);
		});
	  
		bus_events_ids_ref.current = [];
    }

    const attachCallListeners = (rtc_client) => {
        rtc_client.onScreenShared = onScreenShared;
        rtc_client.onShareScreenStopped = onShareScreenStopped;
        rtc_client.onScreenStream = onScreenStream;
        rtc_client.onScreenStreamEnded = onScreenStreamEnded;
    }

    const onScreenShared = ({ user_id }) => {
        if(user_id != current_user.id) return;

        bus.dispatch('call_shared_screen__hide');

        if(window.call_helpers.isWhiteboardOpen()) return;

        switchToShareScreenLayout();
    }

    const onShareScreenStopped = ({ user_id }) => {
        if(user_id != current_user.id) return;

        switchToMainLayout();
    }

    const onScreenStream = ({}) => {
        switchToMainLayout();
    }

    const onScreenStreamEnded = ({}) => {
        if(!window.call_helpers.isSharingScreen()) return;

        switchToShareScreenLayout();
    }

    const onJoined = () => {
        console.log('DesktopCall onjoined');

        window.ipcRenderer.send('call__joined');
    }

    const onLeft = ({ soft_leave }) => {
        console.log('DesktopCall onLeft');

        window.ipcRenderer.send('call__left');

        if(soft_leave) {
            switchToMainLayout();
            return;
        }

        closeDesktopWindow();
    }

    const switchToShareScreenLayout = async () => {
        console.log('switchToShareScreenLayout');
        if(layout_type_ref.current == 'shared-screen') return;

        setLayoutType('shared-screen');
        setViewType('speaker');

        window.call_helpers.hideActions();
        window.call_helpers.hideSidePanels();
        switchToSpeakerView();

        desktop_window.setAlwaysOnTop(true);
        desktop_window.setHasShadow(false);

        desktop_window.setIgnoreMouseEvents(true, { forward: true });

        bus.dispatch('call__layout_switched', 'shared-screen');
        $('body').addClass('call-shared-screen-layout');
    }

    const switchToMainLayout = () => {
        console.log('switchToMainLayout', layout_type_ref.current);
        if(layout_type_ref.current == 'main') return;

        setLayoutType('main');
        setViewType('');

        if(window.call_helpers) {
            window.call_helpers.showActions();
            window.call_helpers.changeViewType({ 
                view_type: 'speaker'
            });
        }

        desktop_window.setAlwaysOnTop(false);
        desktop_window.setHasShadow(true);
        desktop_window.setIgnoreMouseEvents(false);

        $('body').removeClass('call-shared-screen-layout');
    }

    const switchToMinimizedView = () => {
        switchToSpeakerView();
        setViewType('minimized');
    }

    const switchToSpeakerView = () => {
        window.call_helpers.changeViewType({ 
            view_type: 'speaker', 
            per_page_streams: 1 
        });
        
        setViewType('speaker');
    }

    const switchToGalleryView = () => {
        window.call_helpers.changeViewType({ 
            view_type: 'gallery', 
            per_page_streams: 4
        });

        setViewType('gallery');
    }

    const minimizeDesktopWindow = () => {
        desktop_window.minimize();
    }

    const softCloseDesktopWindow = () => {
        desktop_window.close();
    }
	
    return (
        <div className={ `desktop-call ${view_type}-view ${layout_type}-layout` }>
            <div className='title-bar'>
                Mizdah Meeting

                <div className='actions'>
                    <i className="fa fa-window-minimize action minimize" onClick={ minimizeDesktopWindow } />
                    <i className="fas fa-times action close" onClick={ softCloseDesktopWindow } />
                </div>
            </div>

            <Call 
                { ...props } 
                VideoManagerComponent={ DesktopVideoManager }
                ActionsComponent={ DesktopCallActions }
                layout_type={ layout_type } 
            />
        </div>
    )
}

const openDesktopWindow = ({ desktop_call_url }) => {
    console.log('openDesktopWindow', desktop_call_url);

    desktop_call_url = common.addUrlParameters({ 
        url: desktop_call_url, 
        parameters: {
          is_call_window: 1
        }
    });

    var desktop_window = new BrowserWindow({ 
        title: 'Mizdah Meeting',
        transparent: true,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
            preload: `${window.app_path}/src/preload.js`
        }
    });

    desktop_window.loadURL(desktop_call_url);
    // desktop_window.webContents.openDevTools({ mode: 'undocked' });

    window.ipcRenderer.send(
        'call__window_opened', 
        {
            window_id: desktop_window.id
        }
    );
    
    desktop_window.maximize();

    desktop_window.on('closed', () => {
        desktop_window = false;
    });

    return desktop_window;
}

async function closeDesktopWindow() {
    console.log('closeDesktopWindow');
    if(!window.is_desktop_app) return;

    await common.wait({ milliseconds: 1000 });

    desktop_window.destroy();

    desktop_window = false;
}

export {
    DesktopCall,
    openDesktopWindow,
    closeDesktopWindow
};