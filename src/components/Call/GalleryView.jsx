import React from "react";
import bus from "../bus";
import $ from "jquery";
import CallUserStreams from "./CallUserStreams";
import "../../assets/css/call/gallery_view.css";

class GalleryView extends React.Component {
    constructor(props) {
        super(props);

        this.bus_events_ids = [];

        this.adjustDesignBinded = this.adjustDesign.bind(this);
    }

    componentDidMount() {
        this.attachEventListeners();
        this.attachBusListeners();
    }

    componentWillUnmount() {
        this.removeBusListeners();
        this.removeEventListeners();

        // fix Warning: Can't perform a React state update on an unmounted component
        this.setState = (state, callback) => {
            return;
        };
    }

    attachEventListeners() {
        window.addEventListener('resize', this.adjustDesignBinded);
    }
    
    attachBusListeners() {
        var bus_events_ids = this.bus_events_ids;

        bus_events_ids[bus_events_ids.length] = 
        bus.on("call__back_in_call", () => {
            this.adjustDesign();
        });

        bus_events_ids[bus_events_ids.length] = 
        bus.on('call_user_stream__adjust_design', () => {
            this.adjustDesign();
        });
    }

    removeEventListeners() {
        window.removeEventListener('resize', this.adjustDesignBinded);
    }

    removeBusListeners() {
        this.bus_events_ids.forEach(event_id => {
            bus.remove(event_id);
        });
    }
    
    adjustDesign() {
        let items = $(".streams-container").find(" > .user-stream-item");
    
        const size = this.calculateGridItemSize();
        let { cols, rows, height } = size;
    
        if (items.length == 1) {
            height = $(".streams-container").height() / 2;
            cols = 2;
        }
    
        if (cols == 1) {
            cols = 2;
        }

        // row-gap adjustment
        height = height - 4;
    
        $(".streams-container").css("grid-template-columns", `repeat(${cols}, 1fr)`);
        $(".streams-container").css("grid-template-rows", "");
    
        items.css("height", height + "px");
    }
    
    calculateGridItemSize() {
        let items = $(".streams-container").find(" > .user-stream-item");
    
        let sizes = [];
        const iw = $(".streams-container").width();
        const ih = $(".streams-container").height();
    
        const w = iw / 14; // width normalized to 14/9
        const h = ih / 9; // height normalized to 14/9
    
        for (let cols = 1; cols <= this.props.pagination.per_page_streams; cols++) {
            let rows = Math.ceil(items.length / cols);
        
            const size = Math.min(w / cols, h / rows);
        
            sizes.push({
                cols,
                rows,
                size,
                height: ih / rows,
            });
        }
    
        return sizes.reduce((a, b) => (a.size >= b.size ? a : b), {});
    }

    render() {
        return (
            <div className="gallery-view w-100 h-100">
                <CallUserStreams
                    user_streams={ this.props.user_streams }
                    pagination={ this.props.pagination }
                    force_update={ this.props.streams_force_update }
                    participants_ids={ this.props.participants_ids }
                    rtc_client={ this.props.rtc_client }
                    current_user={ this.props.current_user }
                />
            </div>
        );
    }
}

export default GalleryView;
