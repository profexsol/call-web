import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { Provider } from "react-redux";
import store from "../redux/store.js"; 
import { AppContext } from "./Contexts.js";
import { ToastContainer } from "react-toastify";
import SampleCall from "./Call/SampleCall.jsx";
import bus from "./bus.js";
import "bootstrap/dist/js/bootstrap.bundle.min";
import '../assets/js/i18n.js';

var url = new URL(window.location.href);
const query_params = new URLSearchParams(url.search);
var user_id = query_params.get('user_id') || 123;
var target_user_id = query_params.get('target_user_id');

// window.chat_id = 12345;
// window.chat = {};
// window.current_user = {
//     id: 123,
//     name: "John Doe",
//     firstname: "John",
//     lastname: "Doe"
// }

const App = (props) => {
    const [ms_socket, setMsSocket] = useState(false);

    useEffect(() => {
        var ms_socket = io(import.meta.env.VITE_CALL_SERVER_URL,{ 
            query: { user_id: props.current_user ? props.current_user.id : user_id },
            transports: ["websocket"] 
        });

        window.ms_socket = ms_socket;

        ms_socket.on('connect', function() {
            console.log('ms_socket connectedd');
            bus.dispatch('ms_socket__connected', ms_socket);
        });
        
        setMsSocket(ms_socket);
    }, []);

    return (
        <Provider store={store}>
            <AppContext.Provider value={{ ms_socket }}>
                <ToastContainer />
                
                <SampleCall current_user={props.current_user} />
            </AppContext.Provider>
        </Provider>
    )
}

export default App;