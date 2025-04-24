import React from "react";
import CallUserStream from "./CallUserStream";
import "../../assets/css/call/call_user_streams.css";

class CallUserStreams extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {}

  componentWillUnmount() {
    // fix Warning: Can't perform a React state update on an unmounted component
    this.setState = (state, callback) => {
      return;
    };
  }

  goToNextPage() {
    window.call_helpers.goToNextPage();
  }

  goToPreviousPage() {
    window.call_helpers.goToPreviousPage();
  }

  render() {
    return (
      <div className="user-streams-container">
        {
          this.props.pagination.total_pages > 1 &&
        
          <button 
            className="pagination-btn previous-btn"
            disabled={ this.props.pagination.is_page_underway || this.props.pagination.is_first_page } 
            onClick={ this.goToPreviousPage }>

            <i class="fas fa-arrow-left"></i>
          </button>
        }

        <div className="streams-container">
          { this.props.user_streams.map((user_stream) => {
            return (
              <CallUserStream
                key={user_stream.user_id}
                identifier={user_stream.user_id + "_user"}
                stream={user_stream.stream}
                user_id={user_stream.user_id}
                participant={user_stream.participant}
                is_waiting={user_stream.is_waiting}
                rtc_client={ this.props.rtc_client }
                current_user={ this.props.current_user }
                memorized_video_props={{
                  muted: true,
                }}
                className="media_element"
              />
            );
          })}
        </div>
        
        {
          this.props.pagination.total_pages > 1 &&

          <button 
            className="pagination-btn next-btn"
            disabled={ 
              this.props.pagination.is_page_underway 
              || this.props.pagination.is_last_page 
              || this.props.user_streams.length == this.props.participants_ids.length
            }
            onClick={ this.goToNextPage }>
            
            <i class="fas fa-arrow-right"></i>
          </button>
        }
      </div>
    );
  }
}

export default CallUserStreams;
