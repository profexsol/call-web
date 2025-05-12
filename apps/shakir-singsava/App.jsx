import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { Provider } from "react-redux";
import store from "@src/redux/store.js"; 
import { AppContext } from "@components/Contexts.js";
import { ToastContainer } from "react-toastify";
import SampleCall from "./SampleCall.jsx";
import bus from "@components/bus.js";
import "bootstrap/dist/js/bootstrap.bundle.min";
import '@src/assets/js/i18n.js';

var url = new URL(window.location.href);
const query_params = new URLSearchParams(url.search);
var user_id = query_params.get('user_id');
var user_name = query_params.get('user_name');
var user_image = query_params.get('user_image');

var current_user = {
    id: user_id,
    name: user_name,
    image: user_image
}

const App = (props) => {
    const [ms_socket, setMsSocket] = useState(false);

    useEffect(() => {
        var ms_socket = io(import.meta.env.VITE_CALL_SERVER_URL,{ 
            query: { id: user_id, name: user_name, image: user_image },
            transports: ["websocket"] 
        });

        window.ms_socket = ms_socket;

        ms_socket.on('connect', function() {
            console.log('ms_socket connectedd');
            bus.dispatch('ms_socket__connected', ms_socket);
        });
        
        setMsSocket(ms_socket);

        window.joinCall = ({ call }) => {
            window.prepareJoinCall({ call });
        }

        window.makeCall = ({ call }) => {
            window.prepareJoinCall({ call: call, is_calling: true });
        }
    }, []);

    return (
        <Provider store={store}>
            <AppContext.Provider value={{ ms_socket }}>
                <ToastContainer />
                
                <SampleCall current_user={ current_user } />
            </AppContext.Provider>
        </Provider>
    )
}

export default App;