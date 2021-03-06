import React from "react";
import { Query, Subscription } from "react-apollo";
import { Queries } from "Queries";
import { MessageGroup } from "./Message";
import _ from "lodash";
import { SPACING } from "lib/spacing";
import { Spacer } from "../Spacer";
import ReactTooltip from "react-tooltip";
import { COLORS } from "lib/colors";
import { Text } from "../Text";
import { normalizeAnonymousName } from "../Post/Author";
import { pure } from "recompose";
import classNames from "classnames";

const DEFAULT_LIMIT = 20;

const groupMessages = _.memoize(messages => {
  const messageGroups = [];
  let lastMessageGroup;

  messages.forEach((message, index) => {
    if (
      !lastMessageGroup ||
      lastMessageGroup.identity.id !== message.identity.id
    ) {
      lastMessageGroup = {
        identity: message.identity,
        messages: []
      };
      messageGroups.push(lastMessageGroup);
    }

    lastMessageGroup.messages.unshift(message);
  });

  messageGroups.forEach(messageGroup => {
    messageGroup.messages = _.uniqBy(messageGroup.messages, "id");
  });

  return messageGroups;
});

const TYPING_UPDATE_EXPIRY = 60000;
class TypingIndicator extends React.PureComponent {
  state = {
    isExpired: false,
    typing: []
  };
  static getDerivedStateFromProps(props, state) {
    if (props.typing.join("-") !== state.typing.join("-")) {
      return {
        isExpired: false,
        typing: props.typing
      };
    } else {
      return {};
    }
  }

  expireTypingIndicator = () => this.setState({ isExpired: true });

  componentWillUnmount() {
    window.clearTimeout(this.expireTypingIndicatorTimeout);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.typing !== this.state.typing) {
      window.clearTimeout(this.expireTypingIndicator);
      window.setTimeout(this.expireTypingIndicator, TYPING_UPDATE_EXPIRY);
    }
  }

  render() {
    const { participants, typing: allTyping = [], excludedID } = this.props;
    const { isExpired } = this.state;

    const names = participants
      .filter(({ id }) => id !== excludedID && allTyping.includes(id))
      .map(({ name }) => normalizeAnonymousName(name));

    const namesString = names.length > 2 ? "Several people" : names.join(",");

    return (
      <div
        className={classNames("TypingIndicator", {
          "TypingIndicator--hidden": _.isEmpty(names) || isExpired
        })}
      >
        <Text size="12px" color={COLORS.gray}>
          <Text size="inherit" weight="semiBold" color="inherit">
            {namesString}
          </Text>
          is typing
        </Text>
        <style jsx>{`
          .TypingIndicator {
            padding: ${SPACING.small}px ${SPACING.normal}px;
          }

          .TypingIndicator--hidden {
            display: none;
          }
        `}</style>
      </div>
    );
  }
}

class ChatConversation extends React.Component {
  state = {
    messageGroups: []
  };

  static getDerivedStateFromProps(props, state) {
    if (props.messages !== state.messages) {
      return {
        messageGroups: groupMessages(props.messages),
        messages: props.messages
      };
    } else {
      return {};
    }
  }
  componentDidMount = () => {
    ReactTooltip.rebuild();

    this.props.subscribeToMore({
      document: Queries.SubscribeToMessageUpdates,
      variables: { conversationID: this.props.conversation.id },
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newMessage = subscriptionData.data.ConversationMessages;

        return Object.assign({}, prev, {
          Conversation: {
            ...prev.Conversation,
            messages: _.sortedUniqBy(
              [newMessage, ...(prev.Conversation.messages || [])],
              "id"
            )
          }
        });
      }
    });
  };

  componentDidUpdate(prevProps) {
    if (prevProps.messages.length !== this.props.messages.length) {
      ReactTooltip.rebuild();
    }
  }

  renderMessageGroup = messageGroup => {
    const { colorScheme, identity } = this.props;
    return (
      <React.Fragment key={_.last(messageGroup.messages.id)}>
        <MessageGroup
          messageGroup={messageGroup}
          colorScheme={colorScheme}
          isSentByCurrentUser={messageGroup.identity.id === identity.id}
        />
        {messageGroup.identity.id !== identity.id && (
          <Spacer height={SPACING.small} />
        )}
      </React.Fragment>
    );
  };

  render() {
    const { messageGroups } = this.state;
    const { typing = [], identity, conversation } = this.props;
    return (
      <div className="Container">
        <div className="ConversationList">
          {messageGroups.map(this.renderMessageGroup)}
        </div>
        <Subscription
          subscription={Queries.SubscribeToConversationUpdates}
          variables={{ conversationID: conversation.id }}
        >
          {({ data = {} }) => {
            return (
              <TypingIndicator
                typing={_.map(
                  _.get(data, "ConversationActivity.typing") || [],
                  "id"
                )}
                participants={conversation.participants || []}
                excludedID={identity.id}
              />
            );
          }}
        </Subscription>
        <style jsx>{`
          .Container {
            background-color: white;
          }
          .ConversationList {
            overflow-y: auto;
            display: flex;
            flex-direction: column-reverse;
            flex-shrink: 0;
            flex-grow: 0;
            width: auto;
            max-width: 100%;
            max-height: 300px;
            min-height: 200px;
            height: auto;
            border-left: 1px solid ${COLORS.offwhite};
            border-right: 1px solid ${COLORS.offwhite};
            padding: ${SPACING.normal}px ${SPACING.normal}px;
            padding-bottom: 0;
          }
        `}</style>
      </div>
    );
  }
}

export const Conversation = ({ conversation, identity, ...otherProps }) => {
  return (
    <Query
      query={Queries.ChatHistory}
      variables={{
        conversationID: conversation.id,
        offset: 0,
        limit: DEFAULT_LIMIT
      }}
    >
      {({ data, subscribeToMore }) => (
        <ChatConversation
          {...otherProps}
          subscribeToMore={subscribeToMore}
          messages={_.get(data, "Conversation.messages") || []}
          conversation={conversation}
          identity={identity}
        />
      )}
    </Query>
  );
};
