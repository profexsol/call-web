import React, { forwardRef, useEffect, useRef, useState } from "react";
import bus from "../bus";
import $ from "jquery";
import { withTranslation } from "react-i18next";
import "../../assets/css/call/call_reactions.css";

const reactions = {
    'thumbs-up': 'fas fa-thumbs-up',
    'love': 'fas fa-heart',
    'laugh': 'fas fa-laugh',
    'surprise': 'fas fa-surprise',
    'sad': 'fas fa-frown',
    'thumbs-down': 'fas fa-thumbs-down'
}

const CallReactions = forwardRef((props, ref) => {
    const [userReactions, setUserReactions] = useState([]);
    const [showMe, setShowMe] = useState(false);
    const [reactionListStyles, setReactionListStyles] = useState({});

    var showMeRef = useRef(showMe);
    showMeRef.current = showMe;
  
    useEffect(() => {
        attachBusListeners();
        attachCallListeners();
        hideOnClickOutside();

        window.getReactionIcon = getReactionIcon;
    }, []);

    const attachBusListeners = () => {
        bus.on('call_reactions__hide', () => {
            hideReactions();
        });

        bus.on('call_reactions__toggle', (params) => {
            if(showMeRef.current) hideReactions(params);
            else showReactions(params);
        });
    }

    const attachCallListeners = () => {
        props.rtc_client.onReaction = onReaction;
    };

    const hideOnClickOutside = () => {
        $(document).on('mouseup', function(e) {
            if(!showMeRef.current) return;
            
            var container = $(".reactions-container");
            var button_elem = $(".send-reaction-btn");
            // if the target of the click isn't the container nor a descendant of the container
            if (!container.is(e.target) && container.has(e.target).length === 0 &&
                !button_elem.is(e.target) && button_elem.has(e.target).length === 0)
            {
                hideReactions();
            }
        });
    }

    const onReaction = (params) => {
        addToUserReactions(params);
    }

    const sendReaction = (reaction_type) => {
        props.rtc_client.sendReaction({ reaction_type });
    }

    const addToUserReactions = ({ reaction_type, user_id }) => {
        var user = props.getUser(user_id);

        var window_width = $(window).width();
        var min_left = window_width > 400 ? 50 : 20;
        var max_left = window_width > 400 ? 400 : 300;

        var left_pos = Math.floor(Math.random() * (max_left - min_left + 1)) + min_left;
        
        var reaction = {
            id: user_id + '_' + new Date().valueOf() + '_' + Math.random(),
            reaction_type,
            user_id,
            user_name: user.name,
            style: {
                left: `${left_pos}px`
            }
        }

        setUserReactions(reactions => ([...reactions, reaction]));

        setTimeout(() => {
            removeFromUserReactions(reaction);
        }, 5000);
    }

    const removeFromUserReactions = (reaction_r) => {
        setUserReactions(reactions => reactions.filter((reaction, i) => reaction.id != reaction_r.id));
    }

    const getReactionIcon = ({ reaction_type }) => {
        return <span className={`reaction-icon ${reaction_type}`}>
            <i className={reactions[reaction_type]}></i>
        </span>
    }

    const showReactions = ({ position_left }) => {
        var list_width = $('.reactions-list').width();

        position_left = position_left - (list_width / 2);

        if(position_left > 0) setReactionListStyles({ left: position_left });
        else setReactionListStyles({ left: 0, right: 0 });
        
        setShowMe(true);
    }

    const hideReactions = () => {
        setShowMe(false);
    }

    return (
        <div className="reactions-container">
            <div className={`reactions-list ${showMe ? '' : 'hidden'}`} style={ reactionListStyles }>
                {
                    Object.keys(reactions).map((reaction_type) => {

                        return (
                        <span className="reaction-item" onClick={ () => sendReaction(reaction_type) }>
                            { getReactionIcon({ reaction_type }) }
                        </span>
                        )
                    })
                }
            </div>

            <div className="user-reactions">
                {
                    userReactions.map((reaction, index) => {
                        return (
                            <div className="user-reaction-item" style={ reaction.style } key={reaction.id}>
                                { getReactionIcon({ reaction_type: reaction.reaction_type }) }
                                <div className="username">{ reaction.user_name }</div>
                            </div>
                        )
                    })
                } 
            </div>
        </div>
    );
});

export default withTranslation("translation", { withRef: true })(CallReactions);