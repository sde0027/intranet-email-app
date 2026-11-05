import MessageList from "../components/MessageList.jsx";
export const InboxPage = () => (
  <MessageList
    folder="inbox"
    title="Inbox"
    subtitle="Messages sent to your company account."
  />
);
export const SentPage = () => (
  <MessageList
    folder="sent"
    title="Sent"
    subtitle="A record of messages you've sent."
  />
);
export const DraftsPage = () => (
  <MessageList
    folder="drafts"
    title="Drafts"
    subtitle="Pick up where you left off."
  />
);
export const TrashPage = () => (
  <MessageList
    folder="trash"
    title="Trash"
    subtitle="Deleted messages can be restored before permanent removal."
  />
);
